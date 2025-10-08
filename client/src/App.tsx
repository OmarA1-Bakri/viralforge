// Build: 2025-10-05T05:02:00Z
import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { analytics } from "@/lib/analytics";
import { mobileRequest } from "@/lib/mobileRequest";

// Main components
import BottomTabNavigation from "@/components/BottomTabNavigation";
import CreatorDashboard from "@/components/CreatorDashboard";
import IdeaLabFeed from "@/components/IdeaLabFeed";
import LaunchPadAnalyzer from "@/components/LaunchPadAnalyzer";
import MultiplierProcessor from "@/components/MultiplierProcessor";
import LoadingPage from "@/components/LoadingPage";
import UserPreferences from "@/pages/UserPreferences";
import NotFound from "@/pages/not-found";
import StatusBarTest from "@/components/StatusBarTest";

function MainApp() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "idea-lab" | "launch-pad" | "multiplier" | "preferences">("dashboard");
  const [serverVersion, setServerVersion] = useState<any>(null);

  useEffect(() => {
    mobileRequest('/api/version')
      .then(r => r.json())
      .then(setServerVersion)
      .catch((error) => console.log('[App] Version endpoint unavailable:', error.message));
  }, []);

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

      {/* Version Display */}
      <div className="fixed bottom-20 right-2 text-[10px] text-muted-foreground/50 font-mono space-y-0.5">
        <div>Build: {import.meta.env.VITE_BUILD_ID?.substring(0, 10) || 'dev'}</div>
        {serverVersion && (
          <div>Server: {serverVersion.server?.gitHash?.substring(0, 7) || 'dev'}</div>
        )}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/test-status-bar">
        <StatusBarTest />
      </Route>
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
    // Initialize analytics
    analytics.init();

    // Initialize offline queue for RevenueCat syncs
    import('./lib/offlineQueue').then(({ initOfflineQueue }) => {
      initOfflineQueue();
    });

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