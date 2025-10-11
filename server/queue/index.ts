import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../lib/logger';

// ✅ CRITICAL FIX: Only create Redis connection if explicitly configured
// This prevents Firebase Functions from crashing when Redis is not available
const REDIS_ENABLED = !!(process.env.REDIS_HOST || process.env.REDIS_URL);

let redisConnection: Redis | undefined;

if (REDIS_ENABLED) {
  // Redis connection for BullMQ with failure handling
  redisConnection = new Redis({
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

  logger.info('✅ BullMQ queue system enabled with Redis');
} else {
  logger.warn('⚠️  Redis not configured - background job queues disabled');
  logger.warn('⚠️  Set REDIS_HOST or REDIS_URL environment variable to enable automation');
}

// Queue configurations - only create if Redis is available
let queueOptions: any = undefined;
if (REDIS_ENABLED && redisConnection) {
  queueOptions = {
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
}

// Create queues for different automation types - undefined if Redis not available
export const trendDiscoveryQueue = queueOptions ? new Queue('trend-discovery', queueOptions) : undefined;
export const contentScoringQueue = queueOptions ? new Queue('content-scoring', queueOptions) : undefined;
export const videoProcessingQueue = queueOptions ? new Queue('video-processing', queueOptions) : undefined;
export const schedulerQueue = queueOptions ? new Queue('automation-scheduler', queueOptions) : undefined;

// Queue events for monitoring - undefined if Redis not available
export const trendDiscoveryEvents = REDIS_ENABLED && redisConnection ? new QueueEvents('trend-discovery', { connection: redisConnection }) : undefined;
export const contentScoringEvents = REDIS_ENABLED && redisConnection ? new QueueEvents('content-scoring', { connection: redisConnection }) : undefined;
export const videoProcessingEvents = REDIS_ENABLED && redisConnection ? new QueueEvents('video-processing', { connection: redisConnection }) : undefined;
export const schedulerEvents = REDIS_ENABLED && redisConnection ? new QueueEvents('automation-scheduler', { connection: redisConnection }) : undefined;

// Log queue events - only if Redis is enabled
if (REDIS_ENABLED) {
  [trendDiscoveryEvents, contentScoringEvents, videoProcessingEvents, schedulerEvents].forEach((events, index) => {
    const queueNames = ['trend-discovery', 'content-scoring', 'video-processing', 'automation-scheduler'];
    const queueName = queueNames[index];

    if (events) {
      events.on('completed', ({ jobId }) => {
        logger.info({ jobId, queue: queueName }, 'Job completed');
      });

      events.on('failed', ({ jobId, failedReason }) => {
        logger.error({ jobId, queue: queueName, failedReason }, 'Job failed');
      });
    }
  });
}

// Graceful shutdown - wait for active jobs to complete
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');

  if (!REDIS_ENABLED || !redisConnection) {
    logger.info('✅ No Redis connection to close - shutdown complete');
    return;
  }

  try {
    // First, close queues (stop accepting new jobs)
    logger.info('Closing queues (no new jobs)...');
    const closeTasks = [];
    if (trendDiscoveryQueue) closeTasks.push(trendDiscoveryQueue.close());
    if (contentScoringQueue) closeTasks.push(contentScoringQueue.close());
    if (videoProcessingQueue) closeTasks.push(videoProcessingQueue.close());
    if (schedulerQueue) closeTasks.push(schedulerQueue.close());

    if (closeTasks.length > 0) {
      await Promise.all(closeTasks);
    }

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
  if (REDIS_ENABLED && redisConnection) {
    await redisConnection.quit();
  }
  process.exit(0);
});

export { redisConnection };

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface VideoProcessingJobData {
  userId: string;
  contentId: number;
  videoKey: string;
  platform: string;
  videoDuration?: number;
}

export interface ClipGenerationJobData {
  userId: string;
  contentId: number;
  videoKey: string;
  clipData: {
    title: string;
    startTime: number;
    endTime: number;
    viralScore: number;
  };
  platform: string;
}

// ============================================================================
// TYPE-SAFE QUEUE HELPERS
// ============================================================================

/**
 * Safely add a job to a queue, handling undefined queues gracefully
 * @returns Job object if successful, null if queue unavailable or on error
 */
export async function safeQueueAdd<T>(
  queue: Queue<T> | undefined,
  queueName: string,
  jobName: string,
  data: T,
  options?: any
) {
  if (!queue) {
    logger.warn({ queueName, jobName }, 'Queue unavailable - Redis not configured');
    return null;
  }

  try {
    const job = await queue.add(jobName, data, options);
    logger.info({ queueName, jobName, jobId: job.id }, 'Job added to queue');
    return job;
  } catch (error) {
    // ✅ CRITICAL FIX: Return null instead of throwing for graceful degradation
    // Maintains consistent contract: safeQueueAdd always returns Job | null, never throws
    logger.error({ queueName, jobName, error }, 'Failed to add job to queue');
    return null;
  }
}

/**
 * Safely get a job from a queue
 * @returns Job object if found, null if queue unavailable or job not found
 */
export async function safeQueueGetJob<T>(
  queue: Queue<T> | undefined,
  queueName: string,
  jobId: string
) {
  if (!queue) {
    logger.warn({ queueName, jobId }, 'Queue unavailable - cannot get job');
    return null;
  }

  try {
    return await queue.getJob(jobId);
  } catch (error) {
    logger.error({ queueName, jobId, error }, 'Failed to get job from queue');
    return null;
  }
}
