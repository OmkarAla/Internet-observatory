# AGENTS.md

Instructions for AI coding agents modifying this repository.

---

## Architecture

```
client/ (React + Vite + TailwindCSS)
    │
    │ REST API + WebSocket (Socket.IO)
    │
server/ (Express + Mongoose + Socket.IO)
    │
    │ Mongoose ODM
    │
MongoDB Atlas
```

**Frontend:** Static React SPA. Two types of components:
- Props-driven (`WebsiteList`, `ApiList`) — receive data/callbacks from `App.jsx`
- Self-contained (`DnsResolver`, `WebCrawler`, `NetworkDiagnostics`, `AnalyticsDashboard`, `CacheDemo`, `ScalingDemo`) — manage own state, make direct Axios calls

**Backend:** Express server with route modules mounted under `/api`. Business logic lives in `services/`, not in routes. Routes are thin handlers that delegate to services.

---

## Development Commands

```bash
# Server
cd server && npm start          # Start server (port 3001)
cd server && node --check index.js  # Syntax check

# Client
cd client && npm run dev        # Start dev server (port 5173)
cd client && npm run build      # Production build
```

No test framework is configured. No linter is configured.

---

## Code Structure

### Server (`server/`)

| Path | Purpose |
|------|---------|
| `index.js` | Entry point. Mounts routes, inits Socket.IO, starts server. |
| `routes/*.js` | API route handlers. Thin — delegate to services. |
| `services/*.js` | Business logic. One file per concern. |
| `models/*.js` | Mongoose schemas. |
| `config/db.js` | MongoDB connection. |

### Client (`client/src/`)

| Path | Purpose |
|------|---------|
| `App.jsx` | Tab navigation, state management, CRUD handlers. |
| `components/*.jsx` | One component per feature tab. |
| `hooks/useSocket.js` | Socket.IO connection, subscribe/unsubscribe, event listeners. |
| `services/api.js` | Axios instance with all API functions. |
| `config.js` | Reads `VITE_API_URL` and `VITE_WS_URL` from env. |

---

## Coding Conventions

### Server Routes

All routes follow this pattern:
```javascript
router.get('/', async (req, res) => {
  try {
    const data = await Model.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### WebSocket

- Client subscribes to room `{type}:{id}` via `subscribe(id, type)`
- Server broadcasts via `broadcastCheckResult(id, type, result)` from `socketService.js`
- Manual check triggers (POST `/check`) must call `broadcastCheckResult` after saving — the timer queue already does this, but route handlers need to do it explicitly

### Frontend Components

- Props-driven components receive: `websites`/`apis`, `onDelete`, `onCheck`, `subscribe`, `unsubscribe`, `onCheckResult`
- Self-contained components use `config.apiUrl` directly (not the shared `api.js` service)
- WebSocket subscription happens in `useEffect` cleanup — always unsubscribe on unmount

---

## How to Add Things

### New API Endpoint

1. Create `server/routes/newroute.js`
2. Import in `server/index.js`: `import newRoute from './routes/newroute.js'`
3. Mount: `app.use('/api/newroute', newRoute)`
4. Add client function in `client/src/services/api.js`
5. Use in component

### New Model

1. Create `server/models/NewModel.js` with Mongoose schema
2. Import in route file where needed

### New Feature Tab

1. Create `client/src/components/NewTab.jsx` (self-contained)
2. Import in `App.jsx`
3. Add to `tabs` array: `{ id: 'newtab', label: 'New Tab' }`
4. Add conditional render block

### New Service

1. Create `server/services/newservice.js`
2. Import in route file that needs it

---

## Important Constraints

- **Route handlers must be thin.** Business logic goes in `services/`, not in `routes/`.
- **Manual check triggers must broadcast.** When adding a new check endpoint, call `broadcastCheckResult(id, type, result)` after saving to DB.
- **WebSocket rooms are keyed by `{type}:{id}`.** The `subscribe` event expects `{ id, type }` in the payload.
- **Self-contained components bypass `api.js`.** If you need to add an API function for a self-contained component, add it directly in the component using `config.apiUrl`.
- **CORS is configurable.** The `CORS_ORIGINS` env var controls allowed origins. Default is `localhost:5173`.
- **MongoDB connection uses TLS.** The `connectDB` function passes `{ tls: true }` to Mongoose.

---

## Common Pitfalls

- **Adding a check route without broadcasting.** The `POST /:id/check` route must call `broadcastCheckResult` — otherwise the UI won't update in real-time.
- **Forgetting WebSocket cleanup.** Always return a cleanup function from `useEffect` that calls `unsubscribe(id, type)`.
- **Mixing self-contained and props-driven patterns.** New tabs should follow the self-contained pattern (like `DnsResolver`) unless they need shared state from `App.jsx`.
- **Hardcoding API URLs.** Always use `config.apiUrl` from `config.js`, not hardcoded strings.
- **Adding dependencies without checking.** The project uses minimal dependencies. Check `package.json` before adding new ones.

---

## Key Services Reference

| Service | What It Does |
|---------|-------------|
| `timerManager.js` | Queue-based recurring check scheduler (replaces setInterval) |
| `socketService.js` | Socket.IO setup and broadcast functions |
| `circuitBreaker.js` | Three-state circuit breaker (CLOSED/OPEN/HALF_OPEN) |
| `retry.js` | Exponential backoff with jitter |
| `cacheService.js` | In-memory cache with LRU, TTL, stale-while-revalidate |
| `analyticsService.js` | MongoDB aggregation pipelines |
| `crawlerService.js` | BFS web crawler |
| `networkService.js` | TCP/UDP/ICMP diagnostics |
| `dohClient.js` | DNS-over-HTTPS client |
| `scalingService.js` | Rate limiting, load balancing, bottleneck analysis |

---

## Verification

After making changes:

1. Syntax check: `node --check server/index.js`
2. Client build: `cd client && npm run build`
3. Manual test: start server + client, verify the feature works in browser
4. If adding a new route, test with `curl` or browser dev tools
