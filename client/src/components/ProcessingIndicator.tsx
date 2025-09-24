import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingIndicatorProps {
  status: "idle" | "processing" | "completed" | "error";
  progress?: number;
  message?: string;
  estimatedTime?: string;
  className?: string;
}

export default function ProcessingIndicator({ 
  status, 
  progress = 0, 
  message, 
  estimatedTime,
  className 
}: ProcessingIndicatorProps) {
  const statusConfig = {
    idle: {
      icon: Clock,
      iconClassName: "text-muted-foreground",
      badgeVariant: "outline" as const,
      badgeClassName: "text-muted-foreground",
      label: "Ready"
    },
    processing: {
      icon: Loader2,
      iconClassName: "text-primary animate-spin",
      badgeVariant: "default" as const,
      badgeClassName: "bg-gradient-to-r from-primary to-cyan-400 text-white shadow-lg shadow-primary/30",
      label: "AI Working..."
    },
    completed: {
      icon: CheckCircle,
      iconClassName: "text-green-500",
      badgeVariant: "outline" as const,
      badgeClassName: "text-green-500 border-green-500",
      label: "Complete"
    },
    error: {
      icon: AlertCircle,
      iconClassName: "text-destructive",
      badgeVariant: "destructive" as const,
      badgeClassName: "",
      label: "Error"
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge 
          variant={config.badgeVariant}
          className={cn("gap-1.5 text-xs", config.badgeClassName)}
          data-testid={`status-${status}`}
        >
          <Icon className={cn("w-3 h-3", config.iconClassName)} />
          {config.label}
        </Badge>
        
        {estimatedTime && status === "processing" && (
          <span className="text-xs text-muted-foreground">
            ~{estimatedTime}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {status === "processing" && (
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className="h-2 bg-muted"
            data-testid="progress-bar"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            {estimatedTime && (
              <span>{estimatedTime} remaining</span>
            )}
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <p className={cn(
          "text-sm",
          status === "error" ? "text-destructive" : "text-muted-foreground"
        )} data-testid="status-message">
          {message}
        </p>
      )}

      {/* Pulsing Animation for Processing */}
      {status === "processing" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="font-mono">AI automation running</span>
        </div>
      )}
    </div>
  );
}