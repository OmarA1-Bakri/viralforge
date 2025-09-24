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
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Simulate auto-refresh of trends
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      // Simulate new trends arriving
      console.log("Auto-refreshing trends...");
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    console.log("Manually refreshing trends...");
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Shuffle trends to simulate new content
    setTrends(prev => [...prev].sort(() => Math.random() - 0.5));
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Idea Lab</h1>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
            data-testid="button-refresh-trends"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        
        {/* AI Status */}
        <div className="mt-2">
          <ProcessingIndicator
            status={isRefreshing ? "processing" : autoRefreshEnabled ? "processing" : "idle"}
            message={
              isRefreshing ? "Finding fresh trends..." :
              autoRefreshEnabled ? "AI monitoring trends in real-time" :
              "Trend monitoring paused"
            }
            progress={isRefreshing ? 75 : undefined}
          />
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 pt-4 space-y-4">
        {/* Auto-refresh toggle */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {trends.length} trending ideas for you
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className="text-xs"
            data-testid="button-toggle-auto-refresh"
          >
            Auto-refresh: {autoRefreshEnabled ? "ON" : "OFF"}
          </Button>
        </div>

        {/* Trend Cards */}
        {trends.map((trend, index) => (
          <div 
            key={trend.id} 
            className="animate-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <TrendCard
              trend={trend}
              onSave={handleTrendSave}
              onRemix={handleTrendRemix}
            />
          </div>
        ))}

        {/* Load more placeholder */}
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            AI is analyzing more trends...
          </p>
          <div className="flex justify-center gap-1 mt-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}