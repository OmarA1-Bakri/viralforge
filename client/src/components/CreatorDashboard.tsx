import { useState } from "react";
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
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  videosCreated: number;
  trendsUsed: number;
  avgClickRate: number;
  weeklyGrowth: number;
  automationSavings: string;
}

// Mock data - todo: remove mock functionality
const mockStats: DashboardStats = {
  totalViews: 47832,
  totalLikes: 2341,
  totalShares: 892,
  videosCreated: 23,
  trendsUsed: 15,
  avgClickRate: 8.4,
  weeklyGrowth: 23.5,
  automationSavings: "12h 30m"
};

const mockRecentActivity = [
  { id: 1, type: "video", title: "Dog React Video", status: "viral", views: "12.3K", time: "2h ago" },
  { id: 2, type: "trend", title: "Dance Challenge Trend", status: "used", engagement: "8.7K", time: "4h ago" },
  { id: 3, type: "optimization", title: "Thumbnail Analysis", status: "improved", score: "9.2/10", time: "6h ago" },
  { id: 4, type: "clip", title: "Tutorial Segments", status: "ready", clips: "3 clips", time: "1d ago" }
];

export default function CreatorDashboard() {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("week");

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

  const ActivityItem = ({ item }: { item: any }) => (
    <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        item.type === "video" ? "bg-red-500/20 text-red-400" :
        item.type === "trend" ? "bg-primary/20 text-primary" :
        item.type === "optimization" ? "bg-blue-500/20 text-blue-400" :
        "bg-green-500/20 text-green-400"
      )}>
        {item.type === "video" ? <Video className="w-5 h-5" /> :
         item.type === "trend" ? <Lightbulb className="w-5 h-5" /> :
         item.type === "optimization" ? <Target className="w-5 h-5" /> :
         <Zap className="w-5 h-5" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">{item.title}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{item.time}</span>
          <span>•</span>
          <span className={cn(
            item.status === "viral" ? "text-green-400" :
            item.status === "ready" ? "text-blue-400" :
            item.status === "improved" ? "text-primary" :
            "text-foreground"
          )}>
            {item.views || item.engagement || item.score || item.clips}
          </span>
        </div>
      </div>
      
      <Badge variant="outline" className="text-xs">
        {item.status}
      </Badge>
    </div>
  );

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
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Eye}
            label="Total Views"
            value={mockStats.totalViews}
            change={mockStats.weeklyGrowth}
            color="blue"
          />
          <StatCard
            icon={Heart}
            label="Total Likes"
            value={mockStats.totalLikes}
            change={15.2}
            color="primary"
          />
          <StatCard
            icon={Video}
            label="Videos Created"
            value={mockStats.videosCreated}
            change={8.7}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Click Rate"
            value={mockStats.avgClickRate}
            suffix="%"
            change={2.1}
            color="orange"
          />
        </div>

        {/* AI Automation Stats */}
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-primary">🤖 AI Automation Impact</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Time Saved</p>
              <p className="text-xl font-bold text-primary">{mockStats.automationSavings}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Trends Used</p>
              <p className="text-xl font-bold text-primary">{mockStats.trendsUsed}</p>
            </div>
          </div>
          
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Weekly AI Usage</span>
              <span className="text-primary">87%</span>
            </div>
            <Progress value={87} className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-purple-500" />
          </div>
        </Card>

        {/* Performance Insights */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold">📈 Performance Insights</h2>
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
            
            <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded-md border border-orange-500/20">
              <span className="text-sm text-foreground">Top trending hashtag</span>
              <Badge className="bg-orange-500 text-white">#viral</Badge>
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
            {mockRecentActivity.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90" data-testid="quick-analyze">
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