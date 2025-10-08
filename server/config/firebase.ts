import admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../lib/logger';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Firebase Admin SDK Configuration
 *
 * Initializes Firebase Admin for:
 * - Verifying Firebase ID tokens from client
 * - Creating custom tokens for OAuth flows
 * - Managing user authentication
 */

let firebaseApp: admin.app.App;

try {
  // Use environment variable for service account (production)
  // Falls back to file path (development only)
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Production: Use JSON from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
    logger.info('Using Firebase service account from environment variable');
  } else {
    // Development: Use file (but warn about security)
    logger.warn('⚠️  Using Firebase service account from file - NOT SAFE FOR PRODUCTION');
    const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
    credential = admin.credential.cert(serviceAccountPath);
  }

  // Initialize Firebase Admin SDK
  firebaseApp = admin.initializeApp({
    credential,
    projectId: env.FIREBASE_PROJECT_ID || 'viralforge-de120',
  });

  logger.info('✅ Firebase Admin SDK initialized successfully');

} catch (error) {
  logger.error({ error }, '❌ Failed to initialize Firebase Admin SDK');
  throw new Error('Firebase Admin initialization failed');
}

export const firebaseAuth = admin.auth();
export const firebaseAdmin = admin;
export { firebaseApp };
