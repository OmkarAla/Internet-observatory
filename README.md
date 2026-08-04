# Internet Observatory

A hands-on learning laboratory for developing systems engineering intuition. Built with React, Express, MongoDB, and Socket.IO.

## Features

- **Website Monitor** — HTTP checks, uptime tracking, response time history
- **API Observatory** — Retry with backoff, circuit breaker, response validation
- **Real-Time Dashboard** — Live updates via WebSockets, auto-check scheduling
- **DNS Observatory** — DoH queries, resolution chain visualization, record comparison
- **Web Crawler** — BFS traversal, parallel fetching, error isolation
- **Background Processing** — Queue-based scheduling, concurrency control
- **Network Diagnostics** — TCP, UDP, ICMP, traceroute, port scanning
- **Traffic Analytics** — Aggregation pipelines, indexes, time-series data
- **Caching** — TTL, LRU eviction, stale-while-revalidate, thundering herd protection
- **Scaling** — Rate limiting, load balancing, bottleneck analysis

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
# Clone
git clone <repo-url>
cd Internet-Observatory

# Backend
cd server
cp .env.example .env  # Add your MongoDB URI
npm install
npm start

# Frontend (new terminal)
cd client
cp .env.example .env  # Set VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

### Server (.env)
| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `PORT` | No | Server port (default: 3001) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `NODE_ENV` | No | `production` enables error masking |

### Client (.env)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend URL (e.g., `https://api.example.com`) |
| `VITE_WS_URL` | No | WebSocket URL (defaults to `VITE_API_URL`) |

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com), import the repo
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g., `https://internet-observatory-api.onrender.com`)
5. Deploy

### Backend → Render

1. Go to [render.com](https://render.com), create a new Web Service
2. Connect your GitHub repo
3. Configure:
   - **Runtime:** Node
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && node index.js`
4. Add environment variables:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `CORS_ORIGINS` = your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
   - `NODE_ENV` = `production`
5. Deploy

### Docker (alternative)

```bash
# Build
cd server
docker build -t observatory-api .

# Run
docker run -p 3001:3001 \
  -e MONGODB_URI="your-connection-string" \
  -e CORS_ORIGINS="https://your-frontend.vercel.app" \
  observatory-api
```

## Project Structure

```
Internet-Observatory/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks (useSocket)
│   │   ├── services/       # API client
│   │   └── config.js       # Environment config
│   └── dist/               # Production build
├── server/                 # Express backend
│   ├── config/             # Database config
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── index.js            # Entry point
├── vercel.json             # Vercel config
├── render.yaml             # Render config
└── README.md
```

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, Socket.IO Client
- **Backend:** Node.js, Express, Mongoose, Socket.IO
- **Database:** MongoDB Atlas
- **Deployment:** Vercel (frontend), Render (backend)
