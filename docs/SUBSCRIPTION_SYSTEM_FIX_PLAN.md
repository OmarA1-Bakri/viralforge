# ViralForge Subscription System Fix - Implementation Plan

## Executive Summary

This document provides a comprehensive, production-ready implementation plan to fix the broken subscription system in ViralForge Android app (with future iOS support). The current implementation uses Stripe (web-only) instead of mobile platform payment systems, has broken authentication, and lacks proper subscription management.

**Timeline**: 6 weeks
**Priority**: CRITICAL - Blocking monetization

---

## Current State Analysis

### Critical Issues
1. ✗ **Wrong Payment Platform**: Using Stripe instead of Google Play Billing / Apple StoreKit
2. ✗ **Broken Authentication**: `req.isAuthenticated()` doesn't exist (should use `authenticateToken` middleware)
3. ✗ **No Subscription Creation**: Plan selected during registration but never persisted
4. ✗ **No Usage Enforcement**: Free users can access unlimited paid features
5. ✗ **Schema Mismatches**: Missing mobile payment fields in database
6. ✗ **No Receipt Verification**: Vulnerable to fraud and manipulation

### What's Working
- ✓ Database schema exists (subscription_tiers, user_subscriptions, user_usage)
- ✓ Subscription tiers seeded correctly (Free, Pro $14.99, Creator $49.99)
- ✓ Plan selection UI working (PlanSelection.tsx)
- ✓ Basic JWT authentication with `authenticateToken` middleware
- ✓ Backend server operational

---

## Key Architectural Decisions

### Decision 1: Keep Stripe for Web, Add Mobile Billing
**Decision**: Maintain Stripe for future web version, add Google Play Billing and Apple StoreKit for mobile
**Rationale**:
- Allows flexibility for web-based subscriptions later
- Mobile platforms require native billing (App Store guidelines)
- Payment method field in schema already supports multiple types

### Decision 2: Use @capacitor-community/in-app-purchases
**Decision**: Use @capacitor-community/in-app-purchases plugin
**Rationale**:
- Official Capacitor community plugin with active maintenance
- Unified API for both iOS and Android
- TypeScript support out of the box
- Better than react-native-iap (React Native specific)
- Better than custom implementation (time to market)

### Decision 3: Server-Side Receipt Verification
**Decision**: Implement direct Google Play Developer API and App Store Server API verification
**Rationale**:
- Maximum security (no client-side validation)
- No third-party service costs (like RevenueCat)
- Full control over subscription logic
- Required for production-grade security

### Decision 4: Subscription State Synchronization Strategy
**Decision**: Server is source of truth, periodic sync + webhook verification
**Rationale**:
- Google Play webhooks notify server of subscription changes
- App polls /api/subscriptions/current on startup and critical actions
- Server-side cron job validates subscriptions daily
- Graceful offline handling with cached subscription state

---

## Phase 1: Critical Fixes (Week 1)

**Goal**: Fix broken authentication and enable basic subscription creation during registration

### 1.1 Fix Authentication in Subscription Routes
**Priority**: CRITICAL
**Files to Modify**: `/home/omar/viralforge/server/routes/subscriptions.ts`

**Changes Required**:

#### Line 32-34: Fix /api/subscriptions/current
```typescript
// BEFORE (BROKEN):
if (!req.isAuthenticated()) {
  return res.status(401).json({ success: false, error: "Not authenticated" });
}

// AFTER (FIXED):
import { authenticateToken, AuthRequest } from '../auth';

// Change function signature
app.get("/api/subscriptions/current", authenticateToken, async (req: AuthRequest, res) => {
  // req.user is now properly typed and available
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
```

**Apply this pattern to ALL routes** (lines 32, 90, 151, 192, 265, 310, 367):
- Add `authenticateToken` middleware to route
- Change `req: Request` to `req: AuthRequest`
- Remove `req.isAuthenticated()` checks
- Use `req.user?.id` to get userId

**Testing**:
```bash
# Test authenticated endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/subscriptions/current
# Expected: 200 OK with subscription data

# Test unauthenticated endpoint
curl http://localhost:5000/api/subscriptions/current
# Expected: 401 Unauthorized
```

---

### 1.2 Create Subscription During Registration
**Priority**: CRITICAL
**Files to Modify**: `/home/omar/viralforge/server/auth.ts`

**Current Code** (lines 154-175):
```typescript
async registerUser(username: string, password: string, subscriptionTier: string = 'free'): Promise<{ user: AuthUser; token: string }> {
  // ... existing code ...
  const newUser = await storage.createUser({
    username,
    password: hashedPassword,
  });

  // Note: Subscription management is handled separately
  // Basic user registration doesn't require subscription tables
  console.log(`📋 User registered with tier: ${subscriptionTier} (subscription management not yet implemented)`);
```

**New Implementation**:
```typescript
async registerUser(username: string, password: string, subscriptionTier: string = 'free'): Promise<{ user: AuthUser; token: string }> {
  try {
    const { storage } = await import('./storage');
    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
    });

    // Create subscription record for the user
    console.log(`📋 Creating subscription for user: ${newUser.id} with tier: ${subscriptionTier}`);

    // Get the tier ID (validate it exists)
    const tierResult = await db.execute(sql`
      SELECT id FROM subscription_tiers WHERE name = ${subscriptionTier} AND is_active = true
    `);

    if (tierResult.rows.length === 0) {
      console.error(`⚠️  Subscription tier '${subscriptionTier}' not found, defaulting to 'free'`);
      subscriptionTier = 'free';
    }

    const tierId = tierResult.rows[0]?.id || 'free';

    // Create subscription record
    await db.execute(sql`
      INSERT INTO user_subscriptions (
        user_id,
        tier_id,
        status,
        billing_cycle,
        payment_method,
        started_at,
        expires_at,
        auto_renew
      )
      VALUES (
        ${newUser.id},
        ${tierId},
        'active',
        'monthly',
        'none',
        NOW(),
        ${subscriptionTier === 'free' ? null : sql`NOW() + INTERVAL '30 days'`},
        false
      )
    `);

    console.log(`✅ Subscription created successfully for user: ${newUser.id}`);

    const authUser: AuthUser = {
      id: newUser.id,
      username: newUser.username,
    };

    const token = generateToken(authUser);

    return { user: authUser, token };
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    throw new Error('Registration failed');
  }
}
```

**Testing**:
```bash
# Register new user with free tier
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"password123","subscriptionTier":"free"}'

# Verify subscription was created
curl -H "Authorization: Bearer JWT_TOKEN_FROM_REGISTRATION" \
  http://localhost:5000/api/subscriptions/current
# Expected: tier_name = 'free', status = 'active'
```

---

### 1.3 Add Mobile Payment Fields to Schema
**Priority**: HIGH
**Files to Modify**:
- `/home/omar/viralforge/shared/schema.ts` (already has fields)
- `/home/omar/viralforge/server/db/migrations/0003_add_mobile_payment_fields.sql` (new)

**New Migration File**:
```sql
-- Migration: Add mobile payment fields and indexes
-- File: /home/omar/viralforge/server/db/migrations/0003_add_mobile_payment_fields.sql

-- Add missing mobile payment fields to user_subscriptions
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS google_play_purchase_token VARCHAR(500),
  ADD COLUMN IF NOT EXISTS google_play_order_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS apple_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS receipt_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_verification_attempt TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verification_error TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status
  ON user_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_google_token
  ON user_subscriptions(google_play_purchase_token)
  WHERE google_play_purchase_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_apple_transaction
  ON user_subscriptions(apple_transaction_id)
  WHERE apple_transaction_id IS NOT NULL;

-- Add index for subscription expiration checks
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at
  ON user_subscriptions(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'active';

-- Add unique constraint for Google Play purchase tokens
ALTER TABLE user_subscriptions
  ADD CONSTRAINT unique_google_play_purchase_token
  UNIQUE (google_play_purchase_token);

-- Add unique constraint for Apple transaction IDs
ALTER TABLE user_subscriptions
  ADD CONSTRAINT unique_apple_transaction_id
  UNIQUE (apple_transaction_id);

COMMENT ON COLUMN user_subscriptions.google_play_purchase_token IS 'Google Play purchase token for receipt verification';
COMMENT ON COLUMN user_subscriptions.google_play_order_id IS 'Google Play order ID for reference';
COMMENT ON COLUMN user_subscriptions.apple_transaction_id IS 'Apple StoreKit transaction ID';
COMMENT ON COLUMN user_subscriptions.apple_original_transaction_id IS 'Apple original transaction ID for subscription group';
COMMENT ON COLUMN user_subscriptions.receipt_verified_at IS 'Last successful receipt verification timestamp';
COMMENT ON COLUMN user_subscriptions.last_verification_attempt IS 'Last receipt verification attempt timestamp';
COMMENT ON COLUMN user_subscriptions.verification_error IS 'Last verification error message if failed';
```

