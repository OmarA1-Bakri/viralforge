import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProcessingIndicator from "./ProcessingIndicator";
import { Video, Link, Download, Clock, Scissors, Sparkles } from "lucide-react";

interface ProcessedClip {
  id: string;
  title: string;
  duration: string;
  size: string;
  hookSuggestions: string[];
  preview: string;
  downloadUrl: string;
}

interface ProcessingJob {
  id: string;
  url: string;
  status: "processing" | "completed" | "error";
  progress: number;
  clips?: ProcessedClip[];
  estimatedTime?: string;
  startTime: Date;
}

export default function MultiplierProcessor() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [targetPlatform, setTargetPlatform] = useState("tiktok"); // Default to TikTok
  const [clipDuration, setClipDuration] = useState(15); // Default 15s for TikTok

  const isValidYouTubeUrl = (url: string) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return regex.test(url);
  };

  const handleProcess = async () => {
    if (!isValidYouTubeUrl(youtubeUrl)) {
      console.log("Invalid YouTube URL");
      return;
    }

    const jobId = Date.now().toString();
    const newJob: ProcessingJob = {
      id: jobId,
      url: youtubeUrl,
      status: "processing",
      progress: 0,
      estimatedTime: "3 min",
      startTime: new Date()
    };

    setJobs(prev => [newJob, ...prev]);
    setYoutubeUrl("");

    // Simulate processing
    simulateProcessing(jobId);
    console.log("Started processing YouTube URL:", youtubeUrl);
  };

  const simulateProcessing = async (jobId: string) => {
    const updateProgress = (progress: number, estimatedTime?: string) => {
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, progress, estimatedTime }
          : job
      ));
    };

    // Progress simulation
    const progressSteps = [
      { progress: 15, time: "2 min 30s", delay: 800 },
      { progress: 30, time: "2 min", delay: 1000 },
      { progress: 50, time: "1 min 30s", delay: 1200 },
      { progress: 70, time: "1 min", delay: 800 },
      { progress: 90, time: "20s", delay: 600 },
      { progress: 100, time: "Complete", delay: 400 }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      updateProgress(step.progress, step.time);
    }

    // TikTok-optimized mock clips - todo: replace with real API
    const mockClips: ProcessedClip[] = [
      {
        id: "clip-1",
        title: "Hook: The Secret Everyone Gets Wrong",
        duration: "0:15",
        size: "800 KB",
        hookSuggestions: [
          "You're doing this completely wrong...",
          "This 15-second clip will change everything",
          "Nobody talks about this, but..."
        ],
        preview: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjM1NiIgdmlld0JveD0iMCAwIDIwMCAzNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzU2IiBmaWxsPSIjMUYyOTM3Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTc4IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5WaWRlbyBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K",
        downloadUrl: "#"
      },
      {
        id: "clip-2", 
        title: "Main Content: Step-by-Step Guide",
        duration: "0:15",
        size: "750 KB",
        hookSuggestions: [
          "Here's exactly how to do it:",
          "Follow these 3 simple steps",
          "The method that actually works"
        ],
        preview: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjM1NiIgdmlld0JveD0iMCAwIDIwMCAzNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzU2IiBmaWxsPSIjMUYyOTM3Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTc4IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5WaWRlbyBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K",
        downloadUrl: "#"
      },
      {
        id: "clip-3",
        title: "Result: Mind-Blowing Outcome",
        duration: "0:12",
        size: "650 KB", 
        hookSuggestions: [
          "The results will shock you",
          "This is what happened next...",
          "You won't believe this outcome"
        ],
        preview: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjM1NiIgdmlld0JveD0iMCAwIDIwMCAzNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzU2IiBmaWxsPSIjMUYyOTM3Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTc4IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5WaWRlbyBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K",
        downloadUrl: "#"
      }
    ];

    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: "completed", clips: mockClips }
        : job
    ));
  };

  const downloadClip = (clip: ProcessedClip) => {
    console.log("Downloading clip:", clip.title);
    // In real app, this would trigger actual download
  };

  const downloadAllClips = (job: ProcessingJob) => {
    console.log("Downloading all clips from job:", job.id);
    // In real app, this would download all clips as a zip
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Multiplier</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Input Section */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-foreground">YouTube Video to Process</h2>
          
          {/* TikTok Optimization Guide */}
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <span className="font-medium text-sm">TikTok Optimization (15s clips)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI will extract the most viral moments • Vertical format optimized • Hook-heavy content
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="youtube-url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="pl-10"
                  data-testid="input-youtube-url"
                />
              </div>
              <Button
                onClick={handleProcess}
                disabled={!isValidYouTubeUrl(youtubeUrl)}
                data-testid="button-process"
              >
                <Scissors className="w-4 h-4 mr-2" />
                Process
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              AI will automatically extract viral moments and create 15-second TikTok-ready clips
            </p>
          </div>
        </Card>

        {/* Processing Jobs */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Processing Queue ({jobs.length})
          </h2>

          {jobs.length === 0 ? (
            <Card className="p-8 text-center">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">No videos processing</h3>
              <p className="text-sm text-muted-foreground">
                Paste a YouTube URL above to start creating viral clips automatically
              </p>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card key={job.id} className="p-4 space-y-4">
                {/* Job Header */}
                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{job.url}</p>
                    <p className="text-xs text-muted-foreground">
                      Started {job.startTime.toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      job.status === "completed" ? "default" :
                      job.status === "error" ? "destructive" : "outline"
                    }
                  >
                    {job.status === "completed" ? "Ready" :
                     job.status === "error" ? "Failed" : "Processing"}
                  </Badge>
                </div>

                {/* Processing Status */}
                {job.status === "processing" && (
                  <ProcessingIndicator
                    status="processing"
                    progress={job.progress}
                    message="AI is finding viral moments and creating clips..."
                    estimatedTime={job.estimatedTime}
                  />
                )}

                {/* Completed Clips */}
                {job.status === "completed" && job.clips && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {job.clips.length} clips ready
                      </p>
                      <Button
                        size="sm"
                        onClick={() => downloadAllClips(job)}
                        className="gap-2"
                        data-testid={`button-download-all-${job.id}`}
                      >
                        <Download className="w-4 h-4" />
                        Download All
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      {job.clips.map((clip) => (
                        <div 
                          key={clip.id}
                          className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                        >
                          {/* Preview */}
                          <div className="w-16 h-28 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                            <img 
                              src={clip.preview} 
                              alt="Clip preview"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Clip Info */}
                          <div className="flex-1 space-y-2">
                            <div>
                              <h4 className="font-medium text-sm">{clip.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {clip.duration} • {clip.size}
                              </p>
                            </div>

                            {/* AI Hooks */}
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI Hooks
                              </p>
                              <div className="space-y-1">
                                {clip.hookSuggestions.slice(0, 2).map((hook, index) => (
                                  <p key={index} className="text-xs text-primary bg-primary/10 rounded px-2 py-1">
                                    "{hook}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Download Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadClip(clip)}
                            className="self-start"
                            data-testid={`button-download-${clip.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}