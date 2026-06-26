/**
 * Cache Service - Phase 9
 * 
 * Concepts demonstrated:
 * 1. TTL (Time-To-Live) expiration
 * 2. LRU (Least Recently Used) eviction
 * 3. Stale-while-revalidate pattern
 * 4. Cache-aside pattern
 * 5. Thundering herd problem and solutions
 * 6. Cache invalidation strategies
 * 
 * "There are only two hard things in Computer Science:
 *  cache invalidation and naming things." — Phil Karlton
 */

/**
 * In-Memory Cache with TTL and LRU
 * 
 * Why not just use a plain Map?
 * - No automatic expiration (stale data forever)
 * - No size limit (memory grows unbounded)
 * - No access tracking (can't do LRU eviction)
 */
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 60000; // 60 seconds
    
    // Stats for monitoring
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      staleServes: 0
    };
    
    // Cleanup expired entries periodically
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }
  
  /**
   * Get a value from cache
   * 
   * Returns { value, isStale, age } or null if not found
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    const age = Date.now() - entry.createdAt;
    const isExpired = entry.ttl && age > entry.ttl;
    
    if (isExpired) {
      // Entry is expired — should we delete or serve stale?
      if (entry.staleWhileRevalidate) {
        // Serve stale data while allowing background refresh
        this.stats.staleServes++;
        return { value: entry.value, isStale: true, age, key };
      }
      
      // Strict TTL — delete and return null
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Access tracking for LRU
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.stats.hits++;
    return { value: entry.value, isStale: false, age, key };
  }
  
  /**
   * Set a value in cache
   * 
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {Object} options - { ttl, staleWhileRevalidate, tags }
   */
  set(key, value, options = {}) {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const entry = {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      ttl: options.ttl || this.defaultTTL,
      staleWhileRevalidate: options.staleWhileRevalidate || false,
      tags: options.tags || []
    };
    
    this.cache.set(key, entry);
    this.stats.sets++;
  }
  
  /**
   * Delete a specific key
   */
  delete(key) {
    const existed = this.cache.delete(key);
    if (existed) this.stats.deletes++;
    return existed;
  }
  
  /**
   * Invalidate by tag
   * 
   * Why tags?
   * - TTL is time-based (expire after 60s)
   * - Tags are event-based (expire when data changes)
   * 
   * Example: All analytics cache entries tagged "analytics"
   * When new check result arrives, invalidate tag "analytics"
   */
  invalidateByTag(tag) {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
  
  /**
   * Evict Least Recently Used entry
   * 
   * LRU assumes: recently accessed = likely to be accessed again
   * 
   * Tradeoff:
   * - LRU is good for most workloads
   * - LFU (Least Frequently Used) is better for skewed access patterns
   * - Random eviction is simplest but least effective
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && (now - entry.createdAt) > entry.ttl * 2) {
        // Delete entries that are 2x past TTL (stale entries allowed to linger)
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalRequests > 0 
        ? ((this.stats.hits / totalRequests) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  /**
   * Clear all entries
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Destroy cache (cleanup interval)
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Singleton cache instance
export const cache = new MemoryCache({
  maxSize: 500,
  defaultTTL: 60000 // 1 minute
});

/**
 * Cache-Aside Pattern
 * 
 * The most common caching pattern:
 * 1. Check cache first
 * 2. If hit, return cached value
 * 3. If miss, fetch from source
 * 4. Store in cache
 * 5. Return value
 * 
 * Why "aside"? Because the cache sits beside the application,
 * not in front of it (like a read-through cache).
 * 
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data on cache miss
 * @param {Object} options - Cache options
 */
export const cacheAside = async (key, fetchFn, options = {}) => {
  // Step 1: Check cache
  const cached = cache.get(key);
  
  if (cached && !cached.isStale) {
    // Cache hit (fresh)
    return { data: cached.value, source: 'cache', age: cached.age };
  }
  
  if (cached && cached.isStale) {
    // Stale-while-revalidate: return stale data, refresh in background
    // Don't await — let it run in background
    fetchFn()
      .then(newValue => cache.set(key, newValue, options))
      .catch(() => {}); // Silently fail background refresh
    
    return { data: cached.value, source: 'stale-cache', age: cached.age };
  }
  
  // Cache miss — fetch from source
  const value = await fetchFn();
  cache.set(key, value, options);
  return { data: value, source: 'origin', age: 0 };
};

/**
 * Thundering Herd Protection
 * 
 * Problem: Cache expires, 1000 requests all miss cache, all hit DB
 * 
 * Solution: Only ONE request fetches from DB, others wait for result
 * 
 * How it works:
 * 1. First request starts fetch, stores Promise in "in-flight" map
 * 2. Subsequent requests see in-flight Promise, await it
 * 3. When fetch completes, all requests get the same result
 * 4. Remove from in-flight map
 */
const inFlight = new Map();

export const thunderingHerdProtect = async (key, fetchFn, options = {}) => {
  // Check cache first
  const cached = cache.get(key);
  if (cached && !cached.isStale) {
    return { data: cached.value, source: 'cache', age: cached.age };
  }
  
  // Check if someone is already fetching
  if (inFlight.has(key)) {
    // Wait for the in-flight request
    const value = await inFlight.get(key);
    return { data: value, source: 'in-flight', age: 0 };
  }
  
  // We're the first — start fetching
  const fetchPromise = fetchFn()
    .then(value => {
      cache.set(key, value, options);
      inFlight.delete(key);
      return value;
    })
    .catch(error => {
      inFlight.delete(key);
      throw error;
    });
  
  inFlight.set(key, fetchPromise);
  
  const value = await fetchPromise;
  return { data: value, source: 'origin', age: 0 };
};

/**
 * Cache Warming
 * 
 * Pre-populate cache with data before it's needed.
 * 
 * Why warm the cache?
 * - First request after restart is always a cache miss
 * - Cold cache = slow response times
 * - Warming ensures fast responses from the start
 */
export const warmCache = async (key, fetchFn, options = {}) => {
  try {
    const value = await fetchFn();
    cache.set(key, value, options);
    console.log(`[CACHE] Warmed: ${key}`);
  } catch (error) {
    console.error(`[CACHE] Failed to warm: ${key}`, error.message);
  }
};

export default {
  cache,
  cacheAside,
  thunderingHerdProtect,
  warmCache,
  MemoryCache
};
