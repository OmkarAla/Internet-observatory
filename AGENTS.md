# AGENTS.md

Instructions for AI coding assistants working on this project.

---

## Project Overview

Internet Observatory is a full-stack monitoring platform:
- **Frontend:** React 18 + Vite + TailwindCSS (in `client/`)
- **Backend:** Express + MongoDB + Socket.IO (in `server/`)
- **Database:** MongoDB Atlas

---

## Quick Commands

```bash
# Start server
cd server && npm start

# Start client (dev mode)
cd client && npm run dev

# Build client for production
cd client && npm run build

# Check server syntax
node --check server/index.js
```

---

## Code Structure

### Client (`client/src/`)

| Path | Purpose |
|------|---------|
| `App.jsx` | Main app, tab navigation, state management |
| `components/` | UI components (one per feature) |
| `hooks/useSocket.js` | Socket.IO connection and subscriptions |
| `services/api.js` | Axios HTTP client for backend API |
| `config.js` | Environment variable config (VITE_API_URL, VITE_WS_URL) |

### Server (`server/`)

| Path | Purpose |
|------|---------|
| `index.js` | Entry point — Express setup, routes, Socket.IO init |
| `routes/` | API route handlers (websites, apis, dns, crawler, etc.) |
| `services/` | Business logic (socketService, timerManager, retry, etc.) |
| `models/` | Mongoose schemas (Website, Api, CheckResult, etc.) |
| `config/db.js` | MongoDB connection |

---

## Key Patterns

### API Routes

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

### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `subscribe` | Client → Server | `{ id, type }` |
| `unsubscribe` | Client → Server | `{ id, type }` |
| `check:result` | Server → Client | `{ id, type, result }` |
| `circuit:change` | Server → Client | `{ id, state }` |

### Frontend State

Components receive props from `App.jsx`:
- `websites` / `apis` — current list
- `onCheck(id)` — trigger manual check
- `subscribe(id, type)` — join WebSocket room
- `unsubscribe(id, type)` — leave WebSocket room
- `onCheckResult(callback)` — listen for check results

---

## Environment Variables

### Server (`.env`)
```
MONGODB_URI=mongodb+srv://...
PORT=3001
CORS_ORIGINS=http://localhost:5173
NODE_ENV=development
```

### Client (Vercel dashboard)
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

---

## Deployment

- **Frontend:** Vercel (auto-deploys from `main` branch)
- **Backend:** Render (auto-deploys from `main` branch)
- **CI/CD:** GitHub Actions (`.github/workflows/ci-cd.yml`)

After pushing to `main`, both services auto-deploy.

---

## Common Tasks

### Add a new API endpoint
1. Create route in `server/routes/newroute.js`
2. Import and mount in `server/index.js`: `app.use('/api/newroute', newRoute)`
3. Add API function in `client/src/services/api.js`
4. Use in component

### Add a new model
1. Create schema in `server/models/NewModel.js`
2. Import in route file where needed

### Add a new tab
1. Create component in `client/src/components/NewTab.jsx`
2. Import in `App.jsx`
3. Add to `tabs` array and render conditionally
