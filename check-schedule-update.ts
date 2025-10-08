import './server/config/env';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function checkScheduleUpdate() {
  try {
    const result = await db.execute(sql`
      SELECT * FROM analysis_schedules LIMIT 1
    `);
    
    const schedule = result.rows[0];
    
    if (!schedule) {
      console.log('❌ No schedule found');
      process.exit(1);
    }
    
    console.log('📋 Schedule Status After Cron Execution:\n');
    console.log(`   Frequency: ${schedule.frequency}`);
    console.log(`   Scheduled Time: ${schedule.scheduled_time}`);
    console.log(`   Last Run: ${schedule.last_run_at || 'Never'}`);
    console.log(`   Next Run: ${schedule.next_run_at}`);
    console.log(`   Is Active: ${schedule.is_active}\n`);
    
    const lastRun = new Date(schedule.last_run_at || 0);
    const nextRun = new Date(schedule.next_run_at);
    const now = new Date();
    
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Time since last_run_at: ${Math.round((now.getTime() - lastRun.getTime()) / 1000)} seconds`);
    console.log(`Time until next_run_at: ${Math.round((nextRun.getTime() - now.getTime()) / 1000)} seconds\n`);
    
    if (schedule.last_run_at && new Date(schedule.last_run_at) > new Date('2025-10-07T20:34:00Z')) {
      console.log('✅ last_run_at was updated by the cron job!');
    } else {
      console.log('❌ last_run_at was NOT updated');
    }
    
    if (schedule.next_run_at && new Date(schedule.next_run_at) > new Date('2025-10-07T20:35:00Z')) {
      console.log('✅ next_run_at was calculated for next occurrence!');
    } else {
      console.log('⚠️  next_run_at might not have been updated correctly');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkScheduleUpdate();
