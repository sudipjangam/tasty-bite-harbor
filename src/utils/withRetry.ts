/**
 * Retry utility with exponential backoff
 * Useful for handling transient network failures in critical operations
 */

export interface RetryOptions {
  /** Maximum number of retry attempts. Default: 3 */
  maxRetries?: number;
  /** Initial delay in milliseconds. Default: 1000 */
  initialDelay?: number;
  /** Maximum delay in milliseconds. Default: 10000 */
  maxDelay?: number;
  /** Backoff multiplier. Default: 2 */
  backoffMultiplier?: number;
  /** Optional callback for each retry attempt */
  onRetry?: (attempt: number, error: unknown) => void;
  /** Function to determine if error is retryable. Default: all errors are retryable */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Executes an async function with automatic retry on failure
 * Uses exponential backoff between retries
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retries are exhausted
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const result = await withRetry(async () => {
 *   return await supabase.from("orders").insert(orderData);
 * });
 * 
 * // With options
 * const result = await withRetry(
 *   async () => await apiCall(),
 *   {
 *     maxRetries: 5,
 *     onRetry: (attempt) => console.log(`Retry attempt ${attempt}`)
 *   }
 * );
 * ```
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error)) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
};

/**
 * Helper to check if an error is a network error (suitable for retry)
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("failed to fetch") ||
      message.includes("connection") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    );
  }
  return false;
};

/**
 * Pre-configured retry for network operations only
 */
export const withNetworkRetry = <T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, "shouldRetry"> = {}
): Promise<T> => {
  return withRetry(fn, {
    ...options,
    shouldRetry: isNetworkError,
  });
};

export default withRetry;
