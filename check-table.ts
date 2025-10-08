import './server/config/env';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function checkTable() {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'analysis_schedules'
      ORDER BY ordinal_position
    `);
    
    console.log('Table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    if (result.rows.length === 0) {
      console.log('❌ Table does not exist - running migration...');
      const migration = await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS analysis_schedules (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          frequency TEXT NOT NULL CHECK (frequency IN ('manual', 'daily', 'weekly', 'monthly')),
          scheduled_day_of_week INTEGER,
          scheduled_day_of_month INTEGER,
          scheduled_time TEXT NOT NULL DEFAULT '09:00:00',
          last_run_at TIMESTAMP WITH TIME ZONE,
          next_run_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_analysis_schedules_user_id ON analysis_schedules(user_id);
        CREATE INDEX IF NOT EXISTS idx_analysis_schedules_next_run ON analysis_schedules(next_run_at) WHERE is_active = true;
      `));
      console.log('✅ Migration completed');
    } else {
      console.log('✅ Table exists');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkTable();
