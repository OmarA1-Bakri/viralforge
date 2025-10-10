// OpenRouter AI service for CreatorKit - using OpenAI-compatible API with caching
import OpenAI from "openai";
import { simplifiedAICache } from "./simplifiedCache.js";
import { Sentry } from '../lib/sentry';
import { logger } from '../lib/logger';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.REPLIT_DOMAINS || "http://localhost:5000",
    "X-Title": "ViralForgeAI",
  }
});

// Helper function: AI call with timeout and retry logic
async function callOpenAIWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 2
): Promise<T> {
  const TIMEOUT_MS = 20000; // 20 seconds - Give OpenRouter more time

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Race between the operation and a timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`OpenAI timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
        )
      ]);

      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;

      logger.error({
        errorMessage: error?.message || 'Unknown error',
        errorName: error?.name,
        errorStack: error?.stack?.substring(0, 200),
        errorType: error?.constructor?.name,
        operationName,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        isLastAttempt
      }, `OpenAI ${operationName} failed`);

      if (isLastAttempt) {
        // Track final failure in Sentry
        Sentry.captureException(error, {
          tags: {
            operation: operationName,
            attempts: maxRetries + 1
          }
        });
        throw error;
      }

      // Exponential backoff: wait before retry
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
      logger.info({ backoffMs, nextAttempt: attempt + 2 }, `Retrying ${operationName}`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(`Failed ${operationName} after ${maxRetries + 1} attempts`);
}

export interface TrendDiscoveryRequest {
  platform: "tiktok" | "youtube" | "instagram";
  category?: string;
  contentType?: string;
  targetAudience?: string;
  limit?: number;
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
  thumbnailDescription?: string; // Deprecated: use thumbnailUrl or thumbnailBase64
  thumbnailUrl?: string; // URL to thumbnail image for vision analysis
  thumbnailBase64?: string; // Base64-encoded image data for vision analysis
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
  viralPotential: {
    score: number;
    reasoning: string;
    successExamples: string[];
  };
  improvements: {
    priority: 'high' | 'medium' | 'low';
    change: string;
    expectedImpact: string;
    before: string;
    after: string;
  }[];
  abTestSuggestions: {
    variant: string;
    hypothesis: string;
    expectedOutcome: string;
  }[];
  competitorComparison?: {
    strengths: string[];
    gaps: string[];
    opportunities: string[];
  };
  analysis?: string; // Raw analysis text for viral pattern service
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
  // Discover trending content ideas using AI with caching
  async discoverTrends(request: TrendDiscoveryRequest & { limit?: number }, userId?: string): Promise<TrendResult[]> {
    console.log("🔍 Discovering trends for:", request);

    // Check cache first
    const cachedResult = await simplifiedAICache.getCachedWithUserContext<TrendResult[]>('trends', request, userId);
    if (cachedResult) {
      return cachedResult;
    }

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

      // Cache mock data too (but with shorter TTL)
      await simplifiedAICache.setCachedWithUserContext('trends', request, mockTrends, userId);
      console.log(`✅ Returning ${mockTrends.length} mock trends for development - cached for 15 minutes`);
      return mockTrends;
    }

    const systemPrompt = `You are a viral content expert and social media trend analyst with access to real-time trending data. Your job is to curate the BEST content ideas for creators based on their specific niche.

Analyze current trends and generate highly personalized, actionable content ideas for ${request.platform}. Each idea should be:
- Tailored specifically to the creator's niche: ${request.category || 'general'}
- Currently trending or emerging (not generic templates)
- High potential for virality and engagement
- Backed by real trending hashtags/topics
- Creatively adapted to the creator's style

${request.category ? `CRITICAL: All ideas MUST be highly relevant to ${request.category}. Don't just filter generic trends - CREATE unique ideas that blend current viral formats with ${request.category} content.` : ''}
${request.contentType ? `Content style: ${request.contentType}` : ''}
${request.targetAudience ? `Target audience: ${request.targetAudience}` : ''}

Respond with a JSON object containing a "trends" array of 8-12 curated trend objects: { "trends": [...] }. Each trend MUST have:
- title: Catchy, niche-specific title (not generic)
- description: How this trend applies to ${request.category || 'the creator\'s niche'}
- category: "${request.category || 'Content'}"
- platform: "${request.platform}"
- hotness: "hot", "rising", or "relevant"
- engagement: Realistic engagement number (1000-500000)
- hashtags: Array of 3-6 REAL trending hashtags relevant to this niche (without # symbol)
- sound: Optional trending sound/audio name
- suggestion: Specific, actionable steps to execute this idea in ${request.category || 'their niche'}
- timeAgo: How recently this trend emerged (e.g., "2h ago", "1d ago")
- source: Where this trend was discovered (e.g., "Trending on TikTok • #hashtag • 250K videos", "Viral on Instagram Reels • #hashtag • 180K posts")

BE CREATIVE: Don't just list obvious trends. Combine trending formats with niche-specific angles. Example: If niche is "fitness", don't say "workout videos" - say "5-second form check transitions" or "gym fails that teach proper technique".`;

    try {
      const response = await callOpenAIWithRetry(
        () => openai.chat.completions.create({
          model: "x-ai/grok-4-fast", // Using Grok-4-fast for trend discovery
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Discover trending content ideas for ${request.platform}` }
          ],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        }),
        'discoverTrends'
      );

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const trends = result.trends || [];

      // Cache the successful result
      await simplifiedAICache.setCachedWithUserContext('trends', request, trends, userId);

      logger.info({ model: response.model, trendsCount: trends.length }, 'AI trends discovered and cached');
      return trends;
    } catch (error) {
      logger.error({ error, request }, 'Trend discovery failed, using fallback data');
      Sentry.captureException(error, { tags: { operation: 'discoverTrends' } });

      // Fall back to mock data if API fails (development safety)
      console.log("⚠️ OpenRouter API failed, using mock trends for development");
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

      console.log(`✅ Returning ${mockTrends.length} fallback trends for development`);
      return mockTrends;
    }
  }

  // Analyze content for optimization (Launch Pad) with caching
  async analyzeContent(request: ContentAnalysisRequest, userId?: string): Promise<ContentAnalysisResult> {
    console.log("🔍 Analyzing content:", request);

    // Check cache first
    const cachedResult = await simplifiedAICache.getCachedWithUserContext<ContentAnalysisResult>('content', request, userId);
    if (cachedResult) {
      return cachedResult;
    }

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
        ],
        viralPotential: {
          score: 65,
          reasoning: "Content has moderate viral potential based on title structure and emotional appeal.",
          successExamples: [
            "Similar content by @creator123 reached 1M views",
            "Format matches trending pattern on TikTok"
          ]
        },
        improvements: [
          {
            priority: 'high',
            change: 'Add a question to create curiosity',
            expectedImpact: '+25% click-through rate',
            before: request.title || 'Your current title',
            after: `${request.title} - But why?`
          }
        ],
        abTestSuggestions: [
          {
            variant: 'Question-based title',
            hypothesis: 'Questions drive curiosity',
            expectedOutcome: '+15% engagement'
          }
        ]
      };

      // Cache mock analysis too
      await simplifiedAICache.setCachedWithUserContext('content', request, mockAnalysis, userId);
      
      console.log(`✅ Returning mock analysis with overall score: ${Math.round((mockAnalysis.clickabilityScore + mockAnalysis.clarityScore + mockAnalysis.intrigueScore + mockAnalysis.emotionScore) / 4)}/10 - cached for 1 hour`);
      return mockAnalysis;
    }

    const roastModeNote = request.roastMode ? 
      "Use a brutally honest, roast-style tone. Be direct and humorous about what's wrong." :
      "Be constructive and encouraging while pointing out areas for improvement.";

    const systemPrompt = `You are an expert viral content analyst who has studied thousands of viral videos. You provide SPECIFIC, ACTIONABLE insights with real examples.

${roastModeNote}

Your analysis MUST include:

1. **Scores (0-10)**: Clickability, Clarity, Intrigue, Emotion

2. **Viral Potential Analysis**:
   - Overall viral potential score (0-100)
   - Specific reasoning citing viral patterns
   - 2-3 examples of similar content that went viral

3. **Priority Improvements** (ordered by impact):
   For EACH improvement:
   - Priority level (high/medium/low)
   - Exact change to make (be specific!)
   - Why it will increase virality
   - Before vs After example

4. **A/B Test Suggestions**:
   - 3 variations to test
   - Hypothesis for each
   - Predicted outcome

5. **Competitor Comparison**:
   - How does this compare to top performers in the niche?
   - What are they doing that this content isn't?

Be EXTREMELY SPECIFIC. Instead of "improve thumbnail", say "add close-up of surprised face in left third, increase text size by 40%, change background to high-contrast yellow".

Respond in JSON format with:
{
  "clickabilityScore": number,
  "clarityScore": number,
  "intrigueScore": number,
  "emotionScore": number,
  "feedback": {
    "thumbnail": "detailed feedback",
    "title": "detailed feedback",
    "overall": "overall assessment"
  },
  "suggestions": ["suggestion 1", "suggestion 2"],
  "viralPotential": {
    "score": number (0-100),
    "reasoning": "why this score, citing specific viral patterns",
    "successExamples": ["Example 1: Title/channel that went viral", "Example 2", "Example 3"]
  },
  "improvements": [
    {
      "priority": "high|medium|low",
      "change": "EXACT change to make",
      "expectedImpact": "predicted increase in engagement",
      "before": "current state",
      "after": "improved state"
    }
  ],
  "abTestSuggestions": [
    {
      "variant": "description of test variant",
      "hypothesis": "what you're testing",
      "expectedOutcome": "predicted result"
    }
  ]
}`;

    // Build user message with vision support if thumbnail provided
    const hasVision = !!(request.thumbnailUrl || request.thumbnailBase64);

    let userMessage: any;
    if (hasVision) {
      // OpenAI Vision API format for multimodal analysis
      const imageContent: any = request.thumbnailUrl
        ? { type: "image_url", image_url: { url: request.thumbnailUrl } }
        : { type: "image_url", image_url: { url: `data:image/jpeg;base64,${request.thumbnailBase64}` } };

      const textContent = `
Analyze this content for viral potential:
Title: ${request.title || "No title provided"}
Description: ${request.description || "No description provided"}
Platform: ${request.platform}

Provide detailed analysis of the thumbnail image along with the title and description.
      `.trim();

      userMessage = {
        role: "user",
        content: [
          { type: "text", text: textContent },
          imageContent
        ]
      };
    } else {
      // Fallback to text-only analysis
      const contentToAnalyze = `
Title: ${request.title || "No title provided"}
Description: ${request.description || "No description provided"}
Thumbnail: ${request.thumbnailDescription || "No thumbnail description provided"}
Platform: ${request.platform}
      `.trim();

      userMessage = { role: "user", content: contentToAnalyze };
    }

    try {
      const response = await callOpenAIWithRetry(
        () => openai.chat.completions.create({
          model: "x-ai/grok-4-fast",
          messages: [
            { role: "system", content: systemPrompt },
            userMessage
          ],
          response_format: { type: "json_object" },
          max_tokens: 1500,
        }),
        'analyzeContent'
      );

      const result = JSON.parse(response.choices[0].message.content || "{}");

      // Cache the successful result
      await simplifiedAICache.setCachedWithUserContext('content', request, result, userId);

      logger.info({ model: response.model }, 'AI content analysis completed and cached');
      return result;
    } catch (error: any) {
      // Properly serialize error for logging
      const errorDetails = {
        message: error?.message || 'Unknown error',
        code: error?.code,
        status: error?.status,
        type: error?.type,
        stack: error?.stack
      };

      logger.error({ error: errorDetails, request }, 'Content analysis failed');
      Sentry.captureException(error, {
        tags: { operation: 'analyzeContent' },
        extra: { request }
      });

      // Return fallback analysis with helpful message
      return this.getFallbackAnalysis(request);
    }
  }

  // Fallback analysis when AI fails
  private getFallbackAnalysis(request: ContentAnalysisRequest): ContentAnalysisResult {
    // Check if we have minimal input to provide helpful feedback
    const hasMinimalInput = request.title || request.description || request.thumbnailUrl || request.thumbnailBase64 || request.thumbnailDescription;

    if (!hasMinimalInput) {
      // No input provided - give actionable guidance
      return {
        clickabilityScore: 0,
        clarityScore: 0,
        intrigueScore: 0,
        emotionScore: 0,
        feedback: {
          thumbnail: "📸 Add a thumbnail or describe your visual content to get AI feedback",
          title: "✏️ Provide a title for your content to analyze its viral potential",
          overall: "💡 To get AI analysis, please provide:\n• A title for your content\n• A description of what it's about\n• Upload/describe your thumbnail\n\nThe more details you share, the better feedback I can give!"
        },
        suggestions: [
          "Add a compelling title that hooks viewers",
          "Describe or upload your thumbnail",
          "Explain what makes your content unique",
          "Share your target platform (TikTok, YouTube, etc.)"
        ],
        viralPotential: {
          score: 0,
          reasoning: "Need content details to analyze viral potential",
          successExamples: []
        },
        improvements: [{
          priority: 'high',
          change: 'Provide content details for AI analysis',
          expectedImpact: 'Get personalized feedback on your viral potential',
          before: 'No content information provided',
          after: 'Share your title, description, and thumbnail'
        }],
        abTestSuggestions: [],
        competitorComparison: {
          strengths: [],
          gaps: [],
          opportunities: []
        }
      };
    }

    // AI service failed but we have some input
    return {
      clickabilityScore: 6,
      clarityScore: 6,
      intrigueScore: 6,
      emotionScore: 6,
      feedback: {
        thumbnail: request.thumbnailUrl || request.thumbnailBase64 || request.thumbnailDescription ?
          "Thumbnail detected, but AI analysis is temporarily unavailable. Try again in a moment." :
          "No thumbnail provided - upload one for better analysis",
        title: request.title ?
          `Your title: "${request.title}" - AI analysis temporarily unavailable` :
          "No title provided - add one for better feedback",
        overall: "⚠️ AI analysis is temporarily unavailable. Your content has been received, but we can't provide detailed feedback right now. Please try again in a few moments."
      },
      suggestions: [
        "Try again in a few moments when AI service recovers",
        "Make sure you've provided a title and description",
        "Upload or describe your thumbnail for visual analysis"
      ],
      viralPotential: {
        score: 50,
        reasoning: "Unable to analyze due to temporary service issue",
        successExamples: []
      },
      improvements: [],
      abTestSuggestions: [],
      competitorComparison: {
        strengths: [],
        gaps: [],
        opportunities: []
      }
    };
  }

  // Generate video clip suggestions (Multiplier) with caching
  async generateVideoClips(
    videoDescription: string, 
    videoDuration: number, 
    targetPlatform: string,
    userId?: string
  ): Promise<VideoClipSuggestion[]> {
    console.log("🔍 Generating video clips:", { videoDescription, videoDuration, targetPlatform });

    // Create cache key from parameters
    const clipRequest = { videoDescription, videoDuration, targetPlatform };
    
    // Check cache first
    const cachedResult = await simplifiedAICache.getCachedWithUserContext<VideoClipSuggestion[]>('videoProcessing', clipRequest, userId);
    if (cachedResult) {
      return cachedResult;
    }

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

      // Cache mock clips
      await simplifiedAICache.setCachedWithUserContext('videoProcessing', clipRequest, platformOptimizedClips, userId);
      
      console.log(`✅ Generated ${platformOptimizedClips.length} mock clips for ${targetPlatform} (${videoDuration}s video) - cached for 45 minutes`);
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
      const response = await callOpenAIWithRetry(
        () => openai.chat.completions.create({
          model: "x-ai/grok-4-fast",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Video content: ${videoDescription}` }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1200,
        }),
        'generateVideoClips'
      );

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const clips = result.clips || [];

      // Cache the successful result
      await simplifiedAICache.setCachedWithUserContext('videoProcessing', clipRequest, clips, userId);

      logger.info({ model: response.model, clipsCount: clips.length }, 'AI video clips generated and cached');
      return clips;
    } catch (error) {
      logger.error({ error, videoDescription }, 'Video clip generation failed, using fallback');
      Sentry.captureException(error, { tags: { operation: 'generateVideoClips' } });

      // Return empty array instead of crashing
      return [];
    }
  }
}

export const openRouterService = new OpenRouterService();
