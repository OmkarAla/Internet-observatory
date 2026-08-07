# Internet Observatory

A full-stack monitoring platform that demonstrates real-world systems engineering concepts — from HTTP health checks and WebSocket real-time updates to circuit breakers, caching strategies, and load balancing.

---

## What It Does

Monitor websites and APIs while learning core systems engineering patterns through working implementations.

| Feature | Concepts Demonstrated |
|---------|----------------------|
| Website Monitor | HTTP checks, uptime tracking, response time history |
| API Observatory | Retry with backoff, circuit breaker, response validation |
| Real-Time Dashboard | Live WebSocket updates, auto-check scheduling |
| DNS Observatory | DNS-over-HTTPS, resolution chain visualization |
| Web Crawler | BFS traversal, parallel fetching, error isolation |
| Network Diagnostics | TCP/UDP/ICMP probes, traceroute, port scanning |
| Traffic Analytics | MongoDB aggregation pipelines, indexes |
| Caching | TTL, LRU eviction, stale-while-revalidate, thundering herd protection |
| Scaling | Rate limiting, load balancing, bottleneck analysis |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Socket.IO Client |
| Backend | Node.js, Express, Mongoose, Socket.IO |
| Database | MongoDB Atlas |
| Deployment | Vercel (frontend), Render (backend) |
| CI/CD | GitHub Actions |

---

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)

### Setup

```bash
git clone https://github.com/OmkarAla/Internet-observatory.git
cd Internet-observatory
```

**Backend:**
```bash
cd server
cp .env.example .env   # Add your MONGODB_URI
npm install
npm start
```

**Frontend (new terminal):**
```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

---

## Environment Variables

### Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `PORT` | No | `3001` | Server port |
| `CORS_ORIGINS` | No | `localhost:5173` | Comma-separated allowed origins |
| `NODE_ENV` | No | `development` | Set to `production` for error masking |

### Client

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `""` (same origin) | Backend API URL |
| `VITE_WS_URL` | No | `window.location.origin` | WebSocket server URL |

---

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Set **Root Directory** to `client`
4. Add env var: `VITE_API_URL` = your Render backend URL
5. Deploy

### Backend → Render

1. Create Web Service at [render.com](https://render.com)
2. Connect GitHub repo
3. Build Command: `cd server && npm install`
4. Start Command: `cd server && node index.js`
5. Add env vars:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `CORS_ORIGINS` = your Vercel frontend URL
   - `NODE_ENV` = `production`
6. Deploy

### MongoDB Atlas

Add `0.0.0.0/0` to Network Access → IP Whitelist.

### CI/CD

GitHub Actions runs on every push to `main` — tests both services, then deploys to Vercel and Render.

Required GitHub Secrets: `RENDER_SERVICE_ID`, `RENDER_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## Project Structure

```
Internet-Observatory/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── hooks/              # useSocket hook
│   │   ├── services/           # API client
│   │   └── config.js           # Environment config
├── server/                     # Express backend
│   ├── config/                 # Database connection
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   └── index.js                # Entry point
├── .github/workflows/          # CI/CD pipeline
├── render.yaml                 # Render config
└── README.md
```

---

## Documentation

- **[docs.md](docs.md)** — Architecture, data flows, API reference, design decisions
- **[AGENTS.md](AGENTS.md)** — Instructions for AI coding agents
- **[deploy.md](deploy.md)** — Step-by-step deployment guide with CI/CD setup
