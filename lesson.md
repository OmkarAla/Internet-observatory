# Internet Observatory - Lessons Learned

> Updated after each phase. Contains concepts, failures, solutions, and tradeoffs.

---

## Phase 1: Website Monitor

### Concepts

#### HTTP Fundamentals
- Every check starts with a TCP connection, TLS handshake, and HTTP request/response cycle
- `responseTime` includes: DNS lookup + TCP handshake + TLS negotiation + request + server processing + response
- A 232ms response time hides the breakdown — you need tracing to find bottlenecks

#### REST and CRUD
- REST maps HTTP methods to operations: POST=Create, GET=Read, DELETE=Delete
- URL identifies the resource, method identifies the action
- `POST /api/websites` creates, `GET /api/websites` lists, `DELETE /api/websites/:id` removes

#### MongoDB (Document Storage)
- Documents are JSON-like objects stored in collections
- Schema validation via Mongoose ensures data consistency
- Foreign references (e.g., `apiId` in check results) are application-level, not enforced by DB

#### React State Management
- Each independent piece of state needs its own variable
- Shared state creates hidden dependencies and race conditions
- `finally` blocks are essential for loading states — missing them causes UI to hang

### Failures and Solutions

1. **Missing `finally` block** — `fetchApis` didn't set `loading(false)`, causing infinite "Loading..." text
   - **Solution:** Always use `try/catch/finally` with loading states

2. **Single error state shared** — Successful website fetch cleared API error
   - **Solution:** Split into `websiteError` and `apiError`

### Tradeoffs

| Decision | Chose | Gave Up |
|----------|-------|---------|
| MongoDB Atlas | No local install | Network dependency, IP whitelisting |
| Single-page app | Simple routing | Code splitting, lazy loading |
| TailwindCSS | Rapid styling | Custom design system |

---

## Phase 2: API Observatory

### Concepts

#### Retry with Exponential Backoff
- **Problem:** APIs fail temporarily. Don't give up immediately.
- **Solution:** Retry, but wait longer each time
- **Formula:** `delay = baseDelay * 2^attempt`
- **Cap:** Without a cap, delays grow forever (1s, 2s, 4s, 8s, 16s, 32s, 64s...). Cap at 30s.
- **Why exponential?** Constant retries (1s, 1s, 1s) overwhelm a struggling API. Exponential gives recovery time.

```
Attempt 0: 1000ms
Attempt 1: 2000ms
Attempt 2: 4000ms
Attempt 3: 8000ms (capped at maxDelay if needed)
```

#### Jitter (Preventing Thundering Herd)
- **Problem:** Without jitter, 100 users fail at the same time, retry at exactly 1s, 2s, 4s... creating spikes
- **Solution:** Add random 0-50% of delay
- **Formula:** `actualDelay = delay + (delay * random * 0.5)`
- **Result:** Retries spread out over time instead of happening simultaneously

```
Without jitter:  User 1,2,3 all retry at 1.0s, 2.0s, 4.0s (spikes)
With jitter:     User 1 retries at 1.2s, User 2 at 0.8s, User 3 at 1.1s (spread)
```

#### Circuit Breaker Pattern
- **Problem:** If an API is down, retrying wastes resources. 1000 users × 3 retries = 3000 wasted requests.
- **Solution:** Track failure rate. When threshold exceeded, "trip" the circuit. Stop sending requests.
- **States:**

```
CLOSED (Normal)
    │
    │ failureThreshold exceeded
    ▼
OPEN (Tripped)
    │
    │ timeout expires (60s)
    ▼
HALF_OPEN (Testing)
    │
    ├── successThreshold successes ──► CLOSED (Recovered)
    │
    └── 1 failure ───────────────────► OPEN (Still broken)
```

- **Why HALF_OPEN needs multiple successes:** One success could be luck. Three successes is evidence.
- **In-memory state:** Fast but lost on restart. Production uses Redis.

#### Response Validation
- **Problem:** Status code 200 doesn't mean the response is valid
- **Solution:** Check status code AND JSON validity
- **Example:** `200 OK` with `{"name": Bob}` (missing quotes) is NOT success
- **Principle:** Validate what you consume, not just what the server declares

#### Error Classification
| Type | Meaning | Response |
|------|---------|----------|
| DOWN | Unreachable | Retry, then circuit breaker |
| RATE_LIMITED | HTTP 429 | Back off, don't retry immediately |
| ERROR | Responded but wrong | Don't retry (same request fails again) |

### Failures and Solutions

1. **JSON validation bug** (`server/routes/apis.js:164`)
   - **Problem:** axios auto-parses JSON, so `JSON.parse()` was called on objects, causing crashes
   - **Solution:** Added `typeof response.data === 'string'` check before parsing