**Update Schema Types** (`/home/omar/viralforge/shared/schema.ts`):
```typescript
// Update userSubscriptions table definition (around line 351)
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tierId: varchar("tier_id").references(() => subscriptionTiers.id).notNull(),
  status: text("status").default("active").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  autoRenew: boolean("auto_renew").default(true).notNull(),

  // Payment method identifiers
  paymentMethod: text("payment_method"), // 'stripe' | 'google_play' | 'apple_store' | 'none'

  // Stripe fields
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),

  // Google Play Billing fields
  googlePlayPurchaseToken: varchar("google_play_purchase_token", { length: 500 }),
  googlePlayOrderId: varchar("google_play_order_id", { length: 255 }),

  // Apple StoreKit fields
  appleTransactionId: varchar("apple_transaction_id", { length: 255 }),
  appleOriginalTransactionId: varchar("apple_original_transaction_id", { length: 255 }),

  // Receipt verification tracking
  receiptVerifiedAt: timestamp("receipt_verified_at"),
  lastVerificationAttempt: timestamp("last_verification_attempt"),
  verificationError: text("verification_error"),

  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Run Migration**:
```bash
cd /home/omar/viralforge
npm run db:migrate
```

---

### 1.4 Implement Usage Limit Checking Middleware
**Priority**: HIGH
**New File**: `/home/omar/viralforge/server/middleware/usageLimit.ts`

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth';
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface FeatureLimits {
  videoAnalysis: number;
  contentGeneration: number;
  trendBookmarks: number;
  videoClips: number;
}

/**
 * Middleware to check if user has reached their usage limit for a feature
 * Usage: app.post('/api/analyze', authenticateToken, checkFeatureLimit('videoAnalysis'), handler)
 */
export const checkFeatureLimit = (feature: keyof FeatureLimits) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Get user's subscription and limits
      const subscription = await db.execute(sql`
        SELECT st.limits, us.status, us.expires_at
        FROM user_subscriptions us
        JOIN subscription_tiers st ON us.tier_id = st.id
        WHERE us.user_id = ${userId}
          AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `);

      if (subscription.rows.length === 0) {
        res.status(403).json({
          error: 'No active subscription found',
          upgradeRequired: true
        });
        return;
      }

      const limits = subscription.rows[0]?.limits as FeatureLimits;
      const featureLimit = limits[feature];

      // -1 means unlimited
      if (featureLimit === -1) {
        next();
        return;
      }

      // Check if subscription has expired
      const expiresAt = subscription.rows[0]?.expires_at;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        res.status(403).json({
          error: 'Subscription expired',
          upgradeRequired: true,
          expired: true
        });
        return;
      }

      // Get current usage for this billing period
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

      const currentUsage = parseInt(usage.rows[0]?.total || '0');

      if (currentUsage >= featureLimit) {
        res.status(403).json({
          error: `You've reached your ${feature} limit`,
          limitReached: true,
          currentUsage,
          limit: featureLimit,
          upgradeRequired: true,
          feature
        });
        return;
      }

      // Attach usage info to request for later tracking
      (req as any).usageInfo = {
        feature,
        currentUsage,
        limit: featureLimit,
        remaining: featureLimit - currentUsage
      };

      next();
    } catch (error) {
      console.error('Error checking feature limit:', error);
      res.status(500).json({ error: 'Failed to check usage limit' });
    }
  };
};

/**
 * Middleware to track feature usage after successful API call
 * Usage: app.post('/api/analyze', authenticateToken, checkFeatureLimit('videoAnalysis'), trackFeatureUsage('videoAnalysis'), handler)
 */
export const trackFeatureUsage = (feature: keyof FeatureLimits, count: number = 1) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        next();
        return;
      }

      const currentPeriod = new Date();
      currentPeriod.setDate(1);
      currentPeriod.setHours(0, 0, 0, 0);

      // Track usage asynchronously (don't block response)
      db.execute(sql`
        INSERT INTO user_usage (user_id, feature, count, period_start)
        VALUES (${userId}, ${feature}, ${count}, ${currentPeriod.toISOString()})
        ON CONFLICT (user_id, feature, period_start)
        DO UPDATE SET count = user_usage.count + EXCLUDED.count
      `).catch(error => {
        console.error('Error tracking feature usage:', error);
      });

      next();
    } catch (error) {
      console.error('Error in trackFeatureUsage middleware:', error);
      next(); // Don't block request if tracking fails
    }
  };
};
```

**Integration Example** (modify existing routes):
```typescript
// In /home/omar/viralforge/server/routes/trends.ts (or wherever video analysis happens)
import { checkFeatureLimit, trackFeatureUsage } from '../middleware/usageLimit';

// BEFORE:
app.post('/api/analyze', authenticateToken, async (req, res) => {
  // ... analysis logic
});

// AFTER:
app.post('/api/analyze',
  authenticateToken,
  checkFeatureLimit('videoAnalysis'),
  async (req, res) => {
    // ... analysis logic

    // Track usage on success
    await trackUsage(req.user.id, 'videoAnalysis', 1);

    res.json({ success: true, ... });
  }
);
```

**Testing**:
```bash
# Test with free tier (3 video analysis limit)
for i in {1..4}; do
  curl -X POST http://localhost:5000/api/analyze \
    -H "Authorization: Bearer FREE_TIER_JWT" \
    -H "Content-Type: application/json" \
    -d '{"videoUrl":"https://example.com/video.mp4"}'
done
# Expected: First 3 succeed, 4th returns 403 with "limitReached: true"
```

---

### 1.5 Add Helper Function for Usage Tracking
**Priority**: MEDIUM
**New File**: `/home/omar/viralforge/server/lib/usageTracking.ts`

```typescript
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Track feature usage for a user
 * Call this after successful feature usage
 */
export async function trackUsage(
  userId: string,
  feature: string,
  count: number = 1
): Promise<void> {
  try {
    const currentPeriod = new Date();
    currentPeriod.setDate(1);
    currentPeriod.setHours(0, 0, 0, 0);

    await db.execute(sql`
      INSERT INTO user_usage (user_id, feature, count, period_start)
      VALUES (${userId}, ${feature}, ${count}, ${currentPeriod.toISOString()})
      ON CONFLICT (user_id, feature, period_start)
      DO UPDATE SET
        count = user_usage.count + EXCLUDED.count,
        created_at = NOW()
    `);

    console.log(`📊 Usage tracked: user=${userId}, feature=${feature}, count=${count}`);
  } catch (error) {
    console.error('Failed to track usage:', error);
    // Don't throw - usage tracking should not break the main flow
  }
}

/**
 * Check if user can use a feature (returns boolean)
 */
