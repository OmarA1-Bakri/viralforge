import { hashPassword } from './server/auth';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function update() {
  const newPassword = 'Nelson01';
  const hash = await hashPassword(newPassword);
  
  await db.update(users)
    .set({ password: hash })
    .where(eq(users.username, 'omar'));
  
  console.log('✅ Password updated');
  console.log('  Username: omar');
  console.log('  Password: Nelson01');
  process.exit(0);
}

update();
