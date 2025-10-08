// @ts-nocheck
import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { createCheckoutSession, cancelStripeSubscription, createPortalSession } from "../lib/stripe";
import type { AuthRequest } from "../auth";

export function registerSubscriptionRoutes(app: Express) {

  // Get all subscription tiers
  app.get("/api/subscriptions/tiers", async (_req, res) => {
    try {
      const tiers = await db.execute(sql`
        SELECT * FROM subscription_tiers
        WHERE is_active = true
        ORDER BY sort_order ASC
      `);

      res.json({
        success: true,
        tiers: tiers.rows
      });
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch subscription tiers"
      });
    }
  });

  // Get user's current subscription
  app.get("/api/subscriptions/current", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user.id;

      // First check if subscription tables exist
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_subscriptions'
        ) as table_exists
      `);

      // If tables don't exist yet, return free tier
      if (!tableCheck.rows[0]?.table_exists) {
        console.log('📋 Subscription tables not yet created, returning free tier');
        return res.json({
          success: true,
          subscription: {
            tier_id: 'free',
            tier_name: 'free',
            tier_display_name: 'Free',
            status: 'active',
            billing_cycle: 'monthly',
            features: ['3 video analyses per month', '5 AI-generated content ideas', '10 trend bookmarks'],
            limits: {
              videoAnalysis: 3,
              contentGeneration: 5,
              trendBookmarks: 10,
              videoClips: 0
            }
          }
        });
      }

      // Get user's subscription with tier details
      const subscription = await db.execute(sql`
        SELECT
          us.*,
          st.name as tier_name,
          st.display_name as tier_display_name,
          st.description as tier_description,
          st.price_monthly,
          st.price_yearly,
          st.features,
          st.limits
        FROM user_subscriptions us
        JOIN subscription_tiers st ON us.tier_id = st.id
        WHERE us.user_id = ${userId}
          AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `);

      if (subscription.rows.length === 0) {
        // Return free tier as default
        const freeTier = await db.execute(sql`
          SELECT * FROM subscription_tiers WHERE name = 'free'
        `);

        if (freeTier.rows.length === 0) {
          // Fallback if free tier not in database
          return res.json({
            success: true,
            subscription: {
              tier_id: 'free',
              tier_name: 'free',
              tier_display_name: 'Free',
              status: 'active',
              billing_cycle: 'monthly',
              features: ['3 video analyses per month', '5 AI-generated content ideas', '10 trend bookmarks'],
              limits: {
                videoAnalysis: 3,
                contentGeneration: 5,
                trendBookmarks: 10,
                videoClips: 0
              }
            }
          });
        }

        return res.json({
          success: true,
          subscription: {
            tier_id: 'free',
            status: 'active',
            billing_cycle: 'monthly',
            ...freeTier.rows[0]
          }
        });
      }

      res.json({
        success: true,
        subscription: subscription.rows[0]
      });
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch subscription"
      });
    }
  });

  // Get user's usage stats
  app.get("/api/subscriptions/usage", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user.id;
      const currentPeriod = new Date();
      currentPeriod.setDate(1); // First day of current month
      currentPeriod.setHours(0, 0, 0, 0);

      const usage = await db.execute(sql`
        SELECT feature, SUM(count) as total_count
        FROM user_usage
        WHERE user_id = ${userId}
          AND period_start = ${currentPeriod.toISOString()}
        GROUP BY feature
      `);

      // Get user's limits from subscription
      const subscription = await db.execute(sql`
        SELECT st.limits
        FROM user_subscriptions us
        JOIN subscription_tiers st ON us.tier_id = st.id
        WHERE us.user_id = ${userId}
          AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `);

      const limits = subscription.rows[0]?.limits || {
        videoAnalysis: 3,
        contentGeneration: 5,
        trendBookmarks: 10,
        videoClips: 0
      };

      const usageMap: Record<string, number> = {};
      usage.rows.forEach((row: any) => {
        usageMap[row.feature] = parseInt(row.total_count);
      });

      res.json({
        success: true,
        usage: usageMap,
        limits,
        period: {
          start: currentPeriod.toISOString(),
          end: new Date(currentPeriod.getFullYear(), currentPeriod.getMonth() + 1, 0).toISOString()
        }
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch usage statistics"
      });
    }
  });

  // Track feature usage
  app.post("/api/subscriptions/track-usage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user?.id;
      const { feature, count = 1 } = req.body;

      if (!feature) {
        return res.status(400).json({
          success: false,
          error: "Feature name is required"
        });
      }

      const currentPeriod = new Date();
      currentPeriod.setDate(1);
      currentPeriod.setHours(0, 0, 0, 0);

      await db.execute(sql`
        INSERT INTO user_usage (user_id, feature, count, period_start)
        VALUES (${userId}, ${feature}, ${count}, ${currentPeriod.toISOString()})
        ON CONFLICT (user_id, feature, period_start)
        DO UPDATE SET count = user_usage.count + EXCLUDED.count
      `);

      res.json({
        success: true,
        message: "Usage tracked successfully"
      });
    } catch (error) {
      console.error("Error tracking usage:", error);
      res.status(500).json({
        success: false,
        error: "Failed to track usage"
      });
    }
  });

  // Create Stripe checkout session for subscription
  app.post("/api/subscriptions/create-checkout", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user?.id;
      const { tierId, billingCycle = 'monthly' } = req.body;

      if (!tierId) {
        return res.status(400).json({
          success: false,
          error: "Tier ID is required"
        });
      }

      // Only allow paid tiers through Stripe
      if (tierId === 'free') {
        return res.status(400).json({
          success: false,
          error: "Free tier does not require checkout"
        });
      }

      // Verify tier exists and get pricing
      const tier = await db.execute(sql`
        SELECT * FROM subscription_tiers WHERE id = ${tierId} AND is_active = true
      `);

      if (tier.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invalid subscription tier"
        });
      }

      const tierData = tier.rows[0] as any;
      const priceInCents = billingCycle === 'monthly' ? tierData.price_monthly : tierData.price_yearly;

      // Get user email if available
      const user = await db.execute(sql`
        SELECT username FROM users WHERE id = ${userId}
      `);

      const baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Create Stripe checkout session
      const session = await createCheckoutSession({
        userId,
        tierId,
        billingCycle: billingCycle as 'monthly' | 'yearly',
        priceInCents,
        email: user.rows[0]?.username, // Use username as email for now
        successUrl: `${frontendUrl}/settings?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${frontendUrl}/settings?canceled=true`,
      });

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create checkout session"
      });
    }
  });

  // Create Stripe customer portal session
  app.post("/api/subscriptions/create-portal", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user?.id;

      // Get user's Stripe customer ID
      const subscription = await db.execute(sql`
        SELECT stripe_customer_id
        FROM user_subscriptions
        WHERE user_id = ${userId} AND status IN ('active', 'cancelled')
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const customerId = subscription.rows[0]?.stripe_customer_id;

      if (!customerId) {
        return res.status(404).json({
          success: false,
          error: "No active subscription found"
        });
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Create portal session
      const session = await createPortalSession(customerId, `${frontendUrl}/settings`);

      res.json({
        success: true,
        url: session.url
      });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create portal session"
      });
    }
  });

  // Cancel subscription
  app.post("/api/subscriptions/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user?.id;

      // Get current subscription
      const currentSub = await db.execute(sql`
        SELECT stripe_subscription_id, expires_at
        FROM user_subscriptions
        WHERE user_id = ${userId} AND status = 'active'
        LIMIT 1
      `);

      if (currentSub.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No active subscription found"
        });
      }

      const stripeSubscriptionId = currentSub.rows[0]?.stripe_subscription_id;

      // Cancel in Stripe (cancel at period end)
      if (stripeSubscriptionId) {
        await cancelStripeSubscription(stripeSubscriptionId, true);
      }

      // Mark subscription as cancelled in database but keep active until expiry
      await db.execute(sql`
        UPDATE user_subscriptions
        SET status = 'cancelled', cancelled_at = now(), auto_renew = false
        WHERE user_id = ${userId} AND status = 'active'
      `);

      const expiresAt = currentSub.rows[0]?.expires_at;
      const message = expiresAt
        ? `Subscription cancelled. You'll retain access until ${new Date(expiresAt).toLocaleDateString()}`
        : "Subscription cancelled successfully";

      res.json({
        success: true,
        message,
        retainAccessUntil: expiresAt
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({
        success: false,
        error: "Failed to cancel subscription"
      });
    }
  });

  // Check if user can use a feature
  app.post("/api/subscriptions/check-limit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user?.id;
      const { feature } = req.body;

      if (!feature) {
        return res.status(400).json({
          success: false,
          error: "Feature name is required"
        });
      }

      // Get current usage and limits
      const currentPeriod = new Date();
      currentPeriod.setDate(1);
      currentPeriod.setHours(0, 0, 0, 0);

      const usage = await db.execute(sql`
        SELECT SUM(count) as total
        FROM user_usage
        WHERE user_id = ${userId}
          AND feature = ${feature}
          AND period_start = ${currentPeriod.toISOString()}
      `);

      const subscription = await db.execute(sql`
        SELECT st.limits
        FROM user_subscriptions us
        JOIN subscription_tiers st ON us.tier_id = st.id
        WHERE us.user_id = ${userId}
          AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `);

      const limits = subscription.rows[0]?.limits || {
        videoAnalysis: 3,
        contentGeneration: 5,
        trendBookmarks: 10,
        videoClips: 0
      };

      const currentUsage = parseInt(usage.rows[0]?.total || '0');
      const limit = limits[feature as keyof typeof limits];
      const canUse = limit === -1 || currentUsage < limit;

      res.json({
        success: true,
        canUse,
        currentUsage,
        limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - currentUsage)
      });
    } catch (error) {
      console.error("Error checking feature limit:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check feature limit"
      });
    }
  });
}


