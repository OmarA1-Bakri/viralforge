# Mobile Paywall Environment Variables

## Required Environment Variables

Add these to your `.env` file:

```bash
# RevenueCat Configuration
# ========================

# PUBLIC API Key (for mobile app - starts with pk_)
# Get from: RevenueCat Dashboard → Project Settings → API Keys
VITE_REVENUECAT_API_KEY=pk_xxxxxxxxxxxxxxxxxx

# SECRET API Key (for backend server-side validation - starts with sk_)
# Get from: RevenueCat Dashboard → Project Settings → API Keys
REVENUECAT_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxx

# Webhook Secret (for webhook signature verification - starts with rcwsk_)
# Get from: RevenueCat Dashboard → Project Settings → Integrations → Webhooks
REVENUECAT_WEBHOOK_SECRET=rcwsk_xxxxxxxxxxxxxxxxxx
```

## ⚠️ CRITICAL SECURITY NOTES

1. **NEVER use the secret key in the mobile app** - only in `.env` for backend
2. **NEVER commit these keys to git** - add `.env` to `.gitignore`
3. **Rotate keys if they are ever exposed**

## How to Get These Keys

### 1. Get PUBLIC API Key (VITE_REVENUECAT_API_KEY)
1. Go to [app.revenuecat.com](https://app.revenuecat.com)
2. Select your project
3. Go to **Project Settings** → **API Keys**
4. Copy the **PUBLIC** key (starts with `pk_`)
5. Add to `.env`: `VITE_REVENUECAT_API_KEY=pk_...`

### 2. Get SECRET API Key (REVENUECAT_SECRET_KEY)
1. Same location as above
2. Copy the **SECRET** key (starts with `sk_`)
3. Add to `.env`: `REVENUECAT_SECRET_KEY=sk_...`

### 3. Get Webhook Secret (REVENUECAT_WEBHOOK_SECRET)
1. Go to **Project Settings** → **Integrations** → **Webhooks**
2. Click **+ Add Webhook**
3. URL: `https://your-production-domain.com/api/webhooks/revenuecat`
4. Authorization: Leave blank (we verify using signature)
5. Generate webhook signing secret
6. Copy the secret (starts with `rcwsk_`)
7. Add to `.env`: `REVENUECAT_WEBHOOK_SECRET=rcwsk_...`

## Webhook Configuration

Once deployed, configure the webhook in RevenueCat:

- **URL**: `https://your-domain.com/api/webhooks/revenuecat`
- **Events**: All (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE)
- **Signature Verification**: HMAC SHA256 (automatically verified by server)

## Testing

### Sandbox Mode
1. Enable sandbox mode in RevenueCat Dashboard → Project Settings → Sandbox
2. Create test users:
   - **Google Play**: Play Console → Setup → License testing
   - **App Store**: App Store Connect → Users and Access → Sandbox Testers

### Production Checklist
- [ ] PUBLIC key configured in `.env`
- [ ] SECRET key configured in `.env`
- [ ] Webhook secret configured in `.env`
- [ ] Webhook URL configured in RevenueCat
- [ ] Products created in App Store/Play Store
- [ ] Products linked in RevenueCat dashboard
- [ ] Entitlements created (creator, pro, studio)
- [ ] Offering set as "current"

## Security Implementation

✅ **What We Implemented:**
- Server-side receipt validation with RevenueCat API
- Webhook signature verification (HMAC SHA256)
- Retry logic with exponential backoff
- Offline queue for failed syncs
- Platform detection (web vs mobile)
- Comprehensive error handling

❌ **What We BLOCKED:**
- Client-side tier assignment (security vulnerability)
- Trusting client-provided entitlement data
- Bypassing server validation

## Support

- RevenueCat Docs: https://docs.revenuecat.com
- RevenueCat Support: support@revenuecat.com
