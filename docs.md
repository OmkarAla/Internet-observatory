# Internet Observatory — Technical Documentation

Detailed technical documentation for developers maintaining or extending this project.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  Vercel CDN  ·  Vite  ·  TailwindCSS  ·  Socket.IO Client  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    REST API + WebSocket
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Server (Express)                         │
│  Routes  ·  Services  ·  Socket.IO  ·  Timer Queue          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Mongoose ODM
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   MongoDB Atlas                              │
│  Websites  ·  APIs  ·  CheckResults  ·  ApiCheckResults     │
└─────────────────────────────────────────────────────────────┘
```

The frontend is a static React SPA served from Vercel's CDN. It communicates with the backend via REST API calls and receives real-time updates through a Socket.IO WebSocket connection. The backend is a Node.js/Express server that handles HTTP requests, runs background health checks on a queue system, and stores results in MongoDB Atlas.

---

## Server Architecture

### Entry Point (`server/index.js`)

Startup sequence:

1. Configure DNS servers (`8.8.8.8`, `8.8.4.4`, and two regional servers)
2. Create Express app wrapped in `http.createServer()`
3. Apply middleware: `helmet()` (security headers), `cors()` (configurable origins), `express.json()`
4. Mount route modules under `/api` prefix
5. Add `/health` endpoint, 404 handler, error handler
6. Connect to MongoDB
7. Initialize Socket.IO
8. Ensure database indexes
9. Load recurring timers from database
10. Start listening on port (default 3001)

Graceful shutdown handles `SIGTERM` and `SIGINT`, closing the HTTP server with a 10-second force-kill timeout.

### Routes

All routes are mounted under `/api`. Two route files share the `/api/websites` prefix: `websites.js` handles CRUD, `checks.js` handles health check operations.

| Route File | Prefix | Purpose |
|------------|--------|---------|
| `websites.js` | `/api/websites` | Website CRUD, interval configuration |
| `checks.js` | `/api/websites` | Website health checks, check history |
| `apis.js` | `/api/apis` | API endpoint CRUD, checks, circuit breaker |
| `dns.js` | `/api/dns` | DNS-over-HTTPS resolution |
| `crawler.js` | `/api/crawler` | Single-page and BFS web crawling |
| `network.js` | `/api/network` | TCP/UDP/ICMP diagnostics |
| `analytics.js` | `/api/analytics` | Aggregation-based analytics queries |
| `cache.js` | `/api/cache` | Cache pattern demonstrations |
| `scaling.js` | `/api/scaling` | Rate limiting, load balancing, bottleneck analysis |

### Models

| Model | Collection | Key Fields |
|-------|------------|------------|
| `Website` | `websites` | `url`, `name`, `checkInterval` (default null) |
| `Api` | `apis` | `name`, `url`, `method`, `headers`, `expectedStatus`, `timeout`, `retries`, `checkInterval` |
| `CheckResult` | `checkresults` | `websiteId` (ref), `status`, `success`, `responseTime`, `error`, `checkedAt` |
| `ApiCheckResult` | `apicheckresults` | `apiId` (ref), `status`, `success`, `responseTime`, `error`, `checkedAt` |

### Services

| Service | Responsibility |
|---------|---------------|
| `socketService.js` | Socket.IO server setup, room-based event broadcasting |
| `timerManager.js` | Queue-based recurring check scheduler with concurrency control |
| `retry.js` | Exponential backoff with jitter for retrying failed requests |
| `circuitBreaker.js` | Three-state circuit breaker (CLOSED/OPEN/HALF_OPEN) |
| `dohClient.js` | DNS-over-HTTPS queries to Google, Cloudflare, Quad9 |
| `crawlerService.js` | BFS web crawler with parallel batch fetching |
| `networkService.js` | Low-level TCP/UDP/ICMP network diagnostics |
| `analyticsService.js` | MongoDB aggregation pipelines for analytics |
| `cacheService.js` | In-memory cache with LRU eviction, TTL, stale-while-revalidate |
| `scalingService.js` | Token bucket, sliding window, load balancer, bottleneck analyzer |

---

## Client Architecture

### Entry Point

`main.jsx` renders `<App />` inside `React.StrictMode` into the `#root` DOM element. TailwindCSS is loaded via `index.css`.

### App Component (`App.jsx`)

Central state management for the application:

- `websites` / `apis` — lists of monitored entities
- `loading` — shared loading state for initial fetches
- `websiteError` / `apiError` — error messages for user feedback
- `activeTab` — controls which feature tab is visible

The 8 tabs: Websites, APIs, DNS Observatory, Web Crawler, Network Diagnostics, Analytics, Cache, Scaling.

CRUD operations follow a consistent pattern: call API service function, then re-fetch the list to stay in sync with the server.

### Component Communication

```
App.jsx
  ├── WebsiteForm          (props: onSubmit)
  ├── WebsiteList           (props: websites, onDelete, onCheck, subscribe, unsubscribe, onCheckResult)
  │     ├── CheckHistory
  │     ├── StatusAlert
  │     └── AutoCheckToggle
  ├── ApiForm              (props: onSubmit)
  ├── ApiList               (props: apis, onDelete, onCheck, subscribe, unsubscribe, onCheckResult)
  │     ├── ApiCheckHistory
  │     ├── StatusAlert
  │     └── AutoCheckToggle
  ├── DnsResolver           (self-contained)
  ├── WebCrawler            (self-contained)
  ├── NetworkDiagnostics    (self-contained)
  ├── AnalyticsDashboard    (self-contained)
  ├── CacheDemo             (self-contained)
  └── ScalingDemo           (self-contained)
```

Website and API tabs receive props from App and use the shared WebSocket connection. The remaining 6 tabs are fully self-contained — they manage their own state and make direct Axios calls to the server.

### WebSocket Integration (`useSocket.js`)

Creates a single Socket.IO client connection to `config.wsUrl`. Returns four functions:

- `subscribe(id, type)` — joins a room for a specific website/API
- `unsubscribe(id, type)` — leaves the room
- `onCheckResult(callback)` — listens for `check:result` events
- `onCircuitChange(callback)` — listens for `circuit:change` events (currently unused)

Each `WebsiteList`/`ApiList` component subscribes to rooms for all its entities on mount. When a check completes, the server emits to the specific room, and only the relevant client receives the update.

### API Client (`services/api.js`)

Axios instance with base URL `${config.apiUrl}/api`. Exported functions:

| Function | Method | Endpoint |
|----------|--------|----------|
| `getWebsites()` | GET | `/websites` |
| `addWebsite(data)` | POST | `/websites` |
| `deleteWebsite(id)` | DELETE | `/websites/:id` |
| `triggerCheck(id)` | POST | `/websites/:id/check` |
| `getCheckHistory(id)` | GET | `/websites/:id/checks` |
| `getApis()` | GET | `/apis` |
| `addApi(data)` | POST | `/apis` |
| `deleteApi(id)` | DELETE | `/apis/:id` |
| `triggerApiCheck(id)` | POST | `/apis/:id/check` |
| `getApiCheckHistory(id)` | GET | `/apis/:id/checks` |
| `setWebsiteInterval(id, interval)` | PATCH | `/websites/:id/interval` |
| `setApiInterval(id, interval)` | PATCH | `/apis/:id/interval` |

Note: The self-contained components (DnsResolver, WebCrawler, etc.) bypass `api.js` and construct their own URLs using `config.apiUrl` directly.

### Environment Config (`config.js`)

Reads from Vite environment variables:
- `VITE_API_URL` — Backend API base URL (defaults to empty string for same-origin)
- `VITE_WS_URL` — WebSocket server URL (defaults to `window.location.origin`)

---

## Key Data Flows

### Website Health Check

```
1. Client: POST /api/websites/:id/check
2. Server: Fetch website URL via HTTP GET (10s timeout)
3. Server: Record status code, response time, success/failure
4. Server: Save CheckResult to MongoDB
5. Server: broadcastCheckResult(id, 'website', result) via Socket.IO
6. Client: Receives check:result event, updates liveResults state
7. Client: Re-renders component with new result
```

### API Health Check with Circuit Breaker

```
1. Client: POST /api/apis/:id/check
2. Server: Check circuit breaker state (shouldAllowRequest)
   - If OPEN: return immediate failure
   - If CLOSED/HALF_OPEN: proceed
3. Server: Execute HTTP request with retryWithBackoff (respects method, headers, timeout, retries)
4. Server: Validate response status matches expectedStatus
5. Server: Validate JSON if Content-Type is application/json
6. Server: Record success/failure on circuit breaker
7. Server: Save ApiCheckResult to MongoDB
8. Server: broadcastCheckResult(id, 'api', result) via Socket.IO
```

