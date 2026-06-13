# Phase 2: API Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the website monitor to track external APIs with response validation, retry logic, circuit breakers, and error classification.

**Architecture:** Add new API model and check logic to existing Express backend. Create services for retry and circuit breaker patterns. Update frontend with API monitoring components.

**Tech Stack:** Node.js, Express, MongoDB (Mongoose), Axios, React, Vite, TailwindCSS

---

## File Structure

```
Internet-Observatory/
├── server/
│   ├── index.js                    # Register API routes
│   ├── models/
│   │   ├── Website.js              # Existing
│   │   ├── CheckResult.js          # Existing
│   │   └── Api.js                  # NEW: API endpoint model
│   ├── services/
│   │   ├── retry.js                # NEW: Retry with exponential backoff
│   │   └── circuitBreaker.js       # NEW: Circuit breaker pattern
│   └── routes/
│       ├── websites.js             # Existing
│       ├── checks.js               # Existing
│       └── apis.js                 # NEW: API CRUD + check routes
├── client/
│   └── src/
│       ├── App.jsx                 # Add API monitoring section
│       ├── components/
│       │   ├── WebsiteList.jsx     # Existing
│       │   ├── WebsiteForm.jsx     # Existing
│       │   ├── CheckHistory.jsx    # Existing
│       │   ├── ApiList.jsx         # NEW: List monitored APIs
│       │   ├── ApiForm.jsx         # NEW: Add new APIs
│       │   └── ApiCheckHistory.jsx # NEW: API check history
│       └── services/
│           └── api.js              # Add API endpoints
└── docs/
    └── superpowers/
        └── plans/
            └── 2025-06-13-api-observatory-plan.md  # This file
```

---

## Learning Objectives

By the end of this phase, you should understand:

1. **Retry Logic:** Why retries need exponential backoff and jitter
2. **Circuit Breakers:** How to prevent cascade failures
3. **Response Validation:** Why status codes aren't enough
4. **Error Classification:** Distinguishing DOWN vs RATE_LIMITED vs ERROR
5. **Tradeoffs:** Speed vs reliability, simplicity vs robustness

---

## Task 1: API Model

**Files:**
- Create: `Internet-Observatory/server/models/Api.js`

- [ ] **Step 1: Create API model**

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
  }
}, {
  timestamps: true
});

export default mongoose.model('Api', apiSchema);
```

**Concept:** The API model stores endpoint configuration. Unlike Website (which just has URL), APIs need:
- Custom headers (for authentication)
- Expected status code (what "success" looks like)
- Timeout and retry configuration

**Tradeoff:** We're storing API keys in the database. In production, this should be encrypted. For learning, plaintext is acceptable.

- [ ] **Step 2: Commit**

```bash
git add server/models/Api.js
git commit -m "feat: add API model with validation config"
```

---

## Task 2: Retry Service

**Files:**
- Create: `Internet-Observatory/server/services/retry.js`

- [ ] **Step 1: Create retry service with exponential backoff**

```javascript
/**
 * Retry a function with exponential backoff
 * 
 * Why exponential backoff?
 * - If an API is struggling, immediate retries make it worse
 * - Waiting longer between retries gives the API time to recover
 * - Jitter prevents thundering herd (100 users retrying at same time)
 * 
 * Tradeoff: Longer waits = slower failure detection
 *           Shorter waits = more load on struggling API
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff and jitter
 * 
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay cap
 * @returns {number} Delay in milliseconds
 */
export const calculateDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter (random 0-50% of delay)
  // Why jitter? Without it, all retries happen at exact same time
  const jitter = cappedDelay * Math.random() * 0.5;
  
  return cappedDelay + jitter;
};

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Configuration
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.baseDelay - Base delay in ms
 * @param {number} options.maxDelay - Maximum delay cap in ms
 * @param {Function} options.onRetry - Callback on each retry
 * @returns {Promise} Result of the function
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry = () => {}
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Try the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay for this attempt
      const delay = calculateDelay(attempt, baseDelay, maxDelay);
      
      // Notify caller about retry
      onRetry({
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: error.message
      });
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
};

