import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  subscriptionTier: z.string().default('free'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

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

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading } = useAuth();
  const [error, setError] = useState<string>('');

  // Fetch available subscription tiers
  const { data: tiersData } = useQuery<{ success: boolean; tiers: SubscriptionTier[] }>({
    queryKey: ['/api/subscriptions/tiers'],
  });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      subscriptionTier: 'free',
    },
  });

  const onSubmit = async (values: RegisterFormData) => {
    setError('');
    const result = await register(values.username, values.password, values.subscriptionTier);

    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const tiers = tiersData?.tiers || [];

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join ViralForge and start creating viral content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Choose a username"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Create a password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subscriptionTier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose Your Plan</FormLabel>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {tiers.map((tier) => {
                        const isSelected = field.value === tier.id;
                        const isPro = tier.name === 'pro';

                        return (
                          <div
                            key={tier.id}
                            onClick={() => field.onChange(tier.id)}
                            className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-primary/50'
                            } ${isPro ? 'ring-1 ring-primary/20' : ''}`}
                          >
                            {isPro && (
                              <Badge className="absolute -top-2 right-4 bg-primary">
                                <Zap className="h-3 w-3 mr-1" />
                                Popular
                              </Badge>
                            )}

                            <div className="flex items-start gap-3">
                              <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {tier.name === 'enterprise' && <Crown className="h-4 w-4 text-primary" />}
                                  <h3 className="font-semibold">{tier.display_name}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{tier.description}</p>

                                <div className="flex items-baseline gap-1 mb-2">
                                  <span className="text-2xl font-bold">
                                    {tier.price_monthly === 0 ? 'Free' : formatPrice(tier.price_monthly)}
                                  </span>
                                  {tier.price_monthly > 0 && (
                                    <span className="text-sm text-muted-foreground">/month</span>
                                  )}
                                </div>

                                <ul className="space-y-1">
                                  {tier.features.slice(0, 3).map((feature, index) => (
                                    <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                                      <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="text-sm text-destructive text-center">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary hover:underline"
              disabled={isLoading}
            >
              Sign in
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};