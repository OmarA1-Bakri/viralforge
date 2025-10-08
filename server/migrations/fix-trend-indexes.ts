import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

/**
 * Migration: Optimize Trend Indexes for OR Queries
 * Date: 2025-10-06
 *
 * Removes inefficient composite index and adds missing created_at index.
 * Composite indexes are inefficient for OR queries - individual indexes are better.
 */

async function migrate() {
  try {
    logger.info('Starting Trend Index Optimization migration...');

    // Remove composite index (inefficient for OR queries)
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_trends_personalization
    `);
    logger.info('✅ Removed inefficient composite index');

    // Add dedicated index for created_at sorting
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_trends_created_at
      ON trends(created_at DESC)
    `);
    logger.info('✅ Created index on trends.created_at for sorting');

    logger.info('🎉 Trend Index Optimization migration completed successfully!');
    logger.info('Note: Individual column indexes (niche, audience, style, category) are optimal for OR queries');

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
