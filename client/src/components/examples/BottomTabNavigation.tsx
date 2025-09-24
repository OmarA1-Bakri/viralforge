import { useState } from "react";
import BottomTabNavigation from "../BottomTabNavigation";

export default function BottomTabNavigationExample() {
  const [activeTab, setActiveTab] = useState<"idea-lab" | "launch-pad" | "multiplier">("idea-lab");

  return (
    <div className="min-h-screen bg-background relative">
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold mb-4">CreatorKit AI</h1>
        <p className="text-muted-foreground">Current tab: <span className="font-mono text-primary">{activeTab}</span></p>
      </div>
      <BottomTabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
      />
    </div>
  );
}