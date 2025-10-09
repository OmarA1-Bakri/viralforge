# RevenueCat Setup for New Tier System

## 🎯 New Pricing Structure

| Tier | Monthly | Yearly | Savings |
|------|---------|--------|---------|
| **Starter** | $0 | $0 | - |
| **Creator** | $19 | $190 | $38/year |
| **Pro** | $39 | $390 | $78/year |
| **Studio** | $99 | $990 | $198/year |

---

## 📱 Step-by-Step RevenueCat Configuration

### Prerequisites
1. RevenueCat account at [app.revenuecat.com](https://app.revenuecat.com)
2. App Store Connect account (iOS) or Google Play Console (Android)
3. Your app's bundle ID: `android.viral.forge` (Android) or `com.viralforge.app` (iOS)

---

### Step 1: Create Products in App Stores

#### **For Google Play Store:**
1. Go to Google Play Console → Your App → Monetize → Products → Subscriptions
2. Create 6 subscription products:

**Creator Monthly** (`viralforge_creator_monthly`)
- Base plan ID: `creator-monthly`
- Billing period: 1 month
- Price: $19.00 USD

**Creator Yearly** (`viralforge_creator_yearly`)
- Base plan ID: `creator-yearly`
- Billing period: 1 year
- Price: $190.00 USD

**Pro Monthly** (`viralforge_pro_monthly`)
- Base plan ID: `pro-monthly`
- Billing period: 1 month
- Price: $39.00 USD

**Pro Yearly** (`viralforge_pro_yearly`)
- Base plan ID: `pro-yearly`
- Billing period: 1 year
- Price: $390.00 USD

**Studio Monthly** (`viralforge_studio_monthly`)
- Base plan ID: `studio-monthly`
- Billing period: 1 month
- Price: $99.00 USD

**Studio Yearly** (`viralforge_studio_yearly`)
- Base plan ID: `studio-yearly`
- Billing period: 1 year
- Price: $990.00 USD

#### **For Apple App Store:**
1. Go to App Store Connect → Your App → Subscriptions
2. Create the same 6 subscription products with matching IDs
3. Set pricing in USD (Apple will convert to other currencies)

---

### Step 2: Configure RevenueCat Products

1. **Log in to RevenueCat** → Select your project
2. Go to **Products** section
3. Click **+ New** and create 6 products:

For each product:
- **Product identifier**: Match the store IDs exactly (e.g., `viralforge_creator_monthly`)
- **Store**: Google Play Store (create iOS versions separately if needed)
- **Type**: Subscription
- **Duration**: Monthly or Yearly

---

### Step 3: Create Entitlements

Go to **Entitlements** in RevenueCat and create 3 entitlements:

#### **Creator Entitlement**
- **Identifier**: `creator`
- **Description**: Core tools for consistent growth
- **Attached Products**:
  - `viralforge_creator_monthly`
  - `viralforge_creator_yearly`

#### **Pro Entitlement**
- **Identifier**: `pro`
- **Description**: Automation and efficiency for serious creators
- **Attached Products**:
  - `viralforge_pro_monthly`
  - `viralforge_pro_yearly`

#### **Studio Entitlement**
- **Identifier**: `studio`
- **Description**: Scale and collaboration for teams
- **Attached Products**:
  - `viralforge_studio_monthly`
  - `viralforge_studio_yearly`

---

### Step 4: Create Offering

1. Go to **Offerings** in RevenueCat
2. Create new offering:
   - **Identifier**: `default`
   - **Description**: Main subscription offering
   - **Make current**: ✅ YES

3. Add all 6 packages to this offering:
   - Creator Monthly ($19/mo)
   - Creator Yearly ($190/yr - save $38)
   - Pro Monthly ($39/mo) ⭐ **MARK AS "MOST POPULAR"**
   - Pro Yearly ($390/yr - save $78)
   - Studio Monthly ($99/mo)
   - Studio Yearly ($990/yr - save $198)

---

### Step 5: Get API Keys

1. Go to **Project Settings** → **API Keys**
2. Copy your **PUBLIC key** (starts with `pk_`):
   ```
   VITE_REVENUECAT_API_KEY=pk_xxxxxxxxxxxxxxxxxx
   ```
   ⚠️ **IMPORTANT**: Use PUBLIC key for mobile app, NOT the secret key!

3. Update `.env` file:
   ```bash
   # RevenueCat Configuration
   VITE_REVENUECAT_API_KEY=pk_your_public_key_here
   REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
   ```

---

### Step 6: Configure Platform Integrations

#### **Google Play Store Integration:**
1. In RevenueCat → **Project Settings** → **Integrations** → **Google Play**
2. Upload Service Account JSON key file
3. Enter package name: `android.viral.forge`
4. Test the connection

#### **Apple App Store Integration:**
1. In RevenueCat → **Project Settings** → **Integrations** → **App Store Connect**
2. Enter your credentials or use App Store Connect API key
3. Enter bundle ID: `com.viralforge.app`
4. Test the connection

---

### Step 7: Set Up Webhooks

1. Go to **Project Settings** → **Integrations** → **Webhooks**
2. Add new webhook:
   - **URL**: `https://your-production-domain.com/api/webhooks/revenuecat`
   - **Authorization**: Leave blank (we verify using signature)
3. Generate webhook signing secret
4. Copy secret and add to `.env`:
   ```
   REVENUECAT_WEBHOOK_SECRET=rcwsk_xxxxxxxxxxxxx
   ```

---

### Step 8: Enable Sandbox Testing

1. Go to **Project Settings** → **Sandbox**
2. Enable sandbox mode
3. Create test users in:
   - Google Play Console → Setup → License testing
   - App Store Connect → Users and Access → Sandbox Testers

---

## 🧪 Testing Checklist

### Phase 1: Sandbox Testing
- [ ] RevenueCat initializes without errors
- [ ] Offerings load correctly (6 products visible)
- [ ] Can view product details and pricing
- [ ] Test purchase flow (sandbox)
- [ ] Entitlement activates correctly
- [ ] Backend receives webhook
- [ ] Subscription syncs to database

### Phase 2: Production Testing
- [ ] Real purchase completes successfully
- [ ] Receipt validation works
- [ ] Subscription status syncs to backend
- [ ] Feature access granted based on tier
- [ ] Usage limits enforced correctly
- [ ] Subscription renewal works
- [ ] Cancellation flow works
- [ ] Restore purchases works

---

## 🔄 Migration Plan for Existing Users

### Automatic Migration (via SQL)
Run migration: `server/db/migrations/1759884000_update_subscription_tiers.sql`

**What happens:**
- **Free users** → `starter` tier (no change in features)
- **Old Pro users ($14.99)** → `creator` tier ($19) - slight upgrade
- **Old Creator users ($49.99)** → `studio` tier ($99) - major feature upgrade, grandfathered

### Communication to Users
Send email to affected users:

**Subject**: Important Update to Your ViralForge Subscription

**For Old Pro → Creator:**
> Hi [Name],
>
> We're upgrading your plan! You're now on our new **Creator tier** at your existing $14.99/mo rate.
>
> New features you get:
> - Unlimited LaunchPad analyses (was 50/mo)
> - Unlimited AI trend discovery
> - 30 video clips/month (was 50/mo)
> - Advanced analytics dashboard
>
> Your pricing won't change, but you can upgrade to our new **Pro tier** ($39/mo) anytime for:
> - 100 clips/month
> - Weekly auto-analysis
> - Roast Mode
> - Audience insights

**For Old Creator → Studio:**
> Hi [Name],
>
> Big upgrade! You're now on our new **Studio tier** with team collaboration features.
>
> Your rate stays at $49.99/mo, but you now get:
> - Everything you had before
> - 3 team seats (coming soon)
> - API access (beta)
> - Daily auto-analysis
> - Dedicated account manager
>
> We're grandfathering your pricing - the new Studio tier is $99/mo for new users!

---

## 📊 Product ID Reference

| Product ID | Price | Duration | Entitlement |
|-----------|-------|----------|-------------|
| `viralforge_creator_monthly` | $19 | 1 month | `creator` |
| `viralforge_creator_yearly` | $190 | 1 year | `creator` |
| `viralforge_pro_monthly` | $39 | 1 month | `pro` |
| `viralforge_pro_yearly` | $390 | 1 year | `pro` |
| `viralforge_studio_monthly` | $99 | 1 month | `studio` |
| `viralforge_studio_yearly` | $990 | 1 year | `studio` |

---

## 🚀 Deployment Steps

1. **Update .env with PUBLIC API key**
   ```bash
   VITE_REVENUECAT_API_KEY=pk_your_public_key_here
   ```

2. **Run database migration**
   ```bash
   npm run db:migrate
   ```

3. **Seed new tiers**
   ```bash
   tsx server/db/seed-tiers.ts
   ```

4. **Build and deploy**
   ```bash
   npm run build
   npx cap sync android
   npx cap sync ios
   ```

5. **Test in sandbox before production**

---

## ❓ Troubleshooting

### Error: "Secret API keys should not be used"
- **Solution**: Use PUBLIC key (`pk_...`) not SECRET key (`sk_...`)

### Offerings not loading
- **Check**: Products created in both App Store/Play Store AND RevenueCat
- **Check**: Products attached to entitlements
- **Check**: Offering is set as "current"

### Purchase fails
- **Check**: Sandbox testing enabled for test accounts
- **Check**: Service account JSON uploaded (Google Play)
- **Check**: App bundle ID matches exactly

### Webhook not receiving events
- **Check**: Webhook URL is publicly accessible
- **Check**: Webhook secret configured in .env
- **Check**: Signature verification implemented correctly

---

## 📞 Support

- **RevenueCat Docs**: https://docs.revenuecat.com
- **RevenueCat Support**: support@revenuecat.com
- **ViralForge Issues**: GitHub Issues
