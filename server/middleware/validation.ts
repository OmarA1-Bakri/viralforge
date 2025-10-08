import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Generic validation middleware factory
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const schemas = {
  // Content analysis
  analyzeContent: z.object({
    title: z.string().max(100).optional(),
    thumbnailDescription: z.string().max(500).optional(), // Deprecated: for backward compatibility
    thumbnailUrl: z.string().url().optional(), // URL to actual thumbnail image for vision analysis
    thumbnailBase64: z.string().optional(), // Base64-encoded image for vision analysis
    platform: z.enum(['tiktok', 'youtube', 'instagram']),
    roastMode: z.boolean().optional(),
  }).refine(data => data.title || data.thumbnailDescription || data.thumbnailUrl || data.thumbnailBase64, {
    message: 'Either title, thumbnailDescription, thumbnailUrl, or thumbnailBase64 must be provided',
  }),

  // Trend discovery
  discoverTrends: z.object({
    platform: z.enum(['tiktok', 'youtube', 'instagram']),
    category: z.string().max(50).optional(),
    contentType: z.string().max(50).optional(),
    targetAudience: z.string().max(50).optional(),
  }),

  // Video processing
  processVideo: z.object({
    videoUrl: z.string().url(),
    title: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    platform: z.enum(['tiktok', 'youtube', 'instagram']).optional(),
    videoDuration: z.number().int().positive().max(3600).optional(), // Max 1 hour
  }),

  // File upload
  uploadFile: z.object({
    fileName: z.string().max(255),
    contentType: z.string().regex(/^(image|video)\/.+/),
    fileSize: z.number().int().positive().optional(),
  }),

  // Preferences
  savePreferences: z.object({
    niche: z.string().max(50),
    targetAudience: z.string().max(50).optional(),
    contentStyle: z.string().max(50).optional(),
    preferredPlatforms: z.array(z.string()).max(5).optional(),
    preferredCategories: z.array(z.string()).max(10).optional(),
    bio: z.string().max(500).optional(),
    contentLength: z.enum(['short', 'medium', 'long']).optional(),
    postingSchedule: z.array(z.string()).max(10).optional(),
    goals: z.string().max(50).optional(),
  }),

  // Profile analysis
  analyzeProfile: z.object({
    tiktokUsername: z.string()
      .max(30)
      .regex(/^@?[a-zA-Z0-9._]+$/, 'Invalid TikTok username format')
      .optional()
      .transform(val => {
        if (!val) return val;
        // Remove @ prefix
        val = val.replace(/^@/, '');
        // Normalize to prevent homograph attacks (convert non-ASCII to closest ASCII)
        val = val.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
        // Remove template literal characters to prevent injection
        val = val.replace(/[$`\\]/g, '');
        // Final validation: only safe characters
        if (!/^[a-zA-Z0-9._]+$/.test(val)) {
          throw new Error('Username contains invalid characters after sanitization');
        }
        return val.trim();
      }),
    instagramUsername: z.string()
      .max(30)
      .regex(/^[a-zA-Z0-9._]+$/, 'Invalid Instagram username format')
      .optional()
      .transform(val => {
        if (!val) return val;
        // Normalize to prevent homograph attacks
        val = val.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
        // Remove template literal characters
        val = val.replace(/[$`\\]/g, '');
        // Final validation
        if (!/^[a-zA-Z0-9._]+$/.test(val)) {
          throw new Error('Username contains invalid characters after sanitization');
        }
        return val.trim();
      }),
    youtubeChannelId: z.string()
      .regex(/^(@?[a-zA-Z0-9_-]+|UC[a-zA-Z0-9_-]{22})$/, 'Invalid YouTube channel ID or handle format')
      .optional()
      .transform(val => {
        if (!val) return val;
        // Accept both channel IDs (UC...) and handles (@username or username)
        val = val.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
        val = val.replace(/[$`\\]/g, '');
        // Final validation: either channel ID or handle format
        if (!/^(@?[a-zA-Z0-9_-]+|UC[a-zA-Z0-9_-]{22})$/.test(val)) {
          throw new Error('Channel ID/handle contains invalid characters after sanitization');
        }
        return val.trim();
      }),
  }).refine(data => data.tiktokUsername || data.instagramUsername || data.youtubeChannelId, {
    message: 'At least one social media handle is required',
  }),
};

// Sanitize HTML/XSS prevention
export const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>"']/g, (char) => {
      const map: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return map[char] || char;
    });
};
