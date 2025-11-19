# RevenueCat Setup Guide for ViralForge

## ✅ Completed Steps

1. **RevenueCat Account Created** - ViralForge account set up
2. **API Key Configured** - `sk_CBviirtTBwSSVQAgginLFeTqHnqVD` added to `.env`
3. **SDK Integration** - All code integrated and ready

## 🔧 Required Configuration in RevenueCat Dashboard

Visit [app.revenuecat.com](https://app.revenuecat.com) and complete these steps:

### Step 1: Create Products

Navigate to **Products** in the RevenueCat dashboard and create 4 products:

#### Pro Monthly
- **Product ID**: `viralforge_pro_monthly`
- **Price**: $14.99 USD
- **Duration**: 1 month
- **Platform**: Google Play Store

#### Pro Yearly
- **Product ID**: `viralforge_pro_yearly`
- **Price**: $149.90 USD
- **Duration**: 1 year
- **Platform**: Google Play Store

#### Creator Monthly
- **Product ID**: `viralforge_creator_monthly`
- **Price**: $49.99 USD
- **Duration**: 1 month
- **Platform**: Google Play Store

#### Creator Yearly
- **Product ID**: `viralforge_creator_yearly`
- **Price**: $499.90 USD
- **Duration**: 1 year
- **Platform**: Google Play Store

### Step 2: Create Entitlements

Navigate to **Entitlements** and create 2 entitlements:

#### Pro Entitlement
- **Identifier**: `pro`
- **Attached Products**:
  - `viralforge_pro_monthly`
  - `viralforge_pro_yearly`

#### Creator Entitlement
- **Identifier**: `creator`
- **Attached Products**:
  - `viralforge_creator_monthly`
  - `viralforge_creator_yearly`

### Step 3: Create Offering

Navigate to **Offerings** and create a new offering:

- **Identifier**: `default`
- **Make this the current offering**: ✅ YES

Add all 4 packages to this offering:
1. Pro Monthly
2. Pro Yearly
3. Creator Monthly
4. Creator Yearly

### Step 4: Configure Google Play Store

1. In RevenueCat dashboard, go to **Project Settings → Integrations → Google Play**
2. Upload your Google Play Service Account JSON
3. Enter your package name: `com.viralforge.app` (or your actual package name)

### Step 5: Set Up Webhooks

1. Go to **Project Settings → Integrations → Webhooks**
2. Add webhook URL: `https://your-production-domain.com/api/webhooks/revenuecat`
3. Generate a webhook secret and add it to your `.env`:
   ```
   REVENUECAT_WEBHOOK_SECRET=<generated_secret_here>
   ```

### Step 6: Enable Sandbox Testing

1. Go to **Project Settings → Sandbox**
2. Enable sandbox mode for testing
3. Use Google Play Console test accounts for purchases

## 🧪 Testing Checklist

### Local Testing (Web)
- [ ] App loads without RevenueCat errors (will skip on web platform)
- [ ] Plan selection page displays correctly
- [ ] Free tier registration works

### Android Sandbox Testing
- [ ] RevenueCat initializes successfully
- [ ] Offerings load correctly
- [ ] Can view available products
- [ ] Purchase flow starts (use test account)
- [ ] Purchase completes successfully
- [ ] Backend webhook receives event
- [ ] User subscription syncs to database
- [ ] User sees correct tier in app

### Edge Cases to Test
- [ ] Purchase cancellation during flow
- [ ] Network error during purchase
- [ ] Webhook delivery failure (retry logic)
- [ ] Restore purchases functionality
- [ ] Subscription expiration
- [ ] Subscription renewal
- [ ] Subscription cancellation
- [ ] Subscription upgrade/downgrade

## 🚀 Production Deployment Steps

1. **Update Environment Variables**:
   ```bash
   VITE_REVENUECAT_API_KEY=<production_api_key>
   REVENUECAT_WEBHOOK_SECRET=<webhook_secret>
   ```

2. **Build Android App**:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

3. **Configure Google Play Console**:
   - Set up in-app products matching RevenueCat product IDs
   - Configure pricing for all regions
   - Set up subscription benefits
   - Add subscription descriptions

4. **Update Webhook URL** in RevenueCat:
   - Change from localhost to production domain
   - Verify webhook authentication works

5. **Enable Production Mode** in RevenueCat:
   - Switch from sandbox to production
   - Verify all products are active
   - Test with real purchase (small amount first)

## 📊 Monitoring

After launch, monitor these in RevenueCat dashboard:

1. **Active Subscriptions** - Track subscriber count
2. **Revenue** - Monitor monthly recurring revenue (MRR)
3. **Churn Rate** - Track subscription cancellations
4. **Conversion Rate** - Plan selection → purchase completion
5. **Webhook Delivery** - Ensure all events are received

## 🐛 Troubleshooting

### Issue: RevenueCat not initializing
- **Solution**: Check API key is correct in `.env`
- **Solution**: Ensure running on native platform (not web)
- **Solution**: Check Capacitor version compatibility

### Issue: Products not loading
- **Solution**: Verify product IDs match exactly
- **Solution**: Check offering is set as "current"
- **Solution**: Ensure Google Play integration is configured

### Issue: Purchases failing
- **Solution**: Verify Google Play Service Account is configured
- **Solution**: Check test account has payment method
- **Solution**: Ensure app package name matches

### Issue: Webhooks not received
- **Solution**: Check webhook URL is publicly accessible
- **Solution**: Verify webhook secret matches
- **Solution**: Check server logs for authentication errors

## 📝 Code Integration Points

The following files have RevenueCat integration:

1. **client/src/lib/revenueCat.ts** - Core service wrapper
2. **client/src/components/auth/PlanSelection.tsx** - Purchase UI
3. **client/src/contexts/AuthContext.tsx** - Auto-login/sync
4. **server/routes/webhooks.ts** - Webhook handler
5. **server/routes/subscriptions.ts** - Sync endpoint
6. **server/index.ts** - Webhook route registration

## 🔒 Security Checklist

- [x] API key stored in environment variable (not committed)
- [x] Webhook authentication implemented
- [ ] Webhook secret configured (needs RevenueCat setup)
- [x] Receipt verification handled by RevenueCat (server-side)
- [x] Database updates only via authenticated webhooks
- [x] Non-critical failures don't break user flow

## 📞 Support

- RevenueCat Docs: https://www.revenuecat.com/docs
- RevenueCat Support: support@revenuecat.com
- Capacitor Plugin Docs: https://github.com/RevenueCat/purchases-capacitor

## 🎯 Success Criteria

The integration is successful when:

1. ✅ Users can register with free tier
2. ⏳ Users can purchase Pro/Creator subscriptions
3. ⏳ Subscriptions sync to backend database
4. ⏳ Webhooks deliver reliably
5. ⏳ Users see correct tier in app
6. ⏳ Subscription management works (cancel, restore)
7. ⏳ Analytics track subscription events

Status: **7/7 Code Complete** | **0/7 Tested** | **Not Production Ready**
