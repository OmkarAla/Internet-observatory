/**
 * Scaling Service - Phase 10
 * 
 * Concepts demonstrated:
 * 1. Rate limiting (token bucket, sliding window)
 * 2. Load balancing algorithms
 * 3. Bottleneck identification
 * 4. Horizontal vs vertical scaling
 * 5. State vs stateless servers
 * 6. Sharding concepts
 */

/**
 * Rate Limiter - Token Bucket Algorithm
 * 
 * Problem: Clients can overwhelm server with requests
 * Solution: Limit how many requests each client can make
 * 
 * Token Bucket:
 * - Bucket has capacity N tokens
 * - Tokens are added at rate R per second
 * - Each request consumes 1 token
 * - If bucket empty, request is rejected
 * 
 * Why token bucket over fixed window?
 * - Fixed window: 100 requests per minute allows 100 requests at :00 and 100 at :01
 * - Token bucket: Smooths traffic, limits burst to bucket capacity
 */
class TokenBucket {
  constructor(options = {}) {
    this.capacity = options.capacity || 100;       // Max tokens
    this.refillRate = options.refillRate || 10;    // Tokens per second
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    
    this.stats = {
      allowed: 0,
      rejected: 0,
      totalRequests: 0
    };
  }
  
  /**
   * Try to consume a token
   * @returns {Object} { allowed, tokensRemaining, retryAfter }
   */
  consume() {
    this.refill();
    this.stats.totalRequests++;
    
    if (this.tokens >= 1) {
      this.tokens--;
      this.stats.allowed++;
      return { 
        allowed: true, 
        tokensRemaining: Math.floor(this.tokens),
        retryAfter: 0
      };
    }
    
    this.stats.rejected++;
    const retryAfter = Math.ceil((1 - this.tokens) / this.refillRate);
    return { 
      allowed: false, 
      tokensRemaining: 0,
      retryAfter
    };
  }
  
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
  
  getStats() {
    return {
      ...this.stats,
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate
    };
  }
}

/**
 * Sliding Window Rate Limiter
 * 
 * More accurate than fixed window:
 * - Fixed window: Counts requests in [T, T+60s]
 * - Sliding window: Counts requests in [now-60s, now]
 * 
 * Tradeoff: More memory (store timestamps), more accurate
 */
class SlidingWindow {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;  // 60 seconds
    this.maxRequests = options.maxRequests || 100;
    this.requests = [];  // Array of timestamps
    
    this.stats = {
      allowed: 0,
      rejected: 0
    };
  }
  
  consume() {
    const now = Date.now();
    
    // Remove old requests outside window
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      this.stats.allowed++;
      return { 
        allowed: true, 
        requestsInWindow: this.requests.length,
        maxRequests: this.maxRequests
      };
    }
    
    this.stats.rejected++;
    const oldestInWindow = this.requests[0];
    const retryAfter = Math.ceil((oldestInWindow + this.windowMs - now) / 1000);
    return { 
      allowed: false, 
      requestsInWindow: this.requests.length,
      maxRequests: this.maxRequests,
      retryAfter
    };
  }
  
  getStats() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    return {
      ...this.stats,
      requestsInWindow: this.requests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    };
  }
}

/**
 * Load Balancer Simulation
 * 
 * Algorithms:
 * 1. Round Robin: Distribute requests sequentially
 * 2. Least Connections: Send to server with fewest active connections
 * 3. Weighted: Distribute based on server capacity
 * 4. IP Hash: Same client always goes to same server (sticky sessions)
 */
class LoadBalancer {
  constructor() {
    this.servers = [
      { id: 'server-1', weight: 1, connections: 0, totalRequests: 0, status: 'healthy' },
      { id: 'server-2', weight: 1, connections: 0, totalRequests: 0, status: 'healthy' },
      { id: 'server-3', weight: 2, connections: 0, totalRequests: 0, status: 'healthy' }  // More powerful
    ];
    
    this.currentIndex = 0;
    this.algorithm = 'round-robin';
    
    this.stats = {
      totalDistributed: 0,
      algorithm: this.algorithm
    };
  }
  
