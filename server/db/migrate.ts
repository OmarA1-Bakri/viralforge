import 'dotenv/config';
import { db } from '../db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

async function runMigration() {
  console.log('🔄 Running database migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './server/db/migrations' });
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
runMigration();
