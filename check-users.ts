import './server/config/env';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function checkUsers() {
  try {
    const result = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('Users table columns:', result.rows.map(r => r.column_name).join(', '));
    
    // Find omar user
    const users = await db.execute(sql`SELECT * FROM users LIMIT 5`);
    console.log('\nSample users:', users.rows.map(u => ({ 
      id: u.id, 
      username: u.username,
      tier: u.tier 
    })));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkUsers();
