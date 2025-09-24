import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  metadata?: {
    views?: string;
    engagement?: string;
    score?: string;
    clips?: string;
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

export default function CreatorDashboard() {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

  // Fetch dashboard statistics
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/dashboard/stats', timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/stats?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: activityData, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ['/api/dashboard/activity', timeframe],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/dashboard/activity?limit=10&timeframe=${timeframe}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch activity`);
        }
        return await response.json();
      } catch (error) {
        throw error;
      }
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
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
    <Card className="p-4 hover-elevate active-elevate-2 transition-all duration-200">
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
        <p className="text-2xl font-bold text-foreground">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
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

    return (
      <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.color)}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">{item.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTimeAgo(item.createdAt)}</span>
            {item.metadata && (
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
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Dashboard</h1>
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
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-primary">AI Automation Impact</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-xl font-bold text-primary">{stats.automationSavings}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Trends Used</p>
                <p className="text-xl font-bold text-primary">{stats.trendsUsed}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Viral Score</p>
                <p className="text-xl font-bold text-primary">{stats.avgViralScore.toFixed(1)}/10</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Clips Created</p>
                <p className="text-xl font-bold text-primary">{stats.totalClips}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">AI Effectiveness</span>
                <span className="text-primary">{Math.round((stats.avgViralScore / 10) * 100)}%</span>
              </div>
              <Progress 
                value={(stats.avgViralScore / 10) * 100} 
                className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent" 
              />
            </div>
          </Card>
        )}

        {/* Performance Insights */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold">Performance Insights</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-md border border-green-500/20">
              <span className="text-sm text-foreground">Best performing content type</span>
              <Badge className="bg-green-500 text-white">Pet + Dance</Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
              <span className="text-sm text-foreground">Optimal posting time</span>
              <Badge className="bg-blue-500 text-white">6-8 PM</Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-primary/10 rounded-md border border-primary/20">
              <span className="text-sm text-foreground">Top trending hashtag</span>
              <Badge className="bg-primary text-primary-foreground">#viral</Badge>
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
            <Button size="sm" variant="ghost" className="text-xs">
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
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button className="gap-2 bg-gradient-to-r from-primary to-accent" data-testid="quick-analyze">
              <Rocket className="w-4 h-4" />
              Analyze New
            </Button>
            <Button variant="outline" className="gap-2" data-testid="quick-trends">
              <Lightbulb className="w-4 h-4" />
              Find Trends
            </Button>
            <Button variant="outline" className="gap-2" data-testid="quick-process">
              <Video className="w-4 h-4" />
              Process Video
            </Button>
            <Button variant="outline" className="gap-2" data-testid="quick-schedule">
              <Calendar className="w-4 h-4" />
              Schedule Post
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}