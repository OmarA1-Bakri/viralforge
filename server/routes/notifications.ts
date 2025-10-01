import { Router, Request, Response } from 'express';
import { authenticateToken, getUserId, AuthRequest } from '../auth';
import { storage } from '../storage';
import { logger } from '../lib/logger';

const router = Router();

// Register device token for push notifications
router.post('/register', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Store token in user activity for now (could be separate table in production)
    await storage.createUserActivity({
      userId,
      activityType: 'push_token_registered',
      title: 'Device registered for notifications',
      status: 'active',
      metadata: {
        token,
        platform: platform || 'unknown',
        registeredAt: new Date().toISOString(),
      },
    });

    logger.info({ userId, platform }, 'Push notification token registered');

    res.json({
      success: true,
      message: 'Token registered successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to register push token');
    res.status(500).json({ error: 'Failed to register token' });
  }
});

export default router;