### Recurring Check Scheduling

```
1. On server startup: loadTimersFromDB() queries Website/Api with checkInterval != null
2. For each: startTimer(id, type, intervalMs)
   - Clears any existing timer for that key
   - Adds job to queue at specified interval via recursive setTimeout
   - Starts worker loop if not running
3. Worker loop processes jobs:
   - If activeJobs >= MAX_CONCURRENT (3): wait 100ms
   - If queue empty: wait 200ms
   - Otherwise: shift job, call processJob() (non-awaited)
4. processJob: increment activeJobs, run check function, broadcast result, decrement activeJobs
```

---

## Real-Time Updates

Socket.IO rooms provide targeted broadcasts:

- Client subscribes to room `{type}:{id}` (e.g., `website:abc123`)
- When check completes, server emits `check:result` to that room only
- Only clients monitoring that specific entity receive the update
- No polling, no unnecessary network traffic

The server also defines `broadcastCircuitChange(id, state)` which emits to all connected clients, but this function is not currently called anywhere in the codebase.

---

## Timer Queue System

The timer system replaces `setInterval` with a queue-based approach to prevent pile-up.

**Why not setInterval?** If a check takes 35 seconds but the interval is 30 seconds, `setInterval` would fire a second check while the first is still running. Over time, checks pile up and exhaust resources.

**Queue solution:**
- Jobs are added to an array at specified intervals
- A worker loop processes jobs one at a time (up to 3 concurrent)
- If the queue is full or max concurrency is reached, new jobs wait
- Backpressure is automatic — no resource exhaustion

The queue system is implemented in `timerManager.js`. A separate `queueService.js` exists as an educational demo but is not used by the application.

---

## Circuit Breaker

Three-state pattern preventing cascading failures:

| State | Behavior |
|-------|----------|
| **CLOSED** | Normal operation. Failures are counted. Resets on success. |
| **OPEN** | After 5 consecutive failures, requests are blocked for 60 seconds. |
| **HALF-OPEN** | After timeout, one test request is allowed. 3 consecutive successes return to CLOSED. Any failure returns to OPEN. |

Configuration: `failureThreshold: 5`, `successThreshold: 3`, `timeout: 60000ms`, `monitoringWindow: 300000ms` (5 minutes — old failures are forgotten).

State is stored in an in-memory `Map`. For distributed systems, this would need to be backed by Redis.

---

## Caching

In-memory cache (`cacheService.js`) with LRU eviction and configurable TTL.

**Patterns implemented:**

| Pattern | How It Works |
|---------|--------------|
| **TTL** | Entries expire after a configurable duration (default 60s) |
| **LRU** | When cache is full, least recently accessed entry is evicted |
| **Stale-while-revalidate** | Returns stale data immediately, refreshes in background |
| **Cache-aside** | On miss: fetch from source, store in cache. On hit: return cached. |
| **Thundering herd protection** | Prevents 1000 simultaneous cache misses from hitting the origin |
| **Tag-based invalidation** | Invalidate all entries with a given tag |

Cache stats tracked: hits, misses, sets, deletes, evictions, stale serves.

---

## Analytics

MongoDB aggregation pipelines compute analytics in the database (no data transfer overhead):

- **Uptime:** Percentage of successful checks over a time window
- **Response time stats:** Average, min, max, standard deviation
- **Hourly time-series:** `$dateTrunc` groups checks by hour
- **Error breakdown:** Groups failed checks by error message
- **Dashboard summary:** `$facet` runs multiple aggregations in a single pass

Indexes for performance:
- `{websiteId/apiId, checkedAt}` — primary query pattern
- `{checkedAt}` — time-range queries
- `{success}` — filtering by status

---

## Configuration

### Server Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `PORT` | No | `3001` | Server port |
| `CORS_ORIGINS` | No | `localhost:5173` | Comma-separated allowed origins |
| `NODE_ENV` | No | `development` | `production` masks error messages |

### Client Environment Variables (Vercel)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `""` (same origin) | Backend API URL |
| `VITE_WS_URL` | No | `window.location.origin` | WebSocket server URL |

---

## API Reference

