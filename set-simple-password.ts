import { hashPassword } from './server/auth';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function update() {
  const password = 'password';
  const hash = await hashPassword(password);
  
  await db.update(users)
    .set({ password: hash })
    .where(eq(users.username, 'omar'));
  
  console.log('✅ Password updated to: password');
  process.exit(0);
}

update();
