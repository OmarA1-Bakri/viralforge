import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  Share, 
  Video, 
  Lightbulb, 
  Rocket,
  Calendar,
  Target,
  Zap,
  Clock,
  BarChart3,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import viralForgeAILogo from "@assets/viralforge_1758689165504.png";

// Mock data and formatNumber function are not provided in the original code,
// assuming they are either defined elsewhere or should be removed if not used.
// For this fix, we will assume 'stats' and 'activities' are available from useQuery.

// Placeholder for VideoIcon and Scissors if they are used in the changes snippet
const VideoIcon = Video; 
const Scissors = Zap; // Using Zap as a placeholder for Scissors


const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};


interface DashboardStats {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  videosCreated: number;
  trendsUsed: number;
  avgClickRate: number;
  weeklyGrowth: number;
  automationSavings: string;
  avgViralScore: number;
  totalClips: number;
}

interface UserActivity {
  id: number;
  activityType: string;
  title: string;
  status: string;
  contentId?: number;
  trendId?: number;
  metadata?: {
    views?: string;
    engagement?: string;
    score?: string;
    clips?: string;
    url?: string;
    // Trend-specific metadata
    trendTitle?: string;
    trendDescription?: string;
    trendExamples?: string[];
    platform?: string;
    category?: string;
  };
  createdAt: string;
}

// Utility function to format time
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
};

interface CreatorDashboardProps {
  onNavigate?: (tab: "dashboard" | "idea-lab" | "launch-pad" | "multiplier" | "preferences") => void;
}

