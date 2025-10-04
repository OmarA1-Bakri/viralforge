import { db } from "../db.js";
import { subscriptionTiers } from "../../shared/schema.js";

const tiers = [
  {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started',
    priceMonthly: 0,
    priceYearly: 0,
    features: ['3 video analyses per month', '5 AI-generated content ideas', '10 trend bookmarks', 'Basic analytics'],
    limits: { videoAnalysis: 3, contentGeneration: 5, trendBookmarks: 10, videoClips: 0 },
    sortOrder: 1
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    description: 'For serious content creators',
    priceMonthly: 1499,
    priceYearly: 14990,
    features: ['Unlimited video analyses', 'Unlimited AI content generation', 'Unlimited trend bookmarks', 'Advanced analytics dashboard', 'Video clip generation (50/month)', 'Priority support'],
    limits: { videoAnalysis: -1, contentGeneration: -1, trendBookmarks: -1, videoClips: 50 },
    sortOrder: 2
  },
  {
    id: 'creator',
    name: 'creator',
    displayName: 'Creator',
    description: 'For professional creators and agencies',
    priceMonthly: 4999,
    priceYearly: 49990,
    features: ['Everything in Pro', 'Unlimited video clips', 'Team collaboration tools', 'API access', 'Custom integrations', 'Dedicated support'],
    limits: { videoAnalysis: -1, contentGeneration: -1, trendBookmarks: -1, videoClips: -1 },
    sortOrder: 3
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
