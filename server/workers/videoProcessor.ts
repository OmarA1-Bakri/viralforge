import { Worker, Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { VideoProcessingJobData } from '../lib/queue';
import { storageService } from '../lib/storage';
import { storage } from '../storage';
import { openRouterService } from '../ai/openrouter';
import { logger } from '../lib/logger';
import { Readable } from 'stream';

ffmpeg.setFfmpegPath(ffmpegPath);

const connection = process.env.REDIS_URL 
  ? { url: process.env.REDIS_URL }
  : { host: 'localhost', port: 6379 };

export const videoProcessingWorker = new Worker(
  'video-processing',
  async (job: Job<VideoProcessingJobData>) => {
    const { userId, contentId, videoKey, platform, videoDuration } = job.data;

    logger.info({ jobId: job.id, contentId }, 'Starting video processing');

    try {
      // Update job progress
      await job.updateProgress(10);

      // Get video from R2
      const signedUrl = await storageService.getSignedUrl(videoKey);

      // Get video metadata
      await job.updateProgress(20);
      const metadata = await getVideoMetadata(signedUrl);
      const duration = videoDuration || metadata.duration;

      logger.info({ duration }, 'Video metadata extracted');

      // Generate AI clip suggestions
      await job.updateProgress(30);
      const content = await storage.getContentById(contentId);
      const clipSuggestions = await openRouterService.generateVideoClips(
        content?.description || content?.title || 'Video content',
        duration,
        platform
      );

      logger.info({ clipCount: clipSuggestions.length }, 'AI clip suggestions generated');

      // Process each clip
      const clips = [];
      for (let i = 0; i < clipSuggestions.length; i++) {
        const suggestion = clipSuggestions[i];
        await job.updateProgress(30 + (i / clipSuggestions.length) * 60);

        // Extract clip using FFmpeg
        const clipBuffer = await extractClip(
          signedUrl,
          suggestion.startTime,
          suggestion.endTime,
          platform
        );

        // Upload clip to R2
        const clipResult = await storageService.uploadFile(
          clipBuffer,
          'video/mp4',
          'clips'
        );

        // Store clip in database
        const clip = await storage.createVideoClip({
          contentId,
          title: suggestion.title,
          description: suggestion.description,
          startTime: suggestion.startTime,
          endTime: suggestion.endTime,
          clipUrl: clipResult.cdnUrl || clipResult.url,
          viralScore: suggestion.viralScore,
          status: 'ready',
        });

        clips.push(clip);
      }

      await job.updateProgress(95);

      // Update content status
      await storage.updateUserContent(contentId, { status: 'completed' });

      // Create activity log
      await storage.createUserActivity({
        userId,
        activityType: 'video_processed',
        title: `Generated ${clips.length} viral clips`,
        status: 'completed',
        contentId,
        metadata: {
          clips: clips.length.toString(),
          duration: duration.toString(),
        },
      });

      await job.updateProgress(100);

      logger.info({ clipCount: clips.length }, 'Video processing completed');

      return {
        success: true,
        clipCount: clips.length,
        clips,
      };
    } catch (error) {
      logger.error({ error, jobId: job.id }, 'Video processing failed');
      
      await storage.updateUserContent(contentId, { status: 'failed' });
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute
    },
  }
);

/**
 * Get video metadata using FFmpeg
 */
function getVideoMetadata(videoUrl: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
      if (err) return reject(err);
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
      });
    });
  });
}

/**
 * Extract clip from video using FFmpeg
 */
function extractClip(
  videoUrl: string,
  startTime: number,
  endTime: number,
  platform: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const duration = endTime - startTime;

    // Platform-specific encoding
    let videoFilters = '';
    if (platform === 'tiktok') {
      videoFilters = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'; // 9:16
    } else if (platform === 'instagram') {
      videoFilters = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'; // 9:16
    } else {
      videoFilters = 'scale=1920:1080:force_original_aspect_ratio=decrease'; // 16:9 for YouTube
    }

    ffmpeg(videoUrl)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoFilters(videoFilters)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
      ])
      .format('mp4')
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)))
      .pipe()
      .on('data', (chunk: Buffer) => chunks.push(chunk));
  });
}

videoProcessingWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Video processing job completed');
});

videoProcessingWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Video processing job failed');
});
