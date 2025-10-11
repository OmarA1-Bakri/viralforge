import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './lib/logger';
import { storage } from './storage';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { normalizeTier } from '@shared/subscription-constants';
import { users, userSubscriptions, subscriptionTiers } from '@shared/schema';

// Use centralized environment configuration
const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

export interface AuthUser {
  id: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Rate limiting for auth endpoints (relaxed for development)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs (dev mode)
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register rate limiting (relaxed for development)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 registration attempts per hour (dev mode)
  message: {
    error: 'Too many registration attempts, please try again later',
  },
});

// JWT token verification middleware
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    // Log only error type, no stack traces or details in production
    const errorId = crypto.randomUUID();
    if (process.env.NODE_ENV !== 'production') {
      console.error('Auth middleware error:', { errorId, error });
    } else {
      console.error('Auth error:', { errorId, errorType: error?.constructor?.name });
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without auth for optional endpoints
    next();
  }
};

// Generate JWT token
export const generateToken = (user: { id: string; username: string }): string => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Verify password
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Extract user ID from request
export const getUserId = (req: AuthRequest): string => {
  if (req.user?.id) {
    return req.user.id;
  }

  throw new Error('User not authenticated');
};

// Auth integration helpers (now using PostgreSQL storage)
export const neonAuthHelpers = {
  // Register user
  async registerUser(username: string, password: string, subscriptionTier: string = 'starter', email?: string, fullName?: string): Promise<{ user: AuthUser; token: string }> {
    try {
      // SECURITY: Normalize and validate subscription tier
      const normalizedTier = normalizeTier(subscriptionTier, 'starter');

      // SECURITY: Validate that tester tier includes required fields
      if (normalizedTier === 'tester' && (!email || !fullName)) {
        throw new Error('Tester tier requires email and full name');
      }

      // Hash password before transaction (expensive operation)
      const hashedPassword = await hashPassword(password);

      // SECURITY: Use transaction for atomicity
      // All validations and inserts happen within transaction to prevent race conditions
      const result = await db.transaction(async (tx) => {
        // SECURITY: Verify tier exists in database (FK constraint validation)
        // Must be inside transaction to prevent TOCTOU race condition
        const tierExists = await tx.query.subscriptionTiers.findFirst({
          where: eq(subscriptionTiers.id, normalizedTier),
        });

        if (!tierExists) {
          logger.error({ tier: normalizedTier }, 'Tier not found in database during registration');
          throw new Error('Invalid subscription tier configuration. Please contact support.');
        }

        // Check if user already exists (inside transaction for consistency)
        const existingUser = await tx.query.users.findFirst({
          where: eq(users.username, username),
        });

        if (existingUser) {
          throw new Error('User already exists');
        }

        // Create user within transaction
        const [newUser] = await tx.insert(users).values({
          username,
          password: hashedPassword,
          email: email || null,
          fullName: fullName || null,
          role: 'user',
          createdAt: new Date(),
        }).returning();

        // Create subscription record atomically with user
        await tx.insert(userSubscriptions).values({
          userId: newUser.id,
          tierId: normalizedTier,
          status: 'active',
          billingCycle: 'monthly',
        });

        return newUser;
      });

      logger.info({
        userId: result.id,
        username: result.username,
        tier: normalizedTier
      }, 'User registered successfully with subscription');

      const authUser: AuthUser = {
        id: result.id,
        username: result.username,
      };

      const token = generateToken(authUser);

      return { user: authUser, token };
    } catch (error) {
      // Enhanced error handling with specific error types
      const errorId = crypto.randomUUID();

      if (error instanceof Error) {
        // Pass through user-facing errors
        if (error.message.includes('already exists') ||
            error.message.includes('Invalid subscription tier') ||
            error.message.includes('Tester tier requires')) {
          throw error;
        }

        // Log database/system errors with tracking ID
        logger.error({
          errorId,
          errorMessage: error.message,
          errorType: error.constructor.name
        }, 'Registration system error');

        throw new Error(`Registration failed (ref: ${errorId}). Please try again or contact support.`);
      }

      throw new Error('Registration failed');
    }
  },

  // Login user
  async loginUser(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    try {
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        // This is a legitimate "user not found" case
        throw new Error('Invalid credentials');
      }

      // Verify password
      logger.debug({
        username,
        passwordLength: password?.length,
        passwordProvided: !!password,
        hashLength: user.password?.length,
        hashProvided: !!user.password
      }, 'Password verification attempt');

      const isValidPassword = await verifyPassword(password, user.password);

      logger.debug({
        username,
        isValidPassword,
        verificationResult: isValidPassword ? 'SUCCESS' : 'FAILED'
      }, 'Password verification result');

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
      };

      const token = generateToken(authUser);

      return { user: authUser, token };
    } catch (error) {
      // Generate unique error ID for tracking (no PII)
      const errorId = crypto.randomUUID();

      // Determine environment for logging level
      const isDev = process.env.NODE_ENV !== 'production';

      if (isDev) {
        // Development: detailed logging with PII (for debugging)
        console.error('Login failed:', {
          errorId,
          username, // OK in development
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          errorType: error?.constructor?.name
        });
      } else {
        // Production: minimal logging without PII (GDPR compliant)
        console.error('Login failed:', {
          errorId,
          errorType: error?.constructor?.name,
          // NO username, NO stack traces
        });
      }

      // If it's already an auth error, rethrow it
      if (error instanceof Error && error.message === 'Invalid credentials') {
        throw error;
      }

      // For database/system errors, log as critical and provide reference ID
      console.error('SYSTEM ERROR during login:', { errorId });
      throw new Error(`Service temporarily unavailable (ref: ${errorId}). Please try again or contact support.`);
    }
  },

  // Refresh token
  async refreshToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return generateToken({ id: decoded.id, username: decoded.username });
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  },

  // Validate token
  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return decoded;
    } catch (error) {
      return null;
    }
  }
};

// Environment validation (minimal - most validation in config/env.ts)
export const validateAuthEnvironment = (): void => {
  // All critical validation is handled in config/env.ts
  // This function remains for backward compatibility
  if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'your-dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production');
  }
};

// Alias for compatibility
export const requireAuth = authenticateToken;

export default {
  authenticateToken,
  optionalAuth,
  authLimiter,
  registerLimiter,
  generateToken,
  hashPassword,
  verifyPassword,
  isValidEmail,
  isValidPassword,
  getUserId,
  neonAuthHelpers,
  validateAuthEnvironment,
};