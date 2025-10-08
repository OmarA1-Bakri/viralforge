import { db } from "../db.js";
import { subscriptionTiers } from "../../shared/schema.js";

const tiers = [
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter Crew',
    description: 'Your intern - limited tasks per month',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '5 analyses per month',
      '10 AI-generated ideas',
      'Basic viral score history',
      'Your content creation intern'
    ],
    limits: { 
      videoAnalysis: 5,
      contentGeneration: 10,
      trendBookmarks: 15,
      videoClips: 0,
      scheduledAnalysis: false,
      roastMode: false,
      advancedAnalytics: false
    },
    sortOrder: 1
  },
  {
    id: 'creator',
    name: 'creator',
    displayName: 'Creator Crew',
    description: 'Your dedicated content creator',
    priceMonthly: 1900,
    priceYearly: 19000,
    features: [
      'Unlimited analyses & ideas',
      '40 video clips per month',
      'Advanced analytics dashboard',
      'Your AI content team',
      'Standard email support'
    ],
    limits: { 
      videoAnalysis: -1,
      contentGeneration: -1,
      trendBookmarks: -1,
      videoClips: 40,
      scheduledAnalysis: false,
      roastMode: false,
      advancedAnalytics: true
    },
    sortOrder: 2
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro Crew',
    description: 'Your proactive growth team with agentic automation',
    priceMonthly: 3900,
    priceYearly: 39000,
    features: [
      'Everything in Creator Crew',
      '120 video clips per month',
      'Scheduled auto-analysis (strategist agent)',
      'Set-it-and-forget-it autonomy',
      'Roast Mode enabled',
      'Priority support'
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
    sortOrder: 3
  },
  {
    id: 'studio',
    name: 'studio',
    displayName: 'Studio Crew',
    description: 'Your full-scale AI agency',
    priceMonthly: 9900,
    priceYearly: 99000,
    features: [
      'Everything in Pro Crew',
      'Unlimited video clips',
      'Daily auto-analysis',
      '3 human "Director" seats',
      'API access for programmatic goals',
      'Dedicated account manager'
    ],
    limits: { 
      videoAnalysis: -1,
      contentGeneration: -1,
      trendBookmarks: -1,
      videoClips: -1,
      scheduledAnalysis: 'daily',
      roastMode: true,
      advancedAnalytics: true,
      audienceInsights: true,
      teamSeats: 3,
      apiAccess: true
    },
    sortOrder: 4
  }
];

async function seed() {
  try {
    for (const tier of tiers) {
      await db.insert(subscriptionTiers).values(tier).onConflictDoNothing();
    }
    console.log('✅ Subscription tiers seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tiers:', error);
    process.exit(1);
  }
}

seed();
