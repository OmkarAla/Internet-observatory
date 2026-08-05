# Deployment Guide

Step-by-step instructions for deploying Internet Observatory to production.

---

## Architecture

```
Frontend (Vercel)  →  Backend (Render)  →  MongoDB Atlas
   React app              Express API           Database
   Static files           Socket.IO             Cloud-hosted
   CDN-served             Node.js
```

---

## Step 1: Backend → Render

1. Go to [render.com](https://render.com)
2. Click **New Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `internet-observatory-api`
   - **Runtime:** Node
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && node index.js`
   - **Plan:** Free
5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `CORS_ORIGINS` | *(leave blank for now — add after frontend deploys)* |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
6. Click **Create Web Service**
7. Wait for deploy to finish
8. Note your backend URL: `https://internet-observatory-api.onrender.com`
9. Test: visit `https://internet-observatory-api.onrender.com/health`

---

## Step 2: Frontend → Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Import Project** → select your GitHub repo
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://internet-observatory-api.onrender.com` |
5. Click **Deploy**
6. Wait for deploy to finish
7. Note your frontend URL: `https://internet-observatory-five.vercel.app/`

---

## Step 3: Update CORS on Backend

1. Go to Render dashboard → your service → Environment
2. Add/update `CORS_ORIGINS`:
   ```
   https://your-app.vercel.app
   ```
3. Save → service auto-redeploys

---

## Step 4: Verify

1. Open your Vercel URL
2. Add a website to monitor
3. Trigger a check
4. Verify real-time updates work (Socket.IO)
5. Test each tab: DNS, Crawler, Network, Analytics, Cache, Scaling

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error | Ensure `CORS_ORIGINS` matches your Vercel URL exactly |
| Socket.IO won't connect | Check `VITE_WS_URL` or ensure backend URL is correct |
| 502 on Render | Check logs — likely MongoDB connection failure |
| Build fails on Vercel | Ensure root directory is `client` |

---

## Local Development

```bash
# Terminal 1 — Backend
cd server
cp .env.example .env  # Add MongoDB URI
npm install
npm start

# Terminal 2 — Frontend
cd client
cp .env.example .env  # Set VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

Open http://localhost:5173

---

## Environment Variables Reference

### Server
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `PORT` | No | `3001` | Server port |
| `CORS_ORIGINS` | No | `localhost:5173` | Comma-separated allowed origins |
| `NODE_ENV` | No | `development` | `production` masks error messages |

### Client
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `""` (same origin) | Backend API URL |
| `VITE_WS_URL` | No | `window.location.origin` | WebSocket server URL |

---

## CI/CD Setup (GitHub Actions)

### Step 1: Add Repository Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `RENDER_SERVICE_ID` | Render service ID | Render dashboard → Settings → General → Service ID |
| `RENDER_API_KEY` | Render API key | Render dashboard → Account Settings → API Keys |
| `VERCEL_TOKEN` | Vercel deployment token | Vercel dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | Vercel dashboard → Settings → General |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel dashboard → Your project → Settings → General |

### Step 2: Configure Environments

Go to **Settings** → **Environments** → **New environment** → `production`

Add required reviewers (optional but recommended):
- Add yourself as a required reviewer for production deployments

### Step 3: How It Works

The CI/CD pipeline (`.github/workflows/ci-cd.yml`) automatically:

**On every push/PR to main:**
1. ✅ Tests server (syntax check, lint, tests)
2. ✅ Tests client (build, lint, tests)

**On push to main only:**
3. 🚀 Deploys server to Render
4. 🚀 Deploys client to Vercel

### Step 4: Manual Deployment

If you need to deploy manually without waiting for CI/CD:

```bash
# Deploy server to Render
curl -X POST https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys \
  -H "Authorization: Bearer YOUR_RENDER_API_KEY" \
  -H "Content-Type: application/json"

# Deploy client to Vercel
cd client
vercel --prod
```

### Step 5: Updating the Project

With CI/CD configured, updating is simple:

```bash
# Make your changes
git add .
git commit -m "feat: add new feature"
git push origin main
```

The pipeline will automatically:
- Run tests
- Deploy server to Render
- Deploy client to Vercel

**No manual deployment needed!**

---

## First-Time Setup Checklist

- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Add repository secrets (see above)
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Update CORS_ORIGINS on Render with Vercel URL
- [ ] Test all features
- [ ] Verify CI/CD pipeline runs on next push