  /**
   * Select next server based on algorithm
   */
  distribute() {
    let server;
    
    switch (this.algorithm) {
      case 'round-robin':
        server = this.roundRobin();
        break;
      case 'least-connections':
        server = this.leastConnections();
        break;
      case 'weighted':
        server = this.weighted();
        break;
      case 'ip-hash':
        server = this.ipHash();
        break;
      default:
        server = this.roundRobin();
    }
    
    if (server) {
      server.connections++;
      server.totalRequests++;
      this.stats.totalDistributed++;
    }
    
    return server;
  }
  
  /**
   * Complete a request (reduce connections)
   */
  complete(serverId) {
    const server = this.servers.find(s => s.id === serverId);
    if (server && server.connections > 0) {
      server.connections--;
    }
  }
  
  roundRobin() {
    const healthy = this.servers.filter(s => s.status === 'healthy');
    const server = healthy[this.currentIndex % healthy.length];
    this.currentIndex++;
    return server;
  }
  
  leastConnections() {
    const healthy = this.servers.filter(s => s.status === 'healthy');
    return healthy.reduce((min, s) => 
      s.connections < min.connections ? s : min
    );
  }
  
  weighted() {
    const healthy = this.servers.filter(s => s.status === 'healthy');
    const totalWeight = healthy.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of healthy) {
      random -= server.weight;
      if (random <= 0) return server;
    }
    
    return healthy[healthy.length - 1];
  }
  
  ipHash() {
    // Simulate IP hash with random (real impl would hash actual IP)
    const healthy = this.servers.filter(s => s.status === 'healthy');
    const index = Math.floor(Math.random() * healthy.length);
    return healthy[index];
  }
  
  setAlgorithm(algorithm) {
    this.algorithm = algorithm;
    this.stats.algorithm = algorithm;
    this.currentIndex = 0;
  }
  
  toggleServer(serverId) {
    const server = this.servers.find(s => s.id === serverId);
    if (server) {
      server.status = server.status === 'healthy' ? 'unhealthy' : 'healthy';
    }
  }
  
  getStats() {
    return {
      servers: this.servers,
      algorithm: this.algorithm,
      totalDistributed: this.stats.totalDistributed
    };
  }
}

/**
 * Bottleneck Analyzer
 * 
 * Identifies which resource limits system throughput:
 * - CPU bound: Need more CPU cores
 * - Memory bound: Need more RAM
 * - Network bound: Need more bandwidth
 * - Database bound: Need sharding/replication
 * 
 * Little's Law: L = λW
 * - L = average number of requests in system
 * - λ = arrival rate (requests/second)
 * - W = average time in system (response time)
 */
class BottleneckAnalyzer {
  constructor() {
    this.metrics = {
      requests: { total: 0, perSecond: 0, history: [] },
      responseTime: { avg: 0, p50: 0, p95: 0, p99: 0, history: [] },
      cpu: { usage: 0, history: [] },
      memory: { used: 0, total: 0, history: [] },
      database: { queries: 0, avgQueryTime: 0, connections: 0, history: [] }
    };
    
    this.windowSize = 60; // Keep 60 data points
  }
  
  recordRequest(responseTime) {
    const now = Date.now();
    
    this.metrics.requests.total++;
    this.metrics.requests.history.push({ time: now, value: 1 });
    
    this.metrics.responseTime.history.push({ time: now, value: responseTime });
    this.trimHistory('responseTime');
    
    this.updateResponseTimeStats();
    this.updateRequestsPerSecond();
  }
  
  recordDatabase(queryTime) {
    const now = Date.now();
    this.metrics.database.queries++;
    this.metrics.database.history.push({ time: now, value: queryTime });
    this.metrics.database.avgQueryTime = 
      this.metrics.database.history.reduce((sum, h) => sum + h.value, 0) / 
      this.metrics.database.history.length;
  }
  
