# How It Works

High-level explanation of the Internet Observatory architecture and design.

---

## System Architecture

```
Browser  ◄──►  Server (Express + Socket.IO)  ◄──►  MongoDB Atlas
  │                    │
  │  REST API          │  HTTP checks to external sites
  │  WebSocket         │
  └────────────────────┘
```

- **Frontend:** React SPA served from Vercel CDN
- **Backend:** Node.js server on Render, handles API + background jobs
- **Database:** MongoDB Atlas for persistence
- **Real-time:** Socket.IO for instant UI updates

---

## Core Concepts

### 1. Website Monitoring Flow

1. User adds a website (URL + name saved to MongoDB)
2. User clicks "Check Now" (or timer fires automatically)
3. Server sends HTTP GET to the target URL
4. Server records: status code, response time, success/failure
5. Server saves result to MongoDB
6. Server broadcasts result via WebSocket
7. Client receives event and updates UI instantly

### 2. WebSocket Real-Time Updates

Instead of polling the server every few seconds, the client opens a persistent WebSocket connection.

- Client subscribes to specific websites/APIs (joins a "room")
- When a check completes, server emits to that room only
- Only affected clients receive the update
- Result: instant UI updates, minimal network traffic

### 3. Timer Queue System

**Problem:** `setInterval` causes pile-up if checks take longer than the interval.

**Solution:** A queue with concurrency control:
- Jobs are added to a queue at specified intervals
- A worker processes jobs from the queue
- Maximum 3 concurrent checks (configurable)
- If queue is full, new jobs wait (backpressure)
- No pile-up, no resource exhaustion

### 4. Circuit Breaker Pattern

Prevents hammering a failing service with repeated requests.

**Three states:**
- **CLOSED:** Normal operation, requests flow through
- **OPEN:** Service is failing, requests are blocked
- **HALF-OPEN:** Testing if service recovered

After 3 consecutive failures, circuit opens for 60 seconds. Then it half-opens to test. If the test succeeds, it closes. If it fails, it opens again.

### 5. Retry with Exponential Backoff

Failed requests are retried with increasing delays:
- Attempt 1: immediate
- Attempt 2: wait 1 second
- Attempt 3: wait 2 seconds
- Attempt 4: wait 4 seconds

Random jitter added to prevent thundering herd (multiple clients retrying at the same time).

### 6. Caching Strategies

| Strategy | How It Works |
|----------|--------------|
| **TTL** | Entries expire after a set duration |
| **LRU** | Evicts least recently used items when cache is full |
| **Stale-while-revalidate** | Returns stale data immediately, refreshes in background |
| **Thundering herd protection** | Prevents multiple simultaneous refreshes for the same key |

### 7. DNS Resolution

Uses DNS-over-HTTPS (DoH) via Cloudflare:
- Works through firewalls (standard DNS often blocked)
- More private (encrypted)
- Follows CNAME chains recursively to show full resolution path

### 8. Web Crawler

BFS (breadth-first) traversal:
- Starts from a seed URL
- Extracts links from each page
- Fetches pages in parallel (batch of 5)
- Respects depth limit (prevents infinite crawl)
- Error isolation (one failed page doesn't stop the crawl)

### 9. Network Diagnostics

Multiple probe types:
- **TCP:** Port scanning, connectivity testing
- **UDP:** DNS, VoIP testing
- **ICMP:** Reachability, latency measurement
- **Traceroute:** Path visualization (TTL-incrementing packets)

### 10. Analytics

MongoDB aggregation pipelines compute:
- Average response time per hour
- Uptime percentage over time
- Check frequency statistics
- Error rate trends

Indexes on `(websiteId, checkedAt)` ensure fast queries.

---

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Queue over setInterval | Prevents pile-up, enables concurrency control |
| Socket.IO rooms | Efficient targeted broadcasts |
| Circuit breaker | Prevents cascading failures |
| DoH over traditional DNS | Works through firewalls, more private |
| BFS for crawler | Level-by-level traversal, natural depth control |
| MongoDB aggregation | Server-side processing, no data transfer overhead |
