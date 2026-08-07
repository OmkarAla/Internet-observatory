# Internet Observatory

A full-stack monitoring platform that demonstrates real-world systems engineering concepts through working implementations — HTTP health checks, WebSocket real-time updates, circuit breakers, caching strategies, load balancing, and more.

---

## Features

| Feature | What It Demonstrates |
|---------|---------------------|
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

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)

### Installation

```bash
git clone https://github.com/OmkarAla/Internet-observatory.git
cd Internet-observatory
```

**Backend:**
```bash
cd server
npm install
```

Create a `.env` file in `server/`:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<app>
PORT=3001
```

Start the server:
```bash
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

## Project Structure

```
Internet-Observatory/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # UI components (one per feature)
│   │   ├── hooks/              # useSocket hook
│   │   ├── services/           # Axios API client
│   │   └── config.js           # Environment config
│   └── package.json
├── server/                     # Express backend
│   ├── config/                 # MongoDB connection
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API route handlers
│   ├── services/               # Business logic
│   ├── index.js                # Entry point
│   └── package.json
├── .github/workflows/          # CI/CD pipeline
├── render.yaml                 # Render deployment config
└── README.md
```

---

## Deployment

See **[deploy.md](deploy.md)** for step-by-step instructions including CI/CD setup.

**Quick summary:**

1. **Backend → Render:** Create Web Service, connect repo, set build/start commands, add env vars
2. **Frontend → Vercel:** Import repo, set root directory to `client`, add `VITE_API_URL`
3. **MongoDB Atlas:** Add `0.0.0.0/0` to IP whitelist
4. **CI/CD:** Add GitHub Secrets, pushes to `main` auto-deploy both services

---

## Documentation

- **[docs.md](docs.md)** — Architecture, data flows, full API reference, design decisions
- **[AGENTS.md](AGENTS.md)** — Instructions for AI coding agents
- **[deploy.md](deploy.md)** — Deployment guide with CI/CD setup
