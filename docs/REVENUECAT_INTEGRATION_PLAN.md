# RevenueCat Integration Plan - Subscription & Paywall Management

## 📋 Overview

**RevenueCat** will be the single source of truth for subscription management across web and future mobile platforms.

**Benefits:**
- ✅ Cross-platform subscription management (web, iOS, Android)
- ✅ Handles payment processing via Stripe/Google Play/App Store
- ✅ Real-time subscription status updates via webhooks
- ✅ Built-in paywall UI components
- ✅ Free tier management and trial handling
- ✅ Analytics and revenue metrics
- ✅ Reduces backend complexity (no manual subscription logic)

---

## 🏗️ Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERACTION                      │
│  User clicks "Upgrade to Creator Class"                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                 REVENUECAT PAYWALL                       │
│  - Show pricing options (monthly/yearly)                │
│  - Handle Stripe checkout                               │
│  - Return purchase result                               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│               REVENUECAT BACKEND                         │
│  - Process payment via Stripe                           │
│  - Update subscription status                           │
│  - Send webhook to ViralForge                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              VIRALFORGE WEBHOOK HANDLER                  │
│  - Receive subscription status update                   │
│  - Update local user_subscriptions table                │
│  - Unlock features for user                             │
│  - Send confirmation email                              │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 RevenueCat Setup

### 1. Account Configuration

**Steps:**
1. Create RevenueCat account at https://app.revenuecat.com
2. Create project: "ViralForge"
3. Configure platforms:
   - Web (Stripe integration)
   - iOS (future - App Store)
   - Android (future - Google Play)

---

### 2. Product Configuration

**Products to Create in RevenueCat:**

#### Free Tier
```
Product ID: free_tier
Type: Free
Entitlements: basic_features
```

**Entitlements:**
- `trends_daily_limit`: 10
- `saved_trends_limit`: 5
- `profile_analysis_frequency`: quarterly
- `use_this_access`: false
- `personalized_recommendations`: false

---

#### Creator Class - Monthly
```
Product ID: creator_class_monthly
Type: Subscription (auto-renewable)
Price: $10.00 USD/month
Billing Period: 1 month
Entitlements: creator_class_features
Trial: 7 days (optional)
```

---

#### Creator Class - Yearly
```
Product ID: creator_class_yearly
Type: Subscription (auto-renewable)
Price: $96.00 USD/year (20% off)
Billing Period: 1 year
Entitlements: creator_class_features
Trial: 7 days (optional)
```

**Entitlements:**
- `trends_daily_limit`: unlimited
- `saved_trends_limit`: unlimited
- `profile_analysis_frequency`: monthly
- `use_this_access`: true
- `personalized_recommendations`: true
- `streak_freeze`: true
- `priority_support`: true
- `early_access`: true

---

### 3. Stripe Integration

**Setup in RevenueCat:**
1. Go to Project Settings → Integrations → Stripe
2. Connect Stripe account
3. Map products:
   - `creator_class_monthly` → Stripe Price ID
   - `creator_class_yearly` → Stripe Price ID

**Stripe Products to Create:**
```
Product: ViralForge Creator Class
Prices:
  - $10/month (recurring)
  - $96/year (recurring)
```

---

## 💻 Implementation

### Database Schema Changes

#### Update user_subscriptions table
```sql
ALTER TABLE user_subscriptions
ADD COLUMN revenuecat_customer_id VARCHAR,
ADD COLUMN revenuecat_subscription_id VARCHAR,
ADD COLUMN revenuecat_entitlements JSONB DEFAULT '{}',
ADD COLUMN last_synced_at TIMESTAMP;

CREATE INDEX idx_user_subscriptions_revenuecat
  ON user_subscriptions(revenuecat_customer_id);
```

**Fields:**
- `revenuecat_customer_id`: RevenueCat app user ID
- `revenuecat_subscription_id`: RevenueCat subscription ID
- `revenuecat_entitlements`: Current entitlements from RevenueCat
- `last_synced_at`: Last webhook sync timestamp

---

### Frontend Integration (React/TypeScript)

#### 1. Install RevenueCat SDK

```bash
npm install @revenuecat/purchases-js
```

---

#### 2. Initialize SDK

```typescript
// client/src/lib/revenuecat.ts
import Purchases from '@revenuecat/purchases-js';

const REVENUECAT_PUBLIC_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY;

export const initRevenueCat = async (userId: string) => {
  await Purchases.configure({
    apiKey: REVENUECAT_PUBLIC_KEY,
    appUserID: userId, // Your internal user ID
  });
};

export const purchases = Purchases;
```

