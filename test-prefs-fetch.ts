import { db } from './server/db';
import { userPreferences } from './shared/schema';
import { eq } from 'drizzle-orm';

async function test() {
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, 'a0e21f11-a4ba-4a65-852d-110a98302f51'),
  });

  console.log('=== USER PREFERENCES FETCH TEST ===');
  console.log('Status:', prefs ? '✅ SUCCESS' : '❌ FAILED');

  if (prefs) {
    console.log('\nPreferences Data:');
    console.log('  Niche:', prefs.niche);
    console.log('  Platforms:', prefs.platforms);
    console.log('  Content Style:', prefs.contentStyle);
    console.log('  Target Audience:', prefs.targetAudience);
    console.log('  Preferred Categories:', prefs.preferredCategories);
  }

  process.exit(0);
}

test();
