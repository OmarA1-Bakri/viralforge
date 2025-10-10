import { storage } from '../storage';
import { openRouterService } from './openrouter';
import { logger } from '../lib/logger';
import { aiTracer } from './aiTracer';
import type { Trend, ViralAnalysis, TrendApplication } from '@shared/schema';

export class ViralPatternService {
  /**
   * Analyze why a trend is going viral using Grok Vision + metadata
   * Results are cached for 7 days to minimize API costs
   */
  async analyzeTrend(trendId: number): Promise<ViralAnalysis> {
    // Check if we already have a cached analysis
    const existingAnalysis = await storage.getViralAnalysisByTrendId(trendId);

    if (existingAnalysis) {
      // Check if cache is still valid (not expired)
      if (existingAnalysis.expiresAt && new Date() < existingAnalysis.expiresAt) {
        logger.info({ trendId }, 'Returning cached viral analysis');

        // Track cache hit for monitoring
        await aiTracer.traceCacheHit('viral_pattern', undefined, { trendId });

        return existingAnalysis;
      }
      logger.info({ trendId }, 'Cached analysis expired, regenerating');
    }

    // Get the trend details
    const trend = await storage.getTrend(trendId);
    if (!trend) {
      throw new Error(`Trend ${trendId} not found`);
    }

    logger.info({ trendId, title: trend.title }, 'Analyzing viral pattern');

    // Build analysis prompt
    const prompt = this.buildAnalysisPrompt(trend);

    // Call OpenRouter with Grok 4 Vision if thumbnail available
    const response = await openRouterService.analyzeContent({
      title: trend.title,
      description: trend.description,
      thumbnailUrl: trend.thumbnailUrl || undefined,
      platform: trend.platform,
      roastMode: false
    }, undefined); // No userId needed for trend analysis

    // Parse the response to extract structured data
    const analysisText = response.analysis || response.feedback.overall || 'No analysis available';
    const parsedAnalysis = this.parseAnalysisResponse(analysisText, trend);

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save to database
    const analysis = await storage.createViralAnalysis({
      trendId,
      thumbnailAnalysis: parsedAnalysis.thumbnailAnalysis,
      whyItWorks: parsedAnalysis.whyItWorks,
      keyTakeaways: parsedAnalysis.keyTakeaways,
      patternType: parsedAnalysis.patternType,
      audioStrategy: parsedAnalysis.audioStrategy,
      hashtagStrategy: parsedAnalysis.hashtagStrategy,
      engagementRate: trend.engagement ? this.calculateEngagementRate(trend.engagement) : null,
      expiresAt
    });

    logger.info({ trendId, analysisId: analysis.id }, 'Viral analysis complete and cached');
    return analysis;
  }

  /**
   * Generate personalized advice for a user based on a viral trend
   */
  async generatePersonalizedAdvice(
    userId: string,
    trendId: number,
    userContentConcept?: string
  ): Promise<TrendApplication> {
    // Get or create viral analysis
    const analysis = await this.analyzeTrend(trendId);

    // Get user preferences for personalization
    const userPrefs = await storage.getUserPreferences(userId);

    // Get the trend details
    const trend = await storage.getTrend(trendId);
    if (!trend) {
      throw new Error(`Trend ${trendId} not found`);
    }

    logger.info({ userId, trendId }, 'Generating personalized viral advice');

    // Build personalized prompt
    const prompt = this.buildPersonalizedPrompt(trend, analysis, userPrefs, userContentConcept);

    // Call OpenRouter for personalized advice
    const response = await openRouterService.analyzeContent({
      title: trend.title,
      description: prompt,
      platform: trend.platform,
      roastMode: false
    }, userId);

    // Save the application
    const application = await storage.createTrendApplication({
      userId,
      trendId,
      analysisId: analysis.id,
      userContentConcept: userContentConcept || null,
      personalizedAdvice: response.analysis || response.feedback.overall || 'No personalized advice available'
    });

    logger.info({ userId, trendId, applicationId: application.id }, 'Personalized advice generated');
    return application;
  }