export async function canUseFeature(
  userId: string,
  feature: string
): Promise<{ canUse: boolean; reason?: string; currentUsage?: number; limit?: number }> {
  try {
    // Get user's subscription and limits
    const subscription = await db.execute(sql`
      SELECT st.limits, us.status, us.expires_at
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.id
      WHERE us.user_id = ${userId}
        AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `);

    if (subscription.rows.length === 0) {
      return {
        canUse: false,
        reason: 'No active subscription'
      };
    }

    const limits = subscription.rows[0]?.limits as any;
    const featureLimit = limits[feature];

    // -1 means unlimited
    if (featureLimit === -1) {
      return { canUse: true };
    }

    // Check if subscription has expired
    const expiresAt = subscription.rows[0]?.expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return {
        canUse: false,
        reason: 'Subscription expired'
      };
    }

    // Get current usage
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

    const currentUsage = parseInt(usage.rows[0]?.total || '0');

    if (currentUsage >= featureLimit) {
      return {
        canUse: false,
        reason: 'Limit reached',
        currentUsage,
        limit: featureLimit
      };
    }

    return {
      canUse: true,
      currentUsage,
      limit: featureLimit
    };
  } catch (error) {
    console.error('Error checking feature usage:', error);
    return {
      canUse: false,
      reason: 'Error checking limits'
    };
  }
}
```

---

## Phase 1 Deliverables Checklist

- [ ] Fix all subscription route authentication (use `authenticateToken` middleware)
- [ ] Enable subscription creation during user registration
- [ ] Run migration to add mobile payment fields
- [ ] Implement usage limit checking middleware
- [ ] Create usage tracking helper functions
- [ ] Test all endpoints with authenticated JWT tokens
- [ ] Verify free tier users are limited to 3 video analyses
- [ ] Verify subscription is created on registration

**Phase 1 Testing Script**:
```bash
#!/bin/bash
# File: /home/omar/viralforge/scripts/test-phase1.sh

echo "Testing Phase 1 Implementation..."

# 1. Register new user
echo "1. Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser_phase1","password":"password123","subscriptionTier":"free"}')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 2. Check subscription was created
echo "2. Checking subscription..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/subscriptions/current | jq

# 3. Check usage limits
echo "3. Checking usage limits..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/subscriptions/usage | jq

# 4. Test feature limit (try to use videoAnalysis 4 times)
echo "4. Testing feature limits..."
for i in {1..4}; do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:5000/api/subscriptions/check-limit \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"feature":"videoAnalysis"}' | jq
done

echo "Phase 1 tests complete!"
```

---

## Phase 2: Android Payment Integration (Weeks 2-3)

**Goal**: Implement Google Play Billing with receipt verification

### 2.1 Install Dependencies
**Priority**: CRITICAL

**Frontend (Capacitor Plugin)**:
```bash
cd /home/omar/viralforge
npm install @capacitor-community/in-app-purchases
npx cap sync android
```

**Backend (Google Play API)**:
```bash
cd /home/omar/viralforge
npm install googleapis google-auth-library
npm install --save-dev @types/google-auth-library
```

**Update package.json** should include:
```json
{
  "dependencies": {
    "@capacitor-community/in-app-purchases": "^6.0.0",
    "googleapis": "^144.0.0",
    "google-auth-library": "^9.0.0"
  }
}
```

---

### 2.2 Configure Google Play Console
**Priority**: CRITICAL

**Steps** (must be done manually):

1. **Create Service Account**:
   - Go to Google Cloud Console → IAM & Admin → Service Accounts
   - Create service account: `viralforge-subscriptions@PROJECT_ID.iam.gserviceaccount.com`
   - Grant role: "Service Account User"
   - Create JSON key → Download as `google-play-service-account.json`

2. **Link to Google Play Console**:
   - Go to Google Play Console → Settings → API access
   - Link the service account created above
   - Grant permissions: "View financial data", "Manage orders and subscriptions"

3. **Create Subscription Products**:
   - Go to Monetize → Subscriptions → Create subscription
   - Create two products:

   **Product 1: Pro Monthly**
   - Product ID: `viralforge_pro_monthly`
   - Name: "ViralForge Pro Monthly"
   - Description: "Unlimited video analyses, AI content generation, and 50 video clips per month"
   - Price: $14.99 USD
   - Billing period: 1 month
   - Free trial: 7 days (optional)
   - Grace period: 3 days

   **Product 2: Creator Monthly**
   - Product ID: `viralforge_creator_monthly`
   - Name: "ViralForge Creator Monthly"
   - Description: "Everything in Pro plus unlimited video clips, team tools, and API access"
   - Price: $49.99 USD
   - Billing period: 1 month
   - Free trial: 7 days (optional)
   - Grace period: 3 days

4. **Configure License Testing**:
   - Go to Settings → License Testing
   - Add test accounts (your Gmail addresses)
   - These accounts can make test purchases without being charged

5. **Save Configuration Details**:
   - Service account email
   - Product IDs
   - Package name: `com.viralforge.ai`

---

### 2.3 Store Google Play Service Account Credentials
**Priority**: CRITICAL

**Create Environment Variable** (`/home/omar/viralforge/.env`):
```bash
# Google Play Billing
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=viralforge-subscriptions@PROJECT_ID.iam.gserviceaccount.com
GOOGLE_PLAY_PACKAGE_NAME=com.viralforge.ai

# Store the service account JSON as base64 (for production)
# Generate with: cat google-play-service-account.json | base64 -w 0
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64=eyJhbGc...

# OR for development, store the file path
GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=/home/omar/viralforge/google-play-service-account.json
```

**Security Note**: Add to `.gitignore`:
```bash
# Add to /home/omar/viralforge/.gitignore
google-play-service-account.json
*.pem
*.p12
```

---

### 2.4 Create Google Play Billing Service
**Priority**: CRITICAL
**New File**: `/home/omar/viralforge/server/lib/googlePlayBilling.ts`

```typescript
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const androidPublisher = google.androidpublisher('v3');

interface GooglePlayConfig {
  serviceAccountEmail: string;
  serviceAccountKeyPath?: string;
  serviceAccountKeyBase64?: string;
  packageName: string;
}

class GooglePlayBillingService {
  private auth: JWT | null = null;
  private config: GooglePlayConfig;

  constructor() {
    // Load configuration from environment
    this.config = {
      serviceAccountEmail: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL || '',
      serviceAccountKeyPath: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH,
      serviceAccountKeyBase64: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64,
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.viralforge.ai',
    };

    if (!this.config.serviceAccountEmail) {
      console.warn('⚠️  Google Play service account not configured');
    }
  }

  /**
   * Initialize authentication with Google Play API
   */
  private async initializeAuth(): Promise<JWT> {
    if (this.auth) {
      return this.auth;
    }

    let keyFile: any;

    // Load key from base64 (production) or file path (development)
    if (this.config.serviceAccountKeyBase64) {
      const jsonString = Buffer.from(
        this.config.serviceAccountKeyBase64,
        'base64'
      ).toString('utf-8');
      keyFile = JSON.parse(jsonString);
    } else if (this.config.serviceAccountKeyPath) {
      const fs = await import('fs/promises');
      const keyContent = await fs.readFile(this.config.serviceAccountKeyPath, 'utf-8');
      keyFile = JSON.parse(keyContent);
    } else {
      throw new Error('Google Play service account credentials not configured');
    }

    this.auth = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    return this.auth;
  }

