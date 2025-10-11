import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrateSchema() {
  try {
    console.log('📦 Adding email and fullName columns to users table...');

    // Add email column
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email TEXT
    `);

    // Add fullName column
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS full_name TEXT
    `);

    console.log('✅ Schema migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateSchema();