export default retryWithBackoff;
```

**Concept: Exponential Backoff**

```
Attempt 1: Fail → wait 1s
Attempt 2: Fail → wait 2s
Attempt 3: Fail → wait 4s
Attempt 4: Fail → wait 8s
Attempt 5: Fail → throw error
```

**Concept: Jitter**

Without jitter, if 100 users all fail at the same time, they all retry at exactly 1s, 2s, 4s... This creates a "thundering herd" that overwhelms the API.

With jitter, each user waits a random amount within the range. Retries are spread out over time.

**Concept: Max Delay Cap**

Without a cap, exponential backoff grows infinitely: 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s... That's too long. We cap at 30 seconds.

- [ ] **Step 2: Commit**

```bash
git add server/services/retry.js
git commit -m "feat: add retry service with exponential backoff"
```

---

## Task 3: Circuit Breaker Service

**Files:**
- Create: `Internet-Observatory/server/services/circuitBreaker.js`

- [ ] **Step 1: Create circuit breaker service**

```javascript
/**
 * Circuit Breaker Pattern
 * 
 * Problem: If an API is down, retrying wastes resources.
 *          If 1000 users all retry a dead API, that's 3000 wasted requests.
 * 
 * Solution: Track failure rate. When it exceeds threshold, "trip" the circuit.
 *           Stop sending requests. Return failure immediately.
 *           Periodically try again to see if API recovered.
 * 
 * States:
 * - CLOSED: Normal operation. Requests go through.
 * - OPEN: Circuit tripped. Requests fail immediately.
 * - HALF_OPEN: Testing recovery. Allow one request through.
 * 
 * Tradeoff:
 * - Fast trip = fewer wasted requests, but may trip on transient failures
 * - Slow trip = more resilient, but wastes resources during outages
 */

// Circuit breaker states
export const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Circuit tripped, failing fast
  HALF_OPEN: 'HALF_OPEN' // Testing recovery
};

// In-memory circuit breaker store
// In production, use Redis for distributed systems
const circuitBreakers = new Map();

/**
 * Get or create circuit breaker for an API
 */
export const getCircuitBreaker = (apiId) => {
  if (!circuitBreakers.has(apiId)) {
    circuitBreakers.set(apiId, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
      config: {
        failureThreshold: 5,      // Trip after 5 failures
        successThreshold: 3,      // Close after 3 successes
        timeout: 60000,           // Try again after 60 seconds
        monitoringWindow: 300000  // Reset failure count after 5 minutes
      }
    });
  }
  return circuitBreakers.get(apiId);
};

/**
 * Record a success
 */
export const recordSuccess = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  
  if (breaker.state === CircuitState.HALF_OPEN) {
    // Testing recovery - this success counts more
    breaker.successCount++;
    
    if (breaker.successCount >= breaker.config.successThreshold) {
      // API recovered! Close the circuit
      breaker.state = CircuitState.CLOSED;
      breaker.failureCount = 0;
      breaker.successCount = 0;
      breaker.lastStateChange = Date.now();
      console.log(`Circuit CLOSED for API ${apiId}`);
    }
  } else if (breaker.state === CircuitState.CLOSED) {
    // Normal operation - reset failure count on success
    breaker.failureCount = 0;
  }
};

/**
 * Record a failure
 */
export const recordFailure = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  
  if (breaker.state === CircuitState.HALF_OPEN) {
    // Testing recovery - this failure means API is still broken
    breaker.state = CircuitState.OPEN;
    breaker.lastFailureTime = Date.now();
    breaker.lastStateChange = Date.now();
    breaker.successCount = 0;
    console.log(`Circuit OPENED again for API ${apiId}`);
    return;
  }
  
  // Check if we're outside the monitoring window
  const now = Date.now();
  if (breaker.lastFailureTime && 
      (now - breaker.lastFailureTime) > breaker.config.monitoringWindow) {
    // Reset failure count - old failures don't count
    breaker.failureCount = 0;
  }
  
  breaker.failureCount++;
  breaker.lastFailureTime = Date.now();
  
  // Check if we should trip the circuit
  if (breaker.failureCount >= breaker.config.failureThreshold) {
    breaker.state = CircuitState.OPEN;
    breaker.lastStateChange = Date.now();
    console.log(`Circuit OPENED for API ${apiId} after ${breaker.failureCount} failures`);
  }
};

