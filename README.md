# Internet Observatory

A full-stack monitoring platform that demonstrates real-world systems engineering concepts — from HTTP health checks and WebSocket real-time updates to circuit breakers, caching strategies, and load balancing.

Built with **React**, **Express**, **MongoDB**, and **Socket.IO**.

---

## Live Demo

- **Frontend:** [https://internet-observatory-five.vercel.app](https://internet-observatory-five.vercel.app)
- **Backend:** [https://internet-observatory-api.onrender.com](https://internet-observatory-api.onrender.com)

---

## What It Does

Internet Observatory is a hands-on laboratory for monitoring websites and APIs while learning core systems engineering concepts through working implementations.

### Features

| Feature | What It Demonstrates |
|---------|---------------------|
| **Website Monitor** | HTTP checks, uptime tracking, response time history |
| **API Observatory** | Retry with exponential backoff, circuit breaker pattern, response validation |
| **Real-Time Dashboard** | Live updates via WebSockets, automatic check scheduling |
| **DNS Observatory** | DNS-over-HTTPS queries, resolution chain visualization, record comparison |
| **Web Crawler** | BFS traversal, parallel fetching, error isolation |
| **Network Diagnostics** | TCP/UDP/ICMP probes, traceroute, port scanning |
| **Traffic Analytics** | MongoDB aggregation pipelines, indexes, time-series data |
| **Caching** | TTL, LRU eviction, stale-while-revalidate, thundering herd protection |
| **Scaling** | Rate limiting, load balancing, bottleneck analysis |

---

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │ ◄──────────────────► │                 │
│  React Client   │                     │  Express Server │
│  (Vercel)       │     REST API        │  (Render)       │
│                 │ ──────────────────► │                 │
└─────────────────┘                     └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  MongoDB Atlas   │
                                        │  (Database)      │
                                        └─────────────────┘
```

**Frontend (Vercel):** Static React app served from CDN. Communicates with backend via REST API and WebSocket.

**Backend (Render):** Node.js/Express server handling API requests, running health checks on a queue system, and broadcasting results via Socket.IO.

**Database (MongoDB Atlas):** Stores website/API configs, check results, analytics data, and cache entries.

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
# Clone the repo
git clone https://github.com/OmkarAla/Internet-observatory.git
cd Internet-observatory

# Backend
cd server
cp .env.example .env   # Add your MONGODB_URI
npm install
npm start

# Frontend (new terminal)
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

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
2. Go to [vercel.com](https://vercel.com) → Import repo
3. Set **Root Directory** to `client`
4. Add env var: `VITE_API_URL` = your Render backend URL
5. Deploy

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. Set **Build Command:** `cd server && npm install`
4. Set **Start Command:** `cd server && node index.js`
5. Add env vars:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `CORS_ORIGINS` = your Vercel frontend URL
   - `NODE_ENV` = `production`
6. Deploy

### MongoDB Atlas

Add `0.0.0.0/0` to Network Access → IP Whitelist (allows Render's IPs).

### CI/CD

GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) runs on every push to `main`:
1. Tests server and client
2. Deploys server to Render
3. Deploys client to Vercel

Requires these GitHub Secrets:
- `RENDER_SERVICE_ID`, `RENDER_API_KEY`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## Project Structure

```
Internet-Observatory/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # UI components (WebsiteList, ApiList, DnsResolver, etc.)
│   │   ├── hooks/              # Custom hooks (useSocket)
│   │   ├── services/           # API client (api.js)
│   │   └── config.js           # Environment config
│   └── package.json
├── server/                     # Express backend
│   ├── config/                 # Database connection
│   ├── models/                 # Mongoose schemas (Website, Api, CheckResult, etc.)
│   ├── routes/                 # API routes (websites, apis, dns, crawler, etc.)
│   ├── services/               # Business logic (socketService, timerManager, etc.)
│   ├── index.js                # Entry point
│   └── package.json
├── .github/workflows/          # CI/CD pipeline
├── vercel.json                 # Vercel deployment config
├── render.yaml                 # Render deployment config
└── README.md
```

---

## How It Works

See [HOW_IT_WORKS.md](HOW_IT_WORKS.md) for a detailed explanation of the architecture, data flows, and key design decisions.

---

## License

MIT
