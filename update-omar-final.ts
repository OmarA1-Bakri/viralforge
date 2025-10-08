import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function update() {
  const correctHash = '$2b$12$mbH468CZ5u91LLlg/AvX9OUekREEETOMZRr1PfCh9feruWc41E5f2';
  
  await db.update(users)
    .set({ 
      email: 'omar@viralforge.ai',
      password: correctHash 
    })
    .where(eq(users.username, 'omar'));
  
  console.log('✅ Updated omar user');
  console.log('  Username: omar');
  console.log('  Password: Nelson0!');
  console.log('  Email: omar@viralforge.ai');
  console.log('  Tier: creator');
  
  process.exit(0);
}

update();
