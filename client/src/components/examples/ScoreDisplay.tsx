import ScoreDisplay from "../ScoreDisplay";

export default function ScoreDisplayExample() {
  return (
    <div className="max-w-md mx-auto p-6 space-y-6 bg-background min-h-screen">
      <h2 className="text-xl font-bold">AI Score Analysis</h2>
      
      <ScoreDisplay
        type="clickability"
        score={8.5}
        maxScore={10}
        feedback="Great! Your thumbnail has strong visual contrast and clear focal point. Consider making the text slightly larger for mobile viewing."
      />
      
      <ScoreDisplay
        type="clarity"
        score={6}
        maxScore={10}
        feedback="Your title is somewhat clear but could be more specific. Try adding numbers or specific benefits."
      />
      
      <ScoreDisplay
        type="intrigue"
        score={3}
        maxScore={10}
        feedback="Low intrigue score. Consider adding mystery, urgency, or curiosity gaps to make viewers want to click."
      />
      
      <ScoreDisplay
        type="emotion"
        score={9}
        maxScore={10}
        feedback="Excellent emotional appeal! Your content triggers strong emotional responses that drive engagement."
      />
    </div>
  );
}