import { Lightbulb, Rocket, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTabNavigationProps {
  activeTab: "idea-lab" | "launch-pad" | "multiplier";
  onTabChange: (tab: "idea-lab" | "launch-pad" | "multiplier") => void;
}

export default function BottomTabNavigation({ activeTab, onTabChange }: BottomTabNavigationProps) {
  const tabs = [
    {
      id: "idea-lab" as const,
      icon: Lightbulb,
      label: "Idea Lab",
      description: "Trending Ideas"
    },
    {
      id: "launch-pad" as const,
      icon: Rocket,
      label: "Launch Pad",
      description: "Optimize Content"
    },
    {
      id: "multiplier" as const,
      icon: Video,
      label: "Multiplier",
      description: "Clip Videos"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-primary/20 px-4 py-2 z-50 shadow-2xl">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 hover-elevate active-elevate-2",
                isActive 
                  ? "text-primary bg-primary/10 shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon 
                className={cn(
                  "transition-all duration-200",
                  isActive ? "w-6 h-6" : "w-5 h-5"
                )} 
              />
              <span className={cn(
                "text-xs font-medium transition-all duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {tab.label}
              </span>
              <span className="text-[10px] text-muted-foreground opacity-60">
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}