import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Main components
import BottomTabNavigation from "@/components/BottomTabNavigation";
import IdeaLabFeed from "@/components/IdeaLabFeed";
import LaunchPadAnalyzer from "@/components/LaunchPadAnalyzer";
import MultiplierProcessor from "@/components/MultiplierProcessor";
import NotFound from "@/pages/not-found";

function MainApp() {
  const [activeTab, setActiveTab] = useState<"idea-lab" | "launch-pad" | "multiplier">("idea-lab");

  const renderContent = () => {
    switch (activeTab) {
      case "idea-lab":
        return <IdeaLabFeed />;
      case "launch-pad":
        return <LaunchPadAnalyzer />;
      case "multiplier":
        return <MultiplierProcessor />;
      default:
        return <IdeaLabFeed />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="relative">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomTabNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="font-sans antialiased">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}