export default function CreatorDashboard({ onNavigate }: CreatorDashboardProps = {}) {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

  // Fetch dashboard statistics
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/dashboard/stats', timeframe],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dashboard/stats?timeframe=${timeframe}`);
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: activityData, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ['/api/dashboard/activity', timeframe],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/dashboard/activity?limit=10&timeframe=${timeframe}`);
        return await response.json();
      } catch (error) {
        throw error;
      }
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Fetch performance insights
  const { data: insightsData, isLoading: insightsLoading, error: insightsError } = useQuery({
    queryKey: ['/api/dashboard/insights', timeframe],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dashboard/insights?timeframe=${timeframe}`);
      return response.json();
    },
    refetchInterval: 120000, // Refresh every 2 minutes (insights change less frequently)
  });

  const stats: DashboardStats = statsData?.stats || {
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    videosCreated: 0,
    trendsUsed: 0,
    avgClickRate: 0,
    weeklyGrowth: 0,
    automationSavings: "0h 0m",
    avgViralScore: 0,
    totalClips: 0,
  };

  const activities: UserActivity[] = activityData?.activities || [];
  const insights = insightsData?.insights || {
    bestContentType: 'Mixed Content',
    optimalPostingTime: '6-8 PM',
    topTrendingHashtag: '#viral',
    bestPlatform: 'TikTok',
    avgEngagementRate: 0
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    change, 
    color = "primary",
    suffix = "",
    prefix = ""
  }: {
    icon: any;
    label: string;
    value: string | number;
    change?: number;
    color?: string;
    suffix?: string;
    prefix?: string;
  }) => (
    <Card className="p-4 rounded-xl hover-elevate active-elevate-2 hover-cyan-glow interactive">
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("w-5 h-5", 
          color === "primary" ? "text-primary" :
          color === "green" ? "text-green-400" :
          color === "blue" ? "text-blue-400" :
          color === "orange" ? "text-orange-400" :
          "text-primary"
        )} />
        {change !== undefined && (
          <Badge variant={change >= 0 ? "outline" : "destructive"} className="text-xs">
            {change >= 0 ? "+" : ""}{change}%
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold improved-line-height text-foreground">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        <p className="text-xs text-muted-foreground improved-line-height">{label}</p>
      </div>
    </Card>
  );

  const ActivityItem = ({ item }: { item: UserActivity }) => {
    const typeConfig = {
      video: { icon: Video, color: "bg-red-500/20 text-red-400" },
      trend: { icon: Lightbulb, color: "bg-primary/20 text-primary" },
      optimization: { icon: Target, color: "bg-blue-500/20 text-blue-400" },
      clip: { icon: Zap, color: "bg-green-500/20 text-green-400" },
    };

    const config = typeConfig[item.activityType as keyof typeof typeConfig] || typeConfig.video;
    const Icon = config.icon;

    const handleClick = () => {
      // If there's a URL in metadata, open it
      if (item.metadata?.url) {
        window.open(item.metadata.url, '_blank');
        return;
      }

      // Navigate based on activity type
      if (item.activityType === 'trend' && item.trendId) {
        onNavigate?.("idea-lab");
      } else if (item.activityType === 'video' || item.activityType === 'clip') {
        onNavigate?.("multiplier");
      } else if (item.activityType === 'optimization') {
        onNavigate?.("launch-pad");
      }
    };

    return (
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className="flex flex-col gap-2 p-3 bg-card/50 rounded-lg border border-border cursor-pointer hover:bg-card/70 transition-colors active:scale-[0.98] touch-manipulation">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", config.color)}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">{item.title}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTimeAgo(item.createdAt)}</span>
              {item.metadata && (item.metadata.platform || item.metadata.category) && (
                <>
                  <span>•</span>
                  <span>{item.metadata.platform || item.metadata.category}</span>
                </>
              )}
              {item.metadata && (item.metadata.views || item.metadata.engagement || item.metadata.score || item.metadata.clips) && (
                <>
                  <span>•</span>
                  <span className={cn(
                    item.status === "viral" ? "text-green-400" :
                    item.status === "ready" ? "text-blue-400" :
                    item.status === "improved" ? "text-primary" :
                    "text-foreground"
                  )}>
                    {item.metadata.views || item.metadata.engagement || item.metadata.score || item.metadata.clips}
                  </span>
                </>
              )}
            </div>
          </div>

          <Badge variant="outline" className="text-xs">
            {item.status}
          </Badge>
        </div>

        {/* Trend Details - Show trend description and examples */}
        {item.activityType === 'trend' && item.metadata && (
          <div className="pl-[52px] space-y-2">
            {item.metadata.trendTitle && (
              <p className="text-sm font-medium text-primary">{item.metadata.trendTitle}</p>
            )}
            {item.metadata.trendDescription && (
              <p className="text-xs text-muted-foreground">{item.metadata.trendDescription}</p>
            )}
            {item.metadata.trendExamples && item.metadata.trendExamples.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Examples:</p>
                <ul className="space-y-1">
                  {item.metadata.trendExamples.slice(0, 2).map((example, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground pl-3 border-l-2 border-primary/30">
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-background pb-32">
      {/* Header */}
      <div style={{ paddingTop: '56px' }} className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={viralForgeAILogo} 
              alt="ViralForgeAI" 
              className="w-8 h-8 object-contain"
              data-testid="img-logo-dashboard"
            />
            <div>
              <h1 className="text-lg font-bold">ViralForgeAI</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(["week", "month", "year"] as const).map((period) => (
              <Button
                key={period}
                size="sm"
                variant={timeframe === period ? "default" : "ghost"}
                onClick={() => setTimeframe(period)}
                className="text-xs h-7"
                data-testid={`filter-${period}`}
              >
                {period === "week" ? "7D" : period === "month" ? "30D" : "1Y"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Loading State */}
        {statsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading dashboard analytics...</span>
          </div>
        )}

        {/* Error State */}
        {statsError && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Failed to load analytics data</p>
          </div>
        )}

        {/* Quick Stats Grid */}
        {!statsLoading && !statsError && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Eye}
              label="Total Views"
              value={stats.totalViews}
              change={stats.weeklyGrowth}
              color="blue"
            />
            <StatCard
              icon={Heart}
              label="Total Likes"
              value={stats.totalLikes}
              change={15.2}
              color="primary"
            />
            <StatCard
              icon={Video}
              label="Videos Created"
              value={stats.videosCreated}
              change={8.7}
              color="green"
            />
            <StatCard
              icon={TrendingUp}
              label="Click Rate"
              value={stats.avgClickRate}
              suffix="%"
              change={2.1}
              color="orange"
            />
          </div>
        )}

        {/* AI Automation Stats */}
        {!statsLoading && !statsError && (
          <Card className="p-4 rounded-xl brand-gradient bg-opacity-10 border-primary/20 hover-cyan-glow interactive">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-foreground" />
              <h2 className="font-semibold text-lg improved-line-height text-foreground">AI Automation Impact</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground improved-line-height">Time Saved</p>
                <p className="text-xl font-bold text-foreground improved-line-height">{stats.automationSavings}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground improved-line-height">Trends Used</p>
                <p className="text-xl font-bold text-foreground improved-line-height">{stats.trendsUsed}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground improved-line-height">Viral Score</p>
                <p className="text-xl font-bold text-foreground improved-line-height">{stats.avgViralScore.toFixed(1)}/10</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground improved-line-height">Clips Created</p>
                <p className="text-xl font-bold text-foreground improved-line-height">{stats.totalClips}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground improved-line-height">AI Effectiveness</span>
                <span className="text-primary improved-line-height">{Math.round((stats.avgViralScore / 10) * 100)}%</span>
              </div>
              <Progress 
                value={(stats.avgViralScore / 10) * 100} 
                className="h-2 bg-muted progress-animate" 
              />
            </div>
          </Card>
        )}

        {/* Performance Insights */}
        <Card className="p-4 rounded-xl hover-elevate hover-cyan-glow interactive">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg improved-line-height">Performance Insights</h2>
          </div>

          {insightsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading insights...</span>
            </div>
          ) : insightsError ? (
            <div className="text-center py-4 space-y-2">
              <div className="text-xs text-destructive">Failed to load insights</div>
              <div className="text-xs text-muted-foreground">Using cached data</div>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-md border border-border/30 bg-transparent improved-line-height">
              <span className="text-sm text-foreground">Best performing content type</span>
              <Badge variant="outline" className="hover-pink-glow">{insights.bestContentType}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md border border-border/30 bg-transparent improved-line-height">
              <span className="text-sm text-foreground">Optimal posting time</span>
              <Badge variant="outline" className="hover-pink-glow">{insights.optimalPostingTime}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md border border-border/30 bg-transparent improved-line-height">
              <span className="text-sm text-foreground">Top trending hashtag</span>
              <Badge variant="outline" className="hover-pink-glow">{insights.topTrendingHashtag}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md border border-border/30 bg-transparent improved-line-height">
              <span className="text-sm text-foreground">Best platform</span>
              <Badge variant="outline" className="hover-pink-glow">{insights.bestPlatform}</Badge>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Recent Activity</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                // TODO: Navigate to full activity page or show modal
                console.log("View All activity clicked");
              }}
            >
              View All
            </Button>
          </div>

          <div className="space-y-2">
            {activityLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading activity...</span>
              </div>
            ) : activityError ? (
              <div className="text-center py-4 space-y-2">
                <div className="text-xs text-destructive">Failed to load recent activity</div>
                <div className="text-xs text-muted-foreground">Network error or server unavailable</div>
              </div>
            ) : activities.length > 0 ? (
              activities.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No recent activity for selected timeframe
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-4 rounded-xl hover-elevate hover-cyan-glow interactive mb-8">
          <h2 className="font-semibold text-lg mb-3 improved-line-height">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              className="gap-2 brand-gradient text-white hover:shadow-lg hover:shadow-primary/20 interactive" 
              data-testid="quick-analyze"
              onClick={() => onNavigate?.("launch-pad")}
            >
              <Rocket className="w-4 h-4" />
              Analyze New
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 hover-cyan-glow interactive" 
              data-testid="quick-trends"
              onClick={() => onNavigate?.("idea-lab")}
            >
              <Lightbulb className="w-4 h-4" />
              Find Trends
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 hover-cyan-glow interactive" 
              data-testid="quick-process"
              onClick={() => onNavigate?.("multiplier")}
            >
              <Video className="w-4 h-4" />
              Process Video
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 hover-cyan-glow interactive" 
              data-testid="quick-schedule"
              onClick={() => console.log("Schedule Post feature coming soon!")}
            >
              <Calendar className="w-4 h-4" />
              Schedule Post
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}