import type { Express } from "express";
import type Stripe from "stripe";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { stripe } from "../lib/stripe";
import express from "express";
import * as crypto from "crypto";
import { webhookLogger } from "../lib/webhookLogger";

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

      const eventId = event.id;

      // Check for replay attack (idempotency)
      if (await isEventProcessed(eventId, 'stripe')) {
        webhookLogger.warn('Duplicate event (already processed)', { source: 'stripe', eventId, eventType: event.type });
        return res.json({ received: true, duplicate: true });
      }

      webhookLogger.info('Webhook received', { source: 'stripe', eventType: event.type, eventId });

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
            webhookLogger.warn('Unhandled event type', { source: 'stripe', eventType: event.type, eventId });
        }

        // Mark event as processed to prevent replay
        await markEventProcessed(eventId, event.type, 'stripe');

        res.json({ received: true });
      } catch (error) {
        webhookLogger.error("Webhook processing failed", error, { source: 'stripe' });
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}

/**
 * Verify RevenueCat webhook signature
 * SECURITY: Prevents unauthorized webhook calls
 * Uses constant-time comparison to prevent timing attacks
 */
function verifyRevenueCatSignature(body: Buffer, signature: string): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!secret) {
    webhookLogger.error('REVENUECAT_WEBHOOK_SECRET not configured', undefined, { source: 'revenuecat' });
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    // timingSafeEqual throws if lengths don't match
    webhookLogger.security('Signature verification failed', { source: 'revenuecat', error: String(error) });
    return false;
  }
}

/**
 * Check if webhook event has already been processed (idempotency)
 * Prevents replay attacks
 */
async function isEventProcessed(eventId: string, source: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT id FROM processed_webhook_events
      WHERE event_id = ${eventId} AND source = ${source}
      LIMIT 1
    `);
    return result.rows.length > 0;
  } catch (error) {
    webhookLogger.error('Cannot verify idempotency - failing closed', error, { source: source as any, eventId });
    return true; // FAIL CLOSED: Treat as duplicate when database unavailable (prevents replay attacks during outages)
  }
}

/**
 * Mark webhook event as processed
 */
async function markEventProcessed(eventId: string, eventType: string, source: string): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO processed_webhook_events (event_id, event_type, source)
      VALUES (${eventId}, ${eventType}, ${source})
      ON CONFLICT (event_id) DO NOTHING
    `);
  } catch (error) {
    webhookLogger.warn('Error marking event as processed (non-fatal)', { source: source as any, eventId, eventType, error: String(error) });
    // Non-fatal - event was already processed successfully
  }
}

/**
 * RevenueCat webhook endpoint
 * Handles subscription events from RevenueCat
 * SECURITY: Implements replay attack prevention via event ID tracking
 */
export function registerRevenueCatWebhook(app: Express) {
  app.post("/api/webhooks/revenuecat",
    express.raw({ type: 'application/json' }),
    async (req, res) => {
    try {
      const signature = req.headers['x-revenuecat-signature'] as string;

      // Verify webhook signature
      if (!verifyRevenueCatSignature(req.body, signature)) {
        webhookLogger.security('Invalid webhook signature', { source: 'revenuecat' });
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = JSON.parse(req.body.toString());
      const eventId = event.id || event.event?.id;

      if (!eventId) {
        webhookLogger.error('Missing event ID in webhook', undefined, { source: 'revenuecat', eventType: event.type });
        return res.status(400).json({ error: 'Missing event ID' });
      }

      // Check for replay attack (idempotency)
      if (await isEventProcessed(eventId, 'revenuecat')) {
        webhookLogger.warn('Duplicate event (already processed)', { source: 'revenuecat', eventId, eventType: event.type });
        return res.json({ received: true, duplicate: true });
      }

      webhookLogger.info('Webhook received', { source: 'revenuecat', eventType: event.type, eventId, userId: event.event?.app_user_id });

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
          webhookLogger.warn('Unhandled event type', { source: 'revenuecat', eventType: event.type, eventId });
      }

      // Mark event as processed to prevent replay
      await markEventProcessed(eventId, event.type, 'revenuecat');

      res.json({ received: true });
    } catch (error) {
      webhookLogger.error("Webhook processing failed", error, { source: 'revenuecat' });
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}

/**
 * RevenueCat webhook event structure
 */
interface RevenueCatEvent {
  id: string;
  type: string;
  event: {
    app_user_id: string;
    product_id?: string;
    entitlement_ids?: string[];
    purchased_at_ms?: number;
    expiration_at_ms?: number;
  };
}

/**
 * Handle RevenueCat purchase events (initial purchase, renewal, product change)
 */
async function handleRevenueCatPurchase(event: RevenueCatEvent): Promise<void> {
  const { app_user_id, product_id, entitlement_ids, purchased_at_ms, expiration_at_ms } = event.event;

  webhookLogger.info('Processing purchase event', { source: 'revenuecat', eventType: event.type, userId: app_user_id, productId: product_id });

  // Map product ID to tier (4-tier system: starter, creator, pro, studio)
  let tierId = 'starter';
  if (entitlement_ids?.includes('studio')) {
    tierId = 'studio';
  } else if (entitlement_ids?.includes('pro')) {
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

  webhookLogger.success('Subscription updated', { source: 'revenuecat', userId: app_user_id, tierId, billingCycle });
}

/**
 * Handle RevenueCat cancellation events
 */
async function handleRevenueCatCancellation(event: RevenueCatEvent): Promise<void> {
  const { app_user_id, expiration_at_ms } = event.event;

  webhookLogger.info('Processing cancellation event', { source: 'revenuecat', userId: app_user_id });

  await db.execute(sql`
    UPDATE user_subscriptions
    SET auto_renew = false,
        cancelled_at = now(),
        updated_at = now()
    WHERE user_id = ${app_user_id} AND status = 'active'
  `);

  webhookLogger.success('Subscription cancelled', { source: 'revenuecat', userId: app_user_id, expiresAt: expiration_at_ms ? new Date(expiration_at_ms).toISOString() : undefined });
}

/**
 * Handle RevenueCat expiration events
 */
async function handleRevenueCatExpiration(event: RevenueCatEvent): Promise<void> {
  const { app_user_id } = event.event;

  webhookLogger.info('Processing expiration event', { source: 'revenuecat', userId: app_user_id });

  await db.transaction(async (tx) => {
    // Mark subscription as expired
    await tx.execute(sql`
      UPDATE user_subscriptions
      SET status = 'expired',
          updated_at = now()
      WHERE user_id = ${app_user_id} AND status = 'active'
    `);

    // Downgrade user to starter tier
    await tx.execute(sql`
      UPDATE users
      SET subscription_tier_id = 'starter'
      WHERE id = ${app_user_id}
    `);
  });

  webhookLogger.success('User downgraded to starter tier', { source: 'revenuecat', userId: app_user_id, reason: 'expiration' });
}

/**
 * Handle RevenueCat billing issue events
 */
async function handleRevenueCatBillingIssue(event: RevenueCatEvent): Promise<void> {
  const { app_user_id } = event.event;

  webhookLogger.warn('Billing issue detected', { source: 'revenuecat', userId: app_user_id });

  await db.execute(sql`
    UPDATE user_subscriptions
    SET status = 'past_due',
        updated_at = now()
    WHERE user_id = ${app_user_id} AND status = 'active'
  `);

  webhookLogger.warn('Subscription marked as past_due', { source: 'revenuecat', userId: app_user_id });
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
