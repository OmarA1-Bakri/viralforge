import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function verify() {
  const user = await db.query.users.findFirst({
    where: eq(users.username, 'omar'),
  });

  console.log('Username:', user?.username);
  console.log('Email:', user?.email);
  console.log('Password hash exists:', !!user?.password);
  console.log('Password hash:', user?.password?.substring(0, 20) + '...');
  
  process.exit(0);
}

verify();
