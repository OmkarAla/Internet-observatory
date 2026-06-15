# Phase 3: Real-Time Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace polling/refresh-based UI with real-time updates via WebSockets. Check results appear instantly without page refresh.

**Architecture:** Server-side scheduling with Socket.IO. Server manages `setInterval` timers for each endpoint, broadcasts results via WebSocket rooms. Clients subscribe to specific endpoints and surgically update UI on receipt.

**Tech Stack:** Node.js, Express, MongoDB (Mongoose), Socket.IO, React, Vite, TailwindCSS

---

## File Structure

```
Internet-Observatory/
├── server/
│   ├── index.js                          # MODIFY: Add Socket.IO server
│   ├── models/
│   │   ├── Website.js                    # MODIFY: Add checkInterval field
│   │   └── Api.js                        # MODIFY: Add checkInterval field
│   ├── routes/
│   │   ├── websites.js                   # MODIFY: Add PATCH interval endpoint
│   │   └── apis.js                       # MODIFY: Add PATCH interval endpoint
│   └── services/
│       ├── socketService.js              # CREATE: Socket.IO server setup
│       └── timerManager.js               # CREATE: Timer management
├── client/
│   └── src/
│       ├── hooks/
│       │   └── useSocket.js              # CREATE: Socket.IO client hook
│       ├── components/
│       │   ├── WebsiteList.jsx           # MODIFY: Add live updates + alerts
│       │   ├── ApiList.jsx               # MODIFY: Add live updates + alerts
│       │   ├── AutoCheckToggle.jsx       # CREATE: Interval toggle UI
│       │   └── StatusAlert.jsx           # CREATE: In-card alert component
│       └── services/
│           └── api.js                    # MODIFY: Add interval endpoints
└── package.json                          # MODIFY: Add socket.io dependency
```

---

## Task 1: Install Socket.IO Dependencies

**Files:**
- Modify: `server/package.json`
- Modify: `client/package.json`

- [ ] **Step 1: Install server dependency**

Run: `cd D:\famili-vc-basep\Internet-Observatory\server && npm install socket.io`

- [ ] **Step 2: Install client dependency**

Run: `cd D:\famili-vc-basep\Internet-Observatory\client && npm install socket.io-client`

- [ ] **Step 3: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add server/package.json server/package-lock.json client/package.json client/package-lock.json
git commit -m "deps: add socket.io and socket.io-client"
```

---

## Task 2: Add checkInterval to Website Model

**Files:**
- Modify: `server/models/Website.js`

- [ ] **Step 1: Add checkInterval field**

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
  },
  checkInterval: {
    type: Number,
    default: null,
    min: 10000
  }
}, {
  timestamps: true
});

export default mongoose.model('Website', websiteSchema);
```

- [ ] **Step 2: Commit**

```bash
git add server/models/Website.js
git commit -m "feat: add checkInterval field to Website model"
```

---

## Task 3: Add checkInterval to Api Model

**Files:**
- Modify: `server/models/Api.js`

- [ ] **Step 1: Add checkInterval field**

```javascript
import mongoose from 'mongoose';

const apiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    default: 'GET'
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  expectedStatus: {
    type: Number,
    default: 200
  },
  timeout: {
    type: Number,
    default: 10000
  },
  retries: {
    type: Number,
    default: 3
  },
  enabled: {
    type: Boolean,
    default: true
  },
  checkInterval: {
    type: Number,
    default: null,
    min: 10000
  }
}, {
  timestamps: true
});

export default mongoose.model('Api', apiSchema);
```

- [ ] **Step 2: Commit**

```bash
git add server/models/Api.js
git commit -m "feat: add checkInterval field to Api model"
```

---

## Task 4: Create Socket.IO Server Service

**Files:**
- Create: `server/services/socketService.js`

- [ ] **Step 1: Create Socket.IO service**

