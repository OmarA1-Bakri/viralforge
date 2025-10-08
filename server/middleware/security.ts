import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../lib/logger';

// Redis client for rate limiting
const redisClient = process.env.REDIS_URL 
  ? createClient({ url: process.env.REDIS_URL })
  : undefined;

if (redisClient) {
  redisClient.connect().catch(console.error);
}

// General rate limiter: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    // @ts-ignore - Redis client type mismatch
    client: redisClient,
    prefix: 'rl:general:',
  }) : undefined,
});

// AI analysis rate limiter: 10 requests per minute
export const aiAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many AI analysis requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    // @ts-ignore
    client: redisClient,
    prefix: 'rl:ai:',
  }) : undefined,
});

// Upload rate limiter: 5 uploads per minute
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many upload requests, please wait before uploading again.',
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    // @ts-ignore
    client: redisClient,
    prefix: 'rl:upload:',
  }) : undefined,
});

// Profile analysis rate limiter: Global safety net (tier-based limits are enforced in background-jobs.ts)
// CRITICAL: Rate limit by userId, not IP (prevents bypass via VPN/proxy rotation)
export const profileAnalysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Safety net - tier-based limits are enforced elsewhere
  // Disable IP-based validation entirely since we use userId
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    ip: false, // Disable IP validation
  },
  keyGenerator: (req: any) => {
    const userId = req.user?.id;
    // Always use userId - if missing, fail (auth should have caught this)
    if (!userId) {
      throw new Error('Profile analysis requires authentication');
    }
    return `user:${userId}`;
  },
  handler: (req: any, res: any) => {
    const userId = req.user?.id;
    logger.warn({ userId, ip: req.ip }, 'Profile analysis rate limit exceeded');
    res.status(429).json({
      error: 'Too many profile analyses. Please wait before analyzing again.',
      limit: 10,
      window: '1 hour',
      retryAfter: res.getHeader('Retry-After')
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts, even failed ones
  store: redisClient ? new RedisStore({
    // @ts-ignore
    client: redisClient,
    prefix: 'rl:profile:',
  }) : undefined,
});

// Helmet configuration for security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://openrouter.ai", "https://api.openai.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
    },
  } : false, // Disable CSP in development for Vite
  crossOriginEmbedderPolicy: false,
});

// CORS configuration
export const corsMiddleware = cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://viralforge.ai']
    : ['http://localhost:5000', 'http://localhost:5173', 'capacitor://localhost', 'http://localhost', 'http://10.0.2.2:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// File size limit middleware
export const fileSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length']);
      if (contentLength > maxSize) {
        return res.status(413).json({
          error: 'File too large',
          maxSize: `${maxSize / (1024 * 1024)}MB`,
        });
      }
    }
    next();
  };
};

// Request ID middleware for tracing
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.id = req.headers['x-request-id'] as string || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};
