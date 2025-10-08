import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  await db.update(users)
    .set({ email: 'omar@viralforge.ai' })
    .where(eq(users.username, 'omar'));
  
  const user = await db.query.users.findFirst({
    where: eq(users.username, 'omar'),
  });
  
  console.log('✅ Updated:');
  console.log('  Username:', user?.username);
  console.log('  Email:', user?.email);
  
  process.exit(0);
}

fix();
