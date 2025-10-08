import { Router } from 'express';
import { requireFirebaseAuth, type FirebaseRequest } from '../middleware/firebaseAuth';
import { logger } from '../lib/logger';
import { db } from '../db';
import { socialMediaTokens, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '../lib/crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * YouTube OAuth Routes with Security Fixes
 *
 * Security improvements:
 * - AES-256-GCM encryption for tokens
 * - Token verification with Google
 * - Token refresh logic
 * - Rate limiting
 * - Proper token revocation
 * - Input validation
 * - User creation for Firebase users
 */

// Rate limiter for OAuth endpoints
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many OAuth requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const oauthTokenSchema = z.object({
  accessToken: z.string()
    .min(100)
    .max(2048)
    .regex(/^[A-Za-z0-9\-._~+\/]+=*$/),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().min(0).max(86400).optional(),
  scope: z.string().optional(),
});

/**
 * Verify OAuth token with Google
 */
async function verifyGoogleToken(accessToken: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`,
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        return false;
      }

      const tokenInfo = await response.json();

      // Verify scope includes YouTube readonly
      if (!tokenInfo.scope || !tokenInfo.scope.includes('youtube.readonly')) {
        logger.warn({ scope: tokenInfo.scope }, 'Token missing YouTube scope');
        return false;
      }

      return true;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    logger.error({ error }, 'Token verification failed');
    return false;
  }
}

/**
 * Refresh OAuth access token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          grant_type: 'refresh_token',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        logger.error({ error }, 'Token refresh failed');
        return null;
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    logger.error({ error }, 'Token refresh request failed');
    return null;
  }
}

/**
 * Revoke OAuth token with Google
 */
async function revokeGoogleToken(accessToken: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return true;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    logger.warn({ error }, 'Token revocation failed (may already be invalid)');
    return false;
  }
}

/**
 * Get or create user for Firebase UID
 */
async function getOrCreateUser(firebaseUid: string, firebaseEmail?: string) {
  // Check if user exists
  const existing = await db.select()
    .from(users)
    .where(eq(users.id, firebaseUid))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new user for Firebase account
  const [newUser] = await db.insert(users).values({
    id: firebaseUid,
    username: firebaseEmail || `user_${firebaseUid.slice(0, 8)}`,
    password: '', // Firebase users don't need password
    role: 'user',
  }).returning();

  logger.info({ firebaseUid, username: newUser.username }, 'Created user for Firebase UID');

  return newUser;
}

/**
 * POST /api/oauth/youtube/connect
 * Store YouTube OAuth tokens after user signs in with Google
 */
router.post('/youtube/connect', oauthLimiter, requireFirebaseAuth, async (req: FirebaseRequest, res) => {
  const startTime = Date.now();

  try {
    // Validate input
    const validation = oauthTokenSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid token format',
        code: 'INVALID_INPUT',
        details: validation.error.errors,
      });
      return;
    }

    const { accessToken, refreshToken, expiresIn, scope } = validation.data;
    const firebaseUid = req.firebaseUid!;
    const firebaseEmail = req.firebaseEmail;

    // Verify token with Google
    const isValid = await verifyGoogleToken(accessToken);
    if (!isValid) {
      res.status(401).json({
        error: 'Invalid access token or insufficient scope',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Get or create user
    const user = await getOrCreateUser(firebaseUid, firebaseEmail);

    // Encrypt tokens
    const encryptedAccess = encrypt(accessToken);
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 3600 * 1000);

    // Check if token already exists
    const existing = await db.select()
      .from(socialMediaTokens)
      .where(and(
        eq(socialMediaTokens.firebaseUid, firebaseUid),
        eq(socialMediaTokens.platform, 'youtube')
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing token
      await db.update(socialMediaTokens)
        .set({
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh || existing[0].refreshToken,
          expiresAt,
          scope: scope || existing[0].scope,
          updatedAt: new Date(),
        })
        .where(eq(socialMediaTokens.id, existing[0].id));

      logger.info({
        firebaseUid,
        platform: 'youtube',
        duration: Date.now() - startTime,
        action: 'updated'
      }, 'YouTube OAuth token updated');

      res.json({
        success: true,
        message: 'YouTube connected successfully',
        updated: true,
      });
    } else {
      // Insert new token
      await db.insert(socialMediaTokens).values({
        userId: user.id,
        firebaseUid,
        platform: 'youtube',
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenType: 'Bearer',
        expiresAt,
        scope: scope || 'https://www.googleapis.com/auth/youtube.readonly',
      });

      logger.info({
        firebaseUid,
        platform: 'youtube',
        duration: Date.now() - startTime,
        action: 'created'
      }, 'YouTube OAuth token stored');

      res.json({
        success: true,
        message: 'YouTube connected successfully',
        created: true,
      });
    }

  } catch (error: any) {
    logger.error({ error, firebaseUid: req.firebaseUid }, 'Failed to store YouTube OAuth token');
    res.status(500).json({
      error: 'Failed to connect YouTube account',
      code: 'OAUTH_STORAGE_ERROR',
    });
  }
});

/**
 * GET /api/oauth/youtube/status
 * Check if user has connected YouTube and if token is valid
 */
router.get('/youtube/status', requireFirebaseAuth, async (req: FirebaseRequest, res) => {
  try {
    const firebaseUid = req.firebaseUid!;

    const tokens = await db.select()
      .from(socialMediaTokens)
      .where(and(
        eq(socialMediaTokens.firebaseUid, firebaseUid),
        eq(socialMediaTokens.platform, 'youtube')
      ))
      .limit(1);

    if (tokens.length === 0) {
      res.json({
        connected: false,
        platform: 'youtube',
      });
      return;
    }

    const token = tokens[0];
    const isExpired = token.expiresAt ? new Date(token.expiresAt) < new Date() : false;

    // If expired and we have refresh token, try to refresh
    if (isExpired && token.refreshToken) {
      try {
        const decryptedRefresh = decrypt(token.refreshToken);
        const refreshed = await refreshAccessToken(decryptedRefresh);

        if (refreshed) {
          // Update with new token
          const encryptedAccess = encrypt(refreshed.accessToken);
          const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);

          await db.update(socialMediaTokens)
            .set({
              accessToken: encryptedAccess,
              expiresAt: newExpiresAt,
              updatedAt: new Date(),
            })
            .where(eq(socialMediaTokens.id, token.id));

          logger.info({ firebaseUid }, 'OAuth token refreshed automatically');

          res.json({
            connected: true,
            platform: 'youtube',
            connectedAt: token.createdAt,
            expiresAt: newExpiresAt,
            isExpired: false,
            needsRefresh: false,
            scope: token.scope,
            refreshed: true,
          });
          return;
        }
      } catch (error) {
        logger.error({ error, firebaseUid }, 'Failed to auto-refresh token');
      }
    }

    res.json({
      connected: true,
      platform: 'youtube',
      connectedAt: token.createdAt,
      expiresAt: token.expiresAt,
      isExpired,
      needsRefresh: isExpired,
      scope: token.scope,
    });

  } catch (error: any) {
    logger.error({ error, firebaseUid: req.firebaseUid }, 'Failed to check YouTube OAuth status');
    res.status(500).json({
      error: 'Failed to check YouTube connection status',
      code: 'STATUS_CHECK_ERROR',
    });
  }
});

/**
 * DELETE /api/oauth/youtube/disconnect
 * Revoke YouTube OAuth access and delete stored tokens
 */
router.delete('/youtube/disconnect', oauthLimiter, requireFirebaseAuth, async (req: FirebaseRequest, res) => {
  try {
    const firebaseUid = req.firebaseUid!;

    // Get the token to revoke
    const tokens = await db.select()
      .from(socialMediaTokens)
      .where(and(
        eq(socialMediaTokens.firebaseUid, firebaseUid),
        eq(socialMediaTokens.platform, 'youtube')
      ))
      .limit(1);

    if (tokens.length > 0) {
      // Revoke with Google first
      try {
        const decryptedToken = decrypt(tokens[0].accessToken);
        await revokeGoogleToken(decryptedToken);
        logger.info({ firebaseUid }, 'OAuth token revoked with Google');
      } catch (error) {
        logger.warn({ error, firebaseUid }, 'Failed to revoke token with Google (continuing with deletion)');
      }

      // Delete from database
      await db.delete(socialMediaTokens)
        .where(and(
          eq(socialMediaTokens.firebaseUid, firebaseUid),
          eq(socialMediaTokens.platform, 'youtube')
        ));

      logger.info({ firebaseUid, platform: 'youtube' }, 'YouTube OAuth token deleted');
    }

    res.json({
      success: true,
      message: 'YouTube disconnected successfully',
    });

  } catch (error: any) {
    logger.error({ error, firebaseUid: req.firebaseUid }, 'Failed to disconnect YouTube');
    res.status(500).json({
      error: 'Failed to disconnect YouTube account',
      code: 'DISCONNECT_ERROR',
    });
  }
});

/**
 * GET /api/oauth/status
 * Check connection status for all platforms
 */
router.get('/status', requireFirebaseAuth, async (req: FirebaseRequest, res) => {
  try {
    const firebaseUid = req.firebaseUid!;

    const tokens = await db.select()
      .from(socialMediaTokens)
      .where(eq(socialMediaTokens.firebaseUid, firebaseUid));

    const status = {
      youtube: false,
      instagram: false,
      tiktok: false,
    };

    for (const token of tokens) {
      if (token.platform === 'youtube') {
        const isExpired = token.expiresAt ? new Date(token.expiresAt) < new Date() : false;
        status.youtube = !isExpired;
      }
      // Instagram and TikTok parked for now
    }

    res.json(status);

  } catch (error: any) {
    logger.error({ error, firebaseUid: req.firebaseUid }, 'Failed to check OAuth status');
    res.status(500).json({
      error: 'Failed to check connection status',
      code: 'STATUS_ERROR',
    });
  }
});

/**
 * Helper function to get decrypted OAuth token for a user
 * Use this in scraper service and other places that need the token
 */
export async function getDecryptedYouTubeToken(firebaseUid: string): Promise<string | null> {
  try {
    const tokens = await db.select()
      .from(socialMediaTokens)
      .where(and(
        eq(socialMediaTokens.firebaseUid, firebaseUid),
        eq(socialMediaTokens.platform, 'youtube')
      ))
      .limit(1);

    if (tokens.length === 0) {
      return null;
    }

    const token = tokens[0];

    // Check if expired and refresh if needed
    const isExpired = token.expiresAt ? new Date(token.expiresAt) < new Date() : false;

    if (isExpired && token.refreshToken) {
      const decryptedRefresh = decrypt(token.refreshToken);
      const refreshed = await refreshAccessToken(decryptedRefresh);

      if (refreshed) {
        const encryptedAccess = encrypt(refreshed.accessToken);
        const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);

        await db.update(socialMediaTokens)
          .set({
            accessToken: encryptedAccess,
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(socialMediaTokens.id, token.id));

        return refreshed.accessToken;
      }

      // If refresh failed, token is unusable
      return null;
    }

    // Decrypt and return
    return decrypt(token.accessToken);
  } catch (error) {
    logger.error({ error, firebaseUid }, 'Failed to get decrypted token');
    return null;
  }
}

export default router;
