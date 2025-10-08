import { Purchases, LOG_LEVEL, PURCHASE_TYPE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// Product IDs matching our tiers
export const PRODUCT_IDS = {
  // Starter tier (free) - no products needed
  
  // Creator tier
  creator_monthly: 'viralforge_creator_monthly',
  creator_yearly: 'viralforge_creator_yearly',
  
  // Pro tier
  pro_monthly: 'viralforge_pro_monthly',
  pro_yearly: 'viralforge_pro_yearly',
  
  // Studio tier
  studio_monthly: 'viralforge_studio_monthly',
  studio_yearly: 'viralforge_studio_yearly',
} as const;

// Entitlement identifiers
export const ENTITLEMENTS = {
  creator: 'creator',
  pro: 'pro',
  studio: 'studio',
} as const;

class RevenueCatService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[RevenueCat] Already initialized');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('[RevenueCat] Not running on native platform, skipping initialization');
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;

      if (!apiKey) {
        console.error('[RevenueCat] API key not configured');
        return;
      }

      // Configure RevenueCat
      await Purchases.configure({
        apiKey,
        appUserID: undefined, // Will be set after login
      });

      // Set log level for debugging
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      this.initialized = true;
      console.log('[RevenueCat] Initialized successfully');
    } catch (error) {
      console.error('[RevenueCat] Initialization error:', error);
      throw error;
    }
  }

  async loginUser(userId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await Purchases.logIn({ appUserID: userId });
      console.log(`[RevenueCat] User logged in: ${userId}`);
    } catch (error) {
      console.error('[RevenueCat] Login error:', error);
      throw error;
    }
  }

  async logoutUser(): Promise<void> {
    try {
      await Purchases.logOut();
      console.log('[RevenueCat] User logged out');
    } catch (error) {
      console.error('[RevenueCat] Logout error:', error);
    }
  }

  async getOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Offerings:', offerings);
      return offerings;
    } catch (error) {
      console.error('[RevenueCat] Error fetching offerings:', error);
      throw error;
    }
  }

  async purchasePackage(productId: string) {
    try {
      console.log(`[RevenueCat] Purchasing package: ${productId}`);

      // Get offerings first
      const offerings = await this.getOfferings();

      if (!offerings.current) {
        throw new Error('No current offering available');
      }

      // Find the package with this product ID
      const pkg = offerings.current.availablePackages.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        throw new Error(`Package not found: ${productId}`);
      }

      // Make the purchase
      const result = await Purchases.purchasePackage({ aPackage: pkg });

      console.log('[RevenueCat] Purchase successful:', result);

      return {
        success: true,
        customerInfo: result.customerInfo,
        productIdentifier: result.productIdentifier,
      };
    } catch (error: any) {
      console.error('[RevenueCat] Purchase error:', error);

      // Handle user cancellation
      if (error.userCancelled) {
        return {
          success: false,
          cancelled: true,
        };
      }

      throw error;
    }
  }

  async restorePurchases() {
    try {
      console.log('[RevenueCat] Restoring purchases');
      const customerInfo = await Purchases.restorePurchases();
      console.log('[RevenueCat] Purchases restored:', customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      throw error;
    }
  }

  async getCustomerInfo() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Error fetching customer info:', error);
      throw error;
    }
  }

  async getCurrentSubscription() {
    try {
      const customerInfo = await this.getCustomerInfo();
      const entitlements = customerInfo.customerInfo.entitlements.active;

      // Check which entitlement is active (in priority order: studio > pro > creator)
      if (entitlements[ENTITLEMENTS.studio]) {
        return {
          tier: 'studio',
          entitlement: entitlements[ENTITLEMENTS.studio],
          expiresAt: entitlements[ENTITLEMENTS.studio].expirationDate,
        };
      }

      if (entitlements[ENTITLEMENTS.pro]) {
        return {
          tier: 'pro',
          entitlement: entitlements[ENTITLEMENTS.pro],
          expiresAt: entitlements[ENTITLEMENTS.pro].expirationDate,
        };
      }

      if (entitlements[ENTITLEMENTS.creator]) {
        return {
          tier: 'creator',
          entitlement: entitlements[ENTITLEMENTS.creator],
          expiresAt: entitlements[ENTITLEMENTS.creator].expirationDate,
        };
      }

      return {
        tier: 'starter',  // Free tier renamed to 'starter'
        entitlement: null,
        expiresAt: null,
      };
    } catch (error) {
      console.error('[RevenueCat] Error checking subscription:', error);
      return {
        tier: 'starter',
        entitlement: null,
        expiresAt: null,
      };
    }
  }

  async syncSubscriptionWithBackend(token: string) {
    try {
      const customerInfo = await this.getCustomerInfo();
      const entitlements = customerInfo.customerInfo.entitlements.active;

      // Get active product identifier and tier
      let productIdentifier = null;
      let expiresDate = null;
      let tier = 'starter';

      // Check entitlements in priority order
      if (entitlements[ENTITLEMENTS.studio]) {
        productIdentifier = entitlements[ENTITLEMENTS.studio].productIdentifier;
        expiresDate = entitlements[ENTITLEMENTS.studio].expirationDate;
        tier = 'studio';
      } else if (entitlements[ENTITLEMENTS.pro]) {
        productIdentifier = entitlements[ENTITLEMENTS.pro].productIdentifier;
        expiresDate = entitlements[ENTITLEMENTS.pro].expirationDate;
        tier = 'pro';
      } else if (entitlements[ENTITLEMENTS.creator]) {
        productIdentifier = entitlements[ENTITLEMENTS.creator].productIdentifier;
        expiresDate = entitlements[ENTITLEMENTS.creator].expirationDate;
        tier = 'creator';
      }

      // Send to backend for verification and storage
      const { apiRequest } = await import('./queryClient');

      const response = await apiRequest('POST', '/subscriptions/sync-revenuecat', {
        entitlements,
        productIdentifier,
        expiresDate,
        tier,
      });

      const result = await response.json();
      console.log('[RevenueCat] Synced with backend successfully:', result);
      return result;
    } catch (error) {
      console.error('[RevenueCat] Sync with backend failed (non-critical):', error);
      // Don't throw - sync failure shouldn't break login
      return null;
    }
  }
}

export const revenueCat = new RevenueCatService();
