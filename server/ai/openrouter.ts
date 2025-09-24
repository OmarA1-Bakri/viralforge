// OpenRouter AI service for CreatorKit - using OpenAI-compatible API
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.REPLIT_DOMAINS || "http://localhost:5000",
    "X-Title": "ViralForgeAI",
  }
});

export interface TrendDiscoveryRequest {
  platform: "tiktok" | "youtube" | "instagram";
  category?: string;
  contentType?: string;
  targetAudience?: string;
}

export interface TrendResult {
  title: string;
  description: string;
  category: string;
  platform: string;
  hotness: "hot" | "rising" | "relevant";
  engagement: number;
  hashtags: string[];
  sound?: string;
  suggestion: string;
  timeAgo: string;
}

export interface ContentAnalysisRequest {
  title?: string;
  description?: string;
  thumbnailDescription?: string;
  platform: string;
  roastMode?: boolean;
}

export interface ContentAnalysisResult {
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

export interface VideoClipSuggestion {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  viralScore: number;
  reasoning: string;
}

export class OpenRouterService {
  // Discover trending content ideas using AI
  async discoverTrends(request: TrendDiscoveryRequest): Promise<TrendResult[]> {
    console.log("🔧 Debug: API Key exists:", !!process.env.OPENROUTER_API_KEY);
    console.log("🔧 Debug: API Key length:", process.env.OPENROUTER_API_KEY?.length);

    // If no API key, return mock data
    if (!process.env.OPENROUTER_API_KEY) {
      console.log("⚠️ No OpenRouter API key found, returning mock data");
      const mockTrends: TrendResult[] = [
        {
          title: "Pet React Challenge",
          description: "Film your pet's reaction to trending sounds",
          category: "Comedy",
          platform: request.platform,
          hotness: "hot",
          engagement: 23400,
          hashtags: ["petreaction", "viral", "comedy", "trending"],
          sound: "Funny Pet Sound Mix",
          suggestion: "Use close-up shots of your pet's facial expressions with trending audio. Jump cuts work great for maximum impact.",
          timeAgo: "2h ago"
        },
        {
          title: "Quick Life Hack Series",
          description: "Share useful daily life shortcuts under 30 seconds",
          category: "Lifestyle",
          platform: request.platform,
          hotness: "rising",
          engagement: 18900,
          hashtags: ["lifehack", "productivity", "tips", "viral"],
          suggestion: "Start with a problem, show the hack in action, and end with the result. Keep it under 15 seconds for best performance.",
          timeAgo: "4h ago"
        },
        {
          title: "Before & After Transformation",
          description: "Show dramatic changes in any area - room, look, skill",
          category: "Lifestyle",
          platform: request.platform,
          hotness: "hot",
          engagement: 45600,
          hashtags: ["transformation", "beforeandafter", "glow", "change"],
          suggestion: "Use split screen or quick transitions. Add upbeat music and ensure good lighting for the 'after' shot.",
          timeAgo: "1h ago"
        },
        {
          title: "Learn With Me Series",
          description: "Document your journey learning something new",
          category: "Education",
          platform: request.platform,
          hotness: "relevant",
          engagement: 12300,
          hashtags: ["learnwithme", "education", "growth", "journey"],
          suggestion: "Share both struggles and wins. People love authentic learning journeys. Update weekly for best engagement.",
          timeAgo: "6h ago"
        }
      ];

      console.log(`✅ Returning ${mockTrends.length} mock trends for development`);
      return mockTrends;
    }

    const systemPrompt = `You are a viral content expert and social media trend analyst. Your job is to discover and analyze trending content opportunities for creators.

Generate realistic, current trending content ideas for ${request.platform}. Focus on trends that are:
- Currently popular or emerging
- Engaging and likely to get high interaction
- Suitable for content creators
- Based on real social media patterns

${request.category ? `Focus on the ${request.category} category.` : ''}
${request.contentType ? `Content should be ${request.contentType} style.` : ''}
${request.targetAudience ? `Target audience: ${request.targetAudience}.` : ''}

Respond with a JSON object containing a "trends" array of 8-12 trend objects: { "trends": [...] }. Each trend should have:
- title: Catchy, trend-worthy title
- description: Brief explanation of the trend
- category: Content category (e.g., "Comedy", "Education", "Lifestyle", "Tech")
- platform: "${request.platform}"
- hotness: "hot", "rising", or "relevant" 
- engagement: Estimated engagement number (1000-50000)
- hashtags: Array of 3-6 relevant hashtags (without # symbol)
- sound: Optional trending sound/audio name
- suggestion: Specific AI suggestion for how to use this trend
- timeAgo: How long ago this trend started (e.g., "2h ago", "1d ago", "3h ago")

Make the trends feel authentic and actionable for creators.`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini", // Cost-effective model for trend discovery
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Discover trending content ideas for ${request.platform}` }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.trends || [];
    } catch (error) {
      console.error("Error discovering trends:", error);
      throw new Error("Failed to discover trends");
    }
  }

  // Analyze content for optimization (Launch Pad)
  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    console.log("🔧 Debug: Content analysis request:", request);

    // If no API key, return mock analysis data
    if (!process.env.OPENROUTER_API_KEY) {
      console.log("⚠️ No OpenRouter API key found, returning mock analysis");
      const mockAnalysis: ContentAnalysisResult = {
        clickabilityScore: request.title ? (request.title.includes('!') ? 8 : 7) : 6,
        clarityScore: request.title ? (request.title.length > 10 && request.title.length < 60 ? 8 : 6) : 5,
        intrigueScore: request.title ? (request.title.includes('?') || request.title.includes('How') ? 9 : 7) : 6,
        emotionScore: request.roastMode ? 10 : (request.title?.match(/(Amazing|Incredible|Shocking|Insane)/i) ? 9 : 6),
        feedback: {
          title: request.title ? `Your title "${request.title}" ${request.roastMode ? 'needs serious work - it\'s boring and won\'t get clicks' : 'has potential but could be more compelling'}. ${request.title.length > 60 ? 'It\'s too long for mobile users.' : 'Length is good.'}` : "No title provided for analysis",
          thumbnail: request.thumbnailDescription ? `Thumbnail analysis: ${request.roastMode ? 'Hard to judge without seeing it, but make sure it has clear faces, bright colors, and text overlay' : 'Looks like you have a custom thumbnail - that\'s great! Ensure it stands out in the feed'}` : "No thumbnail description provided - using a custom thumbnail can increase CTR by 30%",
          overall: request.roastMode ? 
            "Look, I'll be straight with you - your content needs work. Focus on emotional hooks, clear value propositions, and platform-specific optimization. Stop being boring!" :
            "Your content shows promise! With some tweaks to maximize emotional appeal and clarity, you could see significant engagement improvements."
        },
        suggestions: request.roastMode ? [
          "Stop using boring titles - add emotional hooks",
          "Your thumbnail better grab attention in 0.1 seconds",
          "Use numbers, questions, or power words",
          "Test different versions and actually measure results",
          "Study what's working in your niche right now"
        ] : [
          "Consider adding numbers or questions to your title",
          "Use bright, high-contrast colors in thumbnails",
          "Test emotional hooks like curiosity gaps",
          "Optimize title length for mobile viewing",
          "A/B test different thumbnail styles"
        ]
      };

      console.log(`✅ Returning mock analysis with overall score: ${Math.round((mockAnalysis.clickabilityScore + mockAnalysis.clarityScore + mockAnalysis.intrigueScore + mockAnalysis.emotionScore) / 4)}/10`);
      return mockAnalysis;
    }

    const roastModeNote = request.roastMode ? 
      "Use a brutally honest, roast-style tone. Be direct and humorous about what's wrong." :
      "Be constructive and encouraging while pointing out areas for improvement.";

    const systemPrompt = `You are an expert content optimization specialist who analyzes titles, thumbnails, and content for maximum viral potential.

${roastModeNote}

Analyze the provided content and rate it on these dimensions (0-10 scale):
- Clickability: How likely people are to click
- Clarity: How clear and understandable it is  
- Intrigue: How much curiosity/interest it generates
- Emotion: How much emotional response it evokes

Provide specific feedback and actionable suggestions for improvement.

Respond in JSON format with:
{
  "clickabilityScore": number (0-10),
  "clarityScore": number (0-10), 
  "intrigueScore": number (0-10),
  "emotionScore": number (0-10),
  "feedback": {
    "thumbnail": "detailed feedback about thumbnail/visual",
    "title": "detailed feedback about title",
    "overall": "overall assessment and key recommendations"
  },
  "suggestions": ["specific suggestion 1", "specific suggestion 2", "etc"]
}`;

    const contentToAnalyze = `
Title: ${request.title || "No title provided"}
Description: ${request.description || "No description provided"}  
Thumbnail: ${request.thumbnailDescription || "No thumbnail description provided"}
Platform: ${request.platform}
    `.trim();

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentToAnalyze }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result;
    } catch (error) {
      console.error("Error analyzing content:", error);
      throw new Error("Failed to analyze content");
    }
  }

  // Generate video clip suggestions (Multiplier)
  async generateVideoClips(
    videoDescription: string, 
    videoDuration: number, 
    targetPlatform: string
  ): Promise<VideoClipSuggestion[]> {
    console.log("🔧 Debug: Video clip generation request:", { videoDescription, videoDuration, targetPlatform });

    // If no API key, return mock clip data
    if (!process.env.OPENROUTER_API_KEY) {
      console.log("⚠️ No OpenRouter API key found, returning mock clips");
      const mockClips: VideoClipSuggestion[] = [
        {
          title: "Epic Opening Hook",
          description: "The most engaging first 15 seconds that will hook viewers instantly",
          startTime: 0,
          endTime: 15,
          viralScore: 9,
          reasoning: "Strong opening hooks perform best on all platforms - this grabs attention immediately"
        },
        {
          title: "Key Moment Highlight",
          description: "The most valuable insight or breakthrough moment from the content",
          startTime: Math.floor(videoDuration * 0.3),
          endTime: Math.floor(videoDuration * 0.3) + 30,
          viralScore: 8,
          reasoning: "Educational highlights with clear value propositions get high engagement"
        },
        {
          title: "Emotional Peak",
          description: "The most emotionally compelling segment that creates connection",
          startTime: Math.floor(videoDuration * 0.6),
          endTime: Math.floor(videoDuration * 0.6) + 25,
          viralScore: 8,
          reasoning: "Emotional moments drive shares and comments - perfect for viral growth"
        },
        {
          title: "Surprising Reveal",
          description: "Unexpected insight or plot twist that defies expectations",
          startTime: Math.floor(videoDuration * 0.8),
          endTime: Math.floor(videoDuration * 0.8) + 20,
          viralScore: 7,
          reasoning: "Surprise elements create curiosity gaps that drive engagement and rewatches"
        }
      ];

      // Filter clips to ensure they don't exceed video duration
      const validClips = mockClips.filter(clip => clip.endTime <= videoDuration);
      
      // Adjust platform-specific clip lengths
      const platformOptimizedClips = validClips.map(clip => {
        let maxLength = 60; // Default
        if (targetPlatform === 'tiktok') maxLength = 15;
        else if (targetPlatform === 'youtube') maxLength = 60;
        else if (targetPlatform === 'instagram') maxLength = 30;

        const duration = clip.endTime - clip.startTime;
        if (duration > maxLength) {
          return {
            ...clip,
            endTime: clip.startTime + maxLength,
            description: `${clip.description} (optimized for ${targetPlatform})`
          };
        }
        return clip;
      });

      console.log(`✅ Generated ${platformOptimizedClips.length} mock clips for ${targetPlatform} (${videoDuration}s video)`);
      return platformOptimizedClips;
    }

    const systemPrompt = `You are a video editing expert specializing in creating viral clips from longer content.

Analyze the video content and suggest the best clips that would perform well on ${targetPlatform}.

Consider:
- Hook potential (first 3 seconds)
- Emotional peaks and highlights
- Self-contained story segments
- Platform-specific optimal lengths
- Viral potential factors

Video duration: ${videoDuration} seconds
Target platform: ${targetPlatform}

Respond with a JSON array of clip suggestions:
{
  "clips": [
    {
      "title": "catchy clip title",
      "description": "what happens in this clip", 
      "startTime": number (seconds),
      "endTime": number (seconds),
      "viralScore": number (0-10),
      "reasoning": "why this clip will perform well"
    }
  ]
}

Suggest 3-5 of the best clips with high viral potential.`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Video content: ${videoDescription}` }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.clips || [];
    } catch (error) {
      console.error("Error generating video clips:", error);
      throw new Error("Failed to generate video clips");
    }
  }
}

export const openRouterService = new OpenRouterService();