  /**
   * Build the analysis prompt for understanding why a trend is viral
   * Based on CrewAI best practices for viral content analysis
   */
  private buildAnalysisPrompt(trend: Trend): string {
    return `ROLE: Viral Pattern Analysis Expert

ATTRIBUTES:
You are a data scientist specializing in social media analytics and viral content patterns. With years of experience studying social media algorithms and human psychology, you can identify the underlying patterns that make content go viral. You understand the science behind virality - from emotional triggers to timing, from content structure to community dynamics.

GOAL:
Analyze viral content patterns across all platforms for {${trend.platform}}, identifying common success factors, timing strategies, content structures, and engagement techniques that drive virality.

BACKSTORY:
You're a YouTube analytics expert who has studied thousands of viral videos to understand what makes content successful on the platform. You understand ${trend.platform}'s algorithm, engagement signals, and the psychology behind shareable content. You can break down video elements like hooks, pacing, thumbnails, titles, and content structure that contribute to viral success.

────────────────────────────────────────────────────────────

Perform a deep analysis of this viral ${trend.platform} content to understand what made it successful.

**CONTENT DETAILS:**
Title: ${trend.title}
Description: ${trend.description}
Category: ${trend.category}
Platform: ${trend.platform}
Hashtags: ${trend.hashtags.join(', ')}
${trend.sound ? `Audio/Sound: ${trend.sound}` : ''}
Engagement Level: ${trend.engagement} (Status: ${trend.hotness})
${trend.thumbnailUrl ? '\n**VISUAL ANALYSIS REQUIRED:** Analyze the thumbnail image provided to identify visual patterns, composition, color psychology, and emotional triggers.' : ''}

**ANALYSIS FRAMEWORK:**

1. **Content Structure Breakdown**
   - Hook/Opening strategy (first 3 seconds)
   - Content format type (POV, Tutorial, Storytime, Trending Audio, Challenge, etc.)
   - Pacing and timing patterns
   - Story arc or narrative structure

2. **Visual & Thumbnail Strategy**
   - Composition elements (rule of thirds, focal points)
   - Color psychology and emotional triggers
   - Text overlay effectiveness
   - Facial expressions or key visual elements
   - What makes it scroll-stopping

3. **Engagement Analysis**
   - Why viewers engage (comment, like, share)
   - Emotional triggers activated (curiosity, FOMO, humor, controversy)
   - Call-to-action effectiveness
   - Community-building elements

4. **Platform-Specific Optimization**
   - How it leverages ${trend.platform} algorithm preferences
   - Audio/music strategy for virality
   - Hashtag strategy and discoverability
   - Posting time and audience targeting indicators

5. **Pattern Identification**
   - Specific viral pattern type (be precise)
   - Timing strategies and content structure patterns
   - Shared elements with other viral content in this niche
   - Platform-specific optimization tactics

**EXPECTED OUTPUT:**
Provide a comprehensive analysis identifying 5-10 key viral patterns, including:
- Timing strategies
- Content formats
- Emotional triggers
- Engagement techniques
- Platform-specific optimization tactics

Be specific, actionable, and focus on elements that can be replicated.`;
  }

