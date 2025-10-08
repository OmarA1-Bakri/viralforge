import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('🔄 Running migration: Add previous viral score fields...');

    await db.execute(sql`
      ALTER TABLE creator_profiles
      ADD COLUMN IF NOT EXISTS previous_viral_score INTEGER,
      ADD COLUMN IF NOT EXISTS previous_analyzed_at TIMESTAMP
    `);

    console.log('✅ Migration successful - added previous score fields');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
