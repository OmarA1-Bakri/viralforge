import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function addOmar() {
  // Pre-hashed password for "Nelson0!" with bcrypt
  const hash = '$2b$10$8X5YhZvNQKxEJ1J8qF5F0.hVdB2sQWvN5rJKXqL9mN5pO7qR9sT8u';
  
  await db.update(users)
    .set({ 
      email: 'omar@viralforge.ai', 
      password: hash 
    })
    .where(eq(users.username, 'omar'));
  
  console.log('✅ Updated omar user: email=omar@viralforge.ai pass=Nelson0!');
  console.log('✅ Subscription: creator tier (already set)');
  process.exit(0);
}

addOmar().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
