import type { Express } from "express";
import type Stripe from "stripe";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { stripe } from "../lib/stripe";
import express from "express";

export function registerWebhookRoutes(app: Express) {
  // Stripe webhook endpoint - must use raw body
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];

      if (!sig) {
        console.error("⚠️  Webhook signature missing");
        return res.status(400).send("Webhook signature missing");
      }

      let event: Stripe.Event;

      try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error("⚠️  STRIPE_WEBHOOK_SECRET not configured");
          return res.status(500).send("Webhook secret not configured");
        }

        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`✅ Received Stripe webhook: ${event.type}`);

      try {
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
            break;

          case "customer.subscription.created":
          case "customer.subscription.updated":
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
            break;

          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
            break;

          case "invoice.payment_succeeded":
            await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
            break;

          case "invoice.payment_failed":
            await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
            break;

          default:
            console.log(`ℹ️  Unhandled webhook event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (error) {
        console.error("❌ Error processing webhook:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}

/**
 * RevenueCat webhook endpoint
 * Handles subscription events from RevenueCat
 */
export function registerRevenueCatWebhook(app: Express) {
  app.post("/api/webhooks/revenuecat", express.json(), async (req, res) => {
    try {
      // Verify webhook signature
      const authHeader = req.headers.authorization;
      const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

      if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
        console.error("⚠️  RevenueCat webhook authentication failed");
        return res.status(401).send("Unauthorized");
      }

      const event = req.body;
      console.log(`✅ Received RevenueCat webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
        case "PRODUCT_CHANGE":
          await handleRevenueCatPurchase(event);
          break;

        case "CANCELLATION":
          await handleRevenueCatCancellation(event);
          break;

        case "EXPIRATION":
          await handleRevenueCatExpiration(event);
          break;

        case "BILLING_ISSUE":
          await handleRevenueCatBillingIssue(event);
          break;

        default:
          console.log(`ℹ️  Unhandled RevenueCat event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("❌ Error processing RevenueCat webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}

/**
 * Handle RevenueCat purchase events (initial purchase, renewal, product change)
 */
async function handleRevenueCatPurchase(event: any) {
  const { app_user_id, product_id, entitlement_ids, purchased_at_ms, expiration_at_ms } = event.event;

  console.log(`✅ Purchase event for user ${app_user_id}`);

  // Map product ID to tier
  let tierId = 'free';
  if (entitlement_ids?.includes('pro')) {
    tierId = 'pro';
  } else if (entitlement_ids?.includes('creator')) {
    tierId = 'creator';
  }

  // Map product ID to billing cycle
  const billingCycle = product_id?.includes('yearly') ? 'yearly' : 'monthly';

  await db.transaction(async (tx) => {
    // Deactivate any existing active subscriptions
    await tx.execute(sql`
      UPDATE user_subscriptions
      SET status = 'cancelled', auto_renew = false
      WHERE user_id = ${app_user_id} AND status = 'active'
    `);

    // Create or update subscription
    await tx.execute(sql`
      INSERT INTO user_subscriptions
      (user_id, tier_id, billing_cycle, revenuecat_product_id, status, expires_at, auto_renew)
      VALUES (
        ${app_user_id},
        ${tierId},
        ${billingCycle},
        ${product_id},
        'active',
        ${new Date(expiration_at_ms).toISOString()},
        true
      )
      ON CONFLICT (user_id, revenuecat_product_id)
      DO UPDATE SET
        status = 'active',
        expires_at = ${new Date(expiration_at_ms).toISOString()},
        auto_renew = true,
        updated_at = now()
    `);

    // Update user's subscription tier
    await tx.execute(sql`
      UPDATE users
      SET subscription_tier_id = ${tierId}
      WHERE id = ${app_user_id}
    `);
  });

  console.log(`✅ Subscription updated for user ${app_user_id} to tier ${tierId}`);
}

/**
 * Handle RevenueCat cancellation events
 */
async function handleRevenueCatCancellation(event: any) {
  const { app_user_id, expiration_at_ms } = event.event;

  console.log(`✅ Cancellation event for user ${app_user_id}`);

  await db.execute(sql`
    UPDATE user_subscriptions
    SET auto_renew = false,
        cancelled_at = now(),
        updated_at = now()
    WHERE user_id = ${app_user_id} AND status = 'active'
  `);

  console.log(`✅ Subscription cancelled for user ${app_user_id} (expires at ${new Date(expiration_at_ms).toISOString()})`);
}

/**
 * Handle RevenueCat expiration events
 */
async function handleRevenueCatExpiration(event: any) {
  const { app_user_id } = event.event;

  console.log(`✅ Expiration event for user ${app_user_id}`);

  await db.transaction(async (tx) => {
    // Mark subscription as expired
    await tx.execute(sql`
      UPDATE user_subscriptions
      SET status = 'expired',
          updated_at = now()
      WHERE user_id = ${app_user_id} AND status = 'active'
    `);

    // Downgrade user to free tier
    await tx.execute(sql`
      UPDATE users
      SET subscription_tier_id = 'free'
      WHERE id = ${app_user_id}
    `);
  });

  console.log(`✅ User ${app_user_id} downgraded to free tier after expiration`);
}

/**
 * Handle RevenueCat billing issue events
 */
async function handleRevenueCatBillingIssue(event: any) {
  const { app_user_id } = event.event;

  console.log(`⚠️  Billing issue for user ${app_user_id}`);

  await db.execute(sql`
    UPDATE user_subscriptions
    SET status = 'past_due',
        updated_at = now()
    WHERE user_id = ${app_user_id} AND status = 'active'
  `);

  console.log(`⚠️  Subscription marked as past_due for user ${app_user_id}`);
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const tierId = session.metadata?.tier_id;
  const billingCycle = session.metadata?.billing_cycle;

  if (!userId || !tierId || !billingCycle) {
    console.error("❌ Missing metadata in checkout session:", session.id);
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log(`✅ Checkout completed for user ${userId}, subscription ${subscriptionId}`);

  // Create or update subscription in database
  await db.transaction(async (tx) => {
    // Calculate expiry date
    const expiresAt = new Date();
    if (billingCycle === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Deactivate any existing active subscriptions
    await tx.execute(sql`
      UPDATE user_subscriptions
      SET status = 'cancelled', auto_renew = false
      WHERE user_id = ${userId} AND status = 'active'
    `);

    // Create new subscription
    await tx.execute(sql`
      INSERT INTO user_subscriptions
      (user_id, tier_id, billing_cycle, stripe_customer_id, stripe_subscription_id, status, expires_at, auto_renew)
      VALUES (${userId}, ${tierId}, ${billingCycle}, ${customerId}, ${subscriptionId}, 'active', ${expiresAt.toISOString()}, true)
    `);

    // Update user's subscription tier
    await tx.execute(sql`
      UPDATE users
      SET subscription_tier_id = ${tierId}
      WHERE id = ${userId}
    `);
  });

  console.log(`✅ Subscription created in database for user ${userId}`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  const tierId = subscription.metadata?.tier_id;

  if (!userId || !tierId) {
    console.error("❌ Missing metadata in subscription:", subscription.id);
    return;
  }

  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  console.log(`✅ Subscription updated for user ${userId}: ${status}`);

  await db.transaction(async (tx) => {
    // Map Stripe status to our status
    let dbStatus: string;
    switch (status) {
      case "active":
      case "trialing":
        dbStatus = cancelAtPeriodEnd ? "cancelled" : "active";
        break;
      case "past_due":
      case "unpaid":
        dbStatus = "past_due";
        break;
      case "canceled":
      case "incomplete_expired":
        dbStatus = "cancelled";
        break;
      default:
        dbStatus = "active";
    }

    // Update subscription
    await tx.execute(sql`
      UPDATE user_subscriptions
      SET status = ${dbStatus},
          expires_at = ${currentPeriodEnd.toISOString()},
          auto_renew = ${!cancelAtPeriodEnd},
          updated_at = now()
      WHERE stripe_subscription_id = ${subscription.id}
    `);

    // If subscription is no longer active, downgrade user to free tier
    if (dbStatus === "cancelled" && !cancelAtPeriodEnd) {
      await tx.execute(sql`
        UPDATE users
        SET subscription_tier_id = 'free'
        WHERE id = ${userId}
      `);
    }
  });

  console.log(`✅ Subscription status updated to ${dbStatus} for user ${userId}`);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error("❌ Missing user_id in subscription:", subscription.id);
    return;
  }

  console.log(`✅ Subscription deleted for user ${userId}`);

  await db.transaction(async (tx) => {
    // Mark subscription as cancelled
    await tx.execute(sql`
      UPDATE user_subscriptions
      SET status = 'cancelled',
          auto_renew = false,
          cancelled_at = now(),
          updated_at = now()
      WHERE stripe_subscription_id = ${subscription.id}
    `);

    // Downgrade user to free tier
    await tx.execute(sql`
      UPDATE users
      SET subscription_tier_id = 'free'
      WHERE id = ${userId}
    `);
  });

  console.log(`✅ User ${userId} downgraded to free tier`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  console.log(`✅ Invoice paid for subscription ${subscriptionId}`);

  // Extend subscription expiry date
  const periodEnd = new Date((invoice.lines.data[0]?.period?.end || 0) * 1000);

  await db.execute(sql`
    UPDATE user_subscriptions
    SET expires_at = ${periodEnd.toISOString()},
        status = 'active',
        updated_at = now()
    WHERE stripe_subscription_id = ${subscriptionId}
  `);

  console.log(`✅ Subscription ${subscriptionId} renewed until ${periodEnd.toISOString()}`);
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  console.log(`⚠️  Payment failed for subscription ${subscriptionId}`);

  // Mark subscription as past_due
  await db.execute(sql`
    UPDATE user_subscriptions
    SET status = 'past_due',
        updated_at = now()
    WHERE stripe_subscription_id = ${subscriptionId}
  `);

  // TODO: Send email notification to user about failed payment
  console.log(`⚠️  Subscription ${subscriptionId} marked as past_due`);
}
