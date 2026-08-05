# How It Works

A detailed explanation of the Internet Observatory architecture, data flows, and key design decisions.

---

## Table of Contents

- [System Overview](#system-overview)
- [Data Flow: Website Check](#data-flow-website-check)
- [WebSocket Real-Time Updates](#websocket-real-time-updates)
- [Timer Queue System](#timer-queue-system)
- [Circuit Breaker Pattern](#circuit-breaker-pattern)
- [Retry with Backoff](#retry-with-backoff)
- [Caching Strategies](#caching-strategies)
- [DNS Resolution](#dns-resolution)
- [Web Crawler](#web-crawler)
- [Network Diagnostics](#network-diagnostics)
- [Analytics Aggregation](#analytics-aggregation)

---

## System Overview

```
Browser                    Server                     Database
  │                          │                           │
  │  POST /api/websites      │                           │
  │  { url, name }           │                           │
  │ ────────────────────────►│                           │
  │                          │  Save website config      │
  │                          │ ─────────────────────────►│
  │                          │                           │
  │  POST /api/websites/:id/check                       │
  │ ────────────────────────►│                           │
  │                          │  HTTP GET to url          │
  │                          │ ────────────────────────► │ (external)
  │                          │  ◄────────────────────────│
  │                          │                           │
  │                          │  Save check result        │
  │                          │ ─────────────────────────►│
  │                          │                           │
  │                          │  broadcastCheckResult()   │
  │  ◄───────────────────────│  Socket.IO emit           │
  │  check:result event      │                           │
  │                          │                           │
  │  Update UI instantly     │                           │
  ▼                          ▼                           ▼
```

---

## Data Flow: Website Check

When you click "Check Now" on a website:

**1. Client sends request**
```javascript
// client/src/services/api.js
export const triggerCheck = (id) => 
  api.post(`/api/websites/${id}/check`);
```

**2. Server performs HTTP check**
```javascript
// server/routes/checks.js
const response = await axios.get(website.url, {
  timeout: 10000,
  validateStatus: () => true  // Don't throw on 4xx/5xx
});

const success = response.status >= 200 && response.status < 300;
```

**3. Server saves result to MongoDB**
```javascript
const result = new CheckResult({
  websiteId: website._id,
  status: response.status,
  success,
  responseTime: Date.now() - startTime,
  checkedAt: new Date()
});
await result.save();
```

**4. Server broadcasts via WebSocket**
```javascript
broadcastCheckResult(req.params.websiteId, 'website', result);
```

**5. Client receives and updates UI**
```javascript
// In WebsiteList.jsx
onCheckResult(({ id, type, result }) => {
  setLiveResults(prev => ({
    ...prev,
    [id]: [result, ...(prev[id] || [])]
  }));
});
```

---

## WebSocket Real-Time Updates

Socket.IO provides instant updates without polling.

**Server setup:**
```javascript
// server/services/socketService.js
io.on('connection', (socket) => {
  socket.on('subscribe', ({ id, type }) => {
    socket.join(`${type}:${id}`);  // Join a room
  });
});

export const broadcastCheckResult = (id, type, result) => {
  io.to(`${type}:${id}`).emit('check:result', { id, type, result });
};
```

**Client subscription:**
```javascript
// When WebsiteList mounts, subscribe to all websites
useEffect(() => {
  websites.forEach(w => subscribe(w._id, 'website'));
  return () => websites.forEach(w => unsubscribe(w._id, 'website'));
}, [websites]);
```

**Key concept:** Each website/API gets its own "room". When a check completes, only clients monitoring that specific entity receive the update.

---

## Timer Queue System

Instead of `setInterval` (which causes pile-up), the app uses a queue-based system.

**Problem with setInterval:**
```
Timer fires every 30s
Check takes 5s
├── t=0s: Check starts
├── t=5s: Check done
├── t=30s: Next check starts
└── But if check takes 35s: TWO checks pile up!
```

**Queue solution:**
```javascript
// server/services/timerManager.js
const queue = [];
let activeJobs = 0;
const MAX_CONCURRENT = 3;

const workerLoop = async () => {
  while (workerRunning) {
    if (activeJobs >= MAX_CONCURRENT) {
      await sleep(100);  // Wait for slot
      continue;
    }
    if (queue.length === 0) {
      await sleep(200);  // Wait for work
      continue;
    }
    const job = queue.shift();
    processJob(job);  // Don't await — let concurrency control handle it
  }
};
```

**Result:** Maximum 3 concurrent checks, no pile-up, automatic backpressure when busy.

---

## Circuit Breaker Pattern

Prevents cascading failures by stopping requests to a failing service.

**States:**
```
CLOSED (normal) ──► OPEN (failing) ──► HALF-OPEN (testing)
     ▲                                        │
     └────────────────────────────────────────┘
```

**Implementation:**
```javascript
// server/services/circuitBreaker.js
const circuitStates = new Map();  // id → { state, failures, lastFailure }

export const shouldAllowRequest = (id) => {
  const circuit = circuitStates.get(id);
  if (!circuit) return true;
  
  if (circuit.state === 'OPEN') {
    // Check if enough time passed to try again
    if (Date.now() - circuit.lastFailure > 60000) {
      circuit.state = 'HALF_OPEN';
      return true;
    }
    return false;  // Block request
  }
  return true;
};

export const recordFailure = (id) => {
  const circuit = circuitStates.get(id) || { failures: 0 };
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= 3) {
    circuit.state = 'OPEN';  // Trip after 3 failures
  }
  circuitStates.set(id, circuit);
};
```

---

## Retry with Backoff

Automatically retries failed requests with increasing delays.

```javascript
// server/services/retry.js
export const retryWithBackoff = async (fn, options) => {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      console.log(`Retry ${attempt + 1} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};
```

**Timing:** 1s → 2s → 4s → 8s (with random jitter to prevent thundering herd)

---

## Caching Strategies

### TTL (Time-To-Live)
Entries expire after a set duration:
```javascript
if (Date.now() - entry.timestamp > entry.ttl) {
  cache.delete(key);  // Expired
}
```

### LRU (Least Recently Used)
Evicts oldest accessed items when cache is full:
```javascript
// When cache is full
const oldest = [...cache.entries()]
  .sort((a, b) => a[1].lastAccess - b[1].lastAccess)[0];
cache.delete(oldest[0]);
```

### Stale-While-Revalidate
Returns stale data immediately, refreshes in background:
```javascript
if (isStale(entry)) {
  // Return stale data now
  return entry.data;
  // But trigger background refresh
  refreshCache(key);
}
```

### Thundering Herd Protection
Prevents multiple simultaneous refreshes for the same key:
```javascript
const refreshLocks = new Map();

const refreshCache = async (key) => {
  if (refreshLocks.has(key)) return;  // Already refreshing
  
  refreshLocks.set(key, true);
  try {
    const freshData = await fetchFromSource(key);
    cache.set(key, { data: freshData, timestamp: Date.now() });
  } finally {
    refreshLocks.delete(key);
  }
};
```

---

## DNS Resolution

Uses DNS-over-HTTPS (DoH) for privacy and firewall bypass.

```javascript
// server/services/dohClient.js
export const resolveDoh = async (domain, type = 'A') => {
  const url = `https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`;
  
  const response = await axios.get(url, {
    headers: { 'Accept': 'application/dns-json' }
  });
  
  return response.data.Answer || [];
};
```

**Resolution chain:** Follows CNAME records recursively to show the full path from domain to IP.

---

## Web Crawler

BFS traversal with parallel fetching and error isolation.

```javascript
// server/services/crawlerService.js
const crawl = async (startUrl, maxDepth = 2) => {
  const queue = [{ url: startUrl, depth: 0 }];
  const visited = new Set();
  const results = [];
  
  while (queue.length > 0) {
    // Fetch in parallel (batch of 5)
    const batch = queue.splice(0, 5);
    const promises = batch.map(async ({ url, depth }) => {
      try {
        const response = await axios.get(url, { timeout: 5000 });
        const links = extractLinks(response.data);
        return { url, status: response.status, links, depth };
      } catch (error) {
        return { url, status: 'error', error: error.message, depth };
      }
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Add new links to queue
    for (const result of batchResults) {
      if (result.links && result.depth < maxDepth) {
        for (const link of result.links) {
          if (!visited.has(link)) {
            visited.add(link);
            queue.push({ url: link, depth: result.depth + 1 });
          }
        }
      }
    }
  }
  
  return results;
};
```

**Key features:**
- Parallel fetching (5 concurrent requests)
- Depth limiting (prevents infinite crawl)
- Error isolation (one failed page doesn't stop the crawl)
- Deduplication (visits each URL only once)

---

## Network Diagnostics

Multiple probe types for different use cases:

| Protocol | Use Case | Implementation |
|----------|----------|----------------|
| TCP | Port scanning, connectivity | `net.connect()` with timeout |
| UDP | DNS, VoIP testing | `dgram.createSocket()` |
| ICMP | Reachability, latency | Raw socket or `ping` command |
| Traceroute | Path visualization | TTL-incrementing UDP packets |

---

## Analytics Aggregation

MongoDB aggregation pipelines for real-time analytics:

```javascript
// Average response time per hour
const pipeline = [
  { $match: { websiteId, checkedAt: { $gte: startTime } } },
  { $group: {
    _id: { $hour: '$checkedAt' },
    avgResponseTime: { $avg: '$responseTime' },
    checkCount: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
];

const results = await CheckResult.aggregate(pipeline);
```

**Indexes for performance:**
```javascript
CheckResult.schema.index({ websiteId: 1, checkedAt: -1 });
CheckResult.schema.index({ success: 1 });
```

---

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Queue over setInterval | Prevents pile-up, enables concurrency control |
| Socket.IO rooms | Efficient targeted broadcasts (only relevant clients update) |
| Circuit breaker | Prevents hammering a failing service |
| DoH over traditional DNS | Works through firewalls, more private |
| BFS for crawler | Level-by-level traversal, natural depth control |
| MongoDB aggregation | Server-side processing, no data transfer overhead |
