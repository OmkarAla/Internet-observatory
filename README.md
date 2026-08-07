# Internet Observatory

A full-stack monitoring platform demonstrating real-world systems engineering concepts — circuit breakers, retry with backoff, caching strategies, WebSocket real-time updates, and more.

[Live Demo](https://internet-observatory-five.vercel.app/)

## Features

- **Website Monitor** — HTTP checks, uptime tracking, response time history
- **API Observatory** — Retry with backoff, circuit breaker, response validation
- **Real-Time Updates** — Live WebSocket broadcasts, auto-check scheduling
- **DNS Observatory** — DNS-over-HTTPS, resolution chain visualization, multi-resolver comparison
- **Web Crawler** — BFS traversal, parallel fetching, error isolation
- **Network Diagnostics** — TCP/UDP/ICMP probes, traceroute, port scanning
- **Traffic Analytics** — MongoDB aggregation pipelines, time-series data
- **Caching** — TTL, LRU eviction, stale-while-revalidate, thundering herd protection
- **Scaling** — Rate limiting, load balancing, bottleneck analysis

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Socket.IO |
| Backend | Node.js, Express, Mongoose, Socket.IO |
| Database | MongoDB Atlas |
| Deployment | Vercel, Render |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)

### Installation

```bash
git clone https://github.com/OmkarAla/Internet-observatory.git
cd Internet-observatory
```

**Backend**

```bash
cd server
npm install
```

Create `server/.env`:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<app>
PORT=3001
```

Start the server:

```bash
npm start
```

**Frontend**

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

```
Internet-Observatory/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (one per feature)
│   │   ├── hooks/          # useSocket hook
│   │   ├── services/       # Axios API client
│   │   └── config.js       # Environment config
│   └── package.json
├── server/                 # Express backend
│   ├── config/             # MongoDB connection
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   ├── index.js            # Entry point
│   └── package.json
├── .github/workflows/      # CI/CD pipeline
├── render.yaml             # Render deployment config
└── README.md
```

## Documentation

- [docs.md](docs.md) — Architecture, data flows, API reference, design decisions
- [AGENTS.md](AGENTS.md) — Instructions for AI coding agents
- [deploy.md](deploy.md) — Deployment guide with CI/CD setup
