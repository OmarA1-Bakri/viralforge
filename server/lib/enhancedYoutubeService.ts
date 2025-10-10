import { youtubeCircuitBreaker, CircuitBreakerOpenError } from './circuitBreaker';
import { youtubeQuotaTracker, YouTubeQuotaTracker, QuotaExceededException, type ApiCallMetrics } from './youtubeQuotaTracker';
import { logger } from './logger';

/**
 * Enhanced YouTube Service
 *
 * Wraps YouTube API calls with:
 * - Circuit breaker (fail fast when service is down)
 * - Quota tracking (prevent exceeding daily limits)
 * - Retry logic with exponential backoff
 * - Response time monitoring
 * - 429 rate limit handling
 *
 * Usage:
 * ```typescript
 * const service = new EnhancedYouTubeService();
 * const result = await service.execute({
 *   operation: 'channels.list',
 *   quotaCost: 1,
 *   fn: () => youtubeApi.channels.list(...),
 * });
 * ```
 */

export interface YouTubeApiCallOptions<T> {
  operation: string; // e.g., 'channels.list', 'videos.list'
  quotaCost: number; // Quota units this call will consume
  fn: () => Promise<T>; // The actual API call function
  userId?: string; // Optional user ID for tracking
  retries?: number; // Number of retries (default: 3)
  retryDelay?: number; // Initial retry delay in ms (default: 1000)
}

export interface YouTubeApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    type: 'quota_exceeded' | 'rate_limit' | 'circuit_open' | 'network_error' | 'api_error' | 'unknown';
    message: string;
    retryable: boolean;
    retryAfter?: number; // Seconds to wait before retry
  };
  metrics: {
    durationMs: number;
    retryCount: number;
    quotaUsed: number;
  };
}

