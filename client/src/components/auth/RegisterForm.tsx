import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  subscriptionTier: z.string().default('starter'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  fullName: z.string().min(1, 'Full name is required').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // For tester tier, email and fullName are required
  if (data.subscriptionTier === 'tester') {
    return data.email && data.email.length > 0 && data.fullName && data.fullName.length > 0;
  }
  return true;
}, {
  message: "Email and full name are required for tester access",
  path: ["email"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  selectedPlan: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, selectedPlan }) => {
  const { register, isLoading } = useAuth();
  const [error, setError] = useState<string>('');

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      subscriptionTier: selectedPlan,
      email: '',
      fullName: '',
    },
  });

  const onSubmit = async (values: RegisterFormData) => {
    setError('');
    console.log('[RegisterForm] Starting registration:', {
      username: values.username,
      tier: selectedPlan,
      hasEmail: !!values.email,
      hasFullName: !!values.fullName
    });

    // Use the actual selected plan, now that backend supports all tiers
    const result = await register(
      values.username,
      values.password,
      selectedPlan,
      values.email || undefined,
      values.fullName || undefined
    );

    console.log('[RegisterForm] Registration result:', result);

    if (!result.success) {
      console.error('[RegisterForm] Registration failed:', result.error);
      setError(result.error || 'Registration failed');
    } else {
      console.log('[RegisterForm] Registration successful! User should be logged in now.');
      // AuthContext automatically logs the user in on successful registration
      // App.tsx will detect the user is logged in and redirect to dashboard
    }
  };

  const getPlanName = (planId: string) => {
    const planNames: Record<string, string> = {
      'starter': 'Starter Crew',
      'creator': 'Creator Crew',
      'pro': 'Pro Crew',
      'studio': 'Studio Crew',
      'tester': 'Tester Crew'
    };
    return planNames[planId] || 'Starter Crew';
  };

  const getSubtitle = () => {
    if (selectedPlan === 'tester') {
      return 'Full testing access - Pro tier features';
    }
    if (selectedPlan === 'starter') {
      return 'Start with Starter Crew (free) - upgrade anytime in Settings';
    }
    return `Start with ${getPlanName(selectedPlan)}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ paddingTop: '72px' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            {getSubtitle()}
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

              {selectedPlan === 'tester' && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your.email@example.com"
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
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Your full name"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-sm text-center p-3 bg-muted rounded-md">
                    To provide debugging information please email:{' '}
                    <a href="mailto:info@viralforgeai.co.uk" className="text-primary hover:underline">
                      info@viralforgeai.co.uk
                    </a>
                  </div>
                </>
              )}

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