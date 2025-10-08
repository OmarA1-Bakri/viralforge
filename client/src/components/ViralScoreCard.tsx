import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ViralScoreCardProps {
  viralScore?: number;
  previousViralScore?: number;
  previousAnalyzedAt?: string;
  confidenceInterval?: { lower: number; upper: number };
  platformScores?: {
    youtube?: number;  // YouTube-only for mobile
  };
  lastAnalyzedAt?: string;
  analysisStatus?: 'pending' | 'analyzing' | 'completed' | 'failed';
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export function ViralScoreCard({
  viralScore,
  previousViralScore,
  previousAnalyzedAt,
  confidenceInterval,
  platformScores,
  lastAnalyzedAt,
  analysisStatus = 'pending',
  onAnalyze,
  isAnalyzing = false
}: ViralScoreCardProps) {

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-yellow-500";
    return "text-orange-500";
  };

  // Determine score badge variant
  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "Excellent", variant: "default" as const, color: "bg-green-500" };
    if (score >= 60) return { label: "Good", variant: "secondary" as const, color: "bg-blue-500" };
    if (score >= 40) return { label: "Fair", variant: "secondary" as const, color: "bg-yellow-500" };
    return { label: "Needs Work", variant: "destructive" as const, color: "bg-orange-500" };
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  // No analysis yet
  if (!viralScore && analysisStatus === 'pending') {
    return (
      <Card className="p-6 rounded-xl hover-elevate">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Your Viral Score</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            Not Analyzed
          </Badge>
        </div>

        <div className="text-center py-8">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Discover your viral potential! Analyze your top YouTube videos and Shorts.
            </p>
          </div>

          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze My Profile
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Analysis in progress
  if (analysisStatus === 'analyzing' || isAnalyzing) {
    return (
      <Card className="p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <h3 className="text-lg font-semibold">Analyzing Your Profile...</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Scraping posts...</span>
              <span className="font-medium">45-70 seconds</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>

          <p className="text-xs text-muted-foreground">
            We're analyzing your YouTube channel. This will take about a minute.
          </p>
        </div>
      </Card>
    );
  }

  // Analysis failed
  if (analysisStatus === 'failed') {
    return (
      <Card className="p-6 rounded-xl border-destructive">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold">Analysis Failed</h3>
          </div>
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          We couldn't analyze your profile. Please check your social media handles and try again.
        </p>

        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </Card>
    );
  }

  // Analysis complete - show results
  const scoreBadge = viralScore ? getScoreBadge(viralScore) : null;

  return (
    <Card className="p-6 rounded-xl hover-elevate">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Your Viral Score</h3>
        </div>
        <div className="flex items-center gap-2">
          {scoreBadge && (
            <Badge variant={scoreBadge.variant} className={cn("text-xs", scoreBadge.color)}>
              {scoreBadge.label}
            </Badge>
          )}
          {lastAnalyzedAt && (
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(lastAnalyzedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Main Viral Score */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="text-6xl font-bold mb-2">
            <span className={cn(viralScore ? getScoreColor(viralScore) : "text-muted-foreground")}>
              {viralScore || "—"}
            </span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>

          {confidenceInterval && (
            <div className="text-xs text-muted-foreground">
              95% CI: {confidenceInterval.lower}-{confidenceInterval.upper}
            </div>
          )}
        </div>

        <Progress
          value={viralScore || 0}
          className="h-2 mt-4"
        />

        {/* Score Comparison - Before/After */}
        {previousViralScore !== undefined && previousViralScore !== null && viralScore && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Previous:</span>
                <span className="font-medium">{previousViralScore}</span>
              </div>
              
              {(() => {
                const change = viralScore - previousViralScore;
                const isPositive = change > 0;
                const isNeutral = change === 0;
                
                return (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md",
                    isNeutral ? "bg-muted" : isPositive ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    {!isNeutral && (
                      isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )
                    )}
                    <span className={cn(
                      "font-semibold",
                      isNeutral ? "text-muted-foreground" : isPositive ? "text-green-500" : "text-red-500"
                    )}>
                      {isPositive ? '+' : ''}{change}
                    </span>
                  </div>
                );
              })()}
              
              {previousAnalyzedAt && (
                <span className="text-xs text-muted-foreground">
                  vs {formatTimeAgo(previousAnalyzedAt)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Platform Breakdown */}
      {platformScores && (
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-medium text-muted-foreground">YouTube Score</h4>

          {platformScores.youtube !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm">YouTube</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={platformScores.youtube} className="w-24 h-1.5" />
                <span className="text-sm font-medium w-8 text-right">{platformScores.youtube}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        variant="outline"
        className="w-full gap-2"
        size="sm"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Re-analyzing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Re-analyze Profile
          </>
        )}
      </Button>
    </Card>
  );
}

interface DetailedAnalysisProps {
  report?: {
    overallStrengths?: string[];
    overallWeaknesses?: string[];
    quickWins?: string[];
    strategicRecommendations?: string[];
    mostViralPattern?: string;
    growthPotential?: string;
  };
}

export function DetailedAnalysisCard({ report }: DetailedAnalysisProps) {
  // Debug logging
  console.log('[DetailedAnalysisCard] Rendering with report:', JSON.stringify({
    hasReport: !!report,
    reportKeys: report ? Object.keys(report) : [],
    hasQuickWins: !!report?.quickWins,
    quickWinsLength: report?.quickWins?.length || 0,
  }));
  
  // TEMPORARY: Show placeholder when report is missing
  if (!report) {
    return (
      <Card className="p-6 rounded-xl hover-elevate border-2 border-dashed border-primary">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Detailed Analysis</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No report data available. The report object is {report === null ? 'null' : 'undefined'}.
          Try re-analyzing your profile to generate detailed insights.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-xl hover-elevate">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Detailed Analysis</h3>
      </div>

      <div className="space-y-6">
        {/* Strengths */}
        {report.overallStrengths && report.overallStrengths.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h4 className="text-sm font-semibold text-green-500">What's Working</h4>
            </div>
            <ul className="space-y-2">
              {report.overallStrengths.map((strength, idx) => (
                <li key={idx} className="text-sm text-muted-foreground pl-6 border-l-2 border-green-500/30">
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {report.overallWeaknesses && report.overallWeaknesses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <h4 className="text-sm font-semibold text-orange-500">Areas to Improve</h4>
            </div>
            <ul className="space-y-2">
              {report.overallWeaknesses.map((weakness, idx) => (
                <li key={idx} className="text-sm text-muted-foreground pl-6 border-l-2 border-orange-500/30">
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Wins */}
        {report.quickWins && report.quickWins.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h4 className="text-sm font-semibold text-blue-500">Quick Wins</h4>
            </div>
            <ul className="space-y-2">
              {report.quickWins.map((win, idx) => (
                <li key={idx} className="text-sm text-muted-foreground pl-6 border-l-2 border-blue-500/30">
                  {win}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strategic Recommendations */}
        {report.strategicRecommendations && report.strategicRecommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold">Strategic Recommendations</h4>
            </div>
            <ul className="space-y-2">
              {report.strategicRecommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-muted-foreground pl-6 border-l-2 border-primary/30">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Most Viral Pattern */}
        {report.mostViralPattern && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <h4 className="text-sm font-semibold mb-2 text-primary">🔥 Most Viral Pattern</h4>
            <p className="text-sm text-muted-foreground">{report.mostViralPattern}</p>
          </div>
        )}

        {/* Growth Potential */}
        {report.growthPotential && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h4 className="text-sm font-semibold mb-2 text-green-500">📈 Growth Potential</h4>
            <p className="text-sm text-muted-foreground">{report.growthPotential}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