### Websites

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/websites` | — | Array of website objects |
| POST | `/api/websites` | `{ url, name }` | Created website |
| DELETE | `/api/websites/:id` | — | `{ message }` |
| PATCH | `/api/websites/:id/interval` | `{ checkInterval }` | Updated website |
| POST | `/api/websites/:id/check` | — | CheckResult object |
| GET | `/api/websites/:id/checks` | — | Array of CheckResult objects (last 50) |

### APIs

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/apis` | — | Array of API objects with circuit breaker status |
| POST | `/api/apis` | `{ name, url, method, headers, expectedStatus, timeout, retries }` | Created API |
| DELETE | `/api/apis/:id` | — | `{ message }` |
| PATCH | `/api/apis/:id/interval` | `{ checkInterval }` | Updated API |
| POST | `/api/apis/:id/check` | — | ApiCheckResult object |
| GET | `/api/apis/:id/checks` | — | Array of ApiCheckResult objects (last 50) |

### DNS

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/api/dns/resolve` | `domain`, `types` (optional) | Resolution results with chain |

Valid types: `A`, `AAAA`, `MX`, `NS`, `CNAME`, `TXT`, `SOA`

### Crawler

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/api/crawler/crawl` | `url` | Single page result with links |
| GET | `/api/crawler/bfs` | `url`, `depth`, `maxPages`, `sameDomain`, `concurrency`, `delay` | BFS crawl results |

### Network

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/network/tcp-connect` | `{ host, port, timeout }` | Connection status + latency |
| POST | `/api/network/port-scan` | `{ host, ports, timeout }` | Per-port results |
| POST | `/api/network/udp-dns` | `{ domain, server, timeout }` | Raw DNS response |
| POST | `/api/network/ping` | `{ host, count, timeout }` | ICMP ping results |
| POST | `/api/network/traceroute` | `{ host, maxHops, timeout }` | Traceroute hops |
| POST | `/api/network/latency` | `{ host, port, count }` | Latency statistics (min/max/avg/median) |

### Analytics

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/api/analytics/dashboard` | `hours` | Full dashboard summary |
| GET | `/api/analytics/uptime` | `type`, `id`, `hours` | Uptime percentage |
| GET | `/api/analytics/response-time` | `type`, `id`, `hours` | Response time stats |
| GET | `/api/analytics/hourly` | `type`, `id`, `hours` | Hourly time-series |
| GET | `/api/analytics/errors` | `type`, `id`, `hours` | Error breakdown |

### Cache

| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/cache/stats` | — | Cache statistics |
| POST | `/api/cache/clear` | — | `{ message }` |
| POST | `/api/cache/invalidate` | `{ tag }` | `{ message }` |
| GET | `/api/cache/demo/ttl` | — | TTL demo result |
| GET | `/api/cache/demo/stale` | — | Stale-while-revalidate demo |
| GET | `/api/cache/demo/thundering-herd` | — | Thundering herd demo |
| GET | `/api/cache/demo/analytics` | — | Cached analytics demo |

### Scaling

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/scaling/rate-limit` | — | Token bucket result |
| GET | `/api/scaling/rate-limit/stats` | — | Token bucket stats |
| POST | `/api/scaling/sliding-window` | — | Sliding window result |
| GET | `/api/scaling/sliding-window/stats` | — | Sliding window stats |
| POST | `/api/scaling/load-balance` | — | Load balancer result |
| POST | `/api/scaling/load-balance/complete` | `{ serverId }` | Updated stats |
| POST | `/api/scaling/load-balance/algorithm` | `{ algorithm }` | Updated stats |
| POST | `/api/scaling/load-balance/toggle` | `{ serverId }` | Updated stats |
| GET | `/api/scaling/load-balance/stats` | — | Load balancer stats |
| POST | `/api/scaling/record-request` | `{ responseTime }` | `{ message }` |
| POST | `/api/scaling/record-db` | `{ queryTime }` | `{ message }` |
| GET | `/api/scaling/bottleneck` | — | Bottleneck analysis |
| POST | `/api/scaling/simulate` | `{ requests, avgResponseTime }` | Simulation results |

---

## Deployment

- **Frontend:** Vercel (static site, auto-deploys from `main`)
- **Backend:** Render (Node.js service, auto-deploys from `main`)
- **Database:** MongoDB Atlas (shared cluster)
- **CI/CD:** GitHub Actions (`.github/workflows/ci-cd.yml`)

MongoDB Atlas must have `0.0.0.0/0` in the IP whitelist to allow connections from Render's dynamic IPs.
