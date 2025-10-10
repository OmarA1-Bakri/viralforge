import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';

// Set global options for all functions
setGlobalOptions({
  region: 'us-central1',
  memory: '1GiB',
  timeoutSeconds: 540,
  maxInstances: 10,
});

/**
 * Firebase Function wrapper for the Express backend
 *
 * The Express app is copied to ./app.js during deployment by deploy-firebase.sh
 *
 * This function handles ALL API routes: /api/*
 * Frontend routes are served by Firebase Hosting
 */
export const api = onRequest({
  cors: true,
  memory: '1GiB',
  timeoutSeconds: 540,
  minInstances: 1, // Keep at least 1 instance warm to avoid cold starts
  maxInstances: 10,
  // Set environment variables for production
  secrets: [],
}, async (req, res) => {
  try {
    // Dynamically import the Express app (copied during deployment)
    const { default: app } = await import('./app.js');

    // Forward the request to Express
    return app(req, res);
  } catch (error) {
    console.error('Failed to load Express app:', error);
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Backend initialization failed. Please check deployment logs.',
      details: error.message
    });
  }
});