/**
 * Sync RevenueCat subscription with backend (SERVER-SIDE VALIDATION)
 * SECURITY: Validates subscription with RevenueCat API - NEVER trust client data
 */
export function registerRevenueCatSyncRoute(app: Express) {
  app.post("/api/subscriptions/sync-revenuecat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      const userId = req.user?.id;

      console.log(`🔄 Syncing RevenueCat subscription for user ${userId}`);

      // ✅ CRITICAL SECURITY: Validate with RevenueCat API, not client data
      const revenueCatSecretKey = process.env.REVENUECAT_SECRET_KEY;

      if (!revenueCatSecretKey) {
        console.error('❌ REVENUECAT_SECRET_KEY not configured');
        return res.status(500).json({
          success: false,
          error: 'RevenueCat configuration error'
        });
      }

      // Fetch subscriber info from RevenueCat API
      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${revenueCatSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error(`❌ RevenueCat API error: ${response.status} ${response.statusText}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to validate subscription with RevenueCat'
        });
      }

      const data = await response.json();
      const activeEntitlements = data.subscriber?.entitlements || {};

      // ✅ Determine tier from SERVER-validated entitlements
      let tierId = 'starter';
      let productIdentifier = null;
      let expiresDate = null;
      const now = Date.now();

      // Check entitlements in priority order: studio > pro > creator
      if (activeEntitlements.studio?.expires_date &&
          new Date(activeEntitlements.studio.expires_date).getTime() > now) {
        tierId = 'studio';
        productIdentifier = activeEntitlements.studio.product_identifier;
        expiresDate = activeEntitlements.studio.expires_date;
      } else if (activeEntitlements.pro?.expires_date &&
                 new Date(activeEntitlements.pro.expires_date).getTime() > now) {
        tierId = 'pro';
        productIdentifier = activeEntitlements.pro.product_identifier;
        expiresDate = activeEntitlements.pro.expires_date;
      } else if (activeEntitlements.creator?.expires_date &&
                 new Date(activeEntitlements.creator.expires_date).getTime() > now) {
        tierId = 'creator';
        productIdentifier = activeEntitlements.creator.product_identifier;
        expiresDate = activeEntitlements.creator.expires_date;
      }

      // Determine billing cycle from validated product ID
      const billingCycle = productIdentifier?.includes('yearly') ? 'yearly' : 'monthly';

      // Check if tables exist
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'user_subscriptions'
        ) as table_exists
      `);

      if (!tableCheck.rows[0]?.table_exists) {
        console.log('⚠️  Subscription tables not yet created, skipping sync');
        return res.json({
          success: true,
          message: 'Subscription tables not ready, sync skipped',
          tier: tierId
        });
      }

      await db.transaction(async (tx) => {
        // Deactivate any existing active subscriptions
        await tx.execute(sql`
          UPDATE user_subscriptions
          SET status = 'cancelled', auto_renew = false
          WHERE user_id = ${userId} AND status = 'active'
        `);

        // If user has an active entitlement, create subscription record
        if (tierId !== 'starter' && expiresDate) {
          await tx.execute(sql`
            INSERT INTO user_subscriptions
            (user_id, tier_id, billing_cycle, revenuecat_product_id, status, expires_at, auto_renew)
            VALUES (
              ${userId},
              ${tierId},
              ${billingCycle},
              ${productIdentifier},
              'active',
              ${new Date(expiresDate).toISOString()},
              true
            )
            ON CONFLICT (user_id, revenuecat_product_id)
            DO UPDATE SET
              status = 'active',
              expires_at = ${new Date(expiresDate).toISOString()},
              auto_renew = true,
              updated_at = now()
          `);
        }

        // Update user's subscription tier
        await tx.execute(sql`
          UPDATE users
          SET subscription_tier_id = ${tierId}
          WHERE id = ${userId}
        `);
      });

      console.log(`✅ Synced subscription for user ${userId} to tier ${tierId} (SERVER-VALIDATED)`);

      res.json({
        success: true,
        message: 'Subscription synced successfully',
        tier: tierId
      });
    } catch (error) {
      console.error("Error syncing RevenueCat subscription:", error);
      res.status(500).json({
        success: false,
        error: "Failed to sync subscription"
      });
    }
  });
}
