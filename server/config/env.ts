import { config } from 'dotenv';

/**
 * Environment Configuration Module
 *
 * This module:
 * 1. Loads environment variables ONCE at startup
 * 2. Validates all required variables
 * 3. Exports typed, validated configuration
 * 4. Handles both .env files (dev) and runtime env vars (production)
 */

// Load .env file only in non-production environments
if (process.env.NODE_ENV !== 'production') {
  config();
}

// Validate required environment variables
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const envType = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    console.error(`❌ FATAL: ${key} environment variable is required`);

    if (envType === 'production') {
      console.error(`Set ${key} via your deployment platform (Docker, Kubernetes, Heroku, etc.)`);
    } else {
      console.error(`Check that .env file exists in project root and contains ${key}`);
    }

    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Optional environment variable with default
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// Export validated, typed environment configuration
export const env = {
  // Node environment
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '5000'), 10),

  // Database - REQUIRED
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Database connection pool settings
  DB_POOL_MAX: parseInt(getEnv('DB_POOL_MAX', '10'), 10),
  DB_POOL_IDLE_TIMEOUT: parseInt(getEnv('DB_POOL_IDLE_TIMEOUT', '30000'), 10),
  DB_POOL_CONNECTION_TIMEOUT: parseInt(getEnv('DB_POOL_CONNECTION_TIMEOUT', '5000'), 10),

  // Authentication
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '24h'),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),

  // Encryption (for OAuth tokens)
  ENCRYPTION_KEY: requireEnv('ENCRYPTION_KEY'),
  ENCRYPTION_SALT: getEnv('ENCRYPTION_SALT', 'viralforge-default-salt-change-in-production'),

  // API Keys
  OPENROUTER_API_KEY: getEnv('OPENROUTER_API_KEY', ''),
  MISTRAL_API_KEY: getEnv('MISTRAL_API_KEY', ''),
  YOUTUBE_API_KEY: getEnv('YOUTUBE_API_KEY', ''),

  // Crew Agent URL with SSRF protection
  CREW_AGENT_URL: (() => {
    const crewUrl = getEnv('CREW_AGENT_URL', 'http://localhost:8002');

    try {
      const parsed = new URL(crewUrl);

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('CREW_AGENT_URL must use http or https protocol');
      }

      // Block internal IP ranges in production (SSRF protection)
      if (getEnv('NODE_ENV', 'development') === 'production') {
        const blockedHosts = [
          'localhost', '127.0.0.1', '0.0.0.0',
          '169.254.169.254', // AWS metadata
          '::1', '::ffff:127.0.0.1',
          '10.', '172.16.', '192.168.' // Private IP ranges
        ];

        if (blockedHosts.some(blocked => parsed.hostname.includes(blocked))) {
          throw new Error('CREW_AGENT_URL cannot point to internal/localhost in production');
        }
      }

      return crewUrl;
    } catch (error: any) {
      console.error(`❌ Invalid CREW_AGENT_URL: ${error.message}`);
      if (getEnv('NODE_ENV', 'development') === 'production') {
        throw new Error(`Invalid CREW_AGENT_URL configuration: ${error.message}`);
      }
      // In development, allow it but warn
      console.warn('⚠️  Using potentially unsafe CREW_AGENT_URL in development mode');
      return crewUrl;
    }
  })(),

  // Stripe (optional)
  STRIPE_SECRET_KEY: getEnv('STRIPE_SECRET_KEY', ''),

  // Sentry (optional)
  SENTRY_DSN: getEnv('SENTRY_DSN', ''),

  // PostHog (optional)
  POSTHOG_API_KEY: getEnv('POSTHOG_API_KEY', ''),

  // RevenueCat
  REVENUECAT_WEBHOOK_SECRET: getEnv('REVENUECAT_WEBHOOK_SECRET', ''),

  // Firebase (OAuth & Authentication)
  FIREBASE_PROJECT_ID: getEnv('FIREBASE_PROJECT_ID', 'viralforge-de120'),

  // Vite/Client configs
  VITE_API_URL: getEnv('VITE_API_URL', ''),
  VITE_API_BASE_URL: getEnv('VITE_API_BASE_URL', ''),

  // Firebase Client (Frontend) - for React app
  VITE_FIREBASE_API_KEY: getEnv('VITE_FIREBASE_API_KEY', ''),
  VITE_FIREBASE_AUTH_DOMAIN: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'viralforge-de120.firebaseapp.com'),
  VITE_FIREBASE_PROJECT_ID: getEnv('VITE_FIREBASE_PROJECT_ID', 'viralforge-de120'),
  VITE_FIREBASE_STORAGE_BUCKET: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'viralforge-de120.firebasestorage.app'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
  VITE_FIREBASE_APP_ID: getEnv('VITE_FIREBASE_APP_ID', ''),
} as const;

// Log successful initialization (not in production to reduce noise)
if (env.NODE_ENV !== 'production') {
  console.log('✅ Environment configuration loaded successfully');
  console.log(`   Node Environment: ${env.NODE_ENV}`);
  console.log(`   Port: ${env.PORT}`);
  console.log(`   Database: ${env.DATABASE_URL ? 'Configured' : 'Missing'}`);
  console.log(`   Pool Max: ${env.DB_POOL_MAX}`);
}

// Export type for use in other modules
export type Environment = typeof env;
