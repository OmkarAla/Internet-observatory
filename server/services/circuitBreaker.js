/**
 * Circuit Breaker Pattern
 * 
 * Problem: If an API is down, retrying wastes resources.
 *          If 1000 users all retry a dead API, that's 3000 wasted requests.
 * 
 * Solution: Track failure rate. When it exceeds threshold, "trip" the circuit.
 *           Stop sending requests. Return failure immediately.
 *           Periodically try again to see if API recovered.
 * 
 * States:
 * - CLOSED: Normal operation. Requests go through.
 * - OPEN: Circuit tripped. Requests fail immediately.
 * - HALF_OPEN: Testing recovery. Allow one request through.
 * 
 * Tradeoff:
 * - Fast trip = fewer wasted requests, but may trip on transient failures
 * - Slow trip = more resilient, but wastes resources during outages
 */

// Circuit breaker states
export const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Circuit tripped, failing fast
  HALF_OPEN: 'HALF_OPEN' // Testing recovery
};

// In-memory circuit breaker store
// In production, use Redis for distributed systems
const circuitBreakers = new Map();

/**
 * Get or create circuit breaker for an API
 */
export const getCircuitBreaker = (apiId) => {
  const key = apiId.toString();
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
      config: {
        failureThreshold: 5,      // Trip after 5 failures
        successThreshold: 3,      // Close after 3 successes
        timeout: 60000,           // Try again after 60 seconds
        monitoringWindow: 300000  // Reset failure count after 5 minutes
      }
    });
  }
  return circuitBreakers.get(key);
};

/**
 * Record a success
 */
export const recordSuccess = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  
  if (breaker.state === CircuitState.HALF_OPEN) {
    // Testing recovery - this success counts more
    breaker.successCount++;
    
    if (breaker.successCount >= breaker.config.successThreshold) {
      // API recovered! Close the circuit
      breaker.state = CircuitState.CLOSED;
      breaker.failureCount = 0;
      breaker.successCount = 0;
      breaker.lastStateChange = Date.now();
      console.log(`Circuit CLOSED for API ${apiId}`);
    }
  } else if (breaker.state === CircuitState.CLOSED) {
    // Normal operation - reset failure count on success
    breaker.failureCount = 0;
  }
};

/**
 * Record a failure
 */
export const recordFailure = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  
  if (breaker.state === CircuitState.HALF_OPEN) {
    // Testing recovery - this failure means API is still broken
    breaker.state = CircuitState.OPEN;
    breaker.lastFailureTime = Date.now();
    breaker.lastStateChange = Date.now();
    breaker.successCount = 0;
    console.log(`Circuit OPENED again for API ${apiId}`);
    return;
  }
  
  // Check if we're outside the monitoring window
  const now = Date.now();
  if (breaker.lastFailureTime && 
      (now - breaker.lastFailureTime) > breaker.config.monitoringWindow) {
    // Reset failure count - old failures don't count
    breaker.failureCount = 0;
  }
  
  breaker.failureCount++;
  breaker.lastFailureTime = Date.now();
  
  // Check if we should trip the circuit
  if (breaker.failureCount >= breaker.config.failureThreshold) {
    breaker.state = CircuitState.OPEN;
    breaker.lastStateChange = Date.now();
    console.log(`Circuit OPENED for API ${apiId} after ${breaker.failureCount} failures`);
  }
};

/**
 * Check if a request should be allowed
 */
export const shouldAllowRequest = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  
  switch (breaker.state) {
    case CircuitState.CLOSED:
      // Normal operation - allow request
      return true;
    
    case CircuitState.OPEN:
      // Circuit tripped - check if enough time has passed to try again
      const timeSinceOpen = Date.now() - breaker.lastStateChange;
      if (timeSinceOpen >= breaker.config.timeout) {
        // Timeout expired - allow one test request
        breaker.state = CircuitState.HALF_OPEN;
        breaker.successCount = 0;
        console.log(`Circuit HALF_OPEN for API ${apiId} - testing recovery`);
        return true;
      }
      // Still in timeout - reject request
      return false;
    
    case CircuitState.HALF_OPEN:
      // Testing recovery - allow request (but it's the test request)
      return true;
    
    default:
      return true;
  }
};

/**
 * Get circuit breaker status for display
 */
export const getCircuitStatus = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  return {
    state: breaker.state,
    failureCount: breaker.failureCount,
    successCount: breaker.successCount,
    lastFailureTime: breaker.lastFailureTime,
    lastStateChange: breaker.lastStateChange
  };
};

export default {
  CircuitState,
  getCircuitBreaker,
  recordSuccess,
  recordFailure,
  shouldAllowRequest,
  getCircuitStatus
};
