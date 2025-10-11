import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from './logger';

// ✅ CRITICAL FIX: Only create queues if Redis is configured
// This prevents Firebase Functions from crashing when Redis is not available
const REDIS_ENABLED = !!(process.env.REDIS_HOST || process.env.REDIS_URL);

let connection: any = undefined;
if (REDIS_ENABLED) {
  connection = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') };
  logger.info('✅ BullMQ lib/queue enabled with Redis');
} else {
  logger.warn('⚠️  Redis not configured - video processing queues disabled');
}

// Video processing queue - undefined if Redis not available
export const videoProcessingQueue = REDIS_ENABLED && connection ? new Queue('video-processing', { connection }) : undefined as any;

// Clip generation queue - undefined if Redis not available
export const clipGenerationQueue = REDIS_ENABLED && connection ? new Queue('clip-generation', { connection }) : undefined as any;

// Thumbnail generation queue - undefined if Redis not available
export const thumbnailQueue = REDIS_ENABLED && connection ? new Queue('thumbnail-generation', { connection }) : undefined as any;

// Queue events for monitoring - only if Redis is enabled
if (REDIS_ENABLED && connection) {
  const videoQueueEvents = new QueueEvents('video-processing', { connection });
  const clipQueueEvents = new QueueEvents('clip-generation', { connection });

  videoQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Video processing completed');
  });

  videoQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Video processing failed');
  });

  clipQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Clip generation completed');
  });

  clipQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Clip generation failed');
  });
}

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

// ✅ TYPE-SAFE QUEUE HELPERS
// These functions safely handle queue operations when Redis might be unavailable

/**
 * Safely add a job to a queue, handling undefined queues gracefully
 * @returns Job object if successful, null if queue unavailable
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