  updateResponseTimeStats() {
    const times = this.metrics.responseTime.history.map(h => h.value).sort((a, b) => a - b);
    if (times.length === 0) return;
    
    this.metrics.responseTime.avg = times.reduce((a, b) => a + b, 0) / times.length;
    this.metrics.responseTime.p50 = times[Math.floor(times.length * 0.5)];
    this.metrics.responseTime.p95 = times[Math.floor(times.length * 0.95)];
    this.metrics.responseTime.p99 = times[Math.floor(times.length * 0.99)];
  }
  
  updateRequestsPerSecond() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    this.metrics.requests.perSecond = 
      this.metrics.requests.history.filter(h => h.time > oneSecondAgo).length;
  }
  
  trimHistory(metric) {
    if (this.metrics[metric].history.length > this.windowSize) {
      this.metrics[metric].history.shift();
    }
  }
  
  /**
   * Identify the bottleneck
   * 
   * Heuristics:
   * - If response time p95 > 1000ms: Database or CPU bound
   * - If memory usage > 80%: Memory bound
   * - If database connections > 80% of pool: Database bound
   * - If CPU > 80%: CPU bound
   */
  analyze() {
    const bottlenecks = [];
    
    if (this.metrics.responseTime.p95 > 1000) {
      bottlenecks.push({
        type: 'response-time',
        severity: 'high',
        message: `P95 response time is ${this.metrics.responseTime.p95}ms (target: <500ms)`,
        solution: 'Check database queries, add indexes, consider caching'
      });
    }
    
    if (this.metrics.database.avgQueryTime > 100) {
      bottlenecks.push({
        type: 'database',
        severity: 'high',
        message: `Average query time is ${this.metrics.database.avgQueryTime.toFixed(1)}ms`,
        solution: 'Add indexes, optimize queries, consider read replicas'
      });
    }
    
    if (bottlenecks.length === 0) {
      bottlenecks.push({
        type: 'none',
        severity: 'low',
        message: 'System is healthy',
        solution: 'Continue monitoring'
      });
    }
    
    return {
      bottlenecks,
      metrics: this.getMetrics(),
      littleLaw: this.calculateLittleLaw()
    };
  }
  
  /**
   * Little's Law: L = λW
   * 
   * L = requests in system
   * λ = arrival rate
   * W = response time
   */
  calculateLittleLaw() {
    const lambda = this.metrics.requests.perSecond;
    const W = this.metrics.responseTime.avg / 1000; // Convert to seconds
    const L = lambda * W;
    
    return {
      arrivalRate: lambda.toFixed(2) + ' req/s',
      avgResponseTime: (W * 1000).toFixed(1) + 'ms',
      requestsInSystem: L.toFixed(2),
      interpretation: L > 100 
        ? 'High concurrency — consider horizontal scaling'
        : L > 10
        ? 'Moderate concurrency — current setup may be sufficient'
        : 'Low concurrency — system is underutilized'
    };
  }
  
  getMetrics() {
    return {
      requests: {
        total: this.metrics.requests.total,
        perSecond: this.metrics.requests.perSecond
      },
      responseTime: {
        avg: this.metrics.responseTime.avg?.toFixed(1) || 0,
        p50: this.metrics.responseTime.p50 || 0,
        p95: this.metrics.responseTime.p95 || 0,
        p99: this.metrics.responseTime.p99 || 0
      },
      database: {
        queries: this.metrics.database.queries,
        avgQueryTime: this.metrics.database.avgQueryTime?.toFixed(1) || 0
      }
    };
  }
}

// Singleton instances
export const rateLimiter = new TokenBucket({ capacity: 100, refillRate: 10 });
export const slidingWindow = new SlidingWindow({ windowMs: 60000, maxRequests: 100 });
export const loadBalancer = new LoadBalancer();
export const bottleneckAnalyzer = new BottleneckAnalyzer();

export default {
  TokenBucket,
  SlidingWindow,
  LoadBalancer,
  BottleneckAnalyzer,
  rateLimiter,
  slidingWindow,
  loadBalancer,
  bottleneckAnalyzer
};
