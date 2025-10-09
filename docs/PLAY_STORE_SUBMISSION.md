# Play Store Submission Guide

## ✅ Production Build Complete

**AAB Location:** `/home/omar/viralforge/android/app/build/outputs/bundle/release/app-release.aab`
**File Size:** 9.3 MB
**Version Code:** 3
**Version Name:** 1.0
**Package Name:** `android.viral.forge`

---

## Google Play Console Setup Steps

### 1. Create App Listing

**Go to:** [Google Play Console](https://play.google.com/console)

**Required Information:**

#### App Details
- **App Name:** ViralForge
- **Short Description (80 chars):**
  ```
  AI-powered YouTube analytics - predict viral potential before posting
  ```
- **Full Description (4000 chars):**
  ```
  ViralForge is the AI-powered analytics platform that helps YouTube creators maximize their viral potential. Stop guessing what content will perform - get data-driven insights before you hit publish.

  🎯 KEY FEATURES:

  • Viral Score Prediction - AI analyzes your video concept and predicts viral potential
  • Trend Analysis - Real-time tracking of trending topics in your niche
  • Competitor Insights - See what's working for top creators in your category
  • Content Ideas - AI-generated video ideas based on trending patterns
  • Schedule Analysis - Automated daily reports on your channel performance

  📊 CREATOR-FOCUSED ANALYTICS:

  ViralForge specializes in YouTube creator analytics, providing:
  - Profile analysis with viral scoring rubric
  - Niche-specific trend identification
  - Content optimization recommendations
  - Engagement pattern analysis

  💡 AI-POWERED INSIGHTS:

  Our AI analyzes millions of data points to help you:
  - Identify emerging trends before competitors
  - Optimize titles and thumbnails for maximum CTR
  - Find the perfect upload timing
  - Discover untapped content opportunities

  📱 DESIGNED FOR CREATORS:

  - Clean, mobile-first interface
  - YouTube-only focus (no TikTok/Instagram distractions)
  - Scheduled analysis reports delivered daily
  - Export and share insights with your team

  🚀 SUBSCRIPTION TIERS:

  • Starter (Free) - Basic trend tracking and analysis
  • Creator ($19/mo) - Advanced analytics + AI insights
  • Pro ($39/mo) - Competitor tracking + priority support
  • Studio ($99/mo) - Unlimited analysis + team features

  Perfect for YouTube creators, content agencies, and social media managers who want to maximize their content's viral potential with AI-powered analytics.
  ```

#### Category
- **App Category:** Tools
- **Tags:** analytics, youtube, content creation, video, social media

#### Contact Details
- **Email:** support@viralforge.ai (create this email)
- **Phone:** (Optional but recommended)
- **Website:** https://viralforge.ai (if you have one)

---

### 2. Store Listing Assets

#### App Icon
- **Size:** 512 x 512 px
- **Format:** 32-bit PNG
- **Note:** Use your existing `viralforge_1758689165504.png` resized to 512x512

#### Feature Graphic
- **Size:** 1024 x 500 px
- **Format:** JPG or PNG
- **Content:** Create banner with "ViralForge" branding + tagline

#### Screenshots (Required: Minimum 2)
**Phone Screenshots:**
- **Size:** 1080 x 2400 px (or your device's resolution)
- **Required:** 2-8 screenshots
- **Recommendation:**
  1. Dashboard with viral scores
  2. Trend analysis page
  3. Profile analysis modal
  4. Scheduled reports settings

**Tablet Screenshots (Optional):**
- **Size:** 1920 x 1200 px or 2560 x 1600 px

#### Promo Video (Optional but Recommended)
- **YouTube URL:** Upload 30-second demo to YouTube
- Shows key features and value proposition

---

### 3. Privacy Policy & Terms (REQUIRED)

**You MUST host these publicly before submission:**

#### Privacy Policy
- **Required Fields:**
  - What data you collect (YouTube OAuth, email, analytics data)
  - How you use it (analytics, personalization)
  - Third-party services (Google OAuth, RevenueCat, Stripe)
  - Data retention and deletion
  - GDPR compliance (you have /gdpr endpoints)
  - Contact information

#### App Access Requirements
- **Special Permissions:**
  - Internet access (analytics API calls)
  - YouTube OAuth (profile analysis)
  - Camera (if using in-app)
  - Biometric authentication (you have @aparajita/capacitor-biometric-auth)

**Template Privacy Policy:** https://app-privacy-policy-generator.firebaseapp.com/

---

### 4. Content Rating

**Answer Google's questionnaire about:**
- Violence
- Sexual content
- Profanity
- Drugs/alcohol
- User-generated content
- Social features
- Data collection

**Expected Rating:** Everyone 13+ (no sensitive content)

---

### 5. App Content Declaration

**Data Safety:**
- ✅ Yes - Collects user data (YouTube profile, analytics preferences)
- ✅ Yes - Shares data with third parties (Google OAuth, payment processors)
- ✅ Encryption in transit (HTTPS)
- ✅ Ability to request data deletion (GDPR endpoint)

**Ads:**
- ❌ No - App does not contain ads

**In-App Purchases:**
- ✅ Yes - RevenueCat subscriptions (Creator, Pro, Studio tiers)

---

### 6. Prepare OAuth Consent Screen

**Before submitting, configure Google Cloud Console:**

1. Go to: [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to: **APIs & Services → OAuth consent screen**
4. Configure:
   - **App Name:** ViralForge
   - **User Support Email:** support@viralforge.ai
   - **App Logo:** Your app icon (512x512)
   - **Authorized Domains:** `viralforge.ai` (if you have one)
   - **Developer Contact:** Your email
   - **Scopes:** YouTube Data API v3 (read-only)
5. Add test users (for pre-launch testing)
6. Submit for verification (required for production OAuth)

---

### 7. Upload AAB

**Steps:**
1. Go to Play Console → Your App → **Production** → **Create new release**
2. Upload: `/home/omar/viralforge/android/app/build/outputs/bundle/release/app-release.aab`
3. Review warnings (if any)
4. Add release notes:
   ```
   Initial release of ViralForge - AI-powered YouTube analytics for creators.

   Features:
   • Viral score prediction
   • Real-time trend analysis
   • Scheduled performance reports
   • Creator profile analytics
   ```

---

### 8. Pre-Launch Checklist

**Before clicking "Send for Review":**

- [ ] Privacy Policy URL added and publicly accessible
- [ ] Terms of Service URL added (if required)
- [ ] Screenshots uploaded (minimum 2)
- [ ] App icon uploaded (512x512)
- [ ] Feature graphic uploaded (1024x500)
- [ ] Content rating completed
- [ ] Data safety form completed
- [ ] OAuth consent screen configured
- [ ] Test users added for pre-launch testing
- [ ] RevenueCat products configured in Google Play Billing
- [ ] In-app purchase descriptions added
- [ ] Release track selected (Internal Test → Closed Test → Production)

---

### 9. RevenueCat + Play Store Integration

**Link Products in RevenueCat Dashboard:**

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. **Products** → **+ Add New Product**
3. For each tier (Creator, Pro, Studio):
   - Create product in Google Play Console → Monetization → In-app products
   - Copy Product ID (e.g., `viralforge_creator_monthly`)
   - Add to RevenueCat with same ID
   - Link to "creator" entitlement
4. Repeat for yearly products

**Google Play Console Product Setup:**
- Product ID must match `PRODUCT_IDS` in `client/src/lib/revenueCat.ts`
- Set pricing (Creator: $19, Pro: $39, Studio: $99)
- Add subscription benefits
- Configure billing period (monthly/yearly)

---

### 10. Testing Before Production

**Recommended Testing Sequence:**

1. **Internal Testing** (1-2 days)
   - Upload to Internal Test track
   - Add internal testers (your team)
   - Test all features, especially RevenueCat purchases
   - Verify OAuth flow works

2. **Closed Testing** (1 week)
   - Promote to Closed Test track
   - Add 20+ external testers
   - Collect feedback via Google Play
   - Fix critical bugs

3. **Production Release**
   - Submit for review
   - Expected review time: 1-3 days
   - Monitor crash reports in Play Console

---

## Common Rejection Reasons

❌ **Missing Privacy Policy** - Must be publicly accessible URL
❌ **OAuth not verified** - Complete verification in Google Cloud Console
❌ **Misleading screenshots** - Must show actual app functionality
❌ **Data safety incomplete** - Declare all data collection accurately
❌ **Content rating issues** - Answer questionnaire truthfully

---

## Post-Launch Monitoring

**Monitor in Play Console:**
- Crash reports (Vitals → Crashes)
- ANR (Application Not Responding) rates
- User reviews and ratings
- Installation metrics
- Revenue (RevenueCat integration)

**Set up alerts for:**
- Crash rate > 2%
- ANR rate > 0.5%
- 1-star reviews (respond within 24h)

---

## Next Steps

1. ✅ AAB is built and signed (`app-release.aab`)
2. Create support email: `support@viralforge.ai`
3. Generate Privacy Policy + Terms
4. Create Play Console account (if needed)
5. Prepare screenshots (use Android emulator or device)
6. Configure OAuth consent screen
7. Upload to **Internal Testing** first
8. Test OAuth flow end-to-end
9. Fix any issues
10. Submit for production review

**Estimated Timeline:**
- Setup: 2-3 hours
- Internal testing: 1-2 days
- Review process: 1-3 days
- Total: 3-7 days to production

---

## Support Resources

- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [OAuth Verification](https://support.google.com/cloud/answer/9110914)
- [RevenueCat Google Play Setup](https://www.revenuecat.com/docs/google-play-store)
- [App Signing](https://developer.android.com/studio/publish/app-signing)

Good luck with your launch! 🚀
