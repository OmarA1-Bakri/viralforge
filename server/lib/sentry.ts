import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';

export function initSentry(app: Express) {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out non-error events in development
      if (process.env.NODE_ENV !== 'production' && event.level !== 'error') {
        return null;
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized');
}

// These handlers are no longer needed in Sentry v8+
// Use Sentry.setupExpressErrorHandler(app) directly instead

export { Sentry };
