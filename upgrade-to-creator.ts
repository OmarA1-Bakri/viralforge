import { db } from './server/db';
import { users, userSubscriptions } from './shared/schema';
import { eq } from 'drizzle-orm';

async function upgradeToCreator() {
  try {
    // Find the user with username "omar"
    const omarUser = await db.query.users.findFirst({
      where: eq(users.username, 'omar'),
    });

    if (!omarUser) {
      console.log('❌ User "omar" not found');
      process.exit(1);
    }

    const userId = omarUser.id;
    console.log(`\nUpgrading user ${userId} (username: ${omarUser.username}) to creator tier...`);

    // Check if subscription exists
    const existingSub = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    if (existingSub) {
      // Update existing subscription
      await db
        .update(userSubscriptions)
        .set({
          tierId: 'creator',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        })
        .where(eq(userSubscriptions.userId, userId));

      console.log('✅ Updated existing subscription to creator tier');
    } else {
      // Create new subscription
      await db.insert(userSubscriptions).values({
        userId,
        tierId: 'creator',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      });

      console.log('✅ Created new creator tier subscription');
    }

    // Verify
    const updated = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });
    console.log('Updated subscription:', updated);

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Upgrade failed:', err.message);
    process.exit(1);
  }
}

upgradeToCreator();
