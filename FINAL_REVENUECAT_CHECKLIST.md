# Final RevenueCat Setup & Testing Checklist

## ✅ Completed

- [x] RevenueCat SDK installed (@revenuecat/purchases-capacitor v11.2.3)
- [x] API key configured in .env (`sk_CBviirtTBwSSVQAgginLFeTqHnqVD`)
- [x] Service wrapper created (client/src/lib/revenueCat.ts)
- [x] Plan selection UI updated (client/src/components/auth/PlanSelection.tsx)
- [x] Backend webhooks implemented (server/routes/webhooks.ts)
- [x] Subscription sync routes created (server/routes/subscriptions.ts)
- [x] Auth integration complete (client/src/contexts/AuthContext.tsx)
- [x] App built for production (npm run build)
- [x] Capacitor synced with Android (npx cap sync android)
- [x] RevenueCat plugin detected in Android (8 Capacitor plugins found)

## 🔧 RevenueCat Dashboard Configuration

### Step 1: Create Products (in RevenueCat)

Go to **Products** → **+ New** and create 4 products:

#### Product 1: Pro Monthly
```
Product ID: viralforge_pro_monthly
Type: Subscription
Platform: Google Play Store
Base Plan ID: p1m (or monthly)
Price: $14.99 USD
Billing Period: 1 month
```

#### Product 2: Pro Yearly
```
Product ID: viralforge_pro_yearly
Type: Subscription
Platform: Google Play Store
Base Plan ID: p1y (or yearly)
Price: $149.90 USD
Billing Period: 1 year
```

#### Product 3: Creator Monthly
```
Product ID: viralforge_creator_monthly
Type: Subscription
Platform: Google Play Store
Base Plan ID: p1m (or monthly)
Price: $49.99 USD
Billing Period: 1 month
```

#### Product 4: Creator Yearly
```
Product ID: viralforge_creator_yearly
Type: Subscription
Platform: Google Play Store
Base Plan ID: p1y (or yearly)
Price: $499.90 USD
Billing Period: 1 year
```

### Step 2: Create Entitlements (in RevenueCat)

Go to **Entitlements** → **+ New**

#### Entitlement 1: Pro
```
Identifier: pro
Display Name: Pro
Description: Pro tier access for serious content creators

Attached Products:
- viralforge_pro_monthly
- viralforge_pro_yearly
```

#### Entitlement 2: Creator
```
Identifier: creator
Display Name: Creator
Description: Creator tier access for professional creators & agencies

Attached Products:
- viralforge_creator_monthly
- viralforge_creator_yearly
```

### Step 3: Create Offering (in RevenueCat)

Go to **Offerings** → **+ New**

```
Identifier: default
Make current offering: YES

Packages to include:
- viralforge_pro_monthly
- viralforge_pro_yearly
- viralforge_creator_monthly
- viralforge_creator_yearly
```

### Step 4: Google Play Integration (in RevenueCat)

Go to **Project Settings** → **Integrations** → **Google Play**

1. Upload your Google Play Service Account JSON
2. Enter package name: `com.viralforge.app` (or your actual package name)
3. Save configuration

## 📱 Google Play Console Configuration

### Create Subscription Products

For each product, go to **Monetize** → **Products** → **Subscriptions** → **Create subscription**

#### Subscription 1: viralforge_pro_monthly
```
Product ID: viralforge_pro_monthly
Name: ViralForge Pro Monthly
Description: Professional content creation tools with unlimited AI analysis

Base plan:
  Base plan ID: p1m
  Billing period: 1 month (P1M)
  Price: $14.99

Free trial: (Optional) 7 days
Grace period: 3 days
```

#### Subscription 2: viralforge_pro_yearly
```
Product ID: viralforge_pro_yearly
Name: ViralForge Pro Yearly
Description: Professional content creation tools - Save 17% with annual billing

Base plan:
  Base plan ID: p1y
  Billing period: 1 year (P1Y)
  Price: $149.90

Free trial: (Optional) 7 days
Grace period: 3 days
```

#### Subscription 3: viralforge_creator_monthly
```
Product ID: viralforge_creator_monthly
Name: ViralForge Creator Monthly
Description: Advanced tools for professional creators and agencies

Base plan:
  Base plan ID: p1m
  Billing period: 1 month (P1M)
  Price: $49.99

Free trial: (Optional) 7 days
Grace period: 3 days
```

