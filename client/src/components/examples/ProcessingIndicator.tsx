import { useState, useEffect } from "react";
import ProcessingIndicator from "../ProcessingIndicator";
import { Button } from "@/components/ui/button";

export default function ProcessingIndicatorExample() {
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === "processing") {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setStatus("completed");
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [status]);

  const startProcessing = () => {
    setStatus("processing");
    setProgress(0);
  };

  const simulateError = () => {
    setStatus("error");
    setProgress(0);
  };

  const reset = () => {
    setStatus("idle");
    setProgress(0);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 bg-background min-h-screen">
      <h2 className="text-xl font-bold">AI Processing States</h2>
      
      <ProcessingIndicator
        status={status}
        progress={progress}
        message={
          status === "idle" ? "Ready to process your content" :
          status === "processing" ? "Analyzing video content and generating clips..." :
          status === "completed" ? "Your clips are ready to download!" :
          "Failed to process video. Please try again."
        }
        estimatedTime={
          status === "processing" ? "2 min" : undefined
        }
      />
      
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={startProcessing} disabled={status === "processing"}>
          Start Processing
        </Button>
        <Button size="sm" variant="destructive" onClick={simulateError}>
          Simulate Error
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}