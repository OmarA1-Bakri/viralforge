/**
 * Shared Subscription Tier Constants
 *
 * Single source of truth for subscription tiers across the entire application.
 * Ensures type safety and consistency between frontend, backend, and database.
 */

/**
 * All valid subscription tier identifiers
 * Must match subscription_tiers.id column in database
 */
export const SUBSCRIPTION_TIERS = ['starter', 'pro', 'creator', 'studio'] as const;

/**
 * Type-safe subscription tier
 */
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

/**
 * Type guard to validate tier at runtime
 *
 * @param tier - String to validate
 * @returns Type predicate indicating if tier is valid
 *
 * @example
 * if (isValidTier(userInput)) {
 *   // userInput is narrowed to SubscriptionTier type
 *   const tier: SubscriptionTier = userInput;
 * }
 */
export function isValidTier(tier: string): tier is SubscriptionTier {
  return SUBSCRIPTION_TIERS.includes(tier as SubscriptionTier);
}

/**
 * Normalize and validate tier string
 *
 * @param tier - Raw tier string from user input
 * @param defaultTier - Fallback tier if validation fails
 * @returns Valid, normalized tier identifier
 *
 * @example
 * const tier = normalizeTier(' STARTER '); // Returns 'starter'
 * const tier = normalizeTier('invalid');   // Returns 'starter' (default)
 * const tier = normalizeTier('pro');       // Returns 'pro'
 */
export function normalizeTier(
  tier: string,
  defaultTier: SubscriptionTier = 'starter'
): SubscriptionTier {
  const normalized = tier.trim().toLowerCase();
  return isValidTier(normalized) ? normalized : defaultTier;
}