export class EnhancedYouTubeService {
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  /**
   * Execute a YouTube API call with all resilience features
   */
  async execute<T>(options: YouTubeApiCallOptions<T>): Promise<YouTubeApiResponse<T>> {
    const {
      operation,
      quotaCost,
      fn,
      userId,
      retries = this.MAX_RETRIES,
      retryDelay = this.INITIAL_RETRY_DELAY,
    } = options;

    const startTime = Date.now();
    let attempt = 0;
    let lastError: any;

    // Validate quota cost matches expected cost for operation
    const expectedCost = YouTubeQuotaTracker.estimateQuotaCost(operation);
    let actualQuotaCost = quotaCost;
    
    if (quotaCost !== expectedCost) {
      logger.error({
        operation,
        providedCost: quotaCost,
        expectedCost,
      }, '⚠️ QUOTA COST MISMATCH - Developer error or API change detected');
      
      // Use the HIGHER cost to be safe (prevents quota exhaustion)
      actualQuotaCost = Math.max(quotaCost, expectedCost);
      
      logger.warn({
        operation,
        originalCost: quotaCost,
        correctedCost: actualQuotaCost,
      }, 'Using higher quota cost for safety');
    }

    // Check quota before attempting (use validated cost)
    const quotaCheck = await youtubeQuotaTracker.shouldBlockRequest(actualQuotaCost);
    if (quotaCheck.shouldBlock) {
      const error = new QuotaExceededException(quotaCheck.reason!, quotaCheck.quotaStatus);

      await youtubeQuotaTracker.trackMetrics({
        operation,
        durationMs: Date.now() - startTime,
        success: false,
        errorType: 'quota_exceeded',
        retryCount: 0,
        userId,
      });

      return {
        success: false,
        error: {
          type: 'quota_exceeded',
          message: quotaCheck.reason!,
          retryable: false, // Don't retry quota exceeded
        },
        metrics: {
          durationMs: Date.now() - startTime,
          retryCount: 0,
          quotaUsed: 0,
        },
      };
    }

    // Retry loop with exponential backoff
    while (attempt <= retries) {
      try {
        // Execute with circuit breaker
        const result = await youtubeCircuitBreaker.execute(async () => {
          return await fn();
        });

        // Success! Track usage and metrics
        const durationMs = Date.now() - startTime;

        await Promise.all([
          youtubeQuotaTracker.trackUsage({
            operation,
            unitsUsed: actualQuotaCost,
            userId,
            success: true,
          }),
          youtubeQuotaTracker.trackMetrics({
            operation,
            durationMs,
            success: true,
            statusCode: 200,
            retryCount: attempt,
            userId,
          }),
        ]);

        logger.info({
          operation,
          durationMs,
          retryCount: attempt,
          quotaUsed: actualQuotaCost,
        }, 'YouTube API call succeeded');

        return {
          success: true,
          data: result,
          metrics: {
            durationMs,
            retryCount: attempt,
            quotaUsed: actualQuotaCost,
          },
        };

      } catch (error: any) {
        lastError = error;
        attempt++;

        const durationMs = Date.now() - startTime;

        // Handle circuit breaker open
        if (error instanceof CircuitBreakerOpenError) {
          await youtubeQuotaTracker.trackMetrics({
            operation,
            durationMs,
            success: false,
            errorType: 'circuit_open',
            retryCount: attempt - 1,
            userId,
          });

          logger.error({
            operation,
            circuit: error.circuitName,
            nextAttemptTime: error.nextAttemptTime,
          }, 'Circuit breaker open - failing fast');

          return {
            success: false,
            error: {
              type: 'circuit_open',
              message: error.message,
              retryable: false, // Don't retry when circuit is open
            },
            metrics: {
              durationMs,
              retryCount: attempt - 1,
              quotaUsed: 0,
            },
          };
        }

        // Detect error type
        const errorInfo = this.classifyError(error);

        // Track failed attempt
        await Promise.all([
          youtubeQuotaTracker.trackUsage({
            operation,
            unitsUsed: 0, // Don't count failed requests against quota
            userId,
            success: false,
            errorCode: errorInfo.statusCode?.toString(),
          }),
          youtubeQuotaTracker.trackMetrics({
            operation,
            durationMs,
            success: false,
            statusCode: errorInfo.statusCode,
            errorType: errorInfo.type,
            retryCount: attempt - 1,
            userId,
          }),
        ]);

        // Handle 429 rate limit with Retry-After
        if (errorInfo.type === 'rate_limit' && errorInfo.retryAfter) {
          logger.warn({
            operation,
            retryAfter: errorInfo.retryAfter,
            attempt,
          }, 'Rate limit hit - respecting Retry-After header');

          if (attempt <= retries) {
            await this.sleep(errorInfo.retryAfter * 1000);
            continue; // Retry after delay
          }
        }

        // Handle quota exceeded (403)
        if (errorInfo.type === 'quota_exceeded') {
          logger.error({
            operation,
            attempt,
          }, 'YouTube API quota exceeded (403)');

          // Don't retry quota exceeded
          return {
            success: false,
            error: {
              type: 'quota_exceeded',
              message: 'YouTube API quota exceeded. Resets at midnight UTC.',
              retryable: false,
            },
            metrics: {
              durationMs,
              retryCount: attempt - 1,
              quotaUsed: 0,
            },
          };
        }

        // Check if should retry
        if (!errorInfo.retryable || attempt > retries) {
          break;
        }

        // Exponential backoff for retries
        const delay = retryDelay * Math.pow(2, attempt - 1);
        logger.warn({
          operation,
          attempt,
          maxRetries: retries,
          nextRetryIn: delay,
          errorType: errorInfo.type,
        }, 'YouTube API call failed - retrying with exponential backoff');

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    const durationMs = Date.now() - startTime;
    const errorInfo = this.classifyError(lastError);

    logger.error({
      operation,
      attempts: attempt,
      durationMs,
      errorType: errorInfo.type,
      errorMessage: lastError?.message,
    }, 'YouTube API call failed after all retries');

    return {
      success: false,
      error: {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        retryAfter: errorInfo.retryAfter,
      },
      metrics: {
        durationMs,
        retryCount: attempt - 1,
        quotaUsed: 0,
      },
    };
  }

  /**
   * Classify error type and extract metadata
   */
  private classifyError(error: any): {
    type: 'quota_exceeded' | 'rate_limit' | 'api_error' | 'network_error' | 'unknown';
    message: string;
    retryable: boolean;
    statusCode?: number;
    retryAfter?: number;
  } {
    const message = error?.message || error?.toString() || 'Unknown error';
    const statusCode = error?.response?.status || error?.status || error?.statusCode;

    // 403 Forbidden - Quota exceeded
    if (statusCode === 403 || message.toLowerCase().includes('quota')) {
      return {
        type: 'quota_exceeded',
        message: 'YouTube API quota exceeded',
        retryable: false,
        statusCode: 403,
      };
    }

    // 429 Too Many Requests - Rate limit
    if (statusCode === 429) {
      const retryAfter = parseInt(error?.response?.headers?.['retry-after'] || '60', 10);
      return {
        type: 'rate_limit',
        message: `Rate limit exceeded. Retry after ${retryAfter}s.`,
        retryable: true,
        statusCode: 429,
        retryAfter,
      };
    }

    // 404 Not Found - Don't retry
    if (statusCode === 404) {
      return {
        type: 'api_error',
        message: 'Resource not found',
        retryable: false,
        statusCode: 404,
      };
    }

    // 400 Bad Request - Don't retry
    if (statusCode === 400) {
      return {
        type: 'api_error',
        message: 'Bad request',
        retryable: false,
        statusCode: 400,
      };
    }

    // 5xx Server Error - Retry
    if (statusCode >= 500) {
      return {
        type: 'api_error',
        message: 'YouTube API server error',
        retryable: true,
        statusCode,
      };
    }

    // Network errors - Retry
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('ENOTFOUND') ||
      message.includes('network') ||
      message.includes('timeout')
    ) {
      return {
        type: 'network_error',
        message: 'Network error connecting to YouTube API',
        retryable: true,
      };
    }

    // Unknown error - Retry to be safe
    return {
      type: 'unknown',
      message,
      retryable: true,
      statusCode,
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current quota status
   */
  async getQuotaStatus() {
    return youtubeQuotaTracker.getQuotaStatus();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return youtubeCircuitBreaker.getMetrics();
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(operation?: string) {
    return youtubeQuotaTracker.getPerformanceMetrics({ operation });
  }
}

// Export singleton instance
export const enhancedYoutubeService = new EnhancedYouTubeService();
