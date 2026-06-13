/**
 * Retry a function with exponential backoff
 * 
 * Why exponential backoff?
 * - If an API is struggling, immediate retries make it worse
 * - Waiting longer between retries gives the API time to recover
 * - Jitter prevents thundering herd (100 users retrying at same time)
 * 
 * Tradeoff: Longer waits = slower failure detection
 *           Shorter waits = more load on struggling API
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff and jitter
 * 
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay cap
 * @returns {number} Delay in milliseconds
 */
export const calculateDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter (random 0-50% of delay)
  // Why jitter? Without it, all retries happen at exact same time
  const jitter = cappedDelay * Math.random() * 0.5;
  
  return cappedDelay + jitter;
};

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Configuration
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.baseDelay - Base delay in ms
 * @param {number} options.maxDelay - Maximum delay cap in ms
 * @param {Function} options.onRetry - Callback on each retry
 * @returns {Promise} Result of the function
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry = () => {}
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Try the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay for this attempt
      const delay = calculateDelay(attempt, baseDelay, maxDelay);
      
      // Notify caller about retry
      onRetry({
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: error.message
      });
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
};

export default retryWithBackoff;
