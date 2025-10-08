-- Migration: Update subscription tiers to new pricing structure
-- Date: 2025-10-08
-- Changes:
--   1. Rename 'free' tier to 'starter'
--   2. Add new 'creator' mid-tier at $19/mo
--   3. Update 'pro' tier to $39/mo with new features
--   4. Rename old 'creator' tier to 'studio' at $99/mo
--   5. Update limits schema to support new features

-- Step 1: Update subscription_tiers table to support new limit fields
-- (Schema changes already handled in shared/schema.ts)

-- Step 2: Migrate existing 'free' tier users to 'starter'
UPDATE user_subscriptions
SET tier_id = 'starter'
WHERE tier_id = 'free';

-- Step 3: Migrate existing 'pro' tier users ($14.99) to new 'creator' tier ($19)
-- Grandfather them at better pricing temporarily
UPDATE user_subscriptions
SET tier_id = 'creator'
WHERE tier_id = 'pro'
  AND status IN ('active', 'cancelled');

-- Step 4: Migrate existing 'creator' tier users ($49.99) to new 'studio' tier ($99)
-- They get upgraded features (team seats, API) at their old price
UPDATE user_subscriptions
SET tier_id = 'studio'
WHERE tier_id = 'creator'
  AND status IN ('active', 'cancelled');

-- Step 5: Delete old tier definitions (will be re-seeded with new values)
DELETE FROM subscription_tiers WHERE id IN ('free', 'pro', 'creator');

-- Step 6: Insert new tier definitions
-- Run: npm run db:seed-tiers after this migration

-- Migration Notes:
-- - Existing 'free' users → 'starter' (same tier, renamed)
-- - Existing 'pro' users ($14.99) → 'creator' ($19) - slight upgrade path
-- - Existing 'creator' users ($49.99) → 'studio' ($99) - major feature upgrade, grandfathered pricing
-- - New 'pro' tier ($39) is available for new signups
