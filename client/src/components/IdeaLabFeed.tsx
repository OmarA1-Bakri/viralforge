import { useState, useEffect } from "react";
import TrendCard from "./TrendCard";
import ProcessingIndicator from "./ProcessingIndicator";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import viralForgeAILogo from "@assets/viralforge_1758689165504.png";

// TikTok-first mock data - todo: replace with real API
const mockTrends = [
  {
    id: "trend-1",
    title: "React to viral TikTok dances with your dog",
    description: "Pet + dance content is exploding! Perfect for pet accounts looking to trend.",
    category: "Pets & Animals",
    platform: "tiktok",
    hotness: "hot" as const,
    engagement: 24,
    timeAgo: "2h ago",
    suggestion: "Film your dog 'reacting' to dance trends. Show their confused expressions and add funny captions like 'When humans do the thing again...'",
    hashtags: ["#dogsoftiktok", "#petreacts", "#dancechallenge", "#viral"],
    sound: "Oh No (Dance Trend Mix)",
    soundUrl: "trending-dance-mix-1",
    duration: "15s"
  },
  {
    id: "trend-2",
    title: "POV: You're explaining complex topics in 15 seconds",
    description: "Educational micro-content is having a massive moment. Perfect for knowledge creators.",
    category: "Education",
    platform: "tiktok",
    hotness: "rising" as const,
    engagement: 18,
    timeAgo: "4h ago",
    suggestion: "Pick a complex topic in your niche. Break it down into 3 simple points with visual aids. Use the hook: 'You think you understand [topic], but you don't...'",
    hashtags: ["#learnontiktok", "#education", "#explained", "#mindblown"],
    sound: "Aesthetic Study Vibes",
    soundUrl: "study-vibes-beat",
    duration: "15s"
  },
  {
    id: "trend-3",
    title: "Day in my life as a [your profession]",
    description: "Behind-the-scenes content builds authentic connections with audiences.",
    category: "Lifestyle",
    platform: "tiktok",
    hotness: "relevant" as const,
    engagement: 12,
    timeAgo: "6h ago",
    suggestion: "Show your actual daily routine with honest moments. Include the struggles, not just highlights. Use trending audio with quick cuts.",
    hashtags: ["#dayinmylife", "#authentic", "#workflow", "#creator"],
    sound: "That Girl Energy (Aesthetic)",
    soundUrl: "that-girl-energy",
    duration: "30s"
  },
  {
    id: "trend-4",
    title: "Rating viral life hacks from 1-10",
    description: "Review and rating content gets huge engagement. Easy to batch create.",
    category: "Reviews",
    platform: "tiktok",
    hotness: "hot" as const,
    engagement: 31,
    timeAgo: "1h ago",
    suggestion: "Test 5 viral life hacks. Rate each honestly with quick explanations. End with your own hack that actually works.",
    hashtags: ["#lifehacks", "#rating", "#viral", "#tested"],
    sound: "Rating Things (Viral Mix)",
    soundUrl: "rating-viral-mix",
    duration: "15s"
  }
];

interface IdeaLabFeedProps {
  onTrendSave?: (id: string) => void;
  onTrendRemix?: (id: string) => void;
  onNavigate?: (tab: "dashboard" | "idea-lab" | "launch-pad" | "multiplier" | "preferences") => void;
}

export default function IdeaLabFeed({ onTrendSave, onTrendRemix, onNavigate }: IdeaLabFeedProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch user preferences for personalization
  const { data: userPrefs } = useQuery({
    queryKey: ['/api/user/preferences'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user/preferences');
        const data = await response.json();
        console.log('[IdeaLab] User preferences:', data);
        return data;
      } catch (error) {
        console.log('[IdeaLab] No user preferences found, using defaults');
        return null;
      }
    },
  });

  // Fetch existing trends from database (personalized if preferences exist)
  const { data: existingTrends, isLoading: isLoadingTrends, error: trendsError } = useQuery({
    queryKey: ['/api/trends', { platform: 'tiktok', categories: userPrefs?.preferredCategories }],
    enabled: true,
    queryFn: async () => {
      const params = new URLSearchParams({ platform: 'tiktok' });
      if (userPrefs?.preferredCategories?.length > 0) {
        params.append('categories', userPrefs.preferredCategories.join(','));
      }
      const response = await apiRequest('GET', `/api/trends?${params}`);
      const data = await response.json();
      console.log('[IdeaLab] Trends loaded:', data);
      return data;
    },
    retry: 2,
    staleTime: 30000,
  });

  // AI-powered trend discovery mutation
  const discoverTrendsMutation = useMutation({
    mutationFn: async () => {
      console.log("🎯 Discovering new TikTok trends via AI...");
      try {
        const response = await apiRequest('POST', '/api/trends/discover', {
          platform: 'tiktok',
          category: 'All',
          contentType: 'viral',
          targetAudience: 'creators'
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
      // Invalidate and refetch trends with exact key
      queryClient.invalidateQueries({ queryKey: ['/api/trends', { platform: 'tiktok' }] });
      setLastUpdated(new Date());
    },
    onError: (error) => {
      console.error("💥 Mutation failed:", error);
    }
  });

  const trends = existingTrends?.trends || [];
  const isRefreshing = discoverTrendsMutation.isPending;
  
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
    console.log("🔄 Manually refreshing TikTok trends via AI...");
    discoverTrendsMutation.mutate();
  };

  const handleTrendSave = (id: string) => {
    console.log("Saving trend:", id);
    onTrendSave?.(id);
  };

  const handleTrendRemix = (id: string) => {
    console.log("Using trend for content creation:", id);
    onTrendRemix?.(id);
    // Navigate to Launch Pad to create content based on this trend
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
    </div>
  );
}