import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProcessingIndicator from "./ProcessingIndicator";
import { Video, Link, Download, Clock, Scissors, Sparkles, Upload, Camera } from "lucide-react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import viralForgeAILogo from "@assets/viralforge_1758689165504.png";

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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<"youtube" | "upload">("youtube");
  const [isUploading, setIsUploading] = useState(false);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [targetPlatform] = useState("youtube"); // YouTube-only for mobile
  const [clipDuration, setClipDuration] = useState(60); // Default 60s for YouTube Shorts
  
  // Ref to track jobs state for the progress simulation
  const jobsRef = useRef<ProcessingJob[]>([]);
  
  // Keep ref in sync with jobs state
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const isValidYouTubeUrl = (url: string) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return regex.test(url);
  };

  // Mutation for video upload
  const uploadVideoMutation = useMutation({
    mutationFn: async ({ fileName, fileSize, contentType }: {
      fileName: string;
      fileSize: number;
      contentType: string;
    }) => {
      const response = await apiRequest('POST', '/api/upload/video', {
        fileName,
        fileSize,
        contentType
      });

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Video upload prepared:', data.fileName);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error('❌ Video upload failed:', error);
      setIsUploading(false);
    }
  });

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processVideoFile(file);
    }
  };

  const handleVideoRecord = async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        // Fallback for web - trigger file input
        document.getElementById('video-upload')?.click();
        return;
      }

      const video = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1080,
        height: 1920
      });

      if (video.dataUrl) {
        const fileName = `video_${Date.now()}.mp4`;
        
        // Create a mock file object for processing
        const mockFile = {
          name: fileName,
          size: 5000000, // Estimate 5MB
          type: 'video/mp4'
        } as File;
        
        setVideoFile(mockFile);
        await processVideoFile(mockFile);
      }
    } catch (error) {
      console.error("Video recording failed:", error);
    }
  };

  const processVideoFile = async (file: File) => {
    // Check file size (limit to 100MB for mobile)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('Video too large. Please choose a video under 100MB.');
      return;
    }

    setVideoFile(file);
    setIsUploading(true);
    
    try {
      await uploadVideoMutation.mutateAsync({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type
      });
    } catch (error) {
      console.error("Failed to upload video:", error);
    }
    
    console.log("Video selected:", file.name, `${(file.size / 1024 / 1024).toFixed(2)} MB`);
  };

  // Mutation for video processing
  const processVideoMutation = useMutation({
    mutationFn: async ({ videoUrl, platform }: { videoUrl: string; platform: string }) => {
      const response = await apiRequest('POST', '/api/videos/process', {
        videoUrl,
        title: `Video from ${videoUrl}`,
        platform,
        videoDuration: 300 // Default 5 minutes
      });

      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log('✅ Video processing completed:', data);
      const jobId = variables.videoUrl; // Use URL as job ID for simplicity
      
      // Convert API clips to our ProcessedClip format
      const processedClips: ProcessedClip[] = data.clips.map((clip: any, index: number) => ({
        id: clip.id.toString(),
        title: clip.title,
        duration: `${Math.floor((clip.endTime - clip.startTime) / 60)}:${String((clip.endTime - clip.startTime) % 60).padStart(2, '0')}`,
        size: `${Math.round(Math.random() * 500 + 300)} KB`, // Estimated size
        hookSuggestions: [
          `Hook for ${clip.title}`,
          "Grab attention with this opener",
          "Perfect viral moment here"
        ],
        preview: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjM1NiIgdmlld0JveD0iMCAwIDIwMCAzNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzU2IiBmaWxsPSIjMUYyOTM3Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTc4IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5WaWRlbyBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K",
        downloadUrl: `#clip-${clip.id}`
      }));

      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: "completed", progress: 100, clips: processedClips, estimatedTime: "Complete" }
          : job
      ));
    },
    onError: (error, variables) => {
      console.error('❌ Video processing failed:', error);
      const jobId = variables.videoUrl;
      
      // Fall back to mock clips on API failure
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
          ? { ...job, status: "error", clips: mockClips }
          : job
      ));
    }
  });

  const handleProcess = async () => {
    let videoSource: string;
    let jobId: string;
    
    if (uploadMode === "youtube") {
      if (!isValidYouTubeUrl(youtubeUrl)) {
        console.log("Invalid YouTube URL");
        return;
      }
      videoSource = youtubeUrl;
      jobId = youtubeUrl;
    } else {
      if (!videoFile) {
        console.log("No video file selected");
        return;
      }
      videoSource = videoFile.name; // Use filename as source identifier
      jobId = `upload-${Date.now()}`;
    }

    const newJob: ProcessingJob = {
      id: jobId,
      url: videoSource,
      status: "processing",
      progress: 0,
      estimatedTime: "3 min",
      startTime: new Date()
    };

    setJobs(prev => [newJob, ...prev]);
    
    // Clear inputs
    if (uploadMode === "youtube") {
      setYoutubeUrl("");
    } else {
      setVideoFile(null);
    }

    // Start progress simulation
    simulateProgress(jobId);
    
    // Call the API
    try {
      await processVideoMutation.mutateAsync({
        videoUrl: videoSource,
        platform: targetPlatform
      });
    } catch (error) {
      console.error("Video processing failed:", error);
    }

    console.log(`Started processing ${uploadMode === "youtube" ? "YouTube URL" : "uploaded video"}:`, videoSource);
  };

  // Separate progress simulation function
  const simulateProgress = async (jobId: string) => {
    const updateProgress = (progress: number, estimatedTime?: string) => {
      setJobs(prev => prev.map(job => {
        // Don't update if job is already completed or errored
        if (job.id === jobId && job.status === "processing") {
          return { ...job, progress, estimatedTime };
        }
        return job;
      }));
    };

    // Progress simulation
    const progressSteps = [
      { progress: 15, time: "2 min 30s", delay: 800 },
      { progress: 30, time: "2 min", delay: 1000 },
      { progress: 50, time: "1 min 30s", delay: 1200 },
      { progress: 70, time: "1 min", delay: 800 },
      { progress: 90, time: "20s", delay: 600 }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      
      // Check if job still exists and is still processing before updating
      const currentJob = jobsRef.current.find(job => job.id === jobId);
      if (!currentJob || currentJob.status !== "processing") {
        console.log(`🛑 Stopping progress simulation for ${jobId} - job completed or not found`);
        break;
      }
      
      updateProgress(step.progress, step.time);
    }
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
    <div className="bg-background pb-24">
      {/* Header */}
      <div style={{ paddingTop: '56px' }} className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 pb-3">
        <div className="flex items-center gap-3">
          <img 
            src={viralForgeAILogo} 
            alt="ViralForgeAI" 
            className="w-8 h-8 object-contain"
            data-testid="img-logo-multiplier"
          />
          <div>
            <h1 className="text-lg font-bold">ViralForgeAI</h1>
            <p className="text-xs text-muted-foreground">Multiplier</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Input Section */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-foreground">Video to Process</h2>
          
          {/* Upload Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={uploadMode === "youtube" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUploadMode("youtube")}
              className="flex-1"
              data-testid="button-youtube-mode"
            >
              <Link className="w-4 h-4 mr-2" />
              YouTube URL
            </Button>
            <Button
              variant={uploadMode === "upload" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUploadMode("upload")}
              className="flex-1"
              data-testid="button-upload-mode"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </div>
          
          {/* YouTube Shorts Optimization Guide */}
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <span className="font-medium text-sm">YouTube Shorts Optimization (15s clips)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI will extract the most viral moments • Vertical format optimized • Hook-heavy content
            </p>
          </div>
          
          {uploadMode === "youtube" ? (
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
                Paste any YouTube URL to automatically extract viral moments
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="video-upload">Upload Video File</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleVideoRecord}
                      className="flex-1"
                      data-testid="button-camera-record"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Record Video
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <Video className="w-4 h-4 mr-2" />
                        Choose File
                      </label>
                    </Button>
                  </div>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    data-testid="input-video-upload"
                  />
                  <Button
                    onClick={handleProcess}
                    disabled={!videoFile || isUploading}
                    className="w-full"
                    data-testid="button-process"
                  >
                    <Scissors className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Process"}
                  </Button>
                </div>
                {videoFile && (
                  <div className="text-xs text-muted-foreground">
                    Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload MP4, MOV, or AVI files up to 100MB for clip generation
                </p>
              </div>
            </div>
          )}
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