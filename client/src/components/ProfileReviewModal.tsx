import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { getErrorMessage } from "@/lib/errors";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalysisComplete: () => void;
}

export function ProfileReviewModal({ open, onOpenChange, onAnalysisComplete }: ProfileReviewModalProps) {
  // YouTube-only for mobile (TikTok/Instagram removed)
  const [youtubeChannelId, setYoutubeChannelId] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setYoutubeChannelId("");
        setJobId(null);
        setAnalysisStatus('idle');
      }, 300); // Wait for close animation
    }
  }, [open]);

  // Start analysis mutation
  const startAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/profile/analyze", {
        youtubeChannelId: youtubeChannelId || undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
      setAnalysisStatus('analyzing');
    },
    onError: () => {
      setAnalysisStatus('error');
    },
  });

  // Poll for job status
  const { data: jobStatus } = useQuery({
    queryKey: ['/api/profile/analysis', jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const response = await apiRequest("GET", `/api/profile/analysis/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      return response.json();
    },
    enabled: !!jobId && analysisStatus === 'analyzing',
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Handle job completion
  useEffect(() => {
    if (jobStatus?.job?.status === 'completed') {
      setAnalysisStatus('completed');
      setTimeout(() => {
        onAnalysisComplete();
        onOpenChange(false);
      }, 2000); // Show success for 2 seconds
    } else if (jobStatus?.job?.status === 'failed') {
      setAnalysisStatus('error');
    }
  }, [jobStatus, onAnalysisComplete, onOpenChange]);

  const handleStartAnalysis = () => {
    if (!youtubeChannelId) {
      return; // YouTube channel ID required
    }
    startAnalysisMutation.mutate();
  };

  const hasAtLeastOneInput = youtubeChannelId;
  const progress = jobStatus?.job?.progress || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Review My Profile
          </DialogTitle>
          <DialogDescription>
            {analysisStatus === 'idle' && "Enter your social media handles to get your viral score"}
            {analysisStatus === 'analyzing' && "Analyzing your content across platforms..."}
            {analysisStatus === 'completed' && "Analysis complete!"}
            {analysisStatus === 'error' && "Analysis failed"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input Form - Only show when idle */}
          {analysisStatus === 'idle' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="youtube" className="text-sm font-medium">
                  YouTube Channel ID or Handle
                </Label>
                <Input
                  id="youtube"
                  placeholder="UCxxxxxxxxxxxxx or @handle"
                  value={youtubeChannelId}
                  onChange={(e) => setYoutubeChannelId(e.target.value)}
                  disabled={startAnalysisMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your channel URL or settings
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Enter your YouTube channel. Analysis takes 45-70 seconds.
              </p>
            </>
          )}

          {/* Progress Bar - Show when analyzing */}
          {analysisStatus === 'analyzing' && (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Analyzing your content...</span>
                  <span className="text-primary font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  {progress < 30 && "Fetching your posts..."}
                  {progress >= 30 && progress < 60 && "Analyzing engagement patterns..."}
                  {progress >= 60 && progress < 90 && "Calculating viral score..."}
                  {progress >= 90 && "Finalizing report..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estimated time: 45-70 seconds
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {analysisStatus === 'completed' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Analysis Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Your viral score has been calculated
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {analysisStatus === 'error' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex items-center justify-center">
                <AlertCircle className="w-16 h-16 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Analysis Failed</h3>
                <p className="text-sm text-muted-foreground">
                  {getErrorMessage(startAnalysisMutation.error) || jobStatus?.job?.error || "Please try again later"}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {(analysisStatus === 'idle' || analysisStatus === 'error') && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={startAnalysisMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartAnalysis}
                disabled={!hasAtLeastOneInput || startAnalysisMutation.isPending}
                className="flex-1 gap-2"
              >
                {startAnalysisMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
