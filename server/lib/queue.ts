import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from './logger';

const connection = process.env.REDIS_URL 
  ? { url: process.env.REDIS_URL }
  : { host: 'localhost', port: 6379 };

// Video processing queue
export const videoProcessingQueue = new Queue('video-processing', { connection });

// Clip generation queue  
export const clipGenerationQueue = new Queue('clip-generation', { connection });

// Thumbnail generation queue
export const thumbnailQueue = new Queue('thumbnail-generation', { connection });

// Queue events for monitoring
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
