import { db } from './server/db';
import { creatorProfiles } from './shared/schema';
import { eq } from 'drizzle-orm';

async function clear() {
  const profile = await db.query.creatorProfiles.findFirst({
    where: eq(creatorProfiles.userId, 'a0e21f11-a4ba-4a65-852d-110a98302f51'),
  });

  if (profile) {
    const lastAnalyzed = profile.lastAnalyzedAt;
    console.log('Last analyzed:', lastAnalyzed);
    
    if (lastAnalyzed) {
      const daysSince = (Date.now() - new Date(lastAnalyzed).getTime()) / (1000 * 60 * 60 * 24);
      console.log('Days since last analysis:', daysSince.toFixed(2));
      
      if (daysSince < 7) {
        console.log('\n⚠️  Rate limit active - setting lastAnalyzedAt to 8 days ago');
        
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
        await db.update(creatorProfiles)
          .set({ lastAnalyzedAt: eightDaysAgo })
          .where(eq(creatorProfiles.id, profile.id));
        
        console.log('✅ Rate limit cleared - you can now analyze');
      } else {
        console.log('✅ No rate limit - you can analyze');
      }
    } else {
      console.log('✅ Never analyzed - you can analyze');
    }
  } else {
    console.log('❌ No profile found');
  }
  
  process.exit(0);
}

clear();
