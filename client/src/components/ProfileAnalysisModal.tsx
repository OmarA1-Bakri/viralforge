import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, TrendingUp, Target, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  trend: {
    id: number | string;
    title: string;
    platform: string;
    category?: string;
  } | null;
  onSuggestionsGenerated: (suggestions: any) => void;
}

export function ProfileAnalysisModal({ open, onClose, trend, onSuggestionsGenerated }: ProfileAnalysisModalProps) {
  const [contentConcept, setContentConcept] = useState("");

  const generateAdviceMutation = useMutation({
    mutationFn: async () => {
      if (!trend) {
        throw new Error('No trend selected');
      }

      try {
        const response = await apiRequest("POST", `/api/trends/${trend.id}/apply`, {
          userContentConcept: contentConcept || undefined
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        // Log for debugging
        console.error('Failed to generate advice:', error);

        // Re-throw with user-friendly message
        if (error.message?.includes('401')) {
          throw new Error('Please log in to use this feature');
        }
        if (error.message?.includes('400')) {
          throw new Error('Invalid trend selected');
        }
        if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
          throw new Error('No internet connection');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      onSuggestionsGenerated(data);
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Apply Viral Trend
          </DialogTitle>
          <DialogDescription>
            Get AI-powered advice on how to apply this trend to your content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trend Info */}
          {trend && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{trend.title}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {trend.platform}
                    </Badge>
                    {trend.category && (
                      <Badge variant="outline" className="text-xs">
                        {trend.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional Content Concept */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Your Content Idea (Optional)
            </label>
            <Textarea
              placeholder="Describe your content idea or concept you want to apply this trend to..."
              value={contentConcept}
              onChange={(e) => setContentConcept(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to get general advice for applying this trend
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={generateAdviceMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => generateAdviceMutation.mutate()}
              disabled={generateAdviceMutation.isPending}
              className="flex-1 gap-2"
            >
              {generateAdviceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Get AI Advice
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {generateAdviceMutation.isError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {generateAdviceMutation.error?.message || "Failed to generate advice. Please try again."}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
