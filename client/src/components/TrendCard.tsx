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
    relevant: { label: "For You", className: "bg-gradient-to-r from-primary to-cyan-400 text-white shadow-lg shadow-primary/30" }
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/90 border-card-border hover-elevate active-elevate-2 transition-all duration-200">
      {/* Hotness indicator */}
      <div className="absolute top-3 right-3 z-10">
        <Badge className={cn("text-xs", hotnessConfig[trend.hotness].className)}>
          <TrendingUp className="w-3 h-3 mr-1" />
          {hotnessConfig[trend.hotness].label}
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground leading-tight" data-testid={`trend-title-${trend.id}`}>
                {trend.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{trend.description}</p>
            </div>
          </div>
        </div>

        {/* Category and stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {trend.category}
          </Badge>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {trend.engagement}K
            </span>
            <span>{trend.timeAgo}</span>
          </div>
        </div>

        {/* AI Suggestion */}
        <div className="bg-gradient-to-r from-primary/20 to-cyan-500/20 rounded-md p-3 border border-primary/30">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0 animate-pulse shadow-md shadow-primary/50" />
            <div>
              <p className="text-sm font-medium text-primary">AI Suggestion</p>
              <p className="text-sm text-foreground mt-1">{trend.suggestion}</p>
            </div>
          </div>
        </div>

        {/* Sound/Audio */}
        {trend.sound && (
          <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-md p-2 border border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-md shadow-green-400/50" />
            <span className="text-green-400 font-medium">{trend.sound}</span>
          </div>
        )}

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1">
          {trend.hashtags.map((tag, index) => (
            <span key={index} className="text-xs text-primary font-medium">
              #{tag}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLike}
              className={cn(
                "gap-1 text-xs",
                isLiked && "text-red-500"
              )}
              data-testid={`button-like-${trend.id}`}
            >
              <Heart className={cn("w-3 h-3", isLiked && "fill-current")} />
              {isLiked ? "Liked" : "Like"}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs"
              onClick={() => console.log("Share trend")}
              data-testid={`button-share-${trend.id}`}
            >
              <Share className="w-3 h-3" />
              Share
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              className={cn(
                "gap-1 text-xs",
                isSaved && "bg-primary text-primary-foreground"
              )}
              data-testid={`button-save-${trend.id}`}
            >
              <Bookmark className={cn("w-3 h-3", isSaved && "fill-current")} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            
            <Button
              size="sm"
              variant="default"
              onClick={handleRemix}
              className="gap-1 text-xs"
              data-testid={`button-remix-${trend.id}`}
            >
              <Shuffle className="w-3 h-3" />
              Remix
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}