import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  Check,
  Sparkles,
  Zap,
  TrendingUp,
  AlertCircle,
  CreditCard
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: {
    videoAnalysis: number;
    contentGeneration: number;
    trendBookmarks: number;
    videoClips: number;
  };
}

interface CurrentSubscription {
  tier_id: string;
  tier_name: string;
  tier_display_name: string;
  status: string;
  billing_cycle: string;
  expires_at?: string;
  features: string[];
  limits: {
    videoAnalysis: number;
    contentGeneration: number;
    trendBookmarks: number;
    videoClips: number;
  };
}

interface UsageStats {
  usage: Record<string, number>;
  limits: Record<string, number>;
  period: {
    start: string;
    end: string;
  };
}

export default function SubscriptionSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Fetch available tiers (public endpoint, no auth required)
  const { data: tiersData, isLoading: tiersLoading } = useQuery<{ success: boolean; tiers: SubscriptionTier[] }>({
    queryKey: ['/api/subscriptions/tiers'],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fetch current subscription (requires auth)
  const { data: currentSub } = useQuery<{ success: boolean; subscription: CurrentSubscription }>({
    queryKey: ['/api/subscriptions/current'],
    retry: 1,
  });

  // Fetch usage stats (requires auth)
  const { data: usageData } = useQuery<{ success: boolean } & UsageStats>({
    queryKey: ['/api/subscriptions/usage'],
    retry: 1,
  });

  // Create Stripe checkout session
  const createCheckout = useMutation({
    mutationFn: async ({ tierId, billingCycle }: { tierId: string; billingCycle: string }) => {
      const response = await apiRequest('POST', '/api/subscriptions/create-checkout', {
        tierId,
        billingCycle
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Open Stripe customer portal
  const openPortal = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscriptions/create-portal', {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Redirect to Stripe customer portal
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Portal Failed",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Cancel subscription mutation
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscriptions/cancel', {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Cancelled",
        description: data.message || "Your subscription has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription.",
        variant: "destructive"
      });
    }
  });

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getUsagePercentage = (feature: string) => {
    if (!usageData) return 0;
    const used = usageData.usage[feature] || 0;
    const limit = usageData.limits[feature];
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, string> = {
      videoAnalysis: 'Video Analyses',
      contentGeneration: 'Content Generated',
      trendBookmarks: 'Bookmarks',
      videoClips: 'Video Clips'
    };
    return labels[feature] || feature;
  };

  if (tiersLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tiers = tiersData?.tiers || [];
  const current = currentSub?.subscription;

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      {current && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Current Plan: {current.tier_display_name}
                </CardTitle>
                <CardDescription>
                  {current.status === 'active' ? 'Active subscription' : 'Inactive'}
                  {current.expires_at && ` • Renews ${new Date(current.expires_at).toLocaleDateString()}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {current.tier_name !== 'free' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPortal.mutate()}
                      disabled={openPortal.isPending}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Billing
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelSubscription.mutate()}
                      disabled={cancelSubscription.isPending}
                    >
                      Cancel Plan
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Usage Stats */}
            {usageData && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium mb-3">Monthly Usage</h4>
                {Object.entries(usageData.limits).map(([feature, limit]) => {
                  const used = usageData.usage[feature] || 0;
                  const percentage = getUsagePercentage(feature);
                  const isUnlimited = limit === -1;

                  return (
                    <div key={feature} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{getFeatureLabel(feature)}</span>
                        <span className="font-medium">
                          {isUnlimited ? (
                            <span className="flex items-center gap-1 text-primary">
                              <Sparkles className="h-3 w-3" />
                              Unlimited
                            </span>
                          ) : (
                            `${used} / ${limit}`
                          )}
                        </span>
                      </div>
                      {!isUnlimited && (
                        <Progress value={percentage} className="h-2" />
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground mt-4">
                  Usage resets on {new Date(usageData.period.end).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border bg-muted p-1">
          <Button
            variant={selectedCycle === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCycle('monthly')}
            className="rounded-md"
          >
            Monthly
          </Button>
          <Button
            variant={selectedCycle === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCycle('yearly')}
            className="rounded-md"
          >
            <span>Yearly</span>
            <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
          </Button>
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const price = selectedCycle === 'monthly' ? tier.price_monthly : tier.price_yearly;
          const monthlyPrice = selectedCycle === 'monthly' ? price : price / 12;
          const isCurrentTier = current?.tier_id === tier.id;
          const isPro = tier.name === 'pro';

          return (
            <Card
              key={tier.id}
              className={`relative ${isPro ? 'border-primary shadow-lg' : ''} ${
                isCurrentTier ? 'ring-2 ring-primary' : ''
              }`}
            >
              {isPro && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Zap className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{tier.display_name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      {formatPrice(monthlyPrice)}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {selectedCycle === 'yearly' && tier.price_yearly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPrice(tier.price_yearly)}/year
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features List */}
                <ul className="space-y-2">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Usage Limits */}
                <div className="pt-4 border-t space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Monthly Limits:</p>
                  {Object.entries(tier.limits).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span>{getFeatureLabel(key)}</span>
                      <span className="font-medium">
                        {value === -1 ? 'Unlimited' : value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  className="w-full"
                  variant={isPro ? 'default' : 'outline'}
                  disabled={isCurrentTier || createCheckout.isPending}
                  onClick={() => {
                    if (tier.price_monthly === 0) {
                      // Free tier - handle downgrade via cancel
                      cancelSubscription.mutate();
                    } else {
                      // Paid tier - redirect to Stripe checkout
                      createCheckout.mutate({
                        tierId: tier.id,
                        billingCycle: selectedCycle
                      });
                    }
                  }}
                >
                  {isCurrentTier ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Current Plan
                    </>
                  ) : createCheckout.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Processing...
                    </>
                  ) : tier.price_monthly === 0 ? (
                    'Downgrade to Free'
                  ) : current && current.tier_id === 'free' ? (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade Now
                    </>
                  ) : (
                    'Switch Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">About Subscriptions</p>
              <p className="text-muted-foreground">
                All plans include access to trending content and basic analytics.
                Upgrade to unlock advanced features, higher limits, and priority support.
                Cancel anytime - no questions asked.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
