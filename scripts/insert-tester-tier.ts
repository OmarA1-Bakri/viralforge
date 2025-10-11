import { db } from '../server/db';
import { subscriptionTiers } from '../shared/schema';

async function insertTesterTier() {
  try {
    const result = await db.insert(subscriptionTiers).values({
      id: 'tester',
      name: 'tester',
      displayName: 'Tester Crew',
      description: 'Full access for testing - Pro tier features',
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        'Everything in Pro Crew',
        'Full testing access',
        'To provide debugging information please email: info@viralforgeai.co.uk'
      ],
      limits: {
        videoAnalysis: -1,
        contentGeneration: -1,
        trendBookmarks: -1,
        videoClips: 120,
        scheduledAnalysis: 'weekly',
        roastMode: true,
        advancedAnalytics: true,
        audienceInsights: true
      },
      isActive: true,
      sortOrder: -1
    }).onConflictDoNothing().returning();

    if (result.length > 0) {
      console.log('✅ Tester tier inserted successfully:', result[0]);
    } else {
      console.log('ℹ️  Tester tier already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting tester tier:', error);
    process.exit(1);
  }
}

insertTesterTier();
