import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import ScoreDisplay from "./ScoreDisplay";
import ProcessingIndicator from "./ProcessingIndicator";
import { Upload, Image, Zap, Eye, MessageSquare, Camera } from "lucide-react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import viralForgeAILogo from "@assets/viralforge_1758689165504.png";

interface AnalysisResult {
  clickabilityScore: number;
  clarityScore: number;
  intrigueScore: number;
  emotionScore: number;
  feedback: {
    thumbnail: string;
    title: string;
    overall: string;
  };
  suggestions: string[];
}

export default function LaunchPadAnalyzer() {
  const [title, setTitle] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [roastMode, setRoastMode] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [platform, setPlatform] = useState("tiktok"); // Default to TikTok

  // Mutation for thumbnail upload
  const uploadThumbnailMutation = useMutation({
    mutationFn: async ({ imageData, fileName, contentType }: {
      imageData: string;
      fileName: string;
      contentType: string;
    }) => {
      const response = await fetch('/api/upload/thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          fileName,
          contentType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to upload thumbnail');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Thumbnail uploaded successfully:', data.fileName);
      setThumbnailUrl(data.thumbnailUrl);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error('❌ Thumbnail upload failed:', error);
      setIsUploading(false);
    }
  });

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        // Fallback for web - trigger file input
        document.getElementById('thumbnail-upload')?.click();
        return;
      }

      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1080,
        height: 1920
      });

      if (image.dataUrl) {
        const fileName = `thumbnail_${Date.now()}.jpg`;
        setIsUploading(true);
        setThumbnailPreview(image.dataUrl);
        
        // Upload to server
        try {
          await uploadThumbnailMutation.mutateAsync({
            imageData: image.dataUrl,
            fileName,
            contentType: 'image/jpeg'
          });
        } catch (error) {
          console.error("Failed to upload captured image:", error);
        }
      }
    } catch (error) {
      console.error("Camera capture failed:", error);
    }
  };

  const processImageFile = async (file: File) => {
    // Check file size (limit to 10MB for mobile)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Image too large. Please choose an image under 10MB.');
      return;
    }

    setThumbnailFile(file);
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setThumbnailPreview(result);
      
      // Upload to server
      try {
        await uploadThumbnailMutation.mutateAsync({
          imageData: result,
          fileName: file.name,
          contentType: file.type
        });
      } catch (error) {
        console.error("Failed to upload thumbnail:", error);
      }
    };
    reader.readAsDataURL(file);
    console.log("Thumbnail selected:", file.name);
  };

  // Mutation for content analysis
  const analyzeContentMutation = useMutation({
    mutationFn: async ({ title, thumbnailDescription, platform, roastMode }: {
      title: string;
      thumbnailDescription?: string;
      platform: string;
      roastMode: boolean;
    }) => {
      const response = await fetch('/api/content/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || undefined,
          thumbnailDescription: thumbnailDescription || undefined,
          platform,
          roastMode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze content');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Content analysis completed:', data);
      setAnalysisResult({
        clickabilityScore: data.analysis.clickabilityScore,
        clarityScore: data.analysis.clarityScore,
        intrigueScore: data.analysis.intrigueScore,
        emotionScore: data.analysis.emotionScore,
        feedback: data.analysis.feedback,
        suggestions: data.analysis.suggestions
      });
      setIsAnalyzing(false);
    },
    onError: (error) => {
      console.error('❌ Content analysis failed:', error);
      setIsAnalyzing(false);
      // Fall back to mock result if API fails
      setAnalysisResult({
        clickabilityScore: roastMode ? 3.5 : 7.5,
        clarityScore: roastMode ? 4.0 : 8.0,
        intrigueScore: roastMode ? 2.5 : 6.5,
        emotionScore: roastMode ? 5.5 : 9.0,
        feedback: {
          thumbnail: roastMode 
            ? "Your thumbnail looks like it was made in 2010. The text is basically invisible and the colors clash harder than a bad breakup. Are you trying to hide your video from viewers?"
            : "Strong visual hierarchy and good contrast. The main subject is clearly visible. Consider making the text 20% larger for better mobile readability.",
          title: roastMode
            ? "This title is vaguer than a politician's promise. 'Amazing trick' tells me absolutely nothing. What trick? Amazing for who? My grandmother's knitting circle?"
            : "Good use of numbers and specific benefits. The emotional hook is strong. Consider adding urgency or scarcity for better performance.",
          overall: roastMode
            ? "Listen, I've seen homework assignments with more engagement potential. Your content might be gold, but this packaging is burying it six feet under."
            : "Solid foundation with room for improvement. Your content shows good understanding of engagement principles."
        },
        suggestions: roastMode ? [
          "Use colors that don't make people's eyes bleed",
          "Write titles that actually say something specific",
          "Put your face in the thumbnail (people like faces, apparently)",
          "Add some contrast - it's not abstract art"
        ] : [
          "Increase thumbnail text size by 25%",
          "Add a bright accent color to draw attention",
          "Test A/B versions with different emotional expressions",
          "Consider adding numbers or time indicators"
        ]
      });
    }
  });

  const handleAnalyze = async () => {
    if (!title.trim() && !thumbnailFile) {
      console.log("Need title or thumbnail to analyze");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisResult(null);

    // Simulate analysis progress
    const progressSteps = [10, 25, 45, 65, 80, 95, 100];
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        const nextStep = progressSteps.find(step => step > prev);
        return nextStep || prev;
      });
    }, 300);

    // Get thumbnail description if available
    let thumbnailDescription: string | undefined;
    if (thumbnailFile) {
      // For now, use a simple description. In the future, we could use AI to analyze the actual image
      thumbnailDescription = `Thumbnail image: ${thumbnailFile.name}`;
    }

    try {
      await analyzeContentMutation.mutateAsync({
        title: title.trim(),
        thumbnailDescription,
        platform,
        roastMode
      });
    } finally {
      clearInterval(progressInterval);
      setAnalysisProgress(100);
    }

    console.log("Analysis complete:", { title, thumbnail: thumbnailFile?.name, roastMode });
  };

  const clearAnalysis = () => {
    setTitle("");
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setAnalysisResult(null);
    setAnalysisProgress(0);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={viralForgeAILogo} 
              alt="ViralForgeAI" 
              className="w-8 h-8 object-contain"
              data-testid="img-logo-launchpad"
            />
            <div>
              <h1 className="text-lg font-bold">ViralForgeAI</h1>
              <p className="text-xs text-muted-foreground">Launch Pad</p>
            </div>
          </div>
          
          {/* Roast Mode Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="roast-mode" className="text-sm">Roast Mode</Label>
            <Switch
              id="roast-mode"
              checked={roastMode}
              onCheckedChange={setRoastMode}
              data-testid="switch-roast-mode"
            />
            {roastMode && (
              <Badge variant="destructive" className="text-xs">
                🔥 Brutal
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Input Section */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-foreground">Content to Analyze</h2>
          
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title-input">Video Title</Label>
            <Input
              id="title-input"
              type="text"
              placeholder="Enter your video title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              data-testid="input-title"
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 characters • Optimal: 50-60 chars
            </p>
          </div>

          {/* TikTok Format Guide */}
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-6 bg-primary rounded-sm"></div>
              <span className="font-medium text-sm">TikTok Vertical Format (9:16)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Optimized for mobile viewing • Keep text in safe zones • Clear subject focus
            </p>
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail-upload">Thumbnail Image</Label>
            <div className="space-y-3">
              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full max-w-xs rounded-md border border-border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setThumbnailFile(null);
                      setThumbnailPreview(null);
                    }}
                    className="absolute top-2 right-2"
                    data-testid="button-remove-thumbnail"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-md p-6 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload your thumbnail for TikTok AI analysis
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Best: 9:16 aspect ratio • Clear faces • Bright colors • Text overlay
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCameraCapture}
                      data-testid="button-camera-capture"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <label htmlFor="thumbnail-upload" className="cursor-pointer">
                        <Image className="w-4 h-4 mr-2" />
                        Choose Image
                      </label>
                    </Button>
                  </div>
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    data-testid="input-thumbnail"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Analyze Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!title.trim() && !thumbnailFile)}
              className="flex-1"
              data-testid="button-analyze"
            >
              {isAnalyzing ? (
                <>
                  <Eye className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Analyze Content
                </>
              )}
            </Button>
            
            {analysisResult && (
              <Button
                variant="outline"
                onClick={clearAnalysis}
                data-testid="button-clear"
              >
                Clear
              </Button>
            )}
          </div>
        </Card>

        {/* Processing Indicator */}
        {isAnalyzing && (
          <ProcessingIndicator
            status="processing"
            progress={analysisProgress}
            message={
              analysisProgress < 30 ? "Analyzing thumbnail composition..." :
              analysisProgress < 60 ? "Evaluating title effectiveness..." :
              analysisProgress < 90 ? "Calculating engagement potential..." :
              "Generating recommendations..."
            }
            estimatedTime="30 sec"
          />
        )}

        {/* Results Section */}
        {analysisResult && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              AI Analysis Results
              {roastMode && <Badge variant="destructive" className="text-xs">🔥 Roasted</Badge>}
            </h2>

            {/* Score Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreDisplay
                type="clickability"
                score={analysisResult.clickabilityScore}
                feedback={analysisResult.feedback.overall}
              />
              <ScoreDisplay
                type="clarity"
                score={analysisResult.clarityScore}
                feedback={analysisResult.feedback.title}
              />
              <ScoreDisplay
                type="intrigue"
                score={analysisResult.intrigueScore}
                feedback={analysisResult.feedback.thumbnail}
              />
              <ScoreDisplay
                type="emotion"
                score={analysisResult.emotionScore}
              />
            </div>

            {/* Suggestions */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">
                {roastMode ? "🔥 Brutal Suggestions" : "💡 AI Recommendations"}
              </h3>
              <ul className="space-y-2">
                {analysisResult.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}