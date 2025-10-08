/**
 * Retry Helper - Exponential Backoff for Network Operations
 *
 * Used to retry failed API calls with increasing delays between attempts.
 * Prevents overwhelming the server and handles transient network failures.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // milliseconds
}

const MAX_DELAY = 30000; // 30 seconds max delay

/**
 * Retry a function with exponential backoff
 * Includes max delay cap and jitter to prevent thundering herd
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result of the function
 * @throws Last error if all attempts fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt < options.maxAttempts - 1) {
        // Calculate exponential backoff
        const exponentialDelay = options.baseDelay * Math.pow(2, attempt);

        // Add jitter (0-1000ms random) to prevent thundering herd
        const jitter = Math.random() * 1000;

        // Cap at MAX_DELAY to prevent extremely long waits
        const delay = Math.min(exponentialDelay + jitter, MAX_DELAY);

        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