---

#### 3. Check Subscription Status

```typescript
// client/src/hooks/useSubscription.ts
import { useState, useEffect } from 'react';
import { purchases } from '@/lib/revenuecat';

interface SubscriptionStatus {
  isCreatorClass: boolean;
  entitlements: Record<string, any>;
  expiresAt?: Date;
  willRenew: boolean;
  isInTrial: boolean;
}

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const customerInfo = await purchases.getCustomerInfo();

        const isCreatorClass = customerInfo.entitlements.active['creator_class_features'] !== undefined;

        setStatus({
          isCreatorClass,
          entitlements: customerInfo.entitlements.active,
          expiresAt: customerInfo.allExpirationDates['creator_class_monthly'] ||
                     customerInfo.allExpirationDates['creator_class_yearly'],
          willRenew: customerInfo.managementURL !== null,
          isInTrial: Object.values(customerInfo.entitlements.active).some(
            (e: any) => e.periodType === 'trial'
          )
        });
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Listen for subscription changes
    purchases.addCustomerInfoUpdateListener(fetchStatus);

    return () => {
      purchases.removeCustomerInfoUpdateListener(fetchStatus);
    };
  }, []);

  return { status, loading };
}
```

---

#### 4. Paywall Component

```typescript
// client/src/components/UpgradeModal.tsx
import { useState } from 'react';
import { purchases } from '@/lib/revenuecat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string; // What triggered the paywall
}

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = async () => {
    setLoading(true);

    try {
      // Get available offerings
      const offerings = await purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering) {
        throw new Error('No offerings available');
      }

      // Select package
      const packageToPurchase = selectedPlan === 'monthly'
        ? currentOffering.monthly
        : currentOffering.annual;

      if (!packageToPurchase) {
        throw new Error('Package not found');
      }

      // Purchase
      const { customerInfo } = await purchases.purchasePackage(packageTopurchase);

      // Check if purchase was successful
      if (customerInfo.entitlements.active['creator_class_features']) {
        // Success! Features unlocked
        onClose();

        // Refresh page or show success message
        window.location.reload();
      }
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, no error
        return;
      }

      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Unlock Creator Class
          </DialogTitle>
        </DialogHeader>

        {feature && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-purple-900">
              <strong>{feature}</strong> requires Creator Class subscription
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`border-2 rounded-lg p-6 text-left transition ${
                selectedPlan === 'monthly'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-lg">Monthly</div>
              <div className="text-3xl font-bold mt-2">$10<span className="text-sm text-gray-500">/mo</span></div>
              <div className="text-sm text-gray-600 mt-1">Cancel anytime</div>
            </button>

            {/* Yearly Plan */}
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`border-2 rounded-lg p-6 text-left transition relative ${
                selectedPlan === 'yearly'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                SAVE 20%
              </div>
              <div className="font-semibold text-lg">Yearly</div>
              <div className="text-3xl font-bold mt-2">$96<span className="text-sm text-gray-500">/yr</span></div>
              <div className="text-sm text-gray-600 mt-1">$8/mo when billed annually</div>
            </button>
          </div>

          {/* Features List */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Creator Class includes:</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {[
                'Unlimited trending ideas',
                'Personalized recommendations',
                '"Use This" AI analysis',
                'Unlimited saves',
                'Monthly profile analysis',
                'Full gamification features',
                'Streak freeze (1/week)',
                'Priority support',
                'Early access to features',
                'Weekly trend digest'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Processing...' : 'Upgrade Now →'}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            7-day free trial · Cancel anytime · Secure payment via Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### 5. Feature Gate Component

```typescript
// client/src/components/FeatureGate.tsx
import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';
import { useState } from 'react';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  children: ReactNode;
  feature: string;
  entitlement?: string; // Specific entitlement to check
  fallback?: ReactNode;
}

export function FeatureGate({ children, feature, entitlement, fallback }: FeatureGateProps) {
  const { status, loading } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded" />;
  }

  // Check if user has access
  const hasAccess = entitlement
    ? status?.entitlements[entitlement] !== undefined
    : status?.isCreatorClass;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback or default locked UI
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <button
        onClick={() => setShowUpgrade(true)}
        className="relative group"
      >
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded group-hover:bg-black/20 transition">
          <Lock className="h-5 w-5 text-gray-700" />
        </div>
      </button>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={feature}
      />
    </>
  );
}
```

---

### Backend Integration (Node.js/Express)

#### 1. Environment Variables

```bash
# .env
REVENUECAT_API_KEY=your_secret_api_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

