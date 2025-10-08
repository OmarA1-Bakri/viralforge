import { db } from './server/db';
import { users, userSubscriptions, creatorProfiles } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkDb() {
  try {
    // Get all users
    const allUsers = await db.select().from(users).limit(20);

    console.log('\n=== ALL USERS ===');
    console.log(`Found ${allUsers.length} users\n`);

    for (const user of allUsers) {
      // Get profile
      const profile = await db.query.creatorProfiles.findFirst({
        where: eq(creatorProfiles.userId, user.id),
      });

      // Get subscription
      const sub = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, user.id),
      });

      console.log(`User ID: ${user.id}`);
      console.log(`  Email: ${user.email || 'none'}`);
      console.log(`  Username: ${user.username || 'none'}`);
      console.log(`  Profile: ${profile ? `${profile.platform}/@${profile.handle}` : 'none'}`);
      console.log(`  Subscription: ${sub ? `${sub.tierId} (${sub.status})` : 'free (default)'}`);
      console.log(`  Created: ${user.createdAt || 'unknown'}`);
      console.log('---\n');
    }

    console.log('=== Which userId do you want to upgrade? ===');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Check failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkDb();
