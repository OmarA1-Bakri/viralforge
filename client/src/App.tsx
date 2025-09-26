import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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

function Router() {
  return (
    <Switch>
      <Route path="/">
        <ProtectedRoute>
          <MainApp />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500); // Start fade out after 2.5 seconds

    const hideTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // Hide completely after 3 seconds

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="font-sans antialiased dark">
            <Router />
            {showSplash && (
              <div className={`transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
                <LoadingPage />
              </div>
            )}
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}