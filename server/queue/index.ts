import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../lib/logger';

// Redis connection for BullMQ with failure handling
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis max retries exceeded, giving up');
      return null; // Stop retrying after 10 attempts
    }
    const delay = Math.min(times * 200, 5000); // Exponential backoff, max 5s
    logger.warn({ attempt: times, delayMs: delay }, 'Redis reconnection attempt');
    return delay;
  },
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
    if (targetErrors.some(e => err.message.includes(e))) {
      logger.warn({ error: err.message }, 'Redis error, attempting reconnect');
      return true;
    }
    return false;
  },
});

redisConnection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error - automation may be degraded');
});

redisConnection.on('connect', () => {
  logger.info('✅ Redis connected for BullMQ');
});

redisConnection.on('close', () => {
  logger.warn('⚠️  Redis connection closed - automation paused');
});

redisConnection.on('reconnecting', () => {
  logger.info('🔄 Redis reconnecting...');
});

// Queue configurations
const queueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Create queues for different automation types
export const trendDiscoveryQueue = new Queue('trend-discovery', queueOptions);
export const contentScoringQueue = new Queue('content-scoring', queueOptions);
export const videoProcessingQueue = new Queue('video-processing', queueOptions);
export const schedulerQueue = new Queue('automation-scheduler', queueOptions);

// Queue events for monitoring
export const trendDiscoveryEvents = new QueueEvents('trend-discovery', { connection: redisConnection });
export const contentScoringEvents = new QueueEvents('content-scoring', { connection: redisConnection });
export const videoProcessingEvents = new QueueEvents('video-processing', { connection: redisConnection });
export const schedulerEvents = new QueueEvents('automation-scheduler', { connection: redisConnection });

// Log queue events
[trendDiscoveryEvents, contentScoringEvents, videoProcessingEvents, schedulerEvents].forEach((events, index) => {
  const queueNames = ['trend-discovery', 'content-scoring', 'video-processing', 'automation-scheduler'];
  const queueName = queueNames[index];

  events.on('completed', ({ jobId }) => {
    logger.info({ jobId, queue: queueName }, 'Job completed');
  });

  events.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, queue: queueName, failedReason }, 'Job failed');
  });
});

// Graceful shutdown - wait for active jobs to complete
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');

  try {
    // First, close queues (stop accepting new jobs)
    logger.info('Closing queues (no new jobs)...');
    await Promise.all([
      trendDiscoveryQueue.close(),
      contentScoringQueue.close(),
      videoProcessingQueue.close(),
      schedulerQueue.close(),
    ]);

    // Workers will be imported and closed by server/index.ts
    logger.info('Queues closed, waiting for workers to finish...');

    // Close Redis connection
    await redisConnection.quit();
    logger.info('✅ BullMQ graceful shutdown complete');
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, forcing shutdown...');
  await redisConnection.quit();
  process.exit(0);
});

export { redisConnection };
