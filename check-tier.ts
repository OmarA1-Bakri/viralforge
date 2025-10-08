import { db } from './server/db';
import { eq } from 'drizzle-orm';
import { userSubscriptions } from '@shared/schema';

async function checkTier() {
  const userId = 'a0e21f11-a4ba-4a65-852d-110a98302f51';
  
  const sub = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
  });

  console.log('Current subscription:', sub);
  process.exit(0);
}

checkTier();