/**
 * Check if a request should be allowed
 */
export const shouldAllowRequest = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  
  switch (breaker.state) {
    case CircuitState.CLOSED:
      // Normal operation - allow request
      return true;
    
    case CircuitState.OPEN:
      // Circuit tripped - check if enough time has passed to try again
      const timeSinceOpen = Date.now() - breaker.lastStateChange;
      if (timeSinceOpen >= breaker.config.timeout) {
        // Timeout expired - allow one test request
        breaker.state = CircuitState.HALF_OPEN;
        breaker.successCount = 0;
        console.log(`Circuit HALF_OPEN for API ${apiId} - testing recovery`);
        return true;
      }
      // Still in timeout - reject request
      return false;
    
    case CircuitState.HALF_OPEN:
      // Testing recovery - allow request (but it's the test request)
      return true;
    
    default:
      return true;
  }
};

/**
 * Get circuit breaker status for display
 */
export const getCircuitStatus = (apiId) => {
  const breaker = getCircuitBreaker(apiId);
  return {
    state: breaker.state,
    failureCount: breaker.failureCount,
    successCount: breaker.successCount,
    lastFailureTime: breaker.lastFailureTime,
    lastStateChange: breaker.lastStateChange
  };
};

export default {
  CircuitState,
  getCircuitBreaker,
  recordSuccess,
  recordFailure,
  shouldAllowRequest,
  getCircuitStatus
};
```

**Concept: Circuit Breaker States**

```
CLOSED (Normal)
    │
    │ Failure threshold exceeded
    ▼
OPEN (Tripped)
    │
    │ Timeout expired
    ▼
HALF_OPEN (Testing)
    │
    ├── Success ──► CLOSED (Recovered)
    │
    └── Failure ──► OPEN (Still broken)
```

**Concept: Why Circuit Breakers Matter**

Without circuit breaker:
```
API down → 1000 users retry → 3000 requests to dead API → API still down → wasted resources
```

With circuit breaker:
```
API down → 5 failures → Circuit opens → 995 users get instant failure → 0 wasted requests
```

**Tradeoff:** Circuit breaker is in-memory. If server restarts, state is lost. For learning, this is acceptable. For production, use Redis.

- [ ] **Step 2: Commit**

```bash
git add server/services/circuitBreaker.js
git commit -m "feat: add circuit breaker service"
```

---

## Task 4: API Routes with Check Logic

**Files:**
- Create: `Internet-Observatory/server/routes/apis.js`

- [ ] **Step 1: Create API routes with retry and circuit breaker**

```javascript
import express from 'express';
import axios from 'axios';
import Api from '../models/Api.js';
import ApiCheckResult from '../models/ApiCheckResult.js';
import { retryWithBackoff } from '../services/retry.js';
import { shouldAllowRequest, recordSuccess, recordFailure, getCircuitStatus } from '../services/circuitBreaker.js';

const router = express.Router();

/**
 * GET /api/apis
 * List all monitored APIs
 */
