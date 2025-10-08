import './server/config/env';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function testScheduler() {
  try {
    console.log('🧪 Testing Scheduled Analysis System\n');

    // Find the first user with a creator profile
    const userResult = await db.execute(sql`
      SELECT u.* FROM users u
      INNER JOIN creator_profiles cp ON u.id = cp.user_id
      LIMIT 1
    `);
    const user = userResult.rows[0];

    if (!user) {
      console.error('❌ No users with creator profiles found.');
      process.exit(1);
    }

    console.log('✅ Found test user:', user.username);

    // Check if user has a creator profile
    const profileResult = await db.execute(sql`
      SELECT * FROM creator_profiles WHERE user_id = ${user.id} LIMIT 1
    `);
    const profile = profileResult.rows[0];

    if (!profile) {
      console.error('❌ Test user has no creator profile.');
      process.exit(1);
    }

    console.log('✅ Found creator profile');
    console.log(`   - TikTok: ${profile.tiktok_username || 'N/A'}`);
    console.log(`   - Instagram: ${profile.instagram_username || 'N/A'}`);
    console.log(`   - YouTube: ${profile.youtube_channel_id || 'N/A'}\n`);

    // Set next_run_at to 2 minutes from now
    const nextRun = new Date(Date.now() + 2 * 60 * 1000);
    console.log(`⏰ Setting next_run_at to: ${nextRun.toISOString()}`);
    console.log(`   (${Math.round((nextRun.getTime() - Date.now()) / 1000)} seconds from now)\n`);

    // Check if schedule exists
    const existingResult = await db.execute(sql`
      SELECT * FROM analysis_schedules WHERE user_id = ${user.id} LIMIT 1
    `);
    const existing = existingResult.rows[0];

    if (existing) {
      // Update existing schedule
      await db.execute(sql`
        UPDATE analysis_schedules
        SET frequency = 'daily',
            scheduled_time = '09:00:00',
            next_run_at = ${nextRun.toISOString()},
            is_active = true,
            updated_at = NOW()
        WHERE user_id = ${user.id}
      `);

      console.log('✅ Updated existing schedule');
    } else {
      // Create new schedule
      await db.execute(sql`
        INSERT INTO analysis_schedules (
          user_id, frequency, scheduled_day_of_week, scheduled_day_of_month,
          scheduled_time, next_run_at, is_active
        )
        VALUES (
          ${user.id}, 'daily', NULL, NULL, '09:00:00', ${nextRun.toISOString()}, true
        )
      `);

      console.log('✅ Created new schedule');
    }

    // Verify the schedule was created/updated
    const scheduleResult = await db.execute(sql`
      SELECT * FROM analysis_schedules WHERE user_id = ${user.id} LIMIT 1
    `);
    const schedule = scheduleResult.rows[0];

    if (!schedule) {
      console.error('❌ Failed to create/update schedule');
      process.exit(1);
    }

    console.log('\n📋 Schedule Details:');
    console.log(`   - Frequency: ${schedule.frequency}`);
    console.log(`   - Scheduled Time: ${schedule.scheduled_time}`);
    console.log(`   - Next Run: ${schedule.next_run_at}`);
    console.log(`   - Is Active: ${schedule.is_active}`);
    console.log(`   - Last Run: ${schedule.last_run_at || 'Never'}\n`);

    console.log('✅ Test schedule created successfully!\n');
    console.log('📌 Next Steps:');
    console.log('   1. Wait ~2 minutes for the cron job to pick this up');
    console.log('   2. Check /tmp/server.log for "Triggering scheduled profile analysis"');
    console.log('   3. Verify the analysis job is created in the background');
    console.log('   4. Confirm next_run_at is updated to tomorrow at 09:00\n');

    console.log('💡 Monitor logs with: tail -f /tmp/server.log | grep -i "schedul"');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testScheduler();
