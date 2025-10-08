import crypto from 'crypto';
import { logger } from './logger';

/**
 * Encryption utility for sensitive data (OAuth tokens)
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 * In production, use a proper key management service (AWS KMS, GCP KMS, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Key should be 32 bytes (256 bits) for AES-256
  // Use PBKDF2 to derive proper key from passphrase
  const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'viralforge-salt-change-in-production');
  return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt sensitive data
 * Returns: base64-encoded string in format: iv:encrypted:authTag
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:encrypted:authTag (all hex encoded)
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    logger.error({ error }, 'Encryption failed');
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted data
 * Input format: iv:encrypted:authTag
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();

    // Parse encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error({ error }, 'Decryption failed');
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Verify if data is encrypted (has correct format)
 */
export function isEncrypted(data: string): boolean {
  const parts = data.split(':');
  return parts.length === 3 &&
         parts[0].length === IV_LENGTH * 2 &&
         parts[2].length === TAG_LENGTH * 2;
}

/**
 * Generate a secure random encryption key
 * Use this once to generate ENCRYPTION_KEY for .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
