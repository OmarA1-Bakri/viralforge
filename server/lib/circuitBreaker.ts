import { db } from '../db';
import { circuitBreakerStates, type InsertCircuitBreakerState } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';

/**
 * Circuit Breaker Pattern Implementation
 *
 * Purpose: Prevents cascading failures by stopping calls to failing services
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests blocked (fail fast)
 * - HALF_OPEN: Testing if service recovered
 *
 * Behavior:
 * - After FAILURE_THRESHOLD failures → OPEN
 * - After TIMEOUT_MS in OPEN → HALF_OPEN
 * - Success in HALF_OPEN → CLOSED
 * - Failure in HALF_OPEN → OPEN
 *
 * Benefits:
 * - Prevents wasting resources on failing calls
 * - Gives failing services time to recover
 * - Provides fast feedback to callers
 * - Protects against quota exhaustion
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes in HALF_OPEN before closing
  timeout: number; // Time in ms to wait before HALF_OPEN
  name: string; // Circuit breaker name (e.g., 'youtube_api')
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  openedAt?: Date;
  halfOpenAt?: Date;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private openedAt?: Date;
  private halfOpenAt?: Date;
  private nextAttemptTime?: Date;
  private halfOpenRequestCount: number = 0;
  private readonly MAX_HALF_OPEN_CONCURRENT = 1; // Only allow 1 test request at a time

  // Default configuration
  private static readonly DEFAULT_CONFIG: Omit<CircuitBreakerConfig, 'name'> = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
  };

  constructor(config: Partial<CircuitBreakerConfig> & { name: string }) {
    this.config = {
      ...CircuitBreaker.DEFAULT_CONFIG,
      ...config,
    };

    // Load state from database on init
    this.loadStateFromDB().catch((error) => {
      logger.error({ error, circuit: this.config.name }, 'Failed to load circuit breaker state');
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        await this.transitionToHalfOpen();
      } else {
        const error = new CircuitBreakerOpenError(
          `Circuit breaker '${this.config.name}' is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`
        );
        error.nextAttemptTime = this.nextAttemptTime;
        error.circuitName = this.config.name;
        throw error;
      }
    }

    // HALF_OPEN: Limit concurrent requests to prevent flood during recovery testing
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequestCount >= this.MAX_HALF_OPEN_CONCURRENT) {
        const error = new CircuitBreakerOpenError(
          `Circuit breaker '${this.config.name}' is HALF_OPEN - limiting concurrent test requests`
        );
        error.circuitName = this.config.name;
        throw error;
      }
      
      this.halfOpenRequestCount++;
      try {
        const result = await fn();
        await this.onSuccess();
        return result;
      } catch (error) {
        await this.onFailure(error);
        throw error;
      } finally {
        this.halfOpenRequestCount--;
      }
    }

    // CLOSED: Normal operation
    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private async onSuccess(): Promise<void> {
    this.lastSuccessTime = new Date();
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        await this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }

    await this.persistState();
  }

  /**
   * Record a failed call
   */
  private async onFailure(error: any): Promise<void> {
    this.lastFailureTime = new Date();
    this.failureCount++;
    this.successCount = 0; // Reset success count

    logger.warn({
      circuit: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error?.message,
    }, 'Circuit breaker failure recorded');

    if (this.state === 'HALF_OPEN') {
      await this.transitionToOpen();
    } else if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      await this.transitionToOpen();
    }

    await this.persistState();
  }

  /**
   * Transition to OPEN state (circuit opens, blocking all calls)
   */
  private async transitionToOpen(): Promise<void> {
    const wasOpen = this.state === 'OPEN';
    this.state = 'OPEN';
    this.openedAt = new Date();
    this.halfOpenAt = undefined;
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout);

    if (!wasOpen) {
      logger.error({
        circuit: this.config.name,
        failureCount: this.failureCount,
        openedAt: this.openedAt,
        nextAttemptTime: this.nextAttemptTime,
      }, '⚠️ Circuit breaker OPENED - Service marked as failing');

      // TODO: Send alert to admins (email, Slack, PagerDuty, etc.)
    }

    await this.persistState();
  }

  /**
   * Transition to HALF_OPEN state (testing if service recovered)
   */
  private async transitionToHalfOpen(): Promise<void> {
    this.state = 'HALF_OPEN';
    this.halfOpenAt = new Date();
    this.successCount = 0;
    this.failureCount = 0;

    logger.info({
      circuit: this.config.name,
      halfOpenAt: this.halfOpenAt,
    }, 'Circuit breaker transitioned to HALF_OPEN - Testing service recovery');

    await this.persistState();
  }

  /**
   * Transition to CLOSED state (service healthy, normal operation)
   */
  private async transitionToClosed(): Promise<void> {
    const wasOpen = this.state === 'OPEN' || this.state === 'HALF_OPEN';
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = undefined;
    this.halfOpenAt = undefined;
    this.nextAttemptTime = undefined;

    if (wasOpen) {
      logger.info({
        circuit: this.config.name,
      }, '✅ Circuit breaker CLOSED - Service recovered');
    }

    await this.persistState();
  }

  /**
   * Check if circuit should attempt reset (transition from OPEN to HALF_OPEN)
   */
  private shouldAttemptReset(): boolean {
    if (this.state !== 'OPEN' || !this.nextAttemptTime) {
      return false;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
      halfOpenAt: this.halfOpenAt,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Manually reset circuit breaker (admin operation)
   */
  async reset(): Promise<void> {
    logger.info({ circuit: this.config.name }, 'Circuit breaker manually reset');
    await this.transitionToClosed();
  }

  /**
   * Load state from database
   */
  private async loadStateFromDB(): Promise<void> {
    try {
      const result = await db.select()
        .from(circuitBreakerStates)
        .where(eq(circuitBreakerStates.service, this.config.name))
        .limit(1);

      if (result.length > 0) {
        const dbState = result[0];
        this.state = dbState.state as CircuitBreakerState;
        this.failureCount = dbState.failureCount;
        this.lastFailureTime = dbState.lastFailureAt || undefined;
        this.lastSuccessTime = dbState.lastSuccessAt || undefined;
        this.openedAt = dbState.openedAt || undefined;
        this.halfOpenAt = dbState.halfOpenAt || undefined;

        // Calculate nextAttemptTime if OPEN
        if (this.state === 'OPEN' && this.openedAt) {
          this.nextAttemptTime = new Date(this.openedAt.getTime() + this.config.timeout);
        }

        logger.info({
          circuit: this.config.name,
          state: this.state,
          failureCount: this.failureCount,
        }, 'Circuit breaker state loaded from database');
      }
    } catch (error) {
      logger.error({ error, circuit: this.config.name }, 'Failed to load circuit breaker state from database');
    }
  }

  /**
   * Persist state to database
   */
  private async persistState(): Promise<void> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await db.insert(circuitBreakerStates)
          .values({
            service: this.config.name,
            state: this.state,
            failureCount: this.failureCount,
            lastFailureAt: this.lastFailureTime,
            lastSuccessAt: this.lastSuccessTime,
            openedAt: this.openedAt,
            halfOpenAt: this.halfOpenAt,
            metadata: {
              config: this.config,
              nextAttemptTime: this.nextAttemptTime,
            },
          } as InsertCircuitBreakerState)
          .onConflictDoUpdate({
            target: circuitBreakerStates.service,
            set: {
              state: this.state,
              failureCount: this.failureCount,
              lastFailureAt: this.lastFailureTime,
              lastSuccessAt: this.lastSuccessTime,
              openedAt: this.openedAt,
              halfOpenAt: this.halfOpenAt,
              metadata: {
                config: this.config,
                nextAttemptTime: this.nextAttemptTime,
              },
              updatedAt: new Date(),
            },
          });
        
        // Success - state persisted
        return;
      } catch (error) {
        lastError = error;
        logger.warn({ 
          error, 
          circuit: this.config.name, 
          attempt: attempt + 1,
          maxRetries 
        }, 'Circuit breaker state persistence failed - retrying');
        
        if (attempt < maxRetries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    // All retries exhausted - CRITICAL FAILURE
    logger.fatal({
      error: lastError,
      circuit: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
    }, '🚨 CRITICAL: Circuit breaker cannot persist state - entering safe mode');

    // Force OPEN state to be safe - block all traffic until database recovers
    this.state = 'OPEN';
    this.nextAttemptTime = new Date(Date.now() + 3600000); // 1 hour
    
    // Throw error to alert monitoring systems
    throw new Error(
      `CRITICAL: Circuit breaker '${this.config.name}' cannot persist state to database. ` +
      `Service forced to OPEN state for safety. Database connectivity must be restored.`
    );
  }
}

/**
 * Custom error for when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  nextAttemptTime?: Date;
  circuitName?: string;

  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Export singleton instances for common services
export const youtubeCircuitBreaker = new CircuitBreaker({
  name: 'youtube_api',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
});

export const stripeCircuitBreaker = new CircuitBreaker({
  name: 'stripe_api',
  failureThreshold: 3,
  successThreshold: 1,
  timeout: 60000, // 1 minute
});
