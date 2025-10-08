import { db } from './server/db';
import { users, userPreferences } from './shared/schema';
import { eq } from 'drizzle-orm';

async function investigate() {
  // Check omar user's preferences
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, 'a0e21f11-a4ba-4a65-852d-110a98302f51'),
  });

  console.log('=== USER PREFERENCES ===');
  console.log('User ID:', 'a0e21f11-a4ba-4a65-852d-110a98302f51');
  console.log('Preferences:', prefs);
  console.log('\nNiche:', prefs?.niche);
  console.log('Platforms:', prefs?.platforms);
  
  process.exit(0);
}

investigate();
