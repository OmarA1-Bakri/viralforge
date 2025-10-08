// Automated preference learning system for ViralForgeAI
import { storage } from "./storage";
import { openRouterService } from "./ai/openrouter";

export interface UserPreferences {
  userId: string;
  niche: string;
  preferredCategories: string[];
  successfulHashtags: string[];
  avgSuccessfulEngagement: number;
  preferredContentLength: string; // 'short', 'medium', 'long'
  bestPerformingPlatforms: string[];
  contentStyle: string; // 'educational', 'entertainment', 'comedy', 'lifestyle'
  targetAudience: string;
  optimizedPostTimes: string[];
  lastUpdated: Date;
}

export interface ContentPerformance {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
  clickRate?: number;
  completionRate?: number;
}

export async function analyzeSuccessPatterns(content: any, performance: ContentPerformance): Promise<Partial<UserPreferences>> {
  console.log(`🔍 Analyzing success patterns from content: ${content.title || content.id}...`);
  
  // Calculate if this content was successful
  const isSuccessful = performance.engagementRate > 0.05 || performance.views > 10000;
  
  if (!isSuccessful) {
    console.log('⚠️ Content performance below success threshold, skipping pattern analysis');
    return {};
  }

  // Extract patterns from successful content
  const patterns: Partial<UserPreferences> = {};

  // Analyze category/niche
  if (content.title) {
    patterns.niche = await inferNicheFromContent(content.title, content.description);
  }

  // Extract successful hashtags (if any)
  const hashtags = extractHashtagsFromContent(content);
  if (hashtags.length > 0) {
    patterns.successfulHashtags = hashtags;
  }

  // Determine content style
  patterns.contentStyle = inferContentStyle(content);

  // Track platform performance
  if (content.platform) {
    patterns.bestPerformingPlatforms = [content.platform];
  }

  // Analyze engagement benchmarks
  patterns.avgSuccessfulEngagement = performance.engagementRate;

  console.log(`✅ Extracted ${Object.keys(patterns).length} success patterns`);
  return patterns;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    // Query database for user preferences
    const preferences = await storage.getUserPreferences(userId);
    
    if (!preferences) {
      console.log(`⚠️ No preferences found for user ${userId}`);
      return null;
    }

    return preferences;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

export async function filterTrendsByPreferences(trends: any[], userPrefs: UserPreferences | null): Promise<any[]> {
  if (!userPrefs || trends.length === 0) {
    console.log('⚠️ No preferences available, returning unfiltered trends');
    return trends;
  }

  console.log(`🎯 Filtering ${trends.length} trends based on user preferences...`);

  // Score each trend based on user preferences
  const scoredTrends = trends.map(trend => {
    let score = 0;
    const reasons: string[] = [];

    // Category match (40% weight)
    if (userPrefs.preferredCategories.includes(trend.category)) {
      score += 40;
      reasons.push(`Category match: ${trend.category}`);
    }

    // Hashtag overlap (25% weight)
    const trendHashtags = trend.hashtags || [];
    const hashtagOverlap = trendHashtags.filter((tag: string) => 
      userPrefs.successfulHashtags.includes(tag.toLowerCase())
    ).length;
    if (hashtagOverlap > 0) {
      score += 25 * (hashtagOverlap / trendHashtags.length);
      reasons.push(`Hashtag overlap: ${hashtagOverlap} matches`);
    }

    // Platform match (20% weight)
    if (userPrefs.bestPerformingPlatforms.includes(trend.platform)) {
      score += 20;
      reasons.push(`Platform match: ${trend.platform}`);
    }

    // Engagement potential (15% weight)
    if (trend.engagement && trend.engagement > userPrefs.avgSuccessfulEngagement * 1000) {
      score += 15;
      reasons.push(`High engagement potential: ${trend.engagement}`);
    }

    return {
      ...trend,
      preferenceScore: score,
      matchReasons: reasons,
      personalizedSuggestion: generatePersonalizedSuggestion(trend, userPrefs)
    };
  });

  // Sort by preference score (highest first)
  const filteredTrends = scoredTrends
    .filter(trend => trend.preferenceScore > 20) // Only trends with decent match
    .sort((a, b) => b.preferenceScore - a.preferenceScore);

  console.log(`✅ Filtered to ${filteredTrends.length} personalized trends (avg score: ${Math.round(filteredTrends.reduce((sum, t) => sum + t.preferenceScore, 0) / filteredTrends.length)}%)`);

  return filteredTrends;
}

async function inferNicheFromContent(title: string, description?: string): Promise<string> {
  const content = `${title} ${description || ''}`.toLowerCase();
  
  // Simple keyword-based niche detection
  const niches: { [key: string]: string[] } = {
    'fitness': ['workout', 'gym', 'fitness', 'health', 'exercise'],
    'food': ['recipe', 'cooking', 'food', 'kitchen', 'meal'],
    'tech': ['tech', 'gadget', 'app', 'software', 'coding'],
    'lifestyle': ['lifestyle', 'daily', 'routine', 'life', 'vlog'],
    'comedy': ['funny', 'comedy', 'humor', 'joke', 'laugh'],
    'education': ['tutorial', 'how to', 'learn', 'education', 'tips'],
    'gaming': ['game', 'gaming', 'play', 'stream', 'gamer'],
    'fashion': ['fashion', 'style', 'outfit', 'clothes', 'trend'],
    'travel': ['travel', 'trip', 'vacation', 'explore', 'adventure']
  };

  for (const [niche, keywords] of Object.entries(niches)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      return niche;
    }
  }

  return 'entertainment'; // Default fallback
}

