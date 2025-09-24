import IdeaLabFeed from "../IdeaLabFeed";

export default function IdeaLabFeedExample() {
  return (
    <IdeaLabFeed 
      onTrendSave={(id) => console.log("Saved trend:", id)}
      onTrendRemix={(id) => console.log("Remixed trend:", id)}
    />
  );
}