import { logger } from '../lib/logger';
import { storage } from '../storage';

/**
 * AI Call Tracing and Cost Tracking
 * Tracks all AI API calls for monitoring, debugging, and cost analysis
 */

interface AICallTrace {
  operationType: 'trends' | 'content_analysis' | 'viral_pattern' | 'personalized_advice' | 'video_clips';
  model: string;
  userId?: string;
  cacheHit: boolean;
  tokensUsed?: number;
  costUsd?: number;
  durationMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenRouterResponse {
  model?: string;
  usage?: OpenRouterUsage;
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

/**
 * Model cost per 1M tokens (as of 2025-01)
 * Source: OpenRouter pricing
 */
const MODEL_COSTS = {
  'x-ai/grok-4-fast': { input: 0.50, output: 1.50 },           // $0.50/$1.50 per 1M tokens
  'x-ai/grok-2-vision-1212': { input: 2.00, output: 10.00 },   // $2.00/$10.00 per 1M tokens
  'anthropic/claude-3-5-sonnet': { input: 3.00, output: 15.00 }, // $3.00/$15.00 per 1M tokens
  // Add more models as needed
} as const;

class AITracer {
  /**
   * Calculate cost from token usage
   */
  private calculateCost(model: string, usage: OpenRouterUsage): number {
    const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
    if (!costs || !usage.prompt_tokens || !usage.completion_tokens) {
      return 0;
    }

    const inputCost = (usage.prompt_tokens / 1_000_000) * costs.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * costs.output;
    return inputCost + outputCost;
  }

  /**
   * Extract usage and cost from OpenRouter response
   */
  private extractUsageInfo(response: OpenRouterResponse): {
    tokens: number;
    cost: number;
  } {
    const usage = response.usage;
    const model = response.model || 'unknown';

    if (!usage) {
      return { tokens: 0, cost: 0 };
    }

    const tokens = usage.total_tokens || 0;
    const cost = this.calculateCost(model, usage);

    return { tokens, cost };
  }

  /**
   * Log AI call for monitoring
   */
  async logAICall(trace: AICallTrace): Promise<void> {
    const logData = {
      operationType: trace.operationType,
      model: trace.model,
      userId: trace.userId,
      cacheHit: trace.cacheHit,
      tokensUsed: trace.tokensUsed || 0,
      costUsd: trace.costUsd || 0,
      durationMs: trace.durationMs,
      success: trace.success,
      error: trace.error,
      timestamp: new Date().toISOString(),
      ...trace.metadata
    };

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const emoji = trace.cacheHit ? '📦' : '🤖';
      const status = trace.success ? '✅' : '❌';

      logger.info(
        `${emoji} ${status} AI Call: ${trace.operationType} | Model: ${trace.model} | ` +
        `Cache: ${trace.cacheHit ? 'HIT' : 'MISS'} | ` +
        `Tokens: ${trace.tokensUsed || 0} | ` +
        `Cost: $${(trace.costUsd || 0).toFixed(4)} | ` +
        `Duration: ${trace.durationMs}ms`
      );
    }

    // Log to structured logger for production monitoring
    logger.info(logData, 'AI API call traced');

    // Store in database for analytics (optional - can be expensive at scale)
    // Consider implementing this only for production or sampling
    // await this.saveToDatabase(logData);
  }

  /**
   * Trace a cached AI call
   */
  async traceCacheHit(
    operationType: AICallTrace['operationType'],
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAICall({
      operationType,
      model: 'cached',
      userId,
      cacheHit: true,
      tokensUsed: 0,
      costUsd: 0,
      durationMs: 0,
      success: true,
      metadata
    });
  }

  /**
   * Trace an actual AI API call
   */
  async traceAICall(
    operationType: AICallTrace['operationType'],
    model: string,
    response: OpenRouterResponse,
    startTime: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const durationMs = Date.now() - startTime;
    const { tokens, cost } = this.extractUsageInfo(response);

    await this.logAICall({
      operationType,
      model,
      userId,
      cacheHit: false,
      tokensUsed: tokens,
      costUsd: cost,
      durationMs,
      success: true,
      metadata
    });
  }

  /**
   * Trace a failed AI call
   */
  async traceAIError(
    operationType: AICallTrace['operationType'],
    model: string,
    error: Error,
    startTime: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const durationMs = Date.now() - startTime;

    await this.logAICall({
      operationType,
      model,
      userId,
      cacheHit: false,
      tokensUsed: 0,
      costUsd: 0,
      durationMs,
      success: false,
      error: error.message,
      metadata
    });
  }

  /**
   * Get cost statistics (for admin dashboard)
   */
  async getCostStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalCalls: number;
    cacheHits: number;
    totalTokens: number;
    totalCostUsd: number;
    averageCostPerCall: number;
    cacheHitRate: number;
  }> {
    // This would query the database if we're storing traces
    // For now, return placeholder
    return {
      totalCalls: 0,
      cacheHits: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      averageCostPerCall: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Optional: Save trace to database for long-term analytics
   * Only enable this in production with proper data retention policies
   */
  private async saveToDatabase(trace: AICallTrace): Promise<void> {
    // Implementation would go here if needed
    // Example: INSERT INTO ai_call_traces (...)
    // For MVP, we're logging to files/monitoring service instead
  }
}

export const aiTracer = new AITracer();
