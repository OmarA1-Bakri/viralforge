import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

/**
 * Migration: Add Creator Profile Analysis tables
 * Date: 2025-10-05
 */

async function migrate() {
  try {
    logger.info('Starting Creator Profile Analysis migration...');

    // Create creator_profiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS creator_profiles (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

        -- Social media handles
        tiktok_username TEXT,
        instagram_username TEXT,
        youtube_channel_id TEXT,

        -- Analysis status
        analysis_status TEXT DEFAULT 'pending' NOT NULL,
        last_analyzed_at TIMESTAMP,

        -- Viral Score (0-100)
        viral_score INTEGER,

        -- Aggregated insights
        content_strengths TEXT[],
        content_weaknesses TEXT[],
        recommended_improvements TEXT[],

        -- Platform-specific scores
        tiktok_score INTEGER,
        instagram_score INTEGER,
        youtube_score INTEGER,

        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    logger.info('✅ Created creator_profiles table');

    // Create indexes for creator_profiles
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_creator_profiles_user
      ON creator_profiles(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_creator_profiles_status
      ON creator_profiles(analysis_status)
    `);
    logger.info('✅ Created indexes for creator_profiles');

    // Create analyzed_posts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analyzed_posts (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

        -- Post metadata
        platform TEXT NOT NULL,
        post_url TEXT NOT NULL,
        post_id TEXT NOT NULL,
        title TEXT,
        description TEXT,
        thumbnail_url TEXT,

        -- Engagement metrics
        view_count INTEGER,
        like_count INTEGER,
        comment_count INTEGER,
        share_count INTEGER,
        posted_at TIMESTAMP,

        -- AI analysis results
        viral_elements TEXT[],
        content_structure JSONB,
        engagement_rate REAL,
        emotional_triggers TEXT[],
        post_score INTEGER,

        -- AI feedback
        what_worked TEXT,
        what_didnt_work TEXT,
        improvement_tips TEXT[],

        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    logger.info('✅ Created analyzed_posts table');

    // Create indexes for analyzed_posts
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_analyzed_posts_profile
      ON analyzed_posts(profile_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_analyzed_posts_platform
      ON analyzed_posts(platform)
    `);
    logger.info('✅ Created indexes for analyzed_posts');

    // Create profile_analysis_reports table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profile_analysis_reports (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

        -- Overall analysis
        viral_score INTEGER NOT NULL,
        posts_analyzed INTEGER NOT NULL,

        -- Platform breakdown
        platform_scores JSONB,

        -- Detailed feedback
        overall_strengths TEXT[],
        overall_weaknesses TEXT[],
        content_style_summary TEXT,
        target_audience_insight TEXT,

        -- Actionable recommendations
        quick_wins TEXT[],
        strategic_recommendations TEXT[],

        -- Pattern recognition
        most_viral_pattern TEXT,
        least_effective_pattern TEXT,

        -- Benchmarking
        compared_to_niche TEXT,
        growth_potential TEXT,

        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    logger.info('✅ Created profile_analysis_reports table');

    // Create index for reports
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_reports_profile
      ON profile_analysis_reports(profile_id)
    `);
    logger.info('✅ Created indexes for profile_analysis_reports');

    // Create data_subject_requests table (GDPR compliance)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id SERIAL PRIMARY KEY,
        email VARCHAR NOT NULL,
        request_type VARCHAR NOT NULL,
        details TEXT,
        status VARCHAR DEFAULT 'pending' NOT NULL,
        resolved_at TIMESTAMP,
        resolved_by VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    logger.info('✅ Created data_subject_requests table (GDPR)');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dsr_email
      ON data_subject_requests(email)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dsr_status
      ON data_subject_requests(status)
    `);
    logger.info('✅ Created indexes for data_subject_requests');

    logger.info('🎉 Creator Profile Analysis migration completed successfully!');

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
