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
