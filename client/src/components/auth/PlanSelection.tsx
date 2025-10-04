import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { revenueCat, PRODUCT_IDS } from '@/lib/revenueCat';
import { useToast } from '@/hooks/use-toast';

interface PlanSelectionProps {
  onSelectPlan: (planId: string) => void;
  onBack?: () => void;
}

const PLANS = [
  {
    id: 'free',
    name: 'free',
    display_name: 'Free',
    description: 'Perfect for getting started',
    price_monthly: 0,
    productId: null, // No purchase needed
    features: [
      '3 video analyses per month',
      '5 AI-generated content ideas',
      '10 trend bookmarks',
      'Basic analytics',
    ],
    limits: {
      videoAnalysis: 3,
      contentGeneration: 5,
      trendBookmarks: 10,
      videoClips: 0
    }
  },
  {
    id: 'pro',
    name: 'pro',
    display_name: 'Pro',
    description: 'For serious content creators',
    price_monthly: 1499, // $14.99
    productId: PRODUCT_IDS.pro_monthly,
    popular: true,
    features: [
      'Unlimited video analyses',
      'Unlimited AI content generation',
      'Unlimited trend bookmarks',
      'Advanced analytics dashboard',
      'Video clip generation (50/month)',
      'Priority support',
    ],
    limits: {
      videoAnalysis: -1,
      contentGeneration: -1,
      trendBookmarks: -1,
      videoClips: 50
    }
  },
  {
    id: 'creator',
    name: 'creator',
    display_name: 'Creator',
    description: 'For professional creators & agencies',
    price_monthly: 4999, // $49.99
    productId: PRODUCT_IDS.creator_monthly,
    features: [
      'Everything in Creator Pro',
      'Unlimited video clips',
      'Team collaboration tools',
      'API access',
      'Custom integrations',
      'Dedicated support',
    ],
    limits: {
      videoAnalysis: -1,
      contentGeneration: -1,
      trendBookmarks: -1,
      videoClips: -1
    }
  },
];

export const PlanSelection: React.FC<PlanSelectionProps> = ({ onSelectPlan, onBack }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleContinue = async () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;

    // Free plan - no purchase needed, just continue to registration
    if (plan.productId === null) {
      onSelectPlan(selectedPlan);
      return;
    }

    // Paid plan - initiate RevenueCat purchase
    setIsPurchasing(true);
    try {
      const result = await revenueCat.purchasePackage(plan.productId);
      
      if (result.success) {
        toast({
          title: "Purchase successful!",
          description: `You've subscribed to ${plan.display_name}`,
        });
        
        // Continue to registration with the selected plan
        onSelectPlan(selectedPlan);
      } else {
        toast({
          title: "Purchase failed",
          description: "Please try again or choose a different plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[PlanSelection] Purchase error:', error);
      toast({
        title: "Purchase error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Select the perfect plan for your content creation needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isPro = plan.popular;

            return (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-muted hover:border-primary/50'
                } ${isPro ? 'ring-2 ring-primary/20' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {isPro && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    <Zap className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center gap-2">
                      {plan.name === 'creator' && <Crown className="h-5 w-5 text-primary" />}
                      {plan.display_name}
                    </CardTitle>
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                    </div>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {plan.price_monthly === 0 ? 'Free' : formatPrice(plan.price_monthly)}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-4 justify-center">
          {onBack && (
            <Button variant="outline" onClick={onBack} disabled={isPurchasing}>
              Back to Login
            </Button>
          )}
          <Button onClick={handleContinue} size="lg" className="min-w-[200px]" disabled={isPurchasing}>
            {isPurchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue with {PLANS.find(p => p.id === selectedPlan)?.display_name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
