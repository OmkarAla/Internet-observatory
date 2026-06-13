# Phase 1: Website Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a website monitoring system that checks URLs, stores results in MongoDB, and displays uptime history via React frontend.

**Architecture:** Express backend with MongoDB, React frontend with Vite. REST API for CRUD operations and triggering checks.

**Tech Stack:** Node.js, Express, MongoDB (Mongoose), React, Vite, TailwindCSS

---

## File Structure

```
Internet-Observatory/
├── server/
│   ├── package.json
│   ├── index.js              # Express server entry
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── models/
│   │   ├── Website.js        # Website model
│   │   └── CheckResult.js    # CheckResult model
│   └── routes/
│       ├── websites.js       # Website CRUD routes
│       └── checks.js         # Check triggering routes
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── WebsiteList.jsx
│   │   │   ├── WebsiteForm.jsx
│   │   │   └── CheckHistory.jsx
│   │   └── services/
│   │       └── api.js       # API client
│   └── tailwind.config.js
├── .env                      # MongoDB URI (to be provided)
└── BRIEF.md
```

---

## Task 1: Project Setup (Backend)

**Files:**
- Create: `Internet-Observatory/server/package.json`
- Create: `Internet-Observatory/server/.env`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "internet-observatory-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```

- [ ] **Step 2: Create server/.env**

```
MONGODB_URI=mongodb+srv://[USERNAME]:[PASSWORD]@cluster.mongodb.net/internet-observatory?retryWrites=true&w=majority
PORT=3001
```

- [ ] **Step 3: Install dependencies**

Run: `cd Internet-Observatory/server && npm install`

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/.env
git commit -m "feat: set up server project structure"
```

---

## Task 2: MongoDB Connection

**Files:**
- Create: `Internet-Observatory/server/config/db.js`

- [ ] **Step 1: Create server/config/db.js**

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
```

- [ ] **Step 2: Commit**

```bash
git add server/config/db.js
git commit -m "feat: add MongoDB connection module"
```

---

## Task 3: Data Models

**Files:**
- Create: `Internet-Observatory/server/models/Website.js`
- Create: `Internet-Observatory/server/models/CheckResult.js`

- [ ] **Step 1: Create server/models/Website.js**

```javascript
import mongoose from 'mongoose';

const websiteSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Website', websiteSchema);
```

- [ ] **Step 2: Create server/models/CheckResult.js**

```javascript
import mongoose from 'mongoose';

const checkResultSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  status: {
    type: Number,
    default: null
  },
  success: {
    type: Boolean,
    required: true
  },
  responseTime: {
    type: Number,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('CheckResult', checkResultSchema);
```

- [ ] **Step 3: Commit**

```bash
git add server/models/Website.js server/models/CheckResult.js
git commit -f"feat: add Website and CheckResult models"
```

---

## Task 4: Website Routes (CRUD)

**Files:**
- Create: `Internet-Observatory/server/routes/websites.js`

- [ ] **Step 1: Create server/routes/websites.js**

```javascript
import express from 'express';
import Website from '../models/Website.js';

const router = express.Router();

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

router.get('/', async (req, res) => {
  try {
    const websites = await Website.find().sort({ createdAt: -1 });
    res.json(websites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { url, name } = req.body;
    
    if (!url || !name) {
      return res.status(400).json({ error: 'URL and name are required' });
    }
    
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const website = new Website({ url, name });
    await website.save();
    res.status(201).json(website);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const website = await Website.findByIdAndDelete(req.params.id);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    res.json({ message: 'Website deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/websites.js
git commit -m "feat: add Website CRUD routes"
```

---

## Task 5: Check Routes (Trigger Checks)

**Files:**
- Create: `Internet-Observatory/server/routes/checks.js`

- [ ] **Step 1: Create server/routes/checks.js**

```javascript
import express from 'express';
import axios from 'axios';
import Website from '../models/Website.js';
import CheckResult from '../models/CheckResult.js';

const router = express.Router();

const TIMEOUT_MS = 10000;

router.get('/:websiteId', async (req, res) => {
  try {
    const checks = await CheckResult.find({ websiteId: req.params.websiteId })
      .sort({ checkedAt: -1 })
      .limit(50);
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:websiteId', async (req, res) => {
  try {
    const website = await Website.findById(req.params.websiteId);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const startTime = Date.now();
    let result;

    try {
      const response = await axios.get(website.url, {
        timeout: TIMEOUT_MS,
        validateStatus: () => true
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;
      
      result = new CheckResult({
        websiteId: website._id,
        status: response.status,
        success,
        responseTime,
        error: null,
        checkedAt: new Date()
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      result = new CheckResult({
        websiteId: website._id,
        status: null,
        success: false,
        responseTime,
        error: error.message,
        checkedAt: new Date()
      });
    }

    await result.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/checks.js
git commit -m "feat: add check routes for triggering URL checks"
```

---

## Task 6: Express Server Entry

**Files:**
- Create: `Internet-Observatory/server/index.js`

- [ ] **Step 1: Create server/index.js**

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import websiteRoutes from './routes/websites.js';
import checkRoutes from './routes/checks.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/websites', websiteRoutes);
app.use('/api/websites', checkRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
```

- [ ] **Step 2: Test the server starts**

Run: `cd Internet-Observatory/server && npm start`
Expected: Server starts, connects to MongoDB, listens on port 3001
Stop with Ctrl+C after verification

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add Express server entry point"
```

---

## Task 7: Frontend Setup

**Files:**
- Create: `Internet-Observatory/client/package.json`
- Create: `Internet-Observatory/client/vite.config.js`
- Create: `Internet-Observatory/client/index.html`
- Create: `Internet-Observatory/client/tailwind.config.js`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "internet-observatory-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

- [ ] **Step 2: Create client/vite.config.js**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

- [ ] **Step 3: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Internet Observatory</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create client/tailwind.config.js**

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 5: Create client/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Install dependencies**

Run: `cd Internet-Observatory/client && npm install`

- [ ] **Step 7: Commit**

```bash
git add client/package.json client/vite.config.js client/index.html client/tailwind.config.js client/postcss.config.js
git commit -m "feat: set up React frontend with Vite and Tailwind"
```

---

## Task 8: Frontend API Client

**Files:**
- Create: `Internet-Observatory/client/src/services/api.js`

- [ ] **Step 1: Create client/src/services/api.js**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const getWebsites = () => api.get('/websites');
export const addWebsite = (data) => api.post('/websites', data);
export const deleteWebsite = (id) => api.delete(`/websites/${id}`);
export const triggerCheck = (id) => api.post(`/websites/${id}/check`);
export const getCheckHistory = (id) => api.get(`/websites/${id}/checks`);

export default api;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/services/api.js
git commit -m "feat: add API client service"
```

---

## Task 9: Frontend Components

**Files:**
- Create: `Internet-Observatory/client/src/index.css`
- Create: `Internet-Observatory/client/src/main.jsx`
- Create: `Internet-Observatory/client/src/App.jsx`
- Create: `Internet-Observatory/client/src/components/WebsiteList.jsx`
- Create: `Internet-Observatory/client/src/components/WebsiteForm.jsx`
- Create: `Internet-Observatory/client/src/components/CheckHistory.jsx`

- [ ] **Step 1: Create client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Create client/src/main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Create client/src/App.jsx**

```jsx
import { useState, useEffect } from 'react';
import { getWebsites, addWebsite, deleteWebsite, triggerCheck } from './services/api';
import WebsiteList from './components/WebsiteList';
import WebsiteForm from './components/WebsiteForm';

function App() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWebsites = async () => {
    try {
      const response = await getWebsites();
      setWebsites(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch websites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleAdd = async (data) => {
    try {
      await addWebsite(data);
      fetchWebsites();
    } catch (err) {
      setError('Failed to add website');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWebsite(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to delete website');
    }
  };

  const handleCheck = async (id) => {
    try {
      await triggerCheck(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to trigger check');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Internet Observatory</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Website</h2>
            <WebsiteForm onSubmit={handleAdd} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monitored Websites</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <WebsiteList 
                websites={websites} 
                onDelete={handleDelete}
                onCheck={handleCheck}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Create client/src/components/WebsiteForm.jsx**

```jsx
import { useState } from 'react';

function WebsiteForm({ onSubmit }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url || !name) return;
    
    setLoading(true);
    await onSubmit({ url, name });
    setUrl('');
    setName('');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          placeholder="Example Site"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          placeholder="https://example.com"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !url || !name}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Website'}
      </button>
    </form>
  );
}

export default WebsiteForm;
```

- [ ] **Step 5: Create client/src/components/WebsiteList.jsx**

```jsx
import { useState } from 'react';
import { getCheckHistory } from '../services/api';
import CheckHistory from './CheckHistory';

function WebsiteList({ websites, onDelete, onCheck }) {
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setLoadingHistory(true);
    try {
      const response = await getCheckHistory(id);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  if (websites.length === 0) {
    return <p className="text-gray-500">No websites monitored yet.</p>;
  }

  return (
    <div className="space-y-4">
      {websites.map((website) => (
        <div key={website._id} className="border rounded p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{website.name}</h3>
              <p className="text-gray-600 text-sm">{website.url}</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => onCheck(website._id)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Check Now
              </button>
              <button
                onClick={() => handleExpand(website._id)}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
              >
                {expanded === website._id ? 'Hide History' : 'View History'}
              </button>
              <button
                onClick={() => onDelete(website._id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          {expanded === website._id && (
            <CheckHistory history={history} loading={loadingHistory} />
          )}
        </div>
      ))}
    </div>
  );
}

export default WebsiteList;
```

- [ ] **Step 6: Create client/src/components/CheckHistory.jsx**

```jsx
function CheckHistory({ history, loading }) {
  if (loading) {
    return <p className="text-gray-500 mt-4">Loading history...</p>;
  }

  if (history.length === 0) {
    return <p className="text-gray-500 mt-4">No check history yet.</p>;
  }

  return (
    <div className="mt-4">
      <h4 className="font-medium text-gray-700 mb-2">Check History</h4>
      <div className="space-y-2">
        {history.map((check) => (
          <div
            key={check._id}
            className={`p-2 rounded text-sm ${
              check.success ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            <div className="flex justify-between">
              <span className={check.success ? 'text-green-800' : 'text-red-800'}>
                {check.success ? 'UP' : 'DOWN'}
              </span>
              <span className="text-gray-600">
                {check.status || 'N/A'} • {check.responseTime}ms
              </span>
            </div>
            {check.error && (
              <p className="text-red-600 text-xs mt-1">{check.error}</p>
            )}
            <p className="text-gray-500 text-xs">
              {new Date(check.checkedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CheckHistory;
```

- [ ] **Step 7: Commit**

```bash
git add client/src/index.css client/src/main.jsx client/src/App.jsx client/src/components/*.jsx
git commit -m "feat: add React components for website monitoring UI"
```

---

## Task 8: Integration Testing

**Files:**
- Test: Full system integration

- [ ] **Step 1: Start the backend**

Run: `cd Internet-Observatory/server && npm start`
Keep this terminal running

- [ ] **Step 2: Start the frontend (new terminal)**

Run: `cd Internet-Observatory/client && npm run dev`

- [ ] **Step 3: Test the full flow**

1. Open http://localhost:5173
2. Add a website (e.g., "Google" with URL "https://google.com")
3. Click "Check Now"
4. Verify the result appears (UP or DOWN)
5. Click "View History" to see past checks

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: complete Phase 1 website monitor with full integration"
```

---

## Summary

This implementation creates:

- Backend with Express + MongoDB for storing websites and check results
- API endpoints for CRUD operations and triggering checks
- React frontend with TailwindCSS for viewing and managing websites
- Error handling for network timeouts and failures

**Questions that emerge:**
- What happens when checks never return? → Timeout handling (10s)
- How should failures be displayed? → Error messages in history

These will be addressed in later phases.