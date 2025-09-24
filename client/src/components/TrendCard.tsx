import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Bookmark, Shuffle, Heart, MessageCircle, Share, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendCardProps {
  trend: {
    id: string;
    title: string;
    description: string;
    category: string;
    hotness: "hot" | "rising" | "relevant";
    engagement: number;
    timeAgo: string;
    suggestion: string;
    hashtags: string[];
    sound?: string;
  };
  onSave?: (id: string) => void;
  onRemix?: (id: string) => void;
}

export default function TrendCard({ trend, onSave, onRemix }: TrendCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave?.(trend.id);
    console.log(`${isSaved ? "Unsaved" : "Saved"} trend: ${trend.title}`);
  };

  const handleRemix = () => {
    onRemix?.(trend.id);
    console.log(`Remixing trend: ${trend.title}`);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    console.log(`${isLiked ? "Unliked" : "Liked"} trend: ${trend.title}`);
  };

  const hotnessConfig = {
    hot: { label: "Hot", className: "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30" },
    rising: { label: "Rising", className: "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/30" },
    relevant: { label: "For You", className: "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30" }
  };

  return (
    <Card className="relative overflow-hidden hover-elevate transition-all duration-300 group border border-border/50 hover:border-primary/30 bg-transparent">
      {/* Hotness indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Badge className={cn("text-xs font-medium", hotnessConfig[trend.hotness].className)}>
          <TrendingUp className="w-3 h-3 mr-1" />
          {hotnessConfig[trend.hotness].label}
        </Badge>
      </div>

      <div className="p-5">
        {/* Header - Clean & Focused */}
        <div className="mb-4 pr-20">
          <h3 className="font-bold text-lg leading-tight mb-2" data-testid={`trend-title-${trend.id}`}>
            {trend.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{trend.description}</p>
        </div>

        {/* Key Info Row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {trend.category}
          </Badge>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span className="font-medium">{trend.engagement}K</span>
          </div>
          <span>{trend.timeAgo}</span>
        </div>

        {/* AI Suggestion - Cleaner Design */}
        <div className="rounded-lg p-4 mb-4 border border-border/30 bg-transparent">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-primary/20 rounded-full mt-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary mb-1">AI Strategy</p>
              <p className="text-sm text-foreground leading-relaxed">{trend.suggestion}</p>
            </div>
          </div>
        </div>

        {/* Hashtags - Prettier Display */}
        <div className="flex flex-wrap gap-2 mb-4">
          {trend.hashtags.slice(0, 3).map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-1 text-primary rounded-md text-xs font-medium border border-border/30 bg-transparent">
              #{tag}
            </span>
          ))}
          {trend.hashtags.length > 3 && (
            <span className="text-xs text-muted-foreground px-2 py-1">
              +{trend.hashtags.length - 3} more
            </span>
          )}
        </div>

        {/* Sound Track */}
        {trend.sound && (
          <div className="flex items-center gap-2 rounded-lg p-3 mb-4 border border-border/30 bg-transparent">
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
              <div className="w-1 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
              <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-muted-foreground font-medium text-sm">{trend.sound}</span>
          </div>
        )}

        {/* Action Buttons - Clean Layout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLike}
              className={cn(
                "gap-1.5 text-xs h-8",
                isLiked && "text-red-500"
              )}
              data-testid={`button-like-${trend.id}`}
            >
              <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-current")} />
              {trend.engagement}K
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs h-8"
              onClick={() => console.log("Share trend")}
              data-testid={`button-share-${trend.id}`}
            >
              <Share className="w-3.5 h-3.5" />
              Share
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              className={cn(
                "gap-1.5 text-xs h-8",
                isSaved && "bg-primary text-primary-foreground border-primary"
              )}
              data-testid={`button-save-${trend.id}`}
            >
              <Bookmark className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            
            <Button
              size="sm"
              onClick={handleRemix}
              className="gap-1.5 text-xs h-8 bg-gradient-to-r from-primary to-accent"
              data-testid={`button-remix-${trend.id}`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              Use This
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}