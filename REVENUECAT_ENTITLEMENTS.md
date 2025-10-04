# RevenueCat Entitlements Configuration

## Entitlement 1: Pro

**Identifier**: `pro`

**Description**: Pro tier access for serious content creators

**Products to Attach**:
- `viralforge_pro_monthly` - $14.99/month
- `viralforge_pro_yearly` - $149.90/year

**Features Unlocked**:
- Unlimited video analyses
- Unlimited AI content generation
- Unlimited trend bookmarks
- Advanced analytics dashboard
- Video clip generation (50/month)
- Priority support

---

## Entitlement 2: Creator

**Identifier**: `creator`

**Description**: Creator tier access for professional creators & agencies

**Products to Attach**:
- `viralforge_creator_monthly` - $49.99/month
- `viralforge_creator_yearly` - $499.90/year

**Features Unlocked**:
- Everything in Pro
- Unlimited video clips
- Team collaboration tools
- API access
- Custom integrations
- Dedicated support

---

## How to Create in RevenueCat Dashboard

### Step 1: Create Pro Entitlement

1. Go to **Entitlements** in RevenueCat dashboard
2. Click **+ New Entitlement**
3. Enter:
   - **Identifier**: `pro`
   - **Display Name**: Pro
   - **Description**: Pro tier access for serious content creators
4. Click **Save**
5. In the entitlement details, click **Attach Products**
6. Select:
   - ✅ `viralforge_pro_monthly`
   - ✅ `viralforge_pro_yearly`
7. Click **Save**

### Step 2: Create Creator Entitlement

1. Click **+ New Entitlement**
2. Enter:
   - **Identifier**: `creator`
   - **Display Name**: Creator
   - **Description**: Creator tier access for professional creators & agencies
3. Click **Save**
4. In the entitlement details, click **Attach Products**
5. Select:
   - ✅ `viralforge_creator_monthly`
   - ✅ `viralforge_creator_yearly`
6. Click **Save**

---

## Verification

After creating both entitlements, verify:

- [ ] Pro entitlement has 2 products attached
- [ ] Creator entitlement has 2 products attached
- [ ] Identifiers match exactly: `pro` and `creator` (lowercase, no spaces)
- [ ] All 4 products are linked to their respective entitlements

---

## Code Reference

These entitlement identifiers are used in:

**client/src/lib/revenueCat.ts**:
```typescript
export const ENTITLEMENTS = {
  pro: 'pro',
  creator: 'creator',
} as const;
```

**The code checks these exact identifiers**, so they must match perfectly!
