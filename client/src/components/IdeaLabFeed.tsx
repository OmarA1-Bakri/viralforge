import { useState, useEffect, useMemo } from "react";
import TrendCard from "./TrendCard";
import ProcessingIndicator from "./ProcessingIndicator";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import viralForgeAILogo from "@assets/viralforge_1758689165504.png";
import { ProfileAnalysisModal } from "./ProfileAnalysisModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// YouTube-focused mock data for instant UX (mobile-first, YouTube-only)
const mockTrends = [
  {
    id: 1,
    title: "Shorts: React to viral moments with your unique take",
    description: "Reaction Shorts are dominating! Perfect for creators with strong personality.",
    category: "Entertainment",
    platform: "youtube",
    hotness: "hot" as const,
    engagement: 24,
    timeAgo: "2h ago",
    suggestion: "Pick trending news or viral videos. Add your authentic reaction with quick cuts. Hook: 'You won't believe what happened next...'",
    hashtags: ["#YouTubeShorts", "#ViralReaction", "#TrendingNow", "#Shorts"],
    sound: "Trending Audio Mix",
    soundUrl: "trending-youtube-mix-1",
    duration: "60s"
  },
  {
    id: 2,
    title: "Quick tutorials: Teach one thing in under 60 seconds",
    description: "Educational Shorts are exploding on YouTube. Knowledge creators, this is your moment.",
    category: "Education",
    platform: "youtube",
    hotness: "rising" as const,
    engagement: 18,
    timeAgo: "4h ago",
    suggestion: "Pick one micro-skill in your niche. Show 3 quick steps with clear visuals. Hook: 'Here's what nobody tells you about [topic]...'",
    hashtags: ["#Tutorial", "#LearnOnYouTube", "#QuickTips", "#Shorts"],
    sound: "Educational Beat",
    soundUrl: "edu-youtube-beat",
    duration: "45s"
  },
  {
    id: 3,
    title: "Behind-the-scenes: Show your creative process",
    description: "BTS content builds authentic connections and keeps viewers coming back.",
    category: "Lifestyle",
    platform: "youtube",
    hotness: "relevant" as const,
    engagement: 12,
    timeAgo: "6h ago",
    suggestion: "Film your workflow with honest moments. Show struggles, not just wins. Hook: 'Day [X] of building my [project]...'",
    hashtags: ["#BehindTheScenes", "#CreatorLife", "#Process", "#YouTube"],
    sound: "Chill Vlog Vibes",
    soundUrl: "chill-vlog-mix",
    duration: "60s"
  },
  {
    id: 4,
    title: "Challenge videos: Test and rate trending products/ideas",
    description: "Challenge and review content drives massive engagement on YouTube Shorts.",
    category: "Reviews",
    platform: "youtube",
    hotness: "hot" as const,
    engagement: 31,
    timeAgo: "1h ago",
    suggestion: "Test 3-5 trending products or life hacks. Rate honestly with quick explanations. End with your top pick and why.",
    hashtags: ["#Challenge", "#Review", "#Tested", "#YouTubeShorts"],
    sound: "Upbeat Challenge Mix",
    soundUrl: "challenge-youtube-mix",
    duration: "60s"
  }
];

interface IdeaLabFeedProps {
  onTrendSave?: (id: string | number) => void;
  onTrendRemix?: (id: string | number) => void;
  onNavigate?: (tab: "dashboard" | "idea-lab" | "launch-pad" | "multiplier" | "preferences") => void;
}

