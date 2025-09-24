import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreDisplayProps {
  type: "clickability" | "clarity" | "intrigue" | "emotion";
  score: number;
  maxScore?: number;
  feedback?: string;
  className?: string;
}

export default function ScoreDisplay({ 
  type, 
  score, 
  maxScore = 10, 
  feedback,
  className 
}: ScoreDisplayProps) {
  const percentage = (score / maxScore) * 100;
  
  const typeConfig = {
    clickability: {
      icon: Target,
      label: "Clickability Score",
      color: getScoreColor(percentage),
      description: "How likely users are to click"
    },
    clarity: {
      icon: TrendingUp,
      label: "Clarity",
      color: getScoreColor(percentage),
      description: "How clear your message is"
    },
    intrigue: {
      icon: Zap,
      label: "Intrigue",
      color: getScoreColor(percentage),
      description: "How curious users will be"
    },
    emotion: {
      icon: TrendingUp,
      label: "Emotion",
      color: getScoreColor(percentage),
      description: "Emotional impact level"
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{config.label}</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-xs font-mono", config.color.badgeClass)}
          data-testid={`score-badge-${type}`}
        >
          {score}/{maxScore}
        </Badge>
      </div>

      {/* Score Visualization */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{config.description}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
        
        <Progress 
          value={percentage} 
          className={cn("h-3", config.color.progressClass)}
          data-testid={`progress-${type}`}
        />
        
        {/* Score labels */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Poor</span>
          <span>Good</span>
          <span>Excellent</span>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn(
          "p-3 rounded-md text-sm",
          percentage >= 70 ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" :
          percentage >= 40 ? "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300" :
          "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
        )}>
          <p data-testid={`feedback-${type}`}>{feedback}</p>
        </div>
      )}

      {/* Visual indicator */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          percentage >= 70 ? "bg-green-500" :
          percentage >= 40 ? "bg-yellow-500" :
          "bg-red-500"
        )} />
        <span className="text-xs text-muted-foreground">
          {percentage >= 70 ? "Strong performance" :
           percentage >= 40 ? "Needs improvement" :
           "Needs major work"}
        </span>
      </div>
    </div>
  );
}

function getScoreColor(percentage: number) {
  if (percentage >= 70) {
    return {
      progressClass: "[&>div]:bg-green-500",
      badgeClass: "text-green-600 border-green-600"
    };
  } else if (percentage >= 40) {
    return {
      progressClass: "[&>div]:bg-yellow-500",
      badgeClass: "text-yellow-600 border-yellow-600"
    };
  } else {
    return {
      progressClass: "[&>div]:bg-red-500",
      badgeClass: "text-red-600 border-red-600"
    };
  }
}