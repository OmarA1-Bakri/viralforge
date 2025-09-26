import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Main components
import BottomTabNavigation from "@/components/BottomTabNavigation";
import CreatorDashboard from "@/components/CreatorDashboard";
import IdeaLabFeed from "@/components/IdeaLabFeed";
import LaunchPadAnalyzer from "@/components/LaunchPadAnalyzer";
import MultiplierProcessor from "@/components/MultiplierProcessor";
import LoadingPage from "@/components/LoadingPage";
import UserPreferences from "@/pages/UserPreferences";
import NotFound from "@/pages/not-found";

function MainApp() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "idea-lab" | "launch-pad" | "multiplier" | "preferences">("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <CreatorDashboard onNavigate={setActiveTab} />;
      case "idea-lab":
        return <IdeaLabFeed onNavigate={setActiveTab} />;
      case "launch-pad":
        return <LaunchPadAnalyzer />;
      case "multiplier":
        return <MultiplierProcessor />;
      case "preferences":
        return <UserPreferences />;
      default:
        return <CreatorDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="relative pb-24">
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

// Loading page wrapper for routing
function LoadingPageRoute() {
  return <LoadingPage message="Loading ViralForgeAI..." />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainApp} />
      <Route path="/loading" component={LoadingPageRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="font-sans antialiased dark">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}