#### Subscription 4: viralforge_creator_yearly
```
Product ID: viralforge_creator_yearly
Name: ViralForge Creator Yearly
Description: Advanced tools for professional creators - Save 17% annually

Base plan:
  Base plan ID: p1y
  Billing period: 1 year (P1Y)
  Price: $499.90

Free trial: (Optional) 7 days
Grace period: 3 days
```

## 🧪 Testing Steps

### 1. Open Android App
```bash
npx cap open android
```

### 2. Run on Device/Emulator
- Click "Run" in Android Studio
- Or use: `npx cap run android`

### 3. Test Free Tier Registration
- [  ] Open app
- [  ] Navigate to registration
- [  ] Select "Free" plan
- [  ] Complete registration
- [  ] Verify user created in database
- [  ] Verify no RevenueCat errors in logs

### 4. Test Plan Selection UI
- [  ] Plan selection screen appears
- [  ] All 3 tiers visible (Free, Pro, Creator)
- [  ] Correct prices shown
- [  ] Can select each plan
- [  ] "Continue" button works

### 5. Test Purchase Flow (Sandbox)
**Note: Requires Google Play test account**

- [  ] Select "Pro" plan
- [  ] Click "Continue with Pro"
- [  ] RevenueCat purchase sheet appears
- [  ] Can see "viralforge_pro_monthly" product
- [  ] Price shows correctly ($14.99)
- [  ] Complete test purchase
- [  ] Purchase succeeds
- [  ] User registered successfully
- [  ] Check backend logs for webhook event
- [  ] Verify subscription synced to database

### 6. Test Backend Sync
- [  ] Login with test account
- [  ] Check RevenueCat login successful
- [  ] Verify sync endpoint called
- [  ] Check database for subscription record
- [  ] Verify user tier updated

### 7. Test Subscription Status
- [  ] Call `/api/subscriptions/current`
- [  ] Verify correct tier returned
- [  ] Check entitlements are active
- [  ] Verify expiration date set

## 🔍 Verification Commands

### Check Database
```bash
# Check if user subscription was created
psql $DATABASE_URL -c "SELECT * FROM user_subscriptions ORDER BY created_at DESC LIMIT 5;"

# Check user tier
psql $DATABASE_URL -c "SELECT id, username, subscription_tier_id FROM users ORDER BY created_at DESC LIMIT 5;"
```

### Check Server Logs
```bash
# Watch for RevenueCat events
tail -f /tmp/server-output.log | grep -i revenuecat

# Watch for webhook events
tail -f /tmp/server-output.log | grep -i webhook
```

### Test API Endpoints
```bash
# Get subscription tiers
curl http://localhost:5000/api/subscriptions/tiers

# Get current subscription (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/subscriptions/current
```

## ⚠️ Common Issues & Solutions

### Issue: "RevenueCat API key not configured"
**Solution**: Check .env file has `VITE_REVENUECAT_API_KEY=sk_CBviirtTBwSSVQAgginLFeTqHnqVD`

### Issue: "Products not loading"
**Solution**:
- Verify products created in RevenueCat dashboard
- Check product IDs match exactly
- Ensure "default" offering is current

### Issue: "Purchase fails immediately"
**Solution**:
- Check Google Play Console has matching products
- Verify Google Play integration configured in RevenueCat
- Ensure using test account with payment method

### Issue: "Webhook not received"
**Solution**:
- Verify webhook URL is publicly accessible
- Check webhook secret in .env
- Test with RevenueCat webhook tester

### Issue: "Subscription not syncing"
**Solution**:
- Check auth token is valid
- Verify sync endpoint is registered
- Check server logs for errors

## 📊 Success Criteria

- [ ] Free tier registration works
- [ ] Plan selection UI displays correctly
- [ ] Can view all products in RevenueCat
- [ ] Test purchase completes successfully
- [ ] Webhook event received
- [ ] Subscription syncs to database
- [ ] User sees correct tier after purchase
- [ ] Backend `/api/subscriptions/current` returns correct data

## 🚀 Ready for Production When:

- [ ] All sandbox tests pass
- [ ] Real purchase tested (small amount)
- [ ] Webhook delivery confirmed
- [ ] Database sync verified
- [ ] Error handling tested
- [ ] Restore purchases works
- [ ] Subscription cancellation works

---

**Current Status**: Code Complete ✅ | Configuration In Progress 🔧 | Testing Pending ⏳