export default function IdeaLabFeed({ onTrendSave, onTrendRemix, onNavigate }: IdeaLabFeedProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedTrend, setSelectedTrend] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user preferences for personalization
  const { data: userPrefs } = useQuery({
    queryKey: ['/api/preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await apiRequest('GET', `/api/preferences/${user.id}`);
        const data = await response.json();
        console.log('[IdeaLab] User preferences:', data);
        return data?.preferences || null;
      } catch (error) {
        console.log('[IdeaLab] No user preferences found, using defaults');
        return null;
      }
    },
    enabled: !!user?.id,
  });

  // Get preferred platform from user preferences (default to youtube to match user's request)
  const preferredPlatform = useMemo(() =>
    userPrefs?.bestPerformingPlatforms?.[0] || 'youtube',
    [userPrefs?.bestPerformingPlatforms]
  );

  // Fetch existing trends from database (personalized if preferences exist)
  const { data: existingTrends, isLoading: isLoadingTrends, error: trendsError } = useQuery({
    queryKey: ['/api/trends', { platform: preferredPlatform, categories: userPrefs?.preferredCategories }],
    enabled: true,
    queryFn: async () => {
      const params = new URLSearchParams({ platform: preferredPlatform });
      if (userPrefs?.preferredCategories?.length > 0) {
        params.append('categories', userPrefs.preferredCategories.join(','));
      }
      const response = await apiRequest('GET', `/api/trends?${params}`);
      const data = await response.json();
      console.log('[IdeaLab] Trends loaded:', JSON.stringify({
        hasTrends: !!data.trends,
        trendsCount: data.trends?.length || 0,
        trendsArray: data.trends,
        cached: data.cached,
        refreshing: data.refreshing
      }));
      return data;
    },
    retry: 2,
    staleTime: 0, // Always fetch fresh trends - no caching
    gcTime: 0, // Don't keep old data in garbage collection
  });

  // AI-powered trend discovery mutation
  const discoverTrendsMutation = useMutation({
    mutationFn: async () => {
      console.log(`🎯 Discovering personalized ${preferredPlatform} trends via AI...`);
      console.log('[IdeaLab] Raw userPrefs:', JSON.stringify(userPrefs, null, 2));
      try {
        // Use user preferences for personalized trend discovery
        const category = userPrefs?.preferredCategories?.[0] || 'All';
        const contentType = userPrefs?.contentStyle || 'viral';
        const targetAudience = userPrefs?.targetAudience || 'gen-z';

        console.log('[IdeaLab] Discovery params:', {
          category,
          contentType,
          targetAudience,
          preferredCategories: userPrefs?.preferredCategories,
          hasCategoriesArray: Array.isArray(userPrefs?.preferredCategories),
          categoriesLength: userPrefs?.preferredCategories?.length
        });

        const response = await apiRequest('POST', '/api/trends/discover', {
          platform: preferredPlatform,
          category,
          contentType,
          targetAudience
        });
        console.log("✅ AI trend discovery completed", response);
        return response;
      } catch (error) {
        console.error("❌ Error during trend discovery:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("🔄 Invalidating queries and updating...", data);
      // Invalidate ALL trends queries (regardless of categories)
      queryClient.invalidateQueries({ queryKey: ['/api/trends'] });
      setLastUpdated(new Date());

      toast({
        title: "✨ Ideas Refreshed",
        description: "New personalized trend ideas generated!",
      });
    },
    onError: (error) => {
      console.error("💥 Mutation failed:", error);
    }
  });

  const trends = existingTrends?.trends || [];
  const isRefreshing = discoverTrendsMutation.isPending;

  // Debug logging
  console.log('[IdeaLab] Component state:', JSON.stringify({
    trendsLength: trends.length,
    isLoadingTrends,
    isRefreshing,
    hasExistingTrends: !!existingTrends,
    existingTrendsKeys: existingTrends ? Object.keys(existingTrends) : []
  }));

  // Check if user has customized preferences (not just defaults)
  const hasCustomPreferences = useMemo(() => {
    if (!userPrefs) return false;
    return (
      userPrefs.preferredCategories?.length > 0 ||
      (userPrefs.contentStyle && userPrefs.contentStyle !== 'entertainment') ||
      (userPrefs.targetAudience && userPrefs.targetAudience !== 'gen-z')
    );
  }, [userPrefs]);

  // Auto-refresh trends when component mounts or preferences change
  useEffect(() => {
    // Skip if already refreshing
    if (isRefreshing || isLoadingTrends) return;

    // Always discover trends on first load if none exist
    if (trends.length === 0) {
      console.log('[IdeaLab] No trends found, auto-discovering...');
      discoverTrendsMutation.mutate();
      return;
    }

    // Auto-refresh when user has customized preferences
    if (hasCustomPreferences) {
      console.log('[IdeaLab] Custom preferences detected, refreshing trends:', {
        categories: userPrefs?.preferredCategories,
        contentStyle: userPrefs?.contentStyle,
        targetAudience: userPrefs?.targetAudience
      });
      discoverTrendsMutation.mutate();
    }
  }, [hasCustomPreferences]);

  // Show mock data only if no API key is configured and no trends exist
  const showMockData = trends.length === 0 && !isLoadingTrends && !isRefreshing;
  const displayTrends = showMockData ? mockTrends : trends;

  // Format time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleRefresh = async () => {
    console.log(`🔄 Manually refreshing ${preferredPlatform} trends via AI...`);
    discoverTrendsMutation.mutate();
  };

  const handleTrendSave = (id: string | number) => {
    console.log("Saving trend:", id);
    onTrendSave?.(id);
  };

  const handleTrendRemix = (id: string | number) => {
    console.log("Using trend for content creation:", id);
    // Find the trend object - handle both string and number IDs
    const trend = displayTrends.find((t: any) => t.id == id); // Use == for loose equality
    if (trend) {
      setSelectedTrend(trend);
      setShowAnalysisModal(true);
    }
  };

  const handleSuggestionsGenerated = (response: any) => {
    // Transform API response to match LaunchPadAnalyzer expectations
    const suggestions = {
      advice: response.personalizedAdvice || "",
      titleSuggestions: [] // The API doesn't return title suggestions, just the full advice
    };

    // Store transformed suggestions in sessionStorage to pass to Launch Pad
    sessionStorage.setItem('trendSuggestions', JSON.stringify(suggestions));
    sessionStorage.setItem('selectedTrend', JSON.stringify(selectedTrend));

    toast({
      title: "AI Advice Generated!",
      description: "Check Launch Pad for personalized suggestions",
    });

    // Navigate to Launch Pad
    onNavigate?.("launch-pad");
  };

  return (
    <div className="bg-background pb-24">
      {/* Header */}
      <div style={{ paddingTop: '56px' }} className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={viralForgeAILogo}
              alt="ViralForgeAI"
              className="w-8 h-8 object-contain"
              data-testid="img-logo-idealab"
            />
            <div>
              <h1 className="text-lg font-bold">ViralForgeAI</h1>
              <p className="text-xs text-muted-foreground">Idea Lab</p>
            </div>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
            data-testid="button-refresh-trends"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Finding..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Trend Feed */}
      <div className="px-4 pt-4 space-y-4">
        {trendsError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-sm text-destructive">Error loading trends</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : isLoadingTrends ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading trends...</p>
          </div>
        ) : displayTrends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Sparkles className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No trends found</p>
            <Button onClick={handleRefresh} variant="default" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Discover Trends
            </Button>
          </div>
        ) : (
          displayTrends.map((trend: any, index: number) => (
            <div
              key={trend.id}
              className="animate-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TrendCard
                trend={trend}
                onSave={handleTrendSave}
                onRemix={handleTrendRemix}
                onNavigate={onNavigate}
              />
            </div>
          ))
        )}

        {/* Load More */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-muted-foreground font-medium">AI discovering more trends...</span>
          </div>
        </div>
      </div>

      {/* Profile Analysis Modal */}
      {selectedTrend && (
        <ProfileAnalysisModal
          open={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          trend={selectedTrend}
          onSuggestionsGenerated={handleSuggestionsGenerated}
        />
      )}
    </div>
  );
}