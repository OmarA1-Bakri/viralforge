import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from './config/env';
import { logger } from './lib/logger';

neonConfig.webSocketConstructor = ws;

// Create connection pool with validated configuration
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT,
  connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT,
});

// Connection pool event handlers for monitoring
pool.on('error', (err, client) => {
  logger.error('Unexpected database pool error', {
    error: err.message,
    stack: err.stack,
  });
  // In production, this should trigger alerts/monitoring
});

pool.on('connect', (client) => {
  if (env.NODE_ENV !== 'production') {
    logger.debug('New database connection established');
  }
});

pool.on('remove', (client) => {
  if (env.NODE_ENV !== 'production') {
    logger.debug('Database connection removed from pool');
  }
});

// Create Drizzle instance
const db = drizzle({ client: pool, schema });

// Export pool statistics for monitoring
export const getPoolStats = () => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
  max: env.DB_POOL_MAX,
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, draining database pool...`);
  try {
    await pool.end();
    logger.info('Database pool drained successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error draining database pool', { error });
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log successful initialization
if (env.NODE_ENV !== 'production') {
  logger.info('Database pool initialized successfully', {
    max: env.DB_POOL_MAX,
    idleTimeout: env.DB_POOL_IDLE_TIMEOUT,
    connectionTimeout: env.DB_POOL_CONNECTION_TIMEOUT,
  });
}

export { pool, db };
