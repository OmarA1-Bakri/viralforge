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

/**
 * Retry a function with exponential backoff
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
        const delay = options.baseDelay * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