2. **Shared history state** (`client/src/components/ApiList.jsx`)
   - **Problem:** Single history array shared across all APIs — clicking "View History" on API B showed API A's history
   - **Solution:** Used `historyMap` object keyed by API ID

3. **Shared loading state** (`client/src/components/ApiList.jsx`)
   - **Problem:** Single loading boolean shared — loading one API's history showed "Loading..." for all
   - **Solution:** Used `loadingMap` object keyed by API ID

4. **Error handling race condition** (`client/src/App.jsx`)
   - **Problem:** Single error state cleared by any successful fetch
   - **Solution:** Split into `websiteError` and `apiError`

5. **Missing finally block** (`client/src/App.jsx`)
   - **Problem:** `fetchApis` missing `finally { setLoading(false) }`
   - **Solution:** Added finally block

### Tradeoffs

| Decision | Chose | Gave Up |
|----------|-------|---------|
| Exponential backoff | API recovery time | Faster failure detection |
| In-memory circuit breaker | Speed, simplicity | Persistence, multi-server |
| Response validation | Accuracy | Code complexity |
| 5 failure threshold | Fast tripping | May trip on transient failures |
| 60s timeout | Enough recovery time | Slower detection of real recovery |

### Integration Test Results

| Test | Result |
|------|--------|
| Backend + MongoDB Atlas | ✅ |
| Frontend Vite | ✅ |
| Add website | ✅ |
| Check website (200, 232ms) | ✅ |
| Add API | ✅ |
| Check API (200, 36ms) | ✅ |
| Circuit breaker CLOSED | ✅ |
| Trip to OPEN (5 failures) | ✅ |
| Fast-fail when OPEN (0ms) | ✅ |

---

## Key Metrics to Monitor (Production)

| Metric | Alert When |
|--------|-----------|
| `circuitBreaker.state` | = "OPEN" |
| `circuitBreaker.failureCount` | Trending upward |
| `responseTime` | > 2x baseline |
| `success` rate | < 99% |

---

## Questions for Phase 3

1. How do we push updates to clients without them asking?
2. What happens when a WebSocket connection drops?
3. How do we handle 10,000 concurrent WebSocket connections?

---

## Phase 3: Real-Time Dashboard (Implemented)

### Concepts (Design)

#### WebSockets vs HTTP Polling
- **HTTP Polling:** Client asks "any updates?" every N seconds → wasteful, latency = N seconds
- **WebSockets:** Server pushes updates instantly → real-time, zero wasted requests
- **Socket.IO:** WebSocket library with fallbacks (long-polling, etc.)

#### Rooms (Targeted Broadcasting)
- **Problem:** Broadcasting to all clients wastes bandwidth (10,000 endpoints × all clients)
- **Solution:** Socket.IO rooms — clients subscribe to specific endpoints
- Server emits to room, only subscribers receive updates

#### Server-Side Timers
- `setInterval` runs checks at configured intervals
- Timer state in-memory (`Map`) — fast but lost on restart
- Reload from DB on server start (eventual consistency)

#### Surgical DOM Updates
- **Problem:** Full React re-render on every update is expensive
- **Solution:** Update only the specific card/component affected
- Use `key` prop or targeted state updates to avoid re-rendering unchanged components

#### Event-Driven Architecture
- **Pull model:** Client asks for updates (HTTP)
- **Push model:** Server sends updates (WebSocket)
- **Pub/Sub:** Server publishes, clients subscribe to topics (rooms)

### Implementation Concepts

#### Extracting Logic from Route Handlers
- Route handlers mix HTTP concerns (req/res) with business logic
- To reuse check logic in timer manager, extract it into standalone functions
- `checkWebsite(id)` and `checkApi(id)` now exported from route files
- Tradeoff: Route files become larger, but logic is reusable

#### Timer Persistence on Restart
- Timers stored in-memory (`Map`) — lost on server crash
- On startup, `loadTimersFromDB()` queries DB for endpoints with `checkInterval != null`
- Restarts timers from DB values
- **Broken assumption:** There's a gap between restart and timer reload — endpoints miss checks during that window
- **Production fix:** Use a job queue (Bull, Agenda) that persists to Redis

#### Socket.IO Connection Lifecycle
- Client connects → server logs `Client connected: {id}`
- Client subscribes to room → joins `type:id` room
- Server broadcasts to room → only subscribers receive
- Client disconnects → room membership persists until server restarts
- **Problem:** If client reconnects (network drop), it must re-subscribe
- **Current solution:** React `useEffect` cleanup re-subscribes on mount

### Failures and Solutions

1. **Route handler not exportable** — `checkWebsite` was inline in Express handler
   - **Solution:** Extracted into standalone async function, exported from module

2. **Shared history state ( Websites)** — Single `history` array shared across all websites
   - **Solution:** `history` object keyed by website ID (same pattern as ApiList)