---

#### 2. RevenueCat Service

```typescript
// server/services/revenueCatService.ts
import axios from 'axios';
import { logger } from '../lib/logger';

const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY!;

class RevenueCatService {
  private api = axios.create({
    baseURL: REVENUECAT_API_URL,
    headers: {
      'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  /**
   * Get subscriber info from RevenueCat
   */
  async getSubscriberInfo(appUserId: string) {
    try {
      const response = await this.api.get(`/subscribers/${appUserId}`);
      return response.data.subscriber;
    } catch (error: any) {
      logger.error({ error, appUserId }, 'Failed to get subscriber info from RevenueCat');
      throw error;
    }
  }

  /**
   * Check if user has active entitlement
   */
  async hasEntitlement(appUserId: string, entitlementId: string): Promise<boolean> {
    try {
      const subscriber = await this.getSubscriberInfo(appUserId);
      return subscriber.entitlements[entitlementId]?.expires_date
        ? new Date(subscriber.entitlements[entitlementId].expires_date) > new Date()
        : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sync RevenueCat subscription status to local database
   */
  async syncSubscription(userId: string) {
    const subscriber = await this.getSubscriberInfo(userId);

    // Update local database
    await storage.upsertUserSubscription({
      userId,
      revenuecatCustomerId: subscriber.subscriber_id,
      revenuecatEntitlements: subscriber.entitlements,
      lastSyncedAt: new Date(),
      // Parse tier from entitlements
      tierId: this.getTierFromEntitlements(subscriber.entitlements),
      status: this.getStatusFromSubscriber(subscriber)
    });

    return subscriber;
  }

  private getTierFromEntitlements(entitlements: any): string {
    if (entitlements['creator_class_features']) {
      return 'creator';
    }
    return 'free';
  }

  private getStatusFromSubscriber(subscriber: any): string {
    // Check if any subscription is active
    const hasActiveSubscription = Object.values(subscriber.entitlements).some(
      (e: any) => e.expires_date && new Date(e.expires_date) > new Date()
    );

    if (hasActiveSubscription) {
      return 'active';
    }

    return 'inactive';
  }
}

export const revenueCatService = new RevenueCatService();
```

---

#### 3. Webhook Handler

```typescript
// server/routes.ts
import crypto from 'crypto';
import { revenueCatService } from './services/revenueCatService';

/**
 * RevenueCat Webhook Handler
 * Receives subscription status updates
 */
app.post('/api/webhooks/revenuecat', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-revenuecat-signature'] as string;
    const isValid = verifyRevenueCatWebhook(req.body, signature);

    if (!isValid) {
      logger.warn('Invalid RevenueCat webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    logger.info({ event: event.event }, 'Received RevenueCat webhook');

    // Handle different event types
    switch (event.event.type) {
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(event);
        break;

      case 'RENEWAL':
        await handleRenewal(event);
        break;

      case 'CANCELLATION':
        await handleCancellation(event);
        break;

      case 'EXPIRATION':
        await handleExpiration(event);
        break;

      case 'BILLING_ISSUE':
        await handleBillingIssue(event);
        break;

      default:
        logger.info({ type: event.event.type }, 'Unhandled webhook event type');
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error({ error }, 'Failed to process RevenueCat webhook');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

function verifyRevenueCatWebhook(body: any, signature: string): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET!;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return hash === signature;
}

async function handleInitialPurchase(event: any) {
  const userId = event.event.app_user_id;

  logger.info({ userId }, 'User purchased Creator Class');

  // Sync subscription from RevenueCat
  await revenueCatService.syncSubscription(userId);

  // Send welcome email
  // await emailService.sendCreatorClassWelcome(userId);

  // Track conversion event
  // await analytics.track(userId, 'subscription_started');
}

async function handleRenewal(event: any) {
  const userId = event.event.app_user_id;

  logger.info({ userId }, 'Subscription renewed');

  await revenueCatService.syncSubscription(userId);
}

async function handleCancellation(event: any) {
  const userId = event.event.app_user_id;

  logger.info({ userId }, 'User cancelled subscription');

  await revenueCatService.syncSubscription(userId);

  // Send cancellation survey
  // await emailService.sendCancellationSurvey(userId);
}

async function handleExpiration(event: any) {
  const userId = event.event.app_user_id;

  logger.info({ userId }, 'Subscription expired');

  await revenueCatService.syncSubscription(userId);

  // Send win-back email
  // await emailService.sendWinBackOffer(userId);
}

async function handleBillingIssue(event: any) {
  const userId = event.event.app_user_id;

  logger.warn({ userId }, 'Billing issue detected');

  // Send payment failed email
  // await emailService.sendPaymentFailedNotice(userId);
}
```

