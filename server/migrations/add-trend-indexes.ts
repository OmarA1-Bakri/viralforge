import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

/**
 * Migration: Add Performance Indexes for Trends Table
 * Date: 2025-10-06
 *
 * Adds indexes to optimize trend filtering by user preferences:
 * - targetNiche, targetAudience, contentStyle, category
 */

async function migrate() {
  try {
    logger.info('Starting Trends Performance Indexes migration...');

    // Add index on targetNiche for niche-based filtering
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_trends_target_niche
      ON trends(target_niche)
    `);
    logger.info('✅ Created index on trends.target_niche');

    // Add index on targetAudience for audience-based filtering
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_trends_target_audience
      ON trends(target_audience)
    `);
    logger.info('✅ Created index on trends.target_audience');

    // Add index on contentStyle for style-based filtering
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_trends_content_style
      ON trends(content_style)
    `);
    logger.info('✅ Created index on trends.content_style');

    // Add index on category for category-based filtering
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_trends_category
      ON trends(category)
    `);
    logger.info('✅ Created index on trends.category');

    // Add composite index for frequently combined filters
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_trends_personalization
      ON trends(target_niche, target_audience, content_style, category, created_at DESC)
    `);
    logger.info('✅ Created composite index for personalized trend queries');

    logger.info('🎉 Trends Performance Indexes migration completed successfully!');

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
