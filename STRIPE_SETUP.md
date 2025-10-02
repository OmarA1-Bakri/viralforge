# Stripe Integration Setup Guide

## Overview

ViralForge AI uses Stripe for subscription payment processing. This guide covers the complete setup process.

## Required Environment Variables

Add these to your `.env` file:

```bash
# Stripe API Keys (Get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...                    # Stripe secret key (test or live)
STRIPE_PUBLISHABLE_KEY=pk_test_...              # Stripe publishable key (frontend)
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook signing secret

# Application URLs
FRONTEND_URL=http://localhost:5173               # Frontend URL for redirects
VITE_API_BASE_URL=http://localhost:5000         # Backend API URL

# Optional: Pre-configured Price IDs (for performance)
STRIPE_PRICE_PRO_MONTHLY=price_...              # Pro monthly price ID
STRIPE_PRICE_PRO_YEARLY=price_...               # Pro yearly price ID
STRIPE_PRICE_AGENCY_MONTHLY=price_...           # Agency monthly price ID
STRIPE_PRICE_AGENCY_YEARLY=price_...            # Agency yearly price ID
```

## Setup Steps

### 1. Create Stripe Account

1. Go to https://stripe.com and create an account
2. Complete business verification (required for live payments)
3. Access your dashboard at https://dashboard.stripe.com

### 2. Get API Keys

1. Navigate to **Developers** → **API keys**
2. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
4. Add to `.env` as shown above

### 3. Configure Webhook

1. Navigate to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
   - For local testing: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 4. Test Webhook Locally (Optional)

For local development, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# This will output a webhook signing secret - add it to .env
```

### 5. Create Products and Prices (Optional)

The system auto-creates products and prices, but you can pre-create them:

1. Navigate to **Products** → **Add product**
2. Create products:
   - **Pro**: $14.99/month or $149.30/year
   - **Agency**: $49.99/month or $497.90/year
3. Copy the price IDs and add to `.env` (optional, for performance)

## Pricing Structure

### Free Tier
- Price: $0
- No Stripe checkout required
- Auto-assigned on registration

### Pro Tier
- Monthly: $14.99/month (1499 cents)
- Yearly: $149.30/year (14930 cents) - 17% discount
- Features: Unlimited video analysis, advanced analytics, priority support

### Agency Tier
- Monthly: $49.99/month (4999 cents)
- Yearly: $497.90/year (49790 cents) - 17% discount
- Features: Everything unlimited, white-label, team collaboration, dedicated support

## Payment Flow

### 1. User Upgrades
```
User clicks "Upgrade Now"
→ Frontend calls /api/subscriptions/create-checkout
→ Backend creates Stripe checkout session
→ User redirected to Stripe checkout page
→ User completes payment
→ Stripe sends webhook: checkout.session.completed
→ Backend creates subscription in database
→ User redirected back to app with success message
```

### 2. User Manages Subscription
```
User clicks "Manage Billing"
→ Frontend calls /api/subscriptions/create-portal
→ Backend creates Stripe portal session
→ User redirected to Stripe customer portal
→ User can update payment method, view invoices, cancel subscription
→ Stripe sends webhooks for any changes
→ Backend updates database accordingly
```

### 3. User Cancels Subscription
```
Option A: Via app
  User clicks "Cancel Plan"
  → Frontend calls /api/subscriptions/cancel
  → Backend cancels in Stripe (at period end)
  → User retains access until expiry date

Option B: Via Stripe portal
  User clicks "Manage Billing" → cancels in portal
  → Stripe sends customer.subscription.updated webhook
  → Backend marks subscription as cancelled
  → User retains access until expiry date
```

## Testing

### Test Cards

Use these test card numbers in Stripe checkout:

- **Success**: 4242 4242 4242 4242
- **Declined**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

Any future expiry date and any 3-digit CVC work for test cards.

### Test Workflow

1. Register a new user (gets Free tier automatically)
2. Go to Settings → Subscription
3. Click "Upgrade Now" on Pro or Agency tier
4. Complete checkout with test card
5. Verify:
   - User redirected back with success message
   - Subscription shows as "Active" in Settings
   - Usage limits updated to Pro/Agency tier
   - Database `user_subscriptions` table has new record
6. Test cancellation:
   - Click "Cancel Plan"
   - Verify retains access until expiry
   - After expiry, verify downgrade to Free tier

## Production Checklist

Before going live:

- [ ] Replace test API keys with live keys (`sk_live_`, `pk_live_`)
- [ ] Configure live webhook endpoint
- [ ] Test end-to-end payment flow with real card
- [ ] Enable Stripe Radar for fraud prevention
- [ ] Set up email notifications for failed payments
- [ ] Configure tax collection if required
- [ ] Review Stripe billing settings
- [ ] Set up subscription email receipts
- [ ] Test refund process
- [ ] Document customer support procedures

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is publicly accessible
2. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. Check webhook endpoint logs for errors
4. Use Stripe CLI to test locally: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`

### Checkout Session Creation Fails

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Check price amounts match tier definitions (in cents)
3. Ensure products exist in Stripe dashboard
4. Check server logs for detailed error messages

### Subscription Not Created After Payment

1. Check webhook logs - was event received?
2. Verify webhook signature validation passed
3. Check database for transaction errors
4. Ensure user_id in metadata matches actual user

### Payment Succeeded but User Still on Free Tier

1. Check `user_subscriptions` table for active subscription
2. Verify `users.subscription_tier_id` updated correctly
3. Check webhook processing logs for errors
4. Ensure `checkout.session.completed` webhook was processed

## Security Notes

- Never commit `.env` file or expose API keys
- Always use HTTPS for webhook endpoints in production
- Validate webhook signatures to prevent spoofing
- Store Stripe customer IDs securely in database
- Use test mode for all development and testing
- Enable Stripe Radar for fraud prevention in production

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Webhooks Guide: https://stripe.com/docs/webhooks
- Test Cards: https://stripe.com/docs/testing
