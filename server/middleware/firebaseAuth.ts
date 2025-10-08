import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import { logger } from '../lib/logger';

/**
 * Firebase Authentication Middleware
 *
 * Verifies Firebase ID tokens sent from client
 * Extracts Firebase UID and email from token
 */

export interface FirebaseRequest extends Request {
  firebaseUid?: string;
  firebaseEmail?: string;
  firebaseUser?: {
    uid: string;
    email?: string;
    emailVerified: boolean;
    displayName?: string;
    photoURL?: string;
  };
}

/**
 * Required Firebase Authentication
 * Use this for routes that MUST have Firebase auth
 */
export const requireFirebaseAuth = async (
  req: FirebaseRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    // Attach Firebase user info to request
    req.firebaseUid = decodedToken.uid;
    req.firebaseEmail = decodedToken.email;
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    };

    logger.debug({ firebaseUid: decodedToken.uid }, 'Firebase token verified');

    next();
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Firebase token verification failed');

    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }

    if (error.code === 'auth/argument-error') {
      res.status(401).json({ error: 'Invalid token format', code: 'INVALID_TOKEN' });
      return;
    }

    res.status(401).json({ error: 'Authentication failed', code: 'AUTH_FAILED' });
  }
};

/**
 * Optional Firebase Authentication
 * Use this for routes that work with OR without Firebase auth
 */
export const optionalFirebaseAuth = async (
  req: FirebaseRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without auth
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Try to verify the token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    // Attach Firebase user info to request
    req.firebaseUid = decodedToken.uid;
    req.firebaseEmail = decodedToken.email;
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    };

    logger.debug({ firebaseUid: decodedToken.uid }, 'Firebase token verified (optional)');

    next();
  } catch (error: any) {
    // Token verification failed, but continue anyway (optional auth)
    logger.debug({ error: error.message }, 'Optional Firebase auth failed, continuing');
    next();
  }
};
