import TrendCard from "../TrendCard";

export default function TrendCardExample() {
  const mockTrend = {
    id: "trend-1",
    title: "React to viral TikTok dances with your dog",
    description: "Pet + dance content is exploding! Perfect for pet accounts looking to trend.",
    category: "Pets & Animals",
    hotness: "hot" as const,
    engagement: 24,
    timeAgo: "2h ago",
    suggestion: "Film your dog 'reacting' to dance trends. Show their confused expressions and add funny captions like 'When humans do the thing again...'",
    hashtags: ["dogsoftiktok", "petreacts", "dancechallenge", "viral"],
    sound: "Oh No (Dance Trend Mix)"
  };

  return (
    <div className="max-w-sm mx-auto p-4 bg-background min-h-screen">
      <TrendCard 
        trend={mockTrend}
        onSave={(id) => console.log("Saved:", id)}
        onRemix={(id) => console.log("Remixed:", id)}
      />
    </div>
  );
}