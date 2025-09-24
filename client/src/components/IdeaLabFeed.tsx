import { useState, useEffect } from "react";
import TrendCard from "./TrendCard";
import ProcessingIndicator from "./ProcessingIndicator";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";

// Mock data - todo: remove mock functionality
const mockTrends = [
  {
    id: "trend-1",
    title: "React to viral TikTok dances with your dog",
    description: "Pet + dance content is exploding! Perfect for pet accounts looking to trend.",
    category: "Pets & Animals",
    hotness: "hot" as const,
    engagement: 24,
    timeAgo: "2h ago",
    suggestion: "Film your dog 'reacting' to dance trends. Show their confused expressions and add funny captions like 'When humans do the thing again...'",
    hashtags: ["dogsoftiktok", "petreacts", "dancechallenge", "viral"],
    sound: "Oh No (Dance Trend Mix)"
  },
  {
    id: "trend-2",
    title: "POV: You're explaining complex topics in 60 seconds",
    description: "Educational micro-content is having a massive moment. Perfect for knowledge creators.",
    category: "Education",
    hotness: "rising" as const,
    engagement: 18,
    timeAgo: "4h ago",
    suggestion: "Pick a complex topic in your niche. Break it down into 3 simple points with visual aids. Use the hook: 'You think you understand [topic], but you don't...'",
    hashtags: ["learnontiktok", "education", "explained", "mindblown"],
    sound: "Aesthetic Study Vibes"
  },
  {
    id: "trend-3",
    title: "Day in my life as a [your profession]",
    description: "Behind-the-scenes content builds authentic connections with audiences.",
    category: "Lifestyle",
    hotness: "relevant" as const,
    engagement: 12,
    timeAgo: "6h ago",
    suggestion: "Show your actual daily routine with honest moments. Include the struggles, not just highlights. Use trending audio with quick cuts.",
    hashtags: ["dayinmylife", "authentic", "workflow", "creator"],
    sound: "That Girl Energy (Aesthetic)"
  },
  {
    id: "trend-4",
    title: "Rating viral life hacks from 1-10",
    description: "Review and rating content gets huge engagement. Easy to batch create.",
    category: "Reviews",
    hotness: "hot" as const,
    engagement: 31,
    timeAgo: "1h ago",
    suggestion: "Test 5 viral life hacks. Rate each honestly with quick explanations. End with your own hack that actually works.",
    hashtags: ["lifehacks", "rating", "viral", "tested"],
    sound: "Rating Things (Viral Mix)"
  }
];

interface IdeaLabFeedProps {
  onTrendSave?: (id: string) => void;
  onTrendRemix?: (id: string) => void;
}

export default function IdeaLabFeed({ onTrendSave, onTrendRemix }: IdeaLabFeedProps) {
  const [trends, setTrends] = useState(mockTrends);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
    setIsRefreshing(true);
    console.log("Manually refreshing trends...");
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Shuffle trends to simulate new content
    setTrends(prev => [...prev].sort(() => Math.random() - 0.5));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const handleTrendSave = (id: string) => {
    console.log("Saving trend:", id);
    onTrendSave?.(id);
  };

  const handleTrendRemix = (id: string) => {
    console.log("Remixing trend:", id);
    onTrendRemix?.(id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <div className="px-4 py-6 border-b border-border/30 bg-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Trending Ideas</h1>
              <p className="text-sm text-muted-foreground">AI-powered content discovery</p>
            </div>
          </div>
          
          <Button
            variant="default"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 bg-gradient-to-r from-primary to-accent"
            data-testid="button-refresh-trends"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Finding..." : "Refresh"}
          </Button>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Live trending</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {trends.length} fresh ideas
          </div>
          <div className="text-sm text-muted-foreground">
            Updated {getTimeAgo(lastUpdated)}
          </div>
        </div>
      </div>

      {/* Trend Feed */}
      <div className="px-4 pt-6 pb-28 space-y-4">
        {trends.map((trend, index) => (
          <div 
            key={trend.id} 
            className="animate-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <TrendCard
              trend={trend}
              onSave={handleTrendSave}
              onRemix={handleTrendRemix}
            />
          </div>
        ))}

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