function extractHashtagsFromContent(content: any): string[] {
  const sources = [
    content.title || '',
    content.description || '',
    JSON.stringify(content.hashtags || [])
  ].join(' ');

  const hashtagRegex = /#[\w]+/g;
  const hashtags = sources.match(hashtagRegex) || [];
  
  return hashtags
    .map(tag => tag.replace('#', '').toLowerCase())
    .filter((tag, index, arr) => arr.indexOf(tag) === index)
    .slice(0, 10); // Limit to top 10
}

function inferContentStyle(content: any): string {
  const title = (content.title || '').toLowerCase();
  const description = (content.description || '').toLowerCase();
  const text = `${title} ${description}`;

  if (text.includes('how to') || text.includes('tutorial') || text.includes('learn')) {
    return 'educational';
  }
  if (text.includes('funny') || text.includes('comedy') || text.includes('laugh')) {
    return 'comedy';
  }
  if (text.includes('lifestyle') || text.includes('routine') || text.includes('daily')) {
    return 'lifestyle';
  }
  if (text.includes('review') || text.includes('unbox') || text.includes('test')) {
    return 'review';
  }

  return 'entertainment'; // Default
}

function generatePersonalizedSuggestion(trend: any, userPrefs: UserPreferences): string {
  const suggestions = [
    `Perfect for your ${userPrefs.niche} niche - adapt this trending format to showcase your expertise`,
    `This trend aligns with your successful content style (${userPrefs.contentStyle}) - create your version now`,
    `Your audience loves ${userPrefs.preferredCategories[0]} content - this trend is ideal for engagement`,
    `Based on your past successes, this trend has high viral potential for your channel`,
    `Trending in your best-performing category - jump on this while it's hot`,
    `This matches your successful hashtag strategy - perfect timing for maximum reach`
  ];

  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

export async function updateUserPreferencesFromSuccess(userId: string, contentId: number, performance: ContentPerformance): Promise<void> {
  try {
    const content = await storage.getContentById(contentId);
    if (!content) return;

    const patterns = await analyzeSuccessPatterns(content, performance);
    
    // In production, this would update the user preferences in the database
    // For now, we'll log the learning
    console.log(`🧠 Learned new patterns for user ${userId}:`, patterns);
    
    // TODO: Implement actual database storage for user preferences
    // await storage.updateUserPreferences(userId, patterns);
  } catch (error) {
    console.error('Error updating user preferences:', error);
  }
}