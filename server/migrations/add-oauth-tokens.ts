import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

/**
 * Migration: Add OAuth Tokens Table for YouTube Authentication
 * Date: 2025-10-06
 *
 * Creates social_media_tokens table to store YouTube OAuth access tokens
 * Instagram and TikTok are parked for now - YouTube only
 */

async function migrate() {
  try {
    logger.info('Starting OAuth Tokens migration...');

    // Create social_media_tokens table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS social_media_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        firebase_uid TEXT,
        platform TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type TEXT DEFAULT 'Bearer' NOT NULL,
        expires_at TIMESTAMP,
        scope TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, platform)
      )
    `);
    logger.info('✅ Created social_media_tokens table');

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_social_tokens_user
      ON social_media_tokens(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_social_tokens_firebase_uid
      ON social_media_tokens(firebase_uid)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_social_tokens_platform
      ON social_media_tokens(platform)
    `);
    logger.info('✅ Created indexes for social_media_tokens');

    logger.info('🎉 OAuth Tokens migration completed successfully!');

  } catch (error) {
    logger.error({ error }, '❌ Migration failed');
    throw error;
  }
}

// Run migration
migrate()
  .then(() => {
    logger.info('Migration complete. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, 'Migration failed. Exiting...');
    process.exit(1);
  });
