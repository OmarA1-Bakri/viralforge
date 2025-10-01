import { storage } from '../storage';
import { OpenRouterService } from './openrouter';

export interface SuccessPattern {
  userId: string;
  patterns: {
    titlePatterns: string[];
    thumbnailElements: string[];
    contentTypes: string[];
    optimalPostingTimes: string[];
    successfulHooks: string[];
  };
  viralThreshold: number;
  lastUpdated: Date;
}

export class SuccessPatternService {
  private openrouter: OpenRouterService;
  private patterns: Map<string, SuccessPattern> = new Map();

  constructor() {
    this.openrouter = new OpenRouterService();
  }

  async analyzeUserSuccessPatterns(userId: string): Promise<SuccessPattern> {
    const analytics = await storage.getUserAnalytics(userId);
    
    const sortedByEngagement = analytics.sort((a, b) => {
      const aScore = (a.views || 0) + (a.likes || 0) * 10 + (a.shares || 0) * 50;
      const bScore = (b.views || 0) + (b.likes || 0) * 10 + (b.shares || 0) * 50;
      return bScore - aScore;
    });
    
    const topPerformers = sortedByEngagement.slice(0, Math.ceil(analytics.length * 0.2));
    
    const successfulContent = await Promise.all(
      topPerformers.map(async (a) => {
        if (!a.contentId) return null;
        const content = await storage.getContentById(a.contentId);
        const analysis = await storage.getContentAnalysis(a.contentId);
        return { content, analysis, analytics: a };
      })
    );

    const validContent = successfulContent.filter(c => c !== null);

    const titlePatterns: string[] = [];
    const thumbnailElements: string[] = [];
    const contentTypes: string[] = [];
    const optimalPostingTimes: string[] = [];

    for (const item of validContent) {
      if (item.content?.title) {
        if (item.content.title.includes('?')) titlePatterns.push('Uses questions');
        if (/\d+/.test(item.content.title)) titlePatterns.push('Contains numbers');
        if (/amazing|incredible|shocking|insane/i.test(item.content.title)) {
          titlePatterns.push('Emotional power words');
        }
      }
      
      if (item.analytics?.recordedAt) {
        const hour = new Date(item.analytics.recordedAt).getHours();
        optimalPostingTimes.push(`${hour}:00-${hour + 1}:00`);
      }
    }

    const pattern: SuccessPattern = {
      userId,
      patterns: {
        titlePatterns: [...new Set(titlePatterns)],
        thumbnailElements: [...new Set(thumbnailElements)],
        contentTypes: [...new Set(contentTypes)],
        optimalPostingTimes: [...new Set(optimalPostingTimes)],
        successfulHooks: []
      },
      viralThreshold: sortedByEngagement[0] 
        ? ((sortedByEngagement[0].views || 0) * 0.5) 
        : 10000,
      lastUpdated: new Date()
    };

    this.patterns.set(userId, pattern);
    return pattern;
  }

  async getPersonalizedAnalysis(
    userId: string,
    content: { title?: string; description?: string }
  ): Promise<string> {
    let pattern = this.patterns.get(userId);
    
    if (!pattern) {
      pattern = await this.analyzeUserSuccessPatterns(userId);
    }

    const insights: string[] = [];

    if (content.title) {
      if (pattern.patterns.titlePatterns.includes('Uses questions') && !content.title.includes('?')) {
        insights.push('✨ Your viral content usually includes questions. Consider adding one.');
      }
      if (pattern.patterns.titlePatterns.includes('Contains numbers') && !/\d+/.test(content.title)) {
        insights.push('📊 Numbers have worked well for you before. Try "5 ways..." or "in 3 steps".');
      }
    }

    if (pattern.patterns.optimalPostingTimes.length > 0) {
      insights.push(
        `⏰ Your best posting times: ${pattern.patterns.optimalPostingTimes.slice(0, 3).join(', ')}`
      );
    }

    return insights.join('\n');
  }

  async trackViralSuccess(userId: string, contentId: number): Promise<void> {
    await this.analyzeUserSuccessPatterns(userId);
    
    await storage.createUserActivity({
      userId,
      activityType: 'viral_success',
      title: 'Content went viral! Learning from your success',
      status: 'detected',
      contentId,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }
}

export const successPatternService = new SuccessPatternService();