  /**
   * Verify a subscription purchase token
   * Returns subscription details if valid
   */
  async verifySubscription(productId: string, purchaseToken: string): Promise<{
    valid: boolean;
    orderId?: string;
    purchaseTime?: number;
    expiryTime?: number;
    autoRenewing?: boolean;
    paymentState?: number;
    cancelReason?: number;
    error?: string;
  }> {
    try {
      const auth = await this.initializeAuth();

      const response = await androidPublisher.purchases.subscriptions.get({
        auth,
        packageName: this.config.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const purchase = response.data;

      // paymentState: 0 = Payment pending, 1 = Payment received, 2 = Free trial, 3 = Pending deferred upgrade/downgrade
      const isValid = purchase.paymentState === 1 || purchase.paymentState === 2;

      return {
        valid: isValid,
        orderId: purchase.orderId || undefined,
        purchaseTime: purchase.startTimeMillis ? parseInt(purchase.startTimeMillis) : undefined,
        expiryTime: purchase.expiryTimeMillis ? parseInt(purchase.expiryTimeMillis) : undefined,
        autoRenewing: purchase.autoRenewing || false,
        paymentState: purchase.paymentState || 0,
        cancelReason: purchase.cancelReason || undefined,
      };
    } catch (error: any) {
      console.error('Google Play receipt verification failed:', error);

      if (error.code === 401) {
        return { valid: false, error: 'Authentication failed' };
      }

      if (error.code === 404) {
        return { valid: false, error: 'Purchase not found' };
      }

      return {
        valid: false,
        error: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Acknowledge a subscription purchase
   * Required by Google Play within 3 days of purchase
   */
  async acknowledgeSubscription(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      const auth = await this.initializeAuth();

      await androidPublisher.purchases.subscriptions.acknowledge({
        auth,
        packageName: this.config.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      console.log(`✅ Subscription acknowledged: ${productId}`);
      return true;
    } catch (error) {
      console.error('Failed to acknowledge subscription:', error);
      return false;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(productId: string, purchaseToken: string) {
    try {
      const auth = await this.initializeAuth();

      const response = await androidPublisher.purchases.subscriptions.get({
        auth,
        packageName: this.config.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get subscription details:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      const auth = await this.initializeAuth();

      await androidPublisher.purchases.subscriptions.cancel({
        auth,
        packageName: this.config.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      console.log(`✅ Subscription cancelled: ${productId}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  /**
   * Refund and revoke a subscription
   */
  async refundSubscription(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      const auth = await this.initializeAuth();

      await androidPublisher.purchases.subscriptions.refund({
        auth,
        packageName: this.config.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      // Also revoke access
      await androidPublisher.purchases.subscriptions.revoke({
        auth,
        packageName: this.config.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      console.log(`✅ Subscription refunded and revoked: ${productId}`);
      return true;
    } catch (error) {
      console.error('Failed to refund subscription:', error);
      return false;
    }
  }
}

// Export singleton instance
export const googlePlayBilling = new GooglePlayBillingService();
```

---

### 2.5 Create Mobile Subscription Routes
**Priority**: CRITICAL
**New File**: `/home/omar/viralforge/server/routes/mobileSubscriptions.ts`

```typescript
import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../auth';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { googlePlayBilling } from '../lib/googlePlayBilling';

const router = Router();

/**
 * Get available subscription products for mobile
 * Returns product IDs that match the client's platform
 */
router.get('/products', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.query.platform as string; // 'android' or 'ios'

    // Get all active tiers except free
    const tiers = await db.execute(sql`
      SELECT id, name, display_name, description, price_monthly, price_yearly, features, limits
      FROM subscription_tiers
      WHERE is_active = true AND name != 'free'
      ORDER BY sort_order ASC
    `);

    // Map to mobile product IDs
    const products = tiers.rows.map((tier: any) => ({
      tierId: tier.id,
      name: tier.name,
      displayName: tier.display_name,
      description: tier.description,
      priceMonthly: tier.price_monthly,
      priceYearly: tier.price_yearly,
      features: tier.features,
      limits: tier.limits,
      // Platform-specific product IDs
      productIds: {
        android: {
          monthly: `viralforge_${tier.name}_monthly`,
          yearly: `viralforge_${tier.name}_yearly`,
        },
        ios: {
          monthly: `viralforge_${tier.name}_monthly`,
          yearly: `viralforge_${tier.name}_yearly`,
        },
      },
    }));

    res.json({
      success: true,
      products,
      platform,
    });
  } catch (error) {
    console.error('Failed to fetch mobile products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
    });
  }
});

/**
 * Verify and activate a mobile subscription purchase
 * Called after user completes purchase in-app
 */
router.post('/verify-purchase', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      platform,
      productId,
      purchaseToken,
      orderId,
      tierId
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!platform || !productId || !purchaseToken || !tierId) {
      return res.status(400).json({
        error: 'Missing required fields: platform, productId, purchaseToken, tierId',
      });
    }

    console.log(`🔍 Verifying purchase: platform=${platform}, product=${productId}, user=${userId}`);

    // Verify with platform API
    let verificationResult: any;

    if (platform === 'android') {
      verificationResult = await googlePlayBilling.verifySubscription(productId, purchaseToken);
    } else if (platform === 'ios') {
      // TODO: Implement Apple StoreKit verification in Phase 3
      return res.status(501).json({
        error: 'iOS verification not yet implemented',
      });
    } else {
      return res.status(400).json({
        error: 'Invalid platform',
      });
    }

    if (!verificationResult.valid) {
      console.error(`❌ Purchase verification failed:`, verificationResult.error);
      return res.status(400).json({
        success: false,
        error: verificationResult.error || 'Purchase verification failed',
      });
    }

    console.log(`✅ Purchase verified successfully`);

    // Check if this purchase token already exists
    const existingSubscription = await db.execute(sql`
      SELECT id FROM user_subscriptions
      WHERE google_play_purchase_token = ${purchaseToken}
      LIMIT 1
    `);

    if (existingSubscription.rows.length > 0) {
      console.log(`⚠️  Purchase token already registered`);
      return res.json({
        success: true,
        message: 'Subscription already active',
        alreadyRegistered: true,
      });
    }

    // Deactivate any existing subscriptions for this user
    await db.execute(sql`
      UPDATE user_subscriptions
      SET status = 'cancelled', cancelled_at = NOW(), auto_renew = false
      WHERE user_id = ${userId} AND status = 'active'
    `);

    // Calculate expiry time
    const expiresAt = verificationResult.expiryTime
      ? new Date(verificationResult.expiryTime)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days fallback

    // Determine billing cycle from product ID
    const billingCycle = productId.includes('yearly') ? 'yearly' : 'monthly';

    // Create new subscription record
    await db.execute(sql`
      INSERT INTO user_subscriptions (
        user_id,
        tier_id,
        status,
        billing_cycle,
        payment_method,
        started_at,
        expires_at,
        auto_renew,
        google_play_purchase_token,
        google_play_order_id,
        receipt_verified_at,
        last_verification_attempt
      ) VALUES (
        ${userId},
        ${tierId},
        'active',
        ${billingCycle},
        'google_play',
        NOW(),
        ${expiresAt.toISOString()},
        ${verificationResult.autoRenewing || false},
        ${purchaseToken},
        ${orderId || verificationResult.orderId || null},
        NOW(),
        NOW()
      )
    `);

    // Acknowledge the purchase with Google Play
    if (platform === 'android') {
      await googlePlayBilling.acknowledgeSubscription(productId, purchaseToken);
    }

    console.log(`✅ Subscription activated for user ${userId}`);

    // Reset usage for the new billing period
    await db.execute(sql`
      DELETE FROM user_usage
      WHERE user_id = ${userId}
    `);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: {
        tierId,
        status: 'active',
        expiresAt: expiresAt.toISOString(),
        autoRenew: verificationResult.autoRenewing,
      },
    });
  } catch (error) {
    console.error('Failed to verify purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify purchase',
    });
  }
});

/**
 * Restore purchases (for users who reinstall the app)
 */
router.post('/restore-purchases', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { platform, purchases } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!purchases || !Array.isArray(purchases)) {
      return res.status(400).json({
        error: 'purchases array required',
      });
    }

    console.log(`🔄 Restoring purchases for user ${userId}, platform: ${platform}`);

    let restoredCount = 0;
    const errors: string[] = [];

    for (const purchase of purchases) {
      try {
        const { productId, purchaseToken, orderId } = purchase;

        // Verify the purchase is still valid
        let verificationResult: any;

        if (platform === 'android') {
          verificationResult = await googlePlayBilling.verifySubscription(productId, purchaseToken);
        } else {
          // iOS verification will be added in Phase 3
          continue;
        }

        if (!verificationResult.valid) {
          errors.push(`${productId}: ${verificationResult.error}`);
          continue;
        }

        // Check if purchase already exists
        const existing = await db.execute(sql`
          SELECT id FROM user_subscriptions
          WHERE google_play_purchase_token = ${purchaseToken}
        `);

        if (existing.rows.length > 0) {
          // Update user_id if different (user reinstalled on different account)
          await db.execute(sql`
            UPDATE user_subscriptions
            SET user_id = ${userId},
                updated_at = NOW()
            WHERE google_play_purchase_token = ${purchaseToken}
          `);
          restoredCount++;
          continue;
        }

        // Map product ID to tier ID
        const tierName = productId.split('_')[1]; // viralforge_pro_monthly -> pro
        const expiresAt = verificationResult.expiryTime
          ? new Date(verificationResult.expiryTime)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Create subscription record
        await db.execute(sql`
          INSERT INTO user_subscriptions (
            user_id,
            tier_id,
            status,
            billing_cycle,
            payment_method,
            started_at,
            expires_at,
            auto_renew,
            google_play_purchase_token,
            google_play_order_id,
            receipt_verified_at
          ) VALUES (
            ${userId},
            ${tierName},
            'active',
            'monthly',
            'google_play',
            NOW(),
            ${expiresAt.toISOString()},
            ${verificationResult.autoRenewing},
            ${purchaseToken},
            ${orderId || verificationResult.orderId},
            NOW()
          )
          ON CONFLICT (google_play_purchase_token) DO NOTHING
        `);

        restoredCount++;
      } catch (error) {
        console.error(`Failed to restore purchase:`, error);
        errors.push(`${purchase.productId}: ${error}`);
      }
    }

    res.json({
      success: true,
      restoredCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore purchases',
    });
  }
});

export default router;
```

**Register Route** (in `/home/omar/viralforge/server/index.ts`):
```typescript
import mobileSubscriptionRoutes from './routes/mobileSubscriptions';
app.use('/api/mobile/subscriptions', mobileSubscriptionRoutes);
```

---

### 2.6 Create Capacitor Service (Frontend)
**Priority**: CRITICAL
**New File**: `/home/omar/viralforge/client/src/lib/inAppPurchases.ts`

```typescript
import { InAppPurchases, type PurchaseResult } from '@capacitor-community/in-app-purchases';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionProduct {
  tierId: string;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  features: string[];
  productIds: {
    android: {
      monthly: string;
      yearly: string;
    };
    ios: {
      monthly: string;
      yearly: string;
    };
  };
}

class InAppPurchaseService {
  private initialized = false;
  private products: SubscriptionProduct[] = [];

  /**
   * Initialize the in-app purchase service
   * Call this on app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('In-app purchases only available on native platforms');
      return;
    }

    try {
      // Connect to the store
      await InAppPurchases.connectToStore();
      console.log('✅ Connected to app store');

      // Load available products
      await this.loadProducts();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize in-app purchases:', error);
      throw error;
    }
  }

  /**
   * Load available subscription products from backend
   */
  async loadProducts(): Promise<SubscriptionProduct[]> {
    try {
      const platform = Capacitor.getPlatform();
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/mobile/subscriptions/products?platform=${platform}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      this.products = data.products;

      // Query store for product details (prices, etc.)
      const productIds = this.products.flatMap(p => {
        const ids = platform === 'android' ? p.productIds.android : p.productIds.ios;
        return [ids.monthly, ids.yearly];
      });

      const storeProducts = await InAppPurchases.queryProductDetails({
        productIdentifiers: productIds,
      });

      console.log('Store products:', storeProducts);

      return this.products;
    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    }
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(
    tierId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<PurchaseResult> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const product = this.products.find(p => p.tierId === tierId);
      if (!product) {
        throw new Error(`Product not found: ${tierId}`);
      }

      const platform = Capacitor.getPlatform();
      const productId = platform === 'android'
        ? product.productIds.android[billingCycle]
        : product.productIds.ios[billingCycle];

      console.log(`🛒 Initiating purchase: ${productId}`);

      // Start purchase flow
      const purchaseResult = await InAppPurchases.purchase({
        productIdentifier: productId,
      });

      console.log('Purchase result:', purchaseResult);

      // Verify purchase with backend
      if (purchaseResult.receipt) {
        await this.verifyPurchaseWithBackend(
          platform,
          productId,
          purchaseResult.receipt,
          purchaseResult.transactionId || '',
          tierId
        );
      }

      return purchaseResult;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Verify purchase with backend
   */
  private async verifyPurchaseWithBackend(
    platform: string,
    productId: string,
    purchaseToken: string,
    orderId: string,
    tierId: string
  ): Promise<void> {
    const token = localStorage.getItem('authToken');

    const response = await fetch('/api/mobile/subscriptions/verify-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        platform,
        productId,
        purchaseToken,
        orderId,
        tierId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Purchase verification failed');
    }

    const data = await response.json();
    console.log('✅ Purchase verified:', data);
  }

  /**
   * Restore previous purchases
   * Call this when user logs in or reinstalls app
   */
  async restorePurchases(): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log('🔄 Restoring purchases...');

      const restoreResult = await InAppPurchases.restorePurchases();
      console.log('Restore result:', restoreResult);

      if (restoreResult.purchases && restoreResult.purchases.length > 0) {
        const platform = Capacitor.getPlatform();
        const token = localStorage.getItem('authToken');

        // Send all purchases to backend for verification
        const response = await fetch('/api/mobile/subscriptions/restore-purchases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            platform,
            purchases: restoreResult.purchases.map(p => ({
              productId: p.productId,
              purchaseToken: p.receipt,
              orderId: p.transactionId,
            })),
          }),
        });

        const data = await response.json();
        console.log(`✅ Restored ${data.restoredCount} purchases`);
      } else {
        console.log('No purchases to restore');
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  /**
   * Get available products
   */
  getProducts(): SubscriptionProduct[] {
    return this.products;
  }

  /**
   * Disconnect from store
   * Call this when app closes
   */
  async disconnect(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await InAppPurchases.disconnectFromStore();
      this.initialized = false;
      console.log('Disconnected from app store');
    } catch (error) {
      console.error('Failed to disconnect from store:', error);
    }
  }
}

// Export singleton instance
export const inAppPurchaseService = new InAppPurchaseService();
```

---

### 2.7 Update Plan Selection Component
**Priority**: HIGH
**File to Modify**: `/home/omar/viralforge/client/src/components/auth/PlanSelection.tsx`

**Add Purchase Flow** (lines 84-86):

```typescript
// BEFORE:
const handleContinue = () => {
  onSelectPlan(selectedPlan);
};

// AFTER:
import { inAppPurchaseService } from '@/lib/inAppPurchases';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();
const [loading, setLoading] = useState(false);

const handleContinue = async () => {
  if (selectedPlan === 'free') {
    onSelectPlan(selectedPlan);
    return;
  }

  // On mobile, initiate in-app purchase
  if (Capacitor.isNativePlatform()) {
    try {
      setLoading(true);

      toast({
        title: 'Processing purchase...',
        description: 'Please complete the payment in the app store',
      });

      await inAppPurchaseService.purchaseSubscription(selectedPlan, 'monthly');

      toast({
        title: 'Success!',
        description: 'Your subscription has been activated',
      });

      // Refresh subscription status
      window.location.reload();
    } catch (error) {
      console.error('Purchase failed:', error);

      toast({
        title: 'Purchase failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  } else {
    // On web, use Stripe (existing flow)
    onSelectPlan(selectedPlan);
  }
};
```

**Update Button** (line 167):
```typescript
<Button
  onClick={handleContinue}
  size="lg"
  className="min-w-[200px]"
  disabled={loading}
>
  {loading ? 'Processing...' : `Continue with ${PLANS.find(p => p.id === selectedPlan)?.display_name}`}
  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
</Button>
```

---

### 2.8 Initialize In-App Purchases on App Startup
**Priority**: HIGH
**File to Modify**: `/home/omar/viralforge/client/src/main.tsx`

**Add Initialization** (after line 10):
```typescript
import { inAppPurchaseService } from '@/lib/inAppPurchases';
import { Capacitor } from '@capacitor/core';

// Initialize in-app purchases on app startup
if (Capacitor.isNativePlatform()) {
  inAppPurchaseService.initialize().catch(error => {
    console.error('Failed to initialize in-app purchases:', error);
  });
}
```

---

## Phase 2 Deliverables Checklist

- [ ] Install @capacitor-community/in-app-purchases plugin
- [ ] Configure Google Play Console (products, service account)
- [ ] Store service account credentials securely
- [ ] Implement Google Play Billing service
- [ ] Create mobile subscription routes
- [ ] Implement Capacitor in-app purchase service
- [ ] Update plan selection component for mobile
- [ ] Initialize IAP service on app startup
- [ ] Test purchase flow on Android device
- [ ] Verify purchases are stored in database
- [ ] Test restore purchases functionality

**Phase 2 Testing Script**:
```bash
#!/bin/bash
# File: /home/omar/viralforge/scripts/test-phase2.sh

echo "Testing Phase 2 - Android Billing Integration..."

# Build and deploy to Android
cd /home/omar/viralforge
npm run build
npx cap sync android
npx cap open android

# Manual testing checklist:
echo "Manual Testing Checklist:"
echo "1. [ ] Open app on Android device"
echo "2. [ ] Navigate to subscription page"
echo "3. [ ] See all subscription products loaded"
echo "4. [ ] Tap 'Pro' plan"
echo "5. [ ] Complete Google Play purchase flow (test account)"
echo "6. [ ] Verify subscription activated in app"
echo "7. [ ] Check database for subscription record"
echo "8. [ ] Uninstall app and reinstall"
echo "9. [ ] Login and tap 'Restore Purchases'"
echo "10. [ ] Verify subscription restored"

# Backend verification
echo "Backend Verification:"
curl -s -H "Authorization: Bearer USER_TOKEN" \
  http://localhost:5000/api/subscriptions/current | jq

# Check database directly
psql $DATABASE_URL -c "SELECT * FROM user_subscriptions WHERE payment_method = 'google_play' ORDER BY created_at DESC LIMIT 5;"
```

---

## Phase 3: iOS Payment Integration (Weeks 4-5)

**Note**: This phase will be implemented after Android is fully working. The structure is similar to Android but uses Apple StoreKit APIs.

### 3.1 Install Dependencies

```bash
npm install @apple/app-store-server-library
npm install --save-dev @types/apple-app-store-server-library
```

### 3.2 Configure App Store Connect

1. Create subscription products in App Store Connect
2. Generate App Store Connect API key
3. Configure server-side verification

### 3.3 Implement Apple StoreKit Verification Service

**New File**: `/home/omar/viralforge/server/lib/appleStoreKit.ts`

(Similar structure to googlePlayBilling.ts, but using Apple's APIs)

### 3.4 Update Mobile Subscription Routes

Add iOS verification logic to `/home/omar/viralforge/server/routes/mobileSubscriptions.ts`

---

## Phase 4: Production Hardening (Week 6)

**Goal**: Add monitoring, error handling, automated testing, and documentation

### 4.1 Add Subscription Webhook Handler (Google Play)
**Priority**: HIGH
**New File**: `/home/omar/viralforge/server/routes/webhooks.ts`

```typescript
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { googlePlayBilling } from '../lib/googlePlayBilling';

const router = Router();

/**
 * Google Play Real-Time Developer Notifications
 * Webhook endpoint for subscription changes
 */
router.post('/google-play', async (req: Request, res: Response) => {
  try {
    const notification = req.body;

    console.log('📬 Received Google Play notification:', JSON.stringify(notification));

    // Acknowledge receipt immediately
    res.status(200).send('OK');

    // Process notification asynchronously
    processGooglePlayNotification(notification).catch(error => {
      console.error('Failed to process Google Play notification:', error);
    });
  } catch (error) {
    console.error('Error handling Google Play webhook:', error);
    res.status(500).send('Error');
  }
});

async function processGooglePlayNotification(notification: any): Promise<void> {
  try {
    const { subscriptionNotification } = notification.message?.data || {};

    if (!subscriptionNotification) {
      console.log('No subscription notification in payload');
      return;
    }

    const {
      subscriptionId,
      purchaseToken,
      notificationType,
    } = subscriptionNotification;

    console.log(`Processing notification: type=${notificationType}, subscription=${subscriptionId}`);

    // Notification types:
    // 1 = SUBSCRIPTION_RECOVERED
    // 2 = SUBSCRIPTION_RENEWED
    // 3 = SUBSCRIPTION_CANCELED
    // 4 = SUBSCRIPTION_PURCHASED
    // 5 = SUBSCRIPTION_ON_HOLD
    // 6 = SUBSCRIPTION_IN_GRACE_PERIOD
    // 7 = SUBSCRIPTION_RESTARTED
    // 8 = SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
    // 9 = SUBSCRIPTION_DEFERRED
    // 10 = SUBSCRIPTION_PAUSED
    // 11 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
    // 12 = SUBSCRIPTION_REVOKED
    // 13 = SUBSCRIPTION_EXPIRED

    switch (notificationType) {
      case 2: // RENEWED
      case 4: // PURCHASED
      case 1: // RECOVERED
      case 7: // RESTARTED
        await handleSubscriptionActivated(subscriptionId, purchaseToken);
        break;

      case 3: // CANCELED
      case 13: // EXPIRED
        await handleSubscriptionCanceled(purchaseToken);
        break;

      case 12: // REVOKED (refunded)
        await handleSubscriptionRevoked(purchaseToken);
        break;

      case 5: // ON_HOLD
      case 6: // GRACE_PERIOD
        await handleSubscriptionOnHold(purchaseToken);
        break;

      default:
        console.log(`Unhandled notification type: ${notificationType}`);
    }
  } catch (error) {
    console.error('Failed to process notification:', error);
    throw error;
  }
}

async function handleSubscriptionActivated(
  subscriptionId: string,
  purchaseToken: string
): Promise<void> {
  try {
    // Verify with Google Play API
    const verification = await googlePlayBilling.verifySubscription(
      subscriptionId,
      purchaseToken
    );

    if (!verification.valid) {
      console.error('Subscription verification failed:', verification.error);
      return;
    }

    const expiresAt = verification.expiryTime
      ? new Date(verification.expiryTime)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update subscription status
    await db.execute(sql`
      UPDATE user_subscriptions
      SET
        status = 'active',
        expires_at = ${expiresAt.toISOString()},
        auto_renew = ${verification.autoRenewing || false},
        receipt_verified_at = NOW(),
        last_verification_attempt = NOW(),
        verification_error = NULL,
        updated_at = NOW()
      WHERE google_play_purchase_token = ${purchaseToken}
    `);

    console.log(`✅ Subscription activated: ${purchaseToken}`);
  } catch (error) {
    console.error('Failed to handle subscription activation:', error);
  }
}

async function handleSubscriptionCanceled(purchaseToken: string): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE user_subscriptions
      SET
        status = 'cancelled',
        auto_renew = false,
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE google_play_purchase_token = ${purchaseToken}
        AND status = 'active'
    `);

    console.log(`✅ Subscription cancelled: ${purchaseToken}`);
  } catch (error) {
    console.error('Failed to handle subscription cancellation:', error);
  }
}

async function handleSubscriptionRevoked(purchaseToken: string): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE user_subscriptions
      SET
        status = 'revoked',
        auto_renew = false,
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE google_play_purchase_token = ${purchaseToken}
    `);

    console.log(`✅ Subscription revoked (refunded): ${purchaseToken}`);
  } catch (error) {
    console.error('Failed to handle subscription revocation:', error);
  }
}

async function handleSubscriptionOnHold(purchaseToken: string): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE user_subscriptions
      SET
        status = 'on_hold',
        updated_at = NOW()
      WHERE google_play_purchase_token = ${purchaseToken}
    `);

    console.log(`⚠️  Subscription on hold: ${purchaseToken}`);
  } catch (error) {
    console.error('Failed to handle subscription on hold:', error);
  }
}

export default router;
```

**Register Webhook** (in `/home/omar/viralforge/server/index.ts`):
```typescript
import webhookRoutes from './routes/webhooks';
app.use('/webhooks', webhookRoutes);
```

**Configure in Google Play Console**:
1. Go to Monetize → Monetization setup
2. Enable Real-time developer notifications
3. Set topic name: `viralforge-subscriptions`
4. Set webhook URL: `https://your-domain.com/webhooks/google-play`

---

### 4.2 Add Subscription Verification Cron Job
**Priority**: HIGH
**New File**: `/home/omar/viralforge/server/jobs/verifySubscriptions.ts`

```typescript
import cron from 'node-cron';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { googlePlayBilling } from '../lib/googlePlayBilling';

/**
 * Verify all active subscriptions daily
 * Catches any subscriptions that expired without webhook notification
 */
export function startSubscriptionVerificationJob() {
  // Run every day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('🔍 Starting subscription verification job...');

    try {
      await verifyActiveSubscriptions();
      console.log('✅ Subscription verification completed');
    } catch (error) {
      console.error('❌ Subscription verification failed:', error);
    }
  });

  console.log('✅ Subscription verification job scheduled (daily at 3 AM)');
}

async function verifyActiveSubscriptions(): Promise<void> {
  // Get all active subscriptions with Google Play payment method
  const subscriptions = await db.execute(sql`
    SELECT
      id,
      user_id,
      tier_id,
      google_play_purchase_token,
      expires_at
    FROM user_subscriptions
    WHERE status = 'active'
      AND payment_method = 'google_play'
      AND google_play_purchase_token IS NOT NULL
    ORDER BY expires_at ASC
  `);

  console.log(`Found ${subscriptions.rows.length} subscriptions to verify`);

  let verifiedCount = 0;
  let expiredCount = 0;
  let errorCount = 0;

  for (const subscription of subscriptions.rows) {
    try {
      const { id, user_id, google_play_purchase_token, expires_at } = subscription as any;

      // Extract product ID from tier_id
      const tierName = subscription.tier_id;
      const productId = `viralforge_${tierName}_monthly`; // TODO: Handle yearly

      // Verify with Google Play
      const verification = await googlePlayBilling.verifySubscription(
        productId,
        google_play_purchase_token
      );

      if (verification.valid) {
        // Update expiry time if it changed
        const newExpiresAt = verification.expiryTime
          ? new Date(verification.expiryTime)
          : null;

        await db.execute(sql`
          UPDATE user_subscriptions
          SET
            expires_at = ${newExpiresAt?.toISOString()},
            auto_renew = ${verification.autoRenewing || false},
            receipt_verified_at = NOW(),
            last_verification_attempt = NOW(),
            verification_error = NULL
          WHERE id = ${id}
        `);

        verifiedCount++;
      } else {
        // Subscription is invalid - mark as expired
        await db.execute(sql`
          UPDATE user_subscriptions
          SET
            status = 'expired',
            auto_renew = false,
            last_verification_attempt = NOW(),
            verification_error = ${verification.error || 'Verification failed'}
          WHERE id = ${id}
        `);

        expiredCount++;
        console.log(`❌ Subscription expired: user=${user_id}, error=${verification.error}`);
      }
    } catch (error) {
      errorCount++;
      console.error('Failed to verify subscription:', error);

      // Update last verification attempt
      await db.execute(sql`
        UPDATE user_subscriptions
        SET
          last_verification_attempt = NOW(),
          verification_error = ${error instanceof Error ? error.message : 'Unknown error'}
        WHERE id = ${subscription.id}
      `);
    }
  }

  console.log(`Verification complete: verified=${verifiedCount}, expired=${expiredCount}, errors=${errorCount}`);
}
```

**Start Job** (in `/home/omar/viralforge/server/index.ts`):
```typescript
import { startSubscriptionVerificationJob } from './jobs/verifySubscriptions';

// Start cron jobs
startSubscriptionVerificationJob();
```

---

### 4.3 Add Monitoring and Analytics
**Priority**: MEDIUM
**File to Modify**: `/home/omar/viralforge/client/src/lib/analytics.ts`

```typescript
// Add subscription-related events

export const trackSubscriptionPurchased = (tierId: string, price: number, platform: string) => {
  if (posthog) {
    posthog.capture('subscription_purchased', {
      tier_id: tierId,
      price,
      platform,
      currency: 'USD',
    });
  }

  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: Date.now().toString(),
      value: price / 100,
      currency: 'USD',
      items: [{
        item_id: tierId,
        item_name: `ViralForge ${tierId}`,
        price: price / 100,
      }],
    });
  }
};

export const trackSubscriptionCancelled = (tierId: string, reason?: string) => {
  if (posthog) {
    posthog.capture('subscription_cancelled', {
      tier_id: tierId,
      reason,
    });
  }
};

export const trackFeatureLimitReached = (feature: string, limit: number) => {
  if (posthog) {
    posthog.capture('feature_limit_reached', {
      feature,
      limit,
    });
  }
};
```

---

### 4.4 Add Error Handling and Retry Logic
**Priority**: MEDIUM
**New File**: `/home/omar/viralforge/server/lib/retryHelper.ts`

```typescript
/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

**Usage Example**:
```typescript
import { retryWithBackoff } from './lib/retryHelper';

// Retry Google Play verification with backoff
const verification = await retryWithBackoff(
  () => googlePlayBilling.verifySubscription(productId, purchaseToken),
  3,
  1000
);
```

---

### 4.5 Add Comprehensive Testing
**Priority**: HIGH
**New File**: `/home/omar/viralforge/tests/subscriptions.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

describe('Subscription System', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: `testuser_${Date.now()}`,
        password: 'password123',
        subscriptionTier: 'free',
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.execute(sql`
      DELETE FROM user_subscriptions WHERE user_id = ${userId}
    `);
    await db.execute(sql`
      DELETE FROM users WHERE id = ${userId}
    `);
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current');

      expect(response.status).toBe(401);
    });

    it('should accept authenticated requests', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Subscription Creation', () => {
    it('should create free subscription on registration', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.subscription.tier_name).toBe('free');
      expect(response.body.subscription.status).toBe('active');
    });
  });

  describe('Usage Limits', () => {
    it('should return correct limits for free tier', async () => {
      const response = await request(app)
        .get('/api/subscriptions/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.limits.videoAnalysis).toBe(3);
      expect(response.body.limits.contentGeneration).toBe(5);
    });

    it('should enforce feature limits', async () => {
      // Use up all video analysis credits
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/subscriptions/track-usage')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ feature: 'videoAnalysis', count: 1 });
      }

      // Check limit
      const response = await request(app)
        .post('/api/subscriptions/check-limit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ feature: 'videoAnalysis' });

      expect(response.status).toBe(200);
      expect(response.body.canUse).toBe(false);
      expect(response.body.currentUsage).toBe(3);
      expect(response.body.limit).toBe(3);
    });
  });

  describe('Mobile Subscriptions', () => {
    it('should fetch available products', async () => {
      const response = await request(app)
        .get('/api/mobile/subscriptions/products?platform=android')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(2); // pro and creator
    });

    // Note: Full purchase flow requires Google Play Test environment
  });
});
```

**Run Tests**:
```bash
cd /home/omar/viralforge
npm test -- subscriptions.test.ts
```

---

### 4.6 Create Documentation
**Priority**: MEDIUM
**New File**: `/home/omar/viralforge/docs/SUBSCRIPTION_SYSTEM.md`

```markdown
# ViralForge Subscription System Documentation

## Overview

ViralForge uses native mobile billing (Google Play Billing / Apple StoreKit) for in-app subscriptions.

## Architecture

```
Mobile App (Capacitor)
  ↓ (Purchase via @capacitor-community/in-app-purchases)
Google Play / App Store
  ↓ (Receipt/Token)
ViralForge Backend
  ↓ (Verify via Google Play API / StoreKit API)
PostgreSQL Database
```

## Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 video analyses, 5 content ideas, 10 bookmarks |
| Pro | $14.99/mo | Unlimited analyses, 50 clips/month |
| Creator | $49.99/mo | Unlimited everything, API access |

## API Endpoints

### Get Current Subscription
```http
GET /api/subscriptions/current
Authorization: Bearer <jwt_token>
```

### Check Feature Limit
```http
POST /api/subscriptions/check-limit
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "feature": "videoAnalysis"
}
```

### Mobile: Get Products
```http
GET /api/mobile/subscriptions/products?platform=android
Authorization: Bearer <jwt_token>
```

### Mobile: Verify Purchase
```http
POST /api/mobile/subscriptions/verify-purchase
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "platform": "android",
  "productId": "viralforge_pro_monthly",
  "purchaseToken": "...",
  "orderId": "...",
  "tierId": "pro"
}
```

## Testing

### Test Accounts
- Add Gmail addresses to Google Play Console → License Testing
- Use these accounts for test purchases (no actual charges)

### Manual Testing Flow
1. Build app: `npm run build && npx cap sync android`
2. Open in Android Studio: `npx cap open android`
3. Run on device
4. Navigate to subscription page
5. Complete test purchase
6. Verify subscription activated
7. Test feature limits
8. Test restore purchases after reinstall

## Monitoring

- PostHog events: `subscription_purchased`, `subscription_cancelled`, `feature_limit_reached`
- Google Play webhooks: Real-time notifications for subscription changes
- Daily cron job: Verifies all active subscriptions

## Troubleshooting

### Purchase verification fails
- Check Google Play service account credentials
- Verify service account has correct permissions
- Check purchase token is valid

### Subscription not activated
- Check webhook endpoint is accessible
- Verify purchase was acknowledged within 3 days
- Check subscription status in Google Play Console

### Feature limits not enforced
- Verify middleware is applied to routes
- Check user_usage table has correct data
- Verify subscription tier has correct limits
```

---

## Phase 4 Deliverables Checklist

- [ ] Implement Google Play webhook handler
- [ ] Create subscription verification cron job
- [ ] Add subscription analytics events
- [ ] Implement retry logic with exponential backoff
- [ ] Write comprehensive test suite
- [ ] Create documentation
- [ ] Set up monitoring dashboard
- [ ] Configure Google Play webhooks
- [ ] Test webhook notifications
- [ ] Verify cron job runs successfully

---

## Rollback Plans

### Phase 1 Rollback
If authentication fixes break existing functionality:
```bash
# Revert changes to subscriptions.ts
git checkout HEAD -- server/routes/subscriptions.ts

# Restart server
npm run dev
```

### Phase 2 Rollback
If Google Play Billing integration fails:
```bash
# Disable mobile subscriptions
# Set feature flag in .env
ENABLE_MOBILE_SUBSCRIPTIONS=false

# Hide subscription UI on mobile
# In PlanSelection.tsx, check flag before showing paid plans
```

### Phase 3 Rollback
If iOS integration causes issues:
```bash
# Disable iOS purchases
# In inAppPurchases.ts, add platform check
if (platform === 'ios') {
  throw new Error('iOS subscriptions temporarily unavailable');
}
```

### Phase 4 Rollback
If webhooks or cron jobs cause issues:
```bash
# Disable webhook processing
# Comment out webhook route registration
# app.use('/webhooks', webhookRoutes);

# Disable cron job
# Comment out in server/index.ts
# startSubscriptionVerificationJob();
```

---

## Edge Cases Handling

### 1. User Registers with Pro Plan Selection
**Current**: Plan selected but never persisted
**Fix**: Phase 1.2 creates subscription record during registration

### 2. User Reinstalls App
**Handling**: Restore purchases flow verifies existing subscriptions with Google Play

### 3. Subscription Expires During Offline Usage
**Handling**:
- App caches last known subscription state
- On reconnect, syncs with server
- Grace period allows continued usage for 3 days

### 4. Payment Fails (Card Declined)
**Handling**:
- Google Play retries automatically
- Webhook notifies server (ON_HOLD status)
- User receives grace period
- After grace period, subscription expires

### 5. User Requests Refund
**Handling**:
- Google Play processes refund
- Webhook notifies server (REVOKED notification)
- Server immediately revokes access
- User_subscriptions status set to 'revoked'

### 6. Duplicate Purchase Attempts
**Handling**:
- Check purchase token uniqueness in database
- Return "already registered" if token exists
- Don't create duplicate subscription records

### 7. Purchase Verification Fails
**Handling**:
- Retry with exponential backoff (3 attempts)
- Store verification error in database
- Daily cron job re-attempts verification
- User can manually trigger "Restore Purchases"

### 8. Migration from Stripe to Google Play
**Handling**:
- Keep existing Stripe subscriptions active
- New subscriptions use Google Play
- Check payment_method field to determine which API to use
- No automatic migration (user must cancel Stripe and repurchase)

---

## Security Considerations

### 1. Receipt Verification
- ✅ Always verify receipts server-side
- ✅ Never trust client-side purchase validation
- ✅ Use Google Play Developer API for verification
- ✅ Store verification timestamp in database

### 2. Credentials Storage
- ✅ Store service account JSON as base64 in environment variable
- ✅ Never commit credentials to git
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate credentials regularly

### 3. Webhook Security
- ✅ Verify webhook signatures (Google Cloud Pub/Sub)
- ✅ Use HTTPS for webhook endpoints
- ✅ Implement idempotency (handle duplicate notifications)
- ✅ Rate limit webhook endpoint

### 4. Usage Tracking
- ✅ Track usage server-side only
- ✅ Use database transactions for concurrent usage updates
- ✅ Prevent race conditions with proper locking
- ✅ Validate feature names to prevent injection

---

## Performance Optimizations

### 1. Database Indexes
Already added in Phase 1.3:
- Index on (user_id, status) for fast subscription lookups
- Index on purchase tokens for verification
- Index on expires_at for cron job efficiency

### 2. Caching
```typescript
// Cache subscription data for 5 minutes
const subscriptionCache = new Map<string, { data: any; expires: number }>();

function getCachedSubscription(userId: string) {
  const cached = subscriptionCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}
```

### 3. Batch Operations
```typescript
// Verify multiple subscriptions in parallel
const verifications = await Promise.allSettled(
  subscriptions.map(sub =>
    googlePlayBilling.verifySubscription(sub.productId, sub.token)
  )
);
```

---

## Key Success Metrics

Track these metrics to measure success:

1. **Conversion Rate**: % of registrations that purchase
2. **Purchase Success Rate**: % of purchase attempts that succeed
3. **Verification Success Rate**: % of receipts successfully verified
4. **Subscription Retention**: % of subscriptions that renew
5. **Refund Rate**: % of subscriptions refunded
6. **Usage Limit Hits**: How often users hit free tier limits
7. **Support Tickets**: Number of subscription-related issues

---

## Final Implementation Order

### Week 1: Critical Fixes
- Day 1-2: Fix authentication (Phase 1.1)
- Day 3: Enable subscription creation (Phase 1.2)
- Day 4: Run migrations (Phase 1.3)
- Day 5: Implement usage limits (Phase 1.4-1.5)

### Week 2: Android Setup
- Day 1-2: Install dependencies, configure Google Play (Phase 2.1-2.3)
- Day 3-4: Implement Google Play Billing service (Phase 2.4)
- Day 5: Create mobile subscription routes (Phase 2.5)

### Week 3: Android UI
- Day 1-2: Implement Capacitor service (Phase 2.6)
- Day 3: Update plan selection component (Phase 2.7)
- Day 4-5: Testing on Android device (Phase 2.8)

### Week 4-5: iOS (Future)
- Implement Phase 3 after Android is validated

### Week 6: Production
- Day 1: Webhooks (Phase 4.1)
- Day 2: Cron jobs (Phase 4.2)
- Day 3: Monitoring (Phase 4.3)
- Day 4: Testing (Phase 4.4-4.5)
- Day 5: Documentation and deployment (Phase 4.6)

---

## Conclusion

This plan provides a comprehensive, production-ready implementation for fixing the ViralForge subscription system. Each phase builds on the previous one, with clear deliverables, testing procedures, and rollback plans.

**Next Steps**:
1. Review this plan with the team
2. Get approval from stakeholders
3. Begin Phase 1 implementation
4. Test thoroughly after each phase
5. Deploy to production incrementally

**Estimated Total Effort**: 6 weeks for Android + production hardening
**Estimated Additional Effort**: 2 weeks for iOS (Phase 3)

For questions or issues during implementation, refer to the troubleshooting section or reach out to the development team.