  /**
   * Build personalized implementation strategy prompt
   * Based on CrewAI "Create Implementation Strategy" task
   */
  private buildPersonalizedPrompt(
    trend: Trend,
    analysis: ViralAnalysis,
    userPrefs: any,
    userContentConcept?: string
  ): string {
    const prefContext = userPrefs
      ? `
**CREATOR PROFILE:**
- Niche: ${userPrefs.niche}
- Target Audience: ${userPrefs.targetAudience}
- Content Style: ${userPrefs.contentStyle}
- Best Performing Platforms: ${userPrefs.bestPerformingPlatforms?.join(', ') || trend.platform}`
      : `
**CREATOR PROFILE:**
- Target Platform: ${trend.platform}
- (No saved preferences - provide general best practices)`;

    const conceptContext = userContentConcept
      ? `

**CREATOR'S CONTENT CONCEPT:**
${userContentConcept}

Adapt the viral strategy specifically to THIS concept.`
      : `

**TASK:** Provide general implementation guidance for applying this viral pattern to their niche.`;

    return `ROLE: Content Strategy Advisor

ATTRIBUTES:
You're a content marketing strategist who has helped countless creators and brands achieve viral success. You excel at translating complex viral patterns into simple, actionable strategies that anyone can implement. You understand different creator skill levels and can provide personalized advice ranging from beginner-friendly tips to advanced viral growth tactics.

GOAL:
Provide actionable content creation strategies and specific implementation advice based on viral content analysis for {${userPrefs?.niche || trend.category}}, helping users replicate successful viral elements in their own content.

BACKSTORY:
You're a content marketing strategist who has helped countless creators and brands achieve viral success. You excel at translating complex viral patterns into simple, actionable strategies that anyone can implement. You understand different creator skill levels and can provide personalized advice ranging from beginner-friendly tips to advanced viral growth tactics.

────────────────────────────────────────────────────────────

Based on the viral pattern analysis, create a comprehensive, actionable implementation strategy guide.

**VIRAL PATTERN ANALYSIS:**
${analysis.whyItWorks}

**Identified Pattern Type:** ${analysis.patternType || 'Multi-format viral content'}

**Key Success Factors:**
${analysis.keyTakeaways.map(t => `• ${t}`).join('\n')}
${prefContext}${conceptContext}

**CREATE A DETAILED IMPLEMENTATION STRATEGY INCLUDING:**

1. **Platform-Specific Strategy for ${trend.platform}**
   - Optimal video length and format
   - Best posting times for maximum reach
   - Algorithm-friendly optimization tactics
   - Hashtag strategy (trending + niche + branded)

2. **Content Creation Templates**
   - Hook template (first 3 seconds script)
   - Story structure framework
   - Visual composition guidelines
   - Audio/music selection criteria

3. **Timing Recommendations**
   - When to post for this content type
   - Content release frequency
   - Trend lifecycle timing (ride the wave correctly)

4. **Step-by-Step Implementation Instructions**
   1. Pre-production checklist
   2. Production guidelines
   3. Editing and optimization tips
   4. Publishing and engagement strategy
   5. Post-publish monitoring and iteration

5. **Adaptation Guidelines**
   - Which viral elements to keep exactly
   - Which elements to customize for their niche
   - How to maintain authenticity while following the pattern
   - Red flags and pitfalls to avoid

6. **Success Metrics to Track**
   - Key performance indicators to monitor
   - Benchmarks for this content type
   - When to iterate vs. when to pivot

**OUTPUT FORMAT:**
Provide a clear, actionable step-by-step action plan that users can follow to apply viral principles to their own content creation. Be specific, include examples, and focus on practical execution.`;
  }

  /**
   * Parse the AI response into structured data
   */
  private parseAnalysisResponse(response: string, trend: Trend): {
    thumbnailAnalysis: string | null;
    whyItWorks: string;
    keyTakeaways: string[];
    patternType: string | null;
    audioStrategy: string | null;
    hashtagStrategy: string | null;
  } {
    // Extract sections using pattern matching
    const whyItWorksMatch = response.match(/\*\*Why It Works\*\*:?\s*(.+?)(?=\n\*\*|$)/s);
    const patternTypeMatch = response.match(/\*\*Pattern Type\*\*:?\s*(.+?)(?=\n|$)/);
    const visualMatch = response.match(/\*\*Visual Strategy\*\*:?\s*(.+?)(?=\n\*\*|$)/s);
    const audioMatch = response.match(/\*\*Audio Strategy\*\*:?\s*(.+?)(?=\n\*\*|$)/s);
    const hashtagMatch = response.match(/\*\*Hashtag Strategy\*\*:?\s*(.+?)(?=\n\*\*|$)/s);
    const takeawaysMatch = response.match(/\*\*Key Takeaways\*\*:?\s*(.+?)$/s);

    // Extract bullet points from takeaways
    const keyTakeaways: string[] = [];
    if (takeawaysMatch) {
      const lines = takeawaysMatch[1].split('\n');
      for (const line of lines) {
        const cleaned = line.replace(/^[-*•]\s*/, '').trim();
        if (cleaned && cleaned.length > 5) {
          keyTakeaways.push(cleaned);
        }
      }
    }

    // Ensure we have at least one takeaway
    if (keyTakeaways.length === 0) {
      keyTakeaways.push(response.slice(0, 200) + '...');
    }

    return {
      thumbnailAnalysis: visualMatch ? visualMatch[1].trim() : null,
      whyItWorks: whyItWorksMatch ? whyItWorksMatch[1].trim() : response.slice(0, 500),
      keyTakeaways,
      patternType: patternTypeMatch ? patternTypeMatch[1].trim() : null,
      audioStrategy: audioMatch ? audioMatch[1].trim() : null,
      hashtagStrategy: hashtagMatch ? hashtagMatch[1].trim() : null
    };
  }

  /**
   * Calculate engagement rate (simple heuristic)
   */
  private calculateEngagementRate(engagement: number): number {
    // Normalize engagement to a 0-1 scale
    // This is a simple heuristic - in production you'd want actual views data
    return Math.min(engagement / 1000, 1.0);
  }
}

export const viralPatternService = new ViralPatternService();