3. **Previous status tracking for alerts** — Need to compare current vs previous to detect state changes
   - **Solution:** `previousStatus` object tracks last known state per endpoint

### Design Decisions

| Decision | Chose | Reason |
|----------|-------|--------|
| Architecture | Server-Side Scheduling | Server is source of truth, no duplicate checks |
| Socket.IO rooms | Per endpoint | Targeted updates, no bandwidth waste |
| Alert system | In-card banner, 5s fade | Non-intrusive, visible |
| checkInterval | Min 10s, default null | Prevents abuse, backward compatible |
| Timer persistence | Reload from DB | Survives restart (with gap) |

### Tradeoffs

| Decision | Chose | Gave Up |
|----------|-------|---------|
| In-memory timers | Speed, simplicity | Persistence, multi-server |
| DB reload on restart | Simple | Gap in monitoring during restart |
| Socket.IO rooms | Targeted updates | More complex client logic |
| 5s alert timeout | Non-intrusive alerts | User might miss brief outage |
| Min 10s interval | Prevents abuse | Less granular monitoring |

### Questions for Phase 4

1. How does DNS resolution actually work under the hood?
2. What's the difference between recursive and iterative queries?
3. How does DNS caching work at each level?

---

## Phase 4: DNS Observatory (Implemented)

### Concepts

#### DNS Resolution Chain
- Every domain lookup goes through 4 levels: Root → TLD → Authoritative → Answer
- **Root servers** (13 clusters) know where to find TLD servers (.com, .org, .net)
- **TLD servers** know which authoritative servers manage a domain
- **Authoritative servers** hold the actual DNS records
- This is an **iterative** process — each server referrals to the next

#### DNS Record Types
| Type | Purpose | Example |
|------|---------|---------|
| A | Maps domain to IPv4 | `google.com → 142.250.80.46` |
| AAAA | Maps domain to IPv6 | `google.com → 2607:f8b0:4004:800::200e` |
| MX | Mail exchange server | `10 smtp.google.com` |
| NS | Nameserver for domain | `ns1.google.com` |
| CNAME | Alias to another domain | `www.google.com → google.com` |
| TXT | Text records (SPF, DKIM) | `"v=spf1 include:_spf.google.com..."` |
| SOA | Start of authority | Zone metadata (serial, refresh, retry) |

#### DNS-over-HTTPS (DoH)
- Traditional DNS uses UDP port 53 — unencrypted, easily spoofed
- DoH wraps DNS in HTTPS — encrypted, authenticated, works through firewalls
- Public resolvers expose DoH APIs: Google, Cloudflare, Quad9
- Response format: JSON (easy to parse) or wire format (binary DNS packet)

#### Parallel Queries with Promise.allSettled
- Query 3 resolvers simultaneously — don't wait for one to finish before starting the next
- `Promise.allSettled` returns results for ALL promises, even rejected ones
- `Promise.all` would fail entirely if ONE resolver fails — wrong choice here
- **Pattern:** `Promise.allSettled` for fault tolerance, `Promise.all` for all-or-nothing

#### In-Memory Caching
- DNS data is ephemeral — same result for ~30 seconds
- Cache key = `domain + sorted record types`
- **Mutation gotcha:** `types.sort()` mutates the input array — always spread first: `[...types].sort()`
- Cache invalidation: TTL-based (simplest), not event-based

### Failures and Solutions

1. **Resolver key lost on rejection** — `Promise.allSettled` rejection reason doesn't carry the resolver key
   - **Solution:** Use `.catch()` on each promise to capture the key before rejection

2. **Cache key mutation** — `Array.sort()` mutates the original array
   - **Solution:** `[...types].sort()` — spread creates a copy

3. **Unknown record type silently defaults to A** — `getTypeCode` returned 1 for unknown types
   - **Solution:** Throw error for unknown types instead of silently guessing

4. **Axios auto-parses JSON** — Same bug as Phase 2, but this time we used `fetch` instead of axios for DoH
   - **Lesson:** Different HTTP clients have different defaults — always check what your client does automatically

### Tradeoffs

| Decision | Chose | Gave Up |
|----------|-------|---------|
| DoH over raw UDP | Works everywhere, no root | Authentic packet-level learning |
| Server-side queries | No CORS, parallel execution | Simpler client-only architecture |
| 30s in-memory cache | Fast, prevents abuse | Persistent cache, cross-restart |
| Promise.allSettled | Partial results on failure | Simpler all-or-nothing behavior |
| No database | Simpler, DNS is ephemeral | Query history, trend analysis |
| JSON DoH API | Easy parsing | Wire format learning (deferred to Phase 7) |

### Questions for Phase 5

1. How do web crawlers discover new pages?
2. What prevents a crawler from visiting the same page twice?
3. How do you represent the web as a graph?
