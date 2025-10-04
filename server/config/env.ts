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

  // API Keys
  OPENROUTER_API_KEY: getEnv('OPENROUTER_API_KEY', ''),
  MISTRAL_API_KEY: getEnv('MISTRAL_API_KEY', ''),

  // Stripe (optional)
  STRIPE_SECRET_KEY: getEnv('STRIPE_SECRET_KEY', ''),

  // Sentry (optional)
  SENTRY_DSN: getEnv('SENTRY_DSN', ''),

  // PostHog (optional)
  POSTHOG_API_KEY: getEnv('POSTHOG_API_KEY', ''),

  // RevenueCat
  REVENUECAT_WEBHOOK_SECRET: getEnv('REVENUECAT_WEBHOOK_SECRET', ''),

  // Vite/Client configs
  VITE_API_URL: getEnv('VITE_API_URL', ''),
  VITE_API_BASE_URL: getEnv('VITE_API_BASE_URL', ''),
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
