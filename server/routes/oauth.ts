import { Router, Request, Response } from 'express';
import { youtubeService } from '../lib/platforms/youtube';
import { storage } from '../storage';
import { logger } from '../lib/logger';

const router = Router();

// YouTube OAuth flow
router.get('/youtube', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const authUrl = youtubeService.getAuthUrl(userId as string);
    res.redirect(authUrl);
  } catch (error) {
    logger.error({ error }, 'YouTube OAuth initiation failed');
    res.status(500).json({ error: 'OAuth flow failed' });
  }
});

router.get('/youtube/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Invalid OAuth callback' });
    }

    const tokens = await youtubeService.getTokens(code as string);

    // Store tokens in user preferences
    await storage.createUserActivity({
      userId: userId as string,
      activityType: 'platform_connected',
      title: 'YouTube account connected',
      status: 'completed',
      metadata: {
        platform: 'youtube',
        hasRefreshToken: !!tokens.refresh_token,
      },
    });

    logger.info({ userId }, 'YouTube OAuth completed');

    // Redirect to app with success
    res.redirect(`/dashboard?youtube=connected`);
  } catch (error) {
    logger.error({ error }, 'YouTube OAuth callback failed');
    res.redirect(`/dashboard?youtube=error`);
  }
});

export default router;