---

#### 4. Middleware for Feature Gates

```typescript
// server/middleware/requireCreatorClass.ts
import { revenueCatService } from '../services/revenueCatService';

export async function requireCreatorClass(req: any, res: any, next: any) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Check if user has Creator Class entitlement
    const hasAccess = await revenueCatService.hasEntitlement(
      userId,
      'creator_class_features'
    );

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Creator Class subscription required',
        upgradeUrl: '/subscription',
        feature: req.originalUrl
      });
    }

    next();
  } catch (error: any) {
    logger.error({ error, userId }, 'Failed to check subscription status');
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
}

// Usage in routes
app.post('/api/creator-profile/analyze',
  requireAuth,
  requireCreatorClass, // ⭐ RevenueCat-powered paywall
  async (req, res) => {
    // ... analysis logic
  }
);
```

---

## 📊 Testing

### 1. Sandbox Testing

RevenueCat provides sandbox mode for testing without real payments:

```typescript
// In development
Purchases.configure({
  apiKey: REVENUECAT_PUBLIC_KEY,
  appUserID: userId,
  useSandbox: true // Test mode
});
```

---

### 2. Test Scenarios

**Test Cases:**
- [ ] Free user hits paywall → sees upgrade modal
- [ ] User purchases monthly plan → unlocked immediately
- [ ] User purchases yearly plan → unlocked immediately
- [ ] User cancels → retains access until expiration
- [ ] Subscription expires → features locked
- [ ] Payment fails → user notified, features locked
- [ ] User upgrades monthly → yearly → billing updated

---

## 💰 Cost Analysis

### RevenueCat Pricing
- **Free:** Up to $2,500 MTR (Monthly Tracked Revenue)
- **Starter:** $1,000/month for up to $50,000 MTR
- **Growth:** Custom pricing

**For ViralForge:**
- 100 users × $10/month = $1,000 MTR → **FREE tier** ✅
- 1,000 users × $10/month = $10,000 MTR → **Still FREE** ✅
- Break $2,500 MTR at ~250 paying subscribers

**Recommendation:** Start with free tier, upgrade when needed

---

## 📋 Implementation Checklist

### Setup
- [ ] Create RevenueCat account
- [ ] Configure Stripe integration
- [ ] Create products (monthly/yearly)
- [ ] Set up entitlements
- [ ] Generate API keys
- [ ] Configure webhooks

### Frontend
- [ ] Install RevenueCat SDK
- [ ] Initialize SDK with user ID
- [ ] Create `useSubscription` hook
- [ ] Build `UpgradeModal` component
- [ ] Build `FeatureGate` component
- [ ] Test subscription flow

### Backend
- [ ] Update database schema
- [ ] Create RevenueCatService
- [ ] Implement webhook handler
- [ ] Create subscription middleware
- [ ] Sync existing subscriptions
- [ ] Test webhook events

### Testing
- [ ] Test purchase flow (sandbox)
- [ ] Test cancellation
- [ ] Test renewal
- [ ] Test webhook handling
- [ ] Test feature unlocking
- [ ] Load testing

---

## 🚀 Migration Strategy

### Existing Subscriptions (if any)

If you already have users with Stripe subscriptions:

```typescript
// Migration script
async function migrateExistingSubscriptions() {
  const existingSubscriptions = await storage.getAllActiveSubscriptions();

  for (const sub of existingSubscriptions) {
    // Create RevenueCat subscriber
    await revenueCatService.createSubscriber({
      appUserId: sub.userId,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId
    });

    // Sync status
    await revenueCatService.syncSubscription(sub.userId);
  }

  logger.info(`Migrated ${existingSubscriptions.length} subscriptions to RevenueCat`);
}
```

---

**STATUS:** 📋 RevenueCat integration plan complete
**NEXT:** Review & approve → Begin implementation
**ESTIMATED TIME:** 2-3 days for full RevenueCat integration