router.get('/', async (req, res) => {
  try {
    const apis = await Api.find().sort({ createdAt: -1 });
    
    // Attach circuit breaker status to each API
    const apisWithStatus = apis.map(api => ({
      ...api.toObject(),
      circuitBreaker: getCircuitStatus(api._id)
    }));
    
    res.json(apisWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/apis
 * Add new API to monitor
 */
router.post('/', async (req, res) => {
  try {
    const { name, url, method, headers, expectedStatus, timeout, retries } = req.body;
    
    // Validation
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const api = new Api({
      name,
      url,
      method: method || 'GET',
      headers: headers || {},
      expectedStatus: expectedStatus || 200,
      timeout: timeout || 10000,
      retries: retries || 3
    });
    
    await api.save();
    res.status(201).json(api);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/apis/:id
 * Remove API from monitoring
 */
router.delete('/:id', async (req, res) => {
  try {
    const api = await Api.findByIdAndDelete(req.params.id);
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    res.json({ message: 'API deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/apis/:apiId/checks
 * Get check history for an API
 */
router.get('/:apiId/checks', async (req, res) => {
  try {
    const checks = await ApiCheckResult.find({ apiId: req.params.apiId })
      .sort({ checkedAt: -1 })
      .limit(50);
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/apis/:apiId/check
 * Trigger a check on an API
 * 
 * This is where the magic happens:
 * 1. Check circuit breaker state
 * 2. If circuit is OPEN, fail immediately
 * 3. If circuit is CLOSED or HALF_OPEN, make request with retries
 * 4. Record success/failure in circuit breaker
 * 5. Save result to database
 */
router.post('/:apiId/check', async (req, res) => {
  try {
    const api = await Api.findById(req.params.apiId);
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    // Step 1: Check circuit breaker
    if (!shouldAllowRequest(api._id)) {
      // Circuit is OPEN - fail immediately
      const result = new ApiCheckResult({
        apiId: api._id,
        status: null,
        success: false,
        error: 'Circuit breaker is OPEN - API marked as down',
        responseTime: 0,
        checkedAt: new Date()
      });
      await result.save();
      return res.status(200).json(result);
    }
    
    // Step 2: Make request with retries
    const startTime = Date.now();
    let result;
    
    try {
      const response = await retryWithBackoff(
        async () => {
          return await axios({
            method: api.method,
            url: api.url,
            headers: api.headers,
            timeout: api.timeout,
            validateStatus: () => true // Don't throw on any status
          });
        },
        {
          maxRetries: api.retries,
          baseDelay: 1000,
          maxDelay: 10000,
          onRetry: ({ attempt, delay, error }) => {
            console.log(`API ${api.name}: Retry ${attempt} after ${delay}ms - ${error}`);
          }
        }
      );
      
      const responseTime = Date.now() - startTime;
      
      // Step 3: Validate response
      const statusMatch = response.status === api.expectedStatus;
      const isJson = response.headers['content-type']?.includes('application/json');
      let jsonValid = true;
      
      if (isJson && api.method !== 'HEAD') {
        try {
          JSON.parse(response.data);
        } catch {
          jsonValid = false;
        }
      }
      
      const success = statusMatch && jsonValid;
      
      // Step 4: Record in circuit breaker
      if (success) {
        recordSuccess(api._id);
      } else {
        recordFailure(api._id);
      }
      
      // Step 5: Save result
      result = new ApiCheckResult({
        apiId: api._id,
        status: response.status,
        success,
        responseTime,
        error: success ? null : `Status: ${response.status}, JSON valid: ${jsonValid}`,
        checkedAt: new Date()
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Request failed completely (timeout, network error, etc.)
      recordFailure(api._id);
      
      result = new ApiCheckResult({
        apiId: api._id,
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

**Concept: Request Flow**

```
User clicks "Check Now"
    │
    ▼
Check circuit breaker
    │
    ├── OPEN ──► Return failure immediately (no request made)
    │
    └── CLOSED/HALF_OPEN
            │
            ▼
        Make request with retries
            │
            ├── Success ──► Record success in circuit breaker
            │
            └── Failure ──► Record failure in circuit breaker
                    │
                    ▼
                Save result to database
```

**Concept: Response Validation**

We don't just check status codes. We also check:
1. **Status match:** Does the response code match what we expect?
2. **JSON validity:** If the response should be JSON, is it valid?
3. **Content type:** Does the response have the right content type?

**Tradeoff:** More validation = more accurate monitoring, but more code to maintain.

- [ ] **Step 2: Commit**

```bash
git add server/routes/apis.js
git commit -m "feat: add API routes with retry and circuit breaker"
```

---

## Task 5: API Check Result Model

**Files:**
- Create: `Internet-Observatory/server/models/ApiCheckResult.js`

- [ ] **Step 1: Create API check result model**

```javascript
import mongoose from 'mongoose';

const apiCheckResultSchema = new mongoose.Schema({
  apiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Api',
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

export default mongoose.model('ApiCheckResult', apiCheckResultSchema);
```

**Concept:** Separate model for API checks vs website checks. Why?
- Different data (APIs have expected status, websites don't)
- Different query patterns (API checks are more frequent)
- Cleaner separation of concerns

- [ ] **Step 2: Commit**

```bash
git add server/models/ApiCheckResult.js
git commit -m "feat: add API check result model"
```

---

## Task 6: Register API Routes

**Files:**
- Modify: `Internet-Observatory/server/index.js`

- [ ] **Step 1: Add API routes to server**

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import websiteRoutes from './routes/websites.js';
import checkRoutes from './routes/checks.js';
import apiRoutes from './routes/apis.js';

dotenv.config();

const app = express();

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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
```

**Concept:** Route registration. Each router handles its own endpoints. The server just wires them together.

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: register API routes in server"
```

---

## Task 7: Frontend API Client

**Files:**
- Modify: `Internet-Observatory/client/src/services/api.js`

- [ ] **Step 1: Add API endpoints to client**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Website endpoints
export const getWebsites = () => api.get('/websites');
export const addWebsite = (data) => api.post('/websites', data);
export const deleteWebsite = (id) => api.delete(`/websites/${id}`);
export const triggerCheck = (id) => api.post(`/websites/${id}/check`);
export const getCheckHistory = (id) => api.get(`/websites/${id}/checks`);

// API endpoints
export const getApis = () => api.get('/apis');
export const addApi = (data) => api.post('/apis', data);
export const deleteApi = (id) => api.delete(`/apis/${id}`);
export const triggerApiCheck = (id) => api.post(`/apis/${id}/check`);
export const getApiCheckHistory = (id) => api.get(`/apis/${id}/checks`);

export default api;
```

**Concept:** API client is a thin wrapper around axios. It provides a clean interface for the frontend to call the backend.

- [ ] **Step 2: Commit**

```bash
git add client/src/services/api.js
git commit -m "feat: add API client endpoints"
```

---

## Task 8: API Form Component

**Files:**
- Create: `Internet-Observatory/client/src/components/ApiForm.jsx`

- [ ] **Step 1: Create API form component**

```jsx
import { useState } from 'react';

function ApiForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !url) return;
    
    setLoading(true);
    await onSubmit({ name, url, method });
    setName('');
    setUrl('');
    setMethod('GET');
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
          placeholder="GitHub API"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          placeholder="https://api.github.com/users/octocat"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading || !name || !url}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add API'}
      </button>
    </form>
  );
}

export default ApiForm;
```

**Concept:** Form component with controlled inputs. Same pattern as WebsiteForm, but with method selector.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ApiForm.jsx
git commit -m "feat: add API form component"
```

---

## Task 9: API Check History Component

**Files:**
- Create: `Internet-Observatory/client/src/components/ApiCheckHistory.jsx`

- [ ] **Step 1: Create API check history component**

```jsx
function ApiCheckHistory({ history, loading }) {
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

export default ApiCheckHistory;
```

**Concept:** Same as CheckHistory, but for API checks. Could be refactored into a shared component, but YAGNI for now.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ApiCheckHistory.jsx
git commit -m "feat: add API check history component"
```

---

## Task 10: API List Component

**Files:**
- Create: `Internet-Observatory/client/src/components/ApiList.jsx`

- [ ] **Step 1: Create API list component**

```jsx
import { useState } from 'react';
import { getApiCheckHistory } from '../services/api';
import ApiCheckHistory from './ApiCheckHistory';

function ApiList({ apis, onDelete, onCheck }) {
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
      const response = await getApiCheckHistory(id);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
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
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{api.name}</h3>
                {getCircuitBreakerBadge(api.circuitBreaker)}
              </div>
              <p className="text-gray-600 text-sm">
                <span className="font-mono bg-gray-100 px-1 rounded">{api.method}</span>
                {' '}{api.url}
              </p>
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
            <ApiCheckHistory history={history} loading={loadingHistory} />
          )}
        </div>
      ))}
    </div>
  );
}

export default ApiList;
```

**Concept:** Circuit breaker status display. Users can see if an API's circuit is OPEN (tripped), CLOSED (normal), or HALF_OPEN (testing).

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ApiList.jsx
git commit -m "feat: add API list component with circuit breaker display"
```

---

## Task 11: Update App Component

**Files:**
- Modify: `Internet-Observatory/client/src/App.jsx`

- [ ] **Step 1: Add API monitoring section to App**

```jsx
import { useState, useEffect } from 'react';
import { 
  getWebsites, addWebsite, deleteWebsite, triggerCheck,
  getApis, addApi, deleteApi, triggerApiCheck
} from './services/api';
import WebsiteList from './components/WebsiteList';
import WebsiteForm from './components/WebsiteForm';
import ApiList from './components/ApiList';
import ApiForm from './components/ApiForm';

function App() {
  const [websites, setWebsites] = useState([]);
  const [apis, setApis] = useState([]);
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

  const fetchApis = async () => {
    try {
      const response = await getApis();
      setApis(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch APIs');
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
      setError('Failed to add website');
    }
  };

  const handleDeleteWebsite = async (id) => {
    try {
      await deleteWebsite(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to delete website');
    }
  };

  const handleCheckWebsite = async (id) => {
    try {
      await triggerCheck(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to trigger check');
    }
  };

  const handleAddApi = async (data) => {
    try {
      await addApi(data);
      fetchApis();
    } catch (err) {
      setError('Failed to add API');
    }
  };

  const handleDeleteApi = async (id) => {
    try {
      await deleteApi(id);
      fetchApis();
    } catch (err) {
      setError('Failed to delete API');
    }
  };

  const handleCheckApi = async (id) => {
    try {
      await triggerApiCheck(id);
      fetchApis();
    } catch (err) {
      setError('Failed to trigger API check');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Internet Observatory</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
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

**Concept:** Single-page app with two monitoring sections: Websites and APIs. Same patterns, different data.

- [ ] **Step 2: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: add API monitoring section to App"
```

---

## Task 12: Integration Testing

**Files:**
- Test: Full system integration

- [ ] **Step 1: Start the backend**

Run: `cd Internet-Observatory/server && npm start`
Keep this terminal running

- [ ] **Step 2: Start the frontend (new terminal)**

Run: `cd Internet-Observatory/client && npm run dev`

- [ ] **Step 3: Test website monitoring (existing)**

1. Open http://localhost:5173
2. Add a website (e.g., "Google" with URL "https://google.com")
3. Click "Check Now"
4. Verify result appears (UP or DOWN)
5. Click "View History" to see past checks

- [ ] **Step 4: Test API monitoring (new)**

1. Add an API (e.g., "GitHub API" with URL "https://api.github.com/users/octocat")
2. Click "Check Now"
3. Verify result appears with status code and response time
4. Click "View History" to see past checks
5. Verify circuit breaker badge shows "CLOSED"

- [ ] **Step 5: Test circuit breaker**

1. Add an API with an invalid URL (e.g., "https://invalid.example.com")
2. Click "Check Now" 5 times
3. Verify circuit breaker badge changes to "OPEN"
4. Click "Check Now" again
5. Verify the check fails immediately (no retry, fast response)

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: complete Phase 2 API observatory with retry and circuit breaker"
```

---

## Summary

This implementation adds:

- **API Model:** Store endpoint configuration with headers, expected status, timeout, retries
- **Retry Service:** Exponential backoff with jitter to prevent thundering herd
- **Circuit Breaker:** Stop trying when APIs consistently fail, test recovery periodically
- **Response Validation:** Check status codes AND JSON validity
- **API Routes:** CRUD operations + check triggering with retry/circuit breaker logic
- **Frontend Components:** Forms, lists, and history display for API monitoring

**Concepts learned:**
- Why retries need exponential backoff
- How circuit breakers prevent cascade failures
- Why status codes aren't enough (need response validation)
- How to distinguish DOWN vs RATE_LIMITED vs ERROR

**Questions that emerge:**
- How do we handle authentication (API keys)?
- What about scheduled checks (cron jobs)?
- How do we monitor response time trends?

These will be addressed in later phases.
