import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Target, Palette, Monitor, Clock, Trophy, Sparkles, LogOut, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";
import SubscriptionSettings from "@/components/SubscriptionSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const preferencesSchema = z.object({
  niche: z.string().min(1, "Please select your niche"),
  targetAudience: z.string().min(1, "Please select your target audience"),
  contentStyle: z.string().min(1, "Please select your content style"),
  preferredPlatforms: z.array(z.string()).min(1, "Please select at least one platform"),
  preferredCategories: z.array(z.string()).min(1, "Please select at least one category"),
  bio: z.string().max(500, "Bio must be 500 characters or less"),
  contentLength: z.string().min(1, "Please select preferred content length"),
  goals: z.string().min(1, "Please select your primary goal"),
  postingSchedule: z.array(z.string()).optional()
});

type PreferencesData = z.infer<typeof preferencesSchema>;

export default function UserPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  // Fetch preference options
  const { data: options, isLoading: optionsLoading } = useQuery<{ success: boolean; options: any }>({
    queryKey: ['/api/preferences/options'],
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch current user preferences
  const { data: currentPrefs } = useQuery<{ success: boolean; preferences: any }>({
    queryKey: ['/api/preferences/demo-user'],
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  const form = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      niche: "",
      targetAudience: "",
      contentStyle: "",
      preferredPlatforms: [],
      preferredCategories: [],
      bio: "",
      contentLength: "",
      goals: "",
      postingSchedule: ["18:00", "21:00"]
    }
  });

  // Populate form with current preferences
  useEffect(() => {
    if (currentPrefs?.preferences) {
      const prefs = currentPrefs.preferences;
      form.reset({
        niche: prefs.niche || "",
        targetAudience: prefs.targetAudience || "",
        contentStyle: prefs.contentStyle || "",
        preferredPlatforms: prefs.bestPerformingPlatforms || [],
        preferredCategories: prefs.preferredCategories || [],
        bio: prefs.bio || "",
        contentLength: prefs.preferredContentLength || "",
        goals: prefs.goals || "",
        postingSchedule: prefs.optimizedPostTimes || ["18:00", "21:00"]
      });
    }
  }, [currentPrefs, form]);

  const savePreferences = useMutation({
    mutationFn: async (data: PreferencesData) => {
      const response = await apiRequest('POST', '/api/preferences/save', data);
      return response.json();
    },
    onSuccess: async (data: any) => {
      toast({
        title: "Preferences Saved!",
        description: data?.message || "Your preferences have been updated successfully.",
      });

      // Track preferences save event
      analytics.trackPreferencesSave({
        niche: form.getValues('niche'),
        target_audience: form.getValues('targetAudience'),
        content_style: form.getValues('contentStyle'),
        platforms: form.getValues('preferredPlatforms')?.length || 0,
        categories: form.getValues('preferredCategories')?.length || 0
      });

      // Invalidate and refetch to update the "Current Preferences" section
      await queryClient.invalidateQueries({ queryKey: ['/api/preferences/demo-user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/preferences/demo-user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trends'] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: PreferencesData) => {
    savePreferences.mutate(data);
  };


  if (optionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold">Welcome, {user?.username}</h2>
              <p className="text-sm text-muted-foreground">Manage your preferences</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">Settings & Preferences</h1>
        <p className="text-muted-foreground">
          Manage your subscription, profile, and content preferences
        </p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Tell us about your content niche and target audience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="niche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Niche *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., fitness, cooking, tech reviews"
                          data-testid="input-niche"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter your primary content category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., gen-z, millennials, entrepreneurs"
                          data-testid="input-audience"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Who is your primary audience?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio/Background</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about yourself and your content style..." 
                        className="min-h-20"
                        data-testid="input-bio"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description of your content and expertise ({field.value?.length || 0}/500)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Content Style Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Content Style & Format
              </CardTitle>
              <CardDescription>
                Define your content creation preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contentStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Style *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., educational, entertaining, motivational"
                          data-testid="input-content-style"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contentLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Content Length *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., short, medium, long"
                          data-testid="input-content-length"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preferredCategories"
                render={() => (
                  <FormItem>
                    <FormLabel>Content Categories *</FormLabel>
                    <FormDescription>
                      Select all categories you create content for
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {options?.options?.niches?.map((category: string) => (
                        <FormField
                          key={category}
                          control={form.control}
                          name="preferredCategories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={category}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(category)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, category])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== category)
                                          );
                                    }}
                                    data-testid={`checkbox-category-${category}`}
                                  />
                                </FormControl>
                                <Badge variant="outline" className="text-xs">
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </Badge>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Platform & Goals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Platforms & Goals
              </CardTitle>
              <CardDescription>
                Choose your preferred platforms and content goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="preferredPlatforms"
                render={() => (
                  <FormItem>
                    <FormLabel>Preferred Platforms *</FormLabel>
                    <FormDescription>
                      Select the platforms you create content for
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {options?.options?.platforms?.map((platform: string) => (
                        <FormField
                          key={platform}
                          control={form.control}
                          name="preferredPlatforms"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={platform}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(platform)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, platform])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== platform)
                                          );
                                    }}
                                    data-testid={`checkbox-platform-${platform}`}
                                  />
                                </FormControl>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {platform}
                                </Badge>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Goal *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., grow followers, increase sales, build brand"
                        data-testid="input-goals"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      What's your main objective with content creation?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center pt-6">
            <Button 
              type="submit" 
              size="lg" 
              disabled={savePreferences.isPending}
              data-testid="button-save-preferences"
              className="min-w-48"
            >
              {savePreferences.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Current Preferences Preview */}
      {currentPrefs?.preferences && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Current Preferences
            </CardTitle>
            <CardDescription>
              Your current content preferences and learned patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Niche</p>
                <p className="capitalize">{currentPrefs.preferences.niche}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Audience</p>
                <p className="capitalize">{currentPrefs.preferences.targetAudience}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Style</p>
                <p className="capitalize">{currentPrefs.preferences.contentStyle}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Success Rate</p>
                <p>{Math.round((currentPrefs.preferences.avgSuccessfulEngagement || 0) * 100)}%</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Platforms</p>
                <p className="capitalize">{currentPrefs.preferences.bestPerformingPlatforms?.join(', ')}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Last Updated</p>
                <p>{new Date(currentPrefs.preferences.lastUpdated).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}