```javascript
import { Server } from 'socket.io';

let io = null;

export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('subscribe', ({ id, type }) => {
      const room = `${type}:${id}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('unsubscribe', ({ id, type }) => {
      const room = `${type}:${id}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left room ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const broadcastCheckResult = (id, type, result) => {
  const room = `${type}:${id}`;
  io.to(room).emit('check:result', { id, type, result });
};

export const broadcastCircuitChange = (id, state) => {
  io.emit('circuit:change', { id, state });
};
```

- [ ] **Step 2: Commit**

```bash
git add server/services/socketService.js
git commit -m "feat: add Socket.IO server service"
```

---

## Task 5: Create Timer Manager Service

**Files:**
- Create: `server/services/timerManager.js`

- [ ] **Step 1: Create timer manager**

```javascript
import Website from '../models/Website.js';
import Api from '../models/Api.js';
import { checkWebsite } from '../routes/checks.js';
import { checkApi } from '../routes/apis.js';
import { broadcastCheckResult } from './socketService.js';

const timers = new Map();

const createCheckFunction = (type) => {
  return async (id) => {
    if (type === 'website') {
      const result = await checkWebsite(id);
      broadcastCheckResult(id, 'website', result);
      return result;
    } else {
      const result = await checkApi(id);
      broadcastCheckResult(id, 'api', result);
      return result;
    }
  };
};

export const startTimer = (id, type, intervalMs) => {
  const key = `${type}:${id}`;
  clearTimer(key);

  const checkFn = createCheckFunction(type);
  const timeout = setInterval(() => {
    checkFn(id).catch(err => console.error(`Check failed for ${key}:`, err));
  }, intervalMs);

  timers.set(key, { intervalMs, timeout, type, id });
  console.log(`Timer started for ${key}: ${intervalMs}ms`);
};

export const clearTimer = (key) => {
  if (timers.has(key)) {
    clearInterval(timers.get(key).timeout);
    timers.delete(key);
    console.log(`Timer cleared for ${key}`);
  }
};

export const getTimerStatus = (id, type) => {
  const key = `${type}:${id}`;
  return timers.has(key) ? timers.get(key) : null;
};

export const loadTimersFromDB = async () => {
  try {
    const websites = await Website.find({ checkInterval: { $ne: null } });
    const apis = await Api.find({ checkInterval: { $ne: null } });

    websites.forEach(w => startTimer(w._id, 'website', w.checkInterval));
    apis.forEach(a => startTimer(a._id, 'api', a.checkInterval));

    console.log(`Loaded ${websites.length + apis.length} timers from DB`);
  } catch (error) {
    console.error('Failed to load timers from DB:', error);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add server/services/timerManager.js
git commit -m "feat: add timer manager service"
```

---

## Task 6: Add PATCH Interval Endpoints

**Files:**
- Modify: `server/routes/websites.js`
- Modify: `server/routes/apis.js`
- Modify: `client/src/services/api.js`

- [ ] **Step 1: Add PATCH to websites.js**

Add before the `export default router;` line:

```javascript
router.patch('/:id/interval', async (req, res) => {
  try {
    const { checkInterval } = req.body;
    
    if (checkInterval !== null && (typeof checkInterval !== 'number' || checkInterval < 10000)) {
      return res.status(400).json({ error: 'Interval must be null or >= 10000ms' });
    }
    
    const website = await Website.findByIdAndUpdate(
      req.params.id,
      { checkInterval },
      { new: true }
    );
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    res.json(website);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 2: Add PATCH to apis.js**

Add before the `export default router;` line:

```javascript
router.patch('/:id/interval', async (req, res) => {
  try {
    const { checkInterval } = req.body;
    
    if (checkInterval !== null && (typeof checkInterval !== 'number' || checkInterval < 10000)) {
      return res.status(400).json({ error: 'Interval must be null or >= 10000ms' });
    }
    
    const api = await Api.findByIdAndUpdate(
      req.params.id,
      { checkInterval },
      { new: true }
    );
    
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    res.json(api);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: Add client API endpoints**

Add to `client/src/services/api.js`:

```javascript
// Interval endpoints
export const setWebsiteInterval = (id, checkInterval) => 
  api.patch(`/websites/${id}/interval`, { checkInterval });

export const setApiInterval = (id, checkInterval) => 
  api.patch(`/apis/${id}/interval`, { checkInterval });
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/websites.js server/routes/apis.js client/src/services/api.js
git commit -m "feat: add PATCH interval endpoints"
```

---

## Task 7: Integrate Socket.IO with Express Server

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Update server/index.js**

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import websiteRoutes from './routes/websites.js';
import checkRoutes from './routes/checks.js';
import apiRoutes from './routes/apis.js';
import { initSocketIO } from './services/socketService.js';
import { loadTimersFromDB } from './services/timerManager.js';

dotenv.config();

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/websites', websiteRoutes);
app.use('/api/websites', checkRoutes);
app.use('/api/apis', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await connectDB();
  
  initSocketIO(server);
  
  await loadTimersFromDB();
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
```

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: integrate Socket.IO with Express server"
```

---

## Task 8: Create useSocket Hook (Client)

**Files:**
- Create: `client/src/hooks/useSocket.js`

- [ ] **Step 1: Create useSocket hook**

```javascript
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const subscribe = useCallback((id, type) => {
    socketRef.current?.emit('subscribe', { id, type });
  }, []);

  const unsubscribe = useCallback((id, type) => {
    socketRef.current?.emit('unsubscribe', { id, type });
  }, []);

  const onCheckResult = useCallback((callback) => {
    socketRef.current?.on('check:result', callback);
    return () => socketRef.current?.off('check:result', callback);
  }, []);

  const onCircuitChange = useCallback((callback) => {
    socketRef.current?.on('circuit:change', callback);
    return () => socketRef.current?.off('circuit:change', callback);
  }, []);

  return { subscribe, unsubscribe, onCheckResult, onCircuitChange };
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useSocket.js
git commit -m "feat: add useSocket hook for client"
```

---

## Task 9: Create StatusAlert Component

**Files:**
- Create: `client/src/components/StatusAlert.jsx`

- [ ] **Step 1: Create StatusAlert component**

```jsx
import { useState, useEffect } from 'react';

function StatusAlert({ isDown, timestamp }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (timestamp) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [timestamp]);

  if (!visible || !timestamp) return null;

  return (
    <div className={`px-3 py-2 rounded text-sm mb-2 transition-opacity duration-500 ${
      isDown 
        ? 'bg-red-100 text-red-800 border border-red-200' 
        : 'bg-green-100 text-green-800 border border-green-200'
    }`}>
      {isDown ? '⚠️ Service is DOWN' : '✅ Service recovered'}
      <span className="float-right opacity-75">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

export default StatusAlert;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/StatusAlert.jsx
git commit -m "feat: add StatusAlert component"
```

---

## Task 10: Create AutoCheckToggle Component

**Files:**
- Create: `client/src/components/AutoCheckToggle.jsx`

- [ ] **Step 1: Create AutoCheckToggle component**

```jsx
function AutoCheckToggle({ checkInterval, onIntervalChange }) {
  const isEnabled = checkInterval !== null;
  const intervalSeconds = (checkInterval || 30000) / 1000;

  const handleToggle = () => {
    onIntervalChange(isEnabled ? null : 30000);
  };

  const handleSliderChange = (e) => {
    const seconds = parseInt(e.target.value);
    onIntervalChange(seconds * 1000);
  };

  return (
    <div className="flex items-center gap-3 text-sm mt-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600">Auto-check</span>
      </label>
      
      {isEnabled && (
        <>
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={intervalSeconds}
            onChange={handleSliderChange}
            className="w-32"
          />
          <span className="text-gray-500 w-12">{intervalSeconds}s</span>
        </>
      )}
    </div>
  );
}

export default AutoCheckToggle;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/AutoCheckToggle.jsx
git commit -m "feat: add AutoCheckToggle component"
```

---

## Task 11: Update WebsiteList with Live Updates

**Files:**
- Modify: `client/src/components/WebsiteList.jsx`

- [ ] **Step 1: Update WebsiteList component**

```jsx
import { useState, useEffect } from 'react';
import { getCheckHistory, setWebsiteInterval } from '../services/api';
import CheckHistory from './CheckHistory';
import StatusAlert from './StatusAlert';
import AutoCheckToggle from './AutoCheckToggle';

function WebsiteList({ websites, onDelete, onCheck, subscribe, unsubscribe, onCheckResult }) {
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});
  const [liveResults, setLiveResults] = useState({});
  const [alerts, setAlerts] = useState({});
  const [previousStatus, setPreviousStatus] = useState({});

  useEffect(() => {
    const cleanup = onCheckResult(({ id, type, result }) => {
      if (type !== 'website') return;

      setLiveResults(prev => ({
        ...prev,
        [id]: [result, ...(prev[id] || [])]
      }));

      if (previousStatus[id] !== undefined && previousStatus[id] !== result.success) {
        setAlerts(prev => ({
          ...prev,
          [id]: { isDown: !result.success, timestamp: Date.now() }
        }));
      }
      setPreviousStatus(prev => ({ ...prev, [id]: result.success }));
    });

    return cleanup;
  }, [onCheckResult, previousStatus]);

  useEffect(() => {
    websites.forEach(w => subscribe(w._id, 'website'));
    return () => websites.forEach(w => unsubscribe(w._id, 'website'));
  }, [websites, subscribe, unsubscribe]);

  const handleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setLoadingHistory(prev => ({ ...prev, [id]: true }));
    try {
      const response = await getCheckHistory(id);
      setHistory(prev => ({ ...prev, [id]: response.data }));
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoadingHistory(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleIntervalChange = async (id, interval) => {
    try {
      await setWebsiteInterval(id, interval);
    } catch (err) {
      console.error('Failed to update interval');
    }
  };

  if (websites.length === 0) {
    return <p className="text-gray-500">No websites monitored yet.</p>;
  }

  return (
    <div className="space-y-4">
      {websites.map((website) => (
        <div key={website._id} className="border rounded p-4">
          <StatusAlert 
            isDown={alerts[website._id]?.isDown} 
            timestamp={alerts[website._id]?.timestamp} 
          />
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{website.name}</h3>
              <p className="text-gray-600 text-sm">{website.url}</p>
              
              {liveResults[website._id]?.[0] && (
                <p className="text-sm mt-1">
                  <span className={liveResults[website._id][0].success ? 'text-green-600' : 'text-red-600'}>
                    {liveResults[website._id][0].success ? 'UP' : 'DOWN'}
                  </span>
                  {' • '}{liveResults[website._id][0].responseTime}ms
                </p>
              )}
              
              <AutoCheckToggle 
                checkInterval={website.checkInterval}
                onIntervalChange={(interval) => handleIntervalChange(website._id, interval)}
              />
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
            <CheckHistory 
              history={[...(liveResults[website._id] || []), ...(history[website._id] || [])]} 
              loading={loadingHistory[website._id]} 
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default WebsiteList;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/WebsiteList.jsx
git commit -m "feat: add live updates and alerts to WebsiteList"
```

---

## Task 12: Update ApiList with Live Updates

**Files:**
- Modify: `client/src/components/ApiList.jsx`

- [ ] **Step 1: Update ApiList component**

```jsx
import { useState, useEffect } from 'react';
import { getApiCheckHistory, setApiInterval } from '../services/api';
import ApiCheckHistory from './ApiCheckHistory';
import StatusAlert from './StatusAlert';
import AutoCheckToggle from './AutoCheckToggle';

function ApiList({ apis, onDelete, onCheck, subscribe, unsubscribe, onCheckResult }) {
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});
  const [liveResults, setLiveResults] = useState({});
  const [alerts, setAlerts] = useState({});
  const [previousStatus, setPreviousStatus] = useState({});

  useEffect(() => {
    const cleanup = onCheckResult(({ id, type, result }) => {
      if (type !== 'api') return;

      setLiveResults(prev => ({
        ...prev,
        [id]: [result, ...(prev[id] || [])]
      }));

      if (previousStatus[id] !== undefined && previousStatus[id] !== result.success) {
        setAlerts(prev => ({
          ...prev,
          [id]: { isDown: !result.success, timestamp: Date.now() }
        }));
      }
      setPreviousStatus(prev => ({ ...prev, [id]: result.success }));
    });

    return cleanup;
  }, [onCheckResult, previousStatus]);

  useEffect(() => {
    apis.forEach(a => subscribe(a._id, 'api'));
    return () => apis.forEach(a => unsubscribe(a._id, 'api'));
  }, [apis, subscribe, unsubscribe]);

  const handleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setLoadingHistory(prev => ({ ...prev, [id]: true }));
    try {
      const response = await getApiCheckHistory(id);
      setHistory(prev => ({ ...prev, [id]: response.data }));
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoadingHistory(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleIntervalChange = async (id, interval) => {
    try {
      await setApiInterval(id, interval);
    } catch (err) {
      console.error('Failed to update interval');
    }
  };

  const getCircuitBreakerBadge = (breaker) => {
    if (!breaker) return null;
    const colors = {
      CLOSED: 'bg-green-100 text-green-800',
      OPEN: 'bg-red-100 text-red-800',
      HALF_OPEN: 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[breaker.state] || 'bg-gray-100'}`}>
        {breaker.state}
      </span>
    );
  };

  if (apis.length === 0) {
    return <p className="text-gray-500">No APIs monitored yet.</p>;
  }

  return (
    <div className="space-y-4">
      {apis.map((api) => (
        <div key={api._id} className="border rounded p-4">
          <StatusAlert 
            isDown={alerts[api._id]?.isDown} 
            timestamp={alerts[api._id]?.timestamp} 
          />
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{api.name}</h3>
                {getCircuitBreakerBadge(api.circuitBreaker)}
              </div>
              <p className="text-gray-600 text-sm">
                <span className="font-mono bg-gray-100 px-1 rounded">{api.method}</span>
                {' '}{api.url}
              </p>
              
              {liveResults[api._id]?.[0] && (
                <p className="text-sm mt-1">
                  <span className={liveResults[api._id][0].success ? 'text-green-600' : 'text-red-600'}>
                    {liveResults[api._id][0].success ? 'UP' : 'DOWN'}
                  </span>
                  {' • '}{liveResults[api._id][0].status || 'N/A'} • {liveResults[api._id][0].responseTime}ms
                </p>
              )}
              
              <AutoCheckToggle 
                checkInterval={api.checkInterval}
                onIntervalChange={(interval) => handleIntervalChange(api._id, interval)}
              />
            </div>
            
            <div className="space-x-2">
              <button
                onClick={() => onCheck(api._id)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Check Now
              </button>
              <button
                onClick={() => handleExpand(api._id)}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
              >
                {expanded === api._id ? 'Hide History' : 'View History'}
              </button>
              <button
                onClick={() => onDelete(api._id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          
          {expanded === api._id && (
            <ApiCheckHistory 
              history={[...(liveResults[api._id] || []), ...(history[api._id] || [])]} 
              loading={loadingHistory[api._id]} 
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default ApiList;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ApiList.jsx
git commit -m "feat: add live updates and alerts to ApiList"
```

---

## Task 13: Update App Component with Socket

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Update App to pass socket functions**

```jsx
import { useState, useEffect } from 'react';
import { 
  getWebsites, addWebsite, deleteWebsite, triggerCheck,
  getApis, addApi, deleteApi, triggerApiCheck
} from './services/api';
import { useSocket } from './hooks/useSocket';
import WebsiteList from './components/WebsiteList';
import WebsiteForm from './components/WebsiteForm';
import ApiList from './components/ApiList';
import ApiForm from './components/ApiForm';

function App() {
  const [websites, setWebsites] = useState([]);
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [websiteError, setWebsiteError] = useState(null);
  const [apiError, setApiError] = useState(null);

  const { subscribe, unsubscribe, onCheckResult } = useSocket();

  const fetchWebsites = async () => {
    try {
      const response = await getWebsites();
      setWebsites(response.data);
      setWebsiteError(null);
    } catch (err) {
      setWebsiteError('Failed to fetch websites');
    } finally {
      setLoading(false);
    }
  };

  const fetchApis = async () => {
    try {
      const response = await getApis();
      setApis(response.data);
      setApiError(null);
    } catch (err) {
      setApiError('Failed to fetch APIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
    fetchApis();
  }, []);

  const handleAddWebsite = async (data) => {
    try {
      await addWebsite(data);
      fetchWebsites();
    } catch (err) {
      setWebsiteError('Failed to add website');
    }
  };

  const handleDeleteWebsite = async (id) => {
    try {
      await deleteWebsite(id);
      fetchWebsites();
    } catch (err) {
      setWebsiteError('Failed to delete website');
    }
  };

  const handleCheckWebsite = async (id) => {
    try {
      await triggerCheck(id);
      fetchWebsites();
    } catch (err) {
      setWebsiteError('Failed to trigger check');
    }
  };

  const handleAddApi = async (data) => {
    try {
      await addApi(data);
      fetchApis();
    } catch (err) {
      setApiError('Failed to add API');
    }
  };

  const handleDeleteApi = async (id) => {
    try {
      await deleteApi(id);
      fetchApis();
    } catch (err) {
      setApiError('Failed to delete API');
    }
  };

  const handleCheckApi = async (id) => {
    try {
      await triggerApiCheck(id);
      fetchApis();
    } catch (err) {
      setApiError('Failed to trigger API check');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Internet Observatory</h1>
        
        {websiteError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {websiteError}
          </div>
        )}

        {apiError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {apiError}
          </div>
        )}

        <div className="grid gap-6">
          {/* Website Monitoring Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Website</h2>
            <WebsiteForm onSubmit={handleAddWebsite} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monitored Websites</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <WebsiteList 
                websites={websites} 
                onDelete={handleDeleteWebsite}
                onCheck={handleCheckWebsite}
                subscribe={subscribe}
                unsubscribe={unsubscribe}
                onCheckResult={onCheckResult}
              />
            )}
          </div>

          {/* API Monitoring Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add API</h2>
            <ApiForm onSubmit={handleAddApi} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monitored APIs</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <ApiList 
                apis={apis} 
                onDelete={handleDeleteApi}
                onCheck={handleCheckApi}
                subscribe={subscribe}
                unsubscribe={unsubscribe}
                onCheckResult={onCheckResult}
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

- [ ] **Step 2: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: integrate Socket.IO into App component"
```

---

## Task 14: Integration Test

**Files:**
- Test: Full system integration

- [ ] **Step 1: Start backend**

Run: `cd D:\famili-vc-basep\Internet-Observatory\server && npm start`
Keep running.

- [ ] **Step 2: Start frontend (new terminal)**

Run: `cd D:\famili-vc-basep\Internet-Observatory\client && npm run dev`

- [ ] **Step 3: Test manual check with live update**

1. Open http://localhost:5173
2. Add a website (e.g., "Google")
3. Click "Check Now"
4. Verify result appears instantly (no refresh)
5. Verify status badge shows UP/DOWN

- [ ] **Step 4: Test auto-check**

1. Toggle "Auto-check" on
2. Set interval to 10s
3. Wait 10 seconds
4. Verify check happens automatically
5. Verify result appears in UI

- [ ] **Step 5: Test status alert**

1. Add API with invalid URL
2. Enable auto-check
3. Wait for check to fail
4. Verify red "⚠️ Service is DOWN" banner appears
5. Wait 5 seconds
6. Verify banner fades out

- [ ] **Step 6: Test multi-client**

1. Open second browser tab to http://localhost:5173
2. Enable auto-check on first tab
3. Verify checks appear on both tabs simultaneously

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: complete Phase 3 real-time dashboard"
```

---

## Summary

| Task | Component | What it does |
|------|-----------|--------------|
| 1 | Dependencies | Install socket.io packages |
| 2 | Website model | Add checkInterval field |
| 3 | Api model | Add checkInterval field |
| 4 | socketService.js | WebSocket server, rooms, broadcasting |
| 5 | timerManager.js | setInterval management, DB reload |
| 6 | PATCH endpoints | Set/clear check intervals |
| 7 | server/index.js | Wire up Socket.IO + timer loader |
| 8 | useSocket.js | Client-side socket hook |
| 9 | StatusAlert.jsx | In-card alert component |
| 10 | AutoCheckToggle.jsx | Interval slider UI |
| 11 | WebsiteList.jsx | Live updates + alerts |
| 12 | ApiList.jsx | Live updates + alerts |
| 13 | App.jsx | Pass socket functions to children |
| 14 | Integration test | Verify everything works |
