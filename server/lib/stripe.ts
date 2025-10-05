import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not configured - Stripe payments disabled');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Stripe Product and Price IDs (these will be created in Stripe Dashboard)
// For now, we'll create them dynamically if they don't exist
export const STRIPE_CONFIG = {
  products: {
    pro: {
      name: 'Pro',
      description: 'For serious content creators',
    },
    agency: {
      name: 'Agency',
      description: 'For agencies and teams',
    },
  },
  prices: {
    // These will be populated dynamically or set from environment
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    agency_monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || '',
    agency_yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || '',
  },
};

/**
 * Get or create Stripe price for a subscription tier
 */
export async function getOrCreateStripePrice(
  tierId: string,
  billingCycle: 'monthly' | 'yearly',
  priceInCents: number
): Promise<string> {
  try {
    // Check if we have a cached price ID in env
    const envKey = `STRIPE_PRICE_${tierId.toUpperCase()}_${billingCycle.toUpperCase()}`;
    const cachedPriceId = process.env[envKey];

    if (cachedPriceId) {
      return cachedPriceId;
    }

    // Search for existing price
    const prices = await stripe.prices.list({
      lookup_keys: [`${tierId}_${billingCycle}`],
      limit: 1,
    });

    if (prices.data.length > 0) {
      return prices.data[0].id;
    }

    // Create new product and price
    const productConfig = STRIPE_CONFIG.products[tierId as keyof typeof STRIPE_CONFIG.products];

    if (!productConfig) {
      throw new Error(`Unknown tier: ${tierId}`);
    }

    // Create or get product
    const products = await stripe.products.search({
      query: `name:'${productConfig.name}' AND active:'true'`,
      limit: 1,
    });

    let product: Stripe.Product;

    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: productConfig.name,
        description: productConfig.description,
        metadata: {
          tier_id: tierId,
        },
      });
    }

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceInCents,
      currency: 'usd',
      recurring: {
        interval: billingCycle === 'monthly' ? 'month' : 'year',
      },
      lookup_key: `${tierId}_${billingCycle}`,
      metadata: {
        tier_id: tierId,
        billing_cycle: billingCycle,
      },
    });

    console.log(`✅ Created Stripe price: ${price.id} for ${tierId} ${billingCycle}`);

    return price.id;
  } catch (error) {
    console.error('Error getting/creating Stripe price:', error);
    throw error;
  }
}

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(userId: string, email?: string): Promise<string> {
  try {
    const customer = await stripe.customers.create({
      metadata: {
        user_id: userId,
      },
      email,
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  userId: string;
  tierId: string;
  billingCycle: 'monthly' | 'yearly';
  priceInCents: number;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  try {
    const { userId, tierId, billingCycle, priceInCents, email, successUrl, cancelUrl } = params;

    // Get or create price
    const priceId = await getOrCreateStripePrice(tierId, billingCycle, priceInCents);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        user_id: userId,
        tier_id: tierId,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          tier_id: tierId,
          billing_cycle: billingCycle,
        },
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a portal session for managing subscription
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

/**
 * Cancel a Stripe subscription
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}
