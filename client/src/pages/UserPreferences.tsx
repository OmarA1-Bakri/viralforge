import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { User, Target, Palette, Monitor, Clock, Trophy, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
      console.log('🌐 Making API request to save preferences...');
      const response = await fetch('/api/preferences/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ API Success:', result);
      return result;
    },
    onSuccess: (data: any) => {
      console.log('🎉 Save success, showing toast...');
      toast({
        title: "Preferences Saved!",
        description: data?.message || "Your preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trends'] });
    },
    onError: (error: any) => {
      console.error('💥 Save failed:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: PreferencesData) => {
    console.log('🔄 Submitting preferences:', data);
    console.log('Form errors:', form.formState.errors);
    savePreferences.mutate(data);
  };

  // Debug function to test API directly
  const testDirectSave = () => {
    const testData = {
      niche: "fitness",
      targetAudience: "gen-z", 
      contentStyle: "motivational",
      preferredPlatforms: ["tiktok"],
      preferredCategories: ["fitness"],
      bio: "Test fitness creator",
      contentLength: "short",
      goals: "grow_followers",
      postingSchedule: ["18:00", "21:00"]
    };
    console.log('🧪 Testing direct API call...');
    savePreferences.mutate(testData);
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
        <h1 className="text-3xl font-bold mb-2">Your Creator Preferences</h1>
        <p className="text-muted-foreground">
          Set up your profile to get personalized trending content and recommendations tailored to your niche
        </p>
      </div>

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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-niche">
                            <SelectValue placeholder="Select your niche" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options?.options?.niches?.map((niche: string) => (
                            <SelectItem key={niche} value={niche}>
                              {niche.charAt(0).toUpperCase() + niche.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose your primary content category
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-audience">
                            <SelectValue placeholder="Select your audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options?.options?.audiences?.map((audience: string) => (
                            <SelectItem key={audience} value={audience}>
                              {audience.charAt(0).toUpperCase() + audience.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-content-style">
                            <SelectValue placeholder="Select your style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options?.options?.contentStyles?.map((style: string) => (
                            <SelectItem key={style} value={style}>
                              {style.charAt(0).toUpperCase() + style.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-content-length">
                            <SelectValue placeholder="Select length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="short">Short (15-60 seconds)</SelectItem>
                          <SelectItem value="medium">Medium (1-5 minutes)</SelectItem>
                          <SelectItem value="long">Long (5+ minutes)</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-goals">
                          <SelectValue placeholder="Select your goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options?.options?.goals?.map((goal: string) => (
                          <SelectItem key={goal} value={goal}>
                            {goal.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          <div className="flex justify-center gap-4 pt-6">
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
            
            {/* Debug Button */}
            <Button 
              type="button" 
              variant="outline"
              size="lg" 
              onClick={testDirectSave}
              disabled={savePreferences.isPending}
              data-testid="button-test-save"
            >
              🧪 Test Save
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
    </div>
  );
}