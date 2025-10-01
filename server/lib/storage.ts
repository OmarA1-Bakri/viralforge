import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

// Cloudflare R2 configuration (S3-compatible)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'viralforge-uploads';
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
  contentType: string;
}

export class StorageService {
  /**
   * Upload file to R2
   */
  async uploadFile(
    buffer: Buffer,
    contentType: string,
    folder: 'thumbnails' | 'videos' | 'clips' = 'thumbnails'
  ): Promise<UploadResult> {
    const ext = contentType.split('/')[1] || 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      key,
      url: `https://${BUCKET_NAME}.r2.cloudflarestorage.com/${key}`,
      cdnUrl: PUBLIC_URL ? `${PUBLIC_URL}/${key}` : undefined,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Generate pre-signed upload URL
   */
  async getUploadUrl(
    fileName: string,
    contentType: string,
    folder: 'thumbnails' | 'videos' | 'clips' = 'thumbnails'
  ): Promise<{ uploadUrl: string; key: string }> {
    const ext = fileName.split('.').pop() || 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { uploadUrl, key };
  }

  /**
   * Generate thumbnail from image
   */
  async generateThumbnails(buffer: Buffer): Promise<{
    small: Buffer;
    medium: Buffer;
    large: Buffer;
  }> {
    const [small, medium, large] = await Promise.all([
      sharp(buffer).resize(150, 150, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
      sharp(buffer).resize(400, 400, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer(),
      sharp(buffer).resize(800, 800, { fit: 'inside' }).jpeg({ quality: 90 }).toBuffer(),
    ]);

    return { small, medium, large };
  }

  /**
   * Upload image with thumbnail variants
   */
  async uploadImageWithThumbnails(
    buffer: Buffer,
    contentType: string
  ): Promise<{
    original: UploadResult;
    thumbnails: {
      small: UploadResult;
      medium: UploadResult;
      large: UploadResult;
    };
  }> {
    const [original, variants] = await Promise.all([
      this.uploadFile(buffer, contentType, 'thumbnails'),
      this.generateThumbnails(buffer),
    ]);

    const [small, medium, large] = await Promise.all([
      this.uploadFile(variants.small, 'image/jpeg', 'thumbnails'),
      this.uploadFile(variants.medium, 'image/jpeg', 'thumbnails'),
      this.uploadFile(variants.large, 'image/jpeg', 'thumbnails'),
    ]);

    return {
      original,
      thumbnails: { small, medium, large },
    };
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  }
}

export const storageService = new StorageService();
