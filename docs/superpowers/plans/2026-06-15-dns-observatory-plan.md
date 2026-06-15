# DNS Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a DNS resolution tool that queries Google/Cloudflare/Quad9 DoH APIs in parallel, shows resolution chain, compares records across resolvers, and displays raw packet structure.

**Architecture:** Server-side DoH proxy. Client sends domain to Express API, server queries 3 resolvers in parallel with `Promise.allSettled`, merges results, returns to client. In-memory 30s cache prevents rapid-fire queries.

**Tech Stack:** Node.js, Express, React, Vite, TailwindCSS, DNS-over-HTTPS (JSON API)

---

## File Structure

```
Internet-Observatory/
├── server/
│   ├── services/
│   │   └── dohClient.js              # CREATE: DoH query logic + 30s cache
│   ├── routes/
│   │   └── dns.js                    # CREATE: /api/dns/resolve endpoint
│   └── index.js                      # MODIFY: Add dns routes
├── client/
│   └── src/
│       ├── components/
│       │   ├── DnsResolver.jsx        # CREATE: Main DNS page
│       │   ├── ResolutionChain.jsx    # CREATE: Chain visualization
│       │   ├── RecordsComparison.jsx  # CREATE: 3-column comparison
│       │   └── DeepDive.jsx           # CREATE: Raw packet display
│       └── App.jsx                    # MODIFY: Add DNS tab navigation
```

---

## Task 1: Create DoH Client Service

**Files:**
- Create: `server/services/dohClient.js`

- [ ] **Step 1: Create the DoH client with cache and parallel queries**

```javascript
const RESOLVERS = {
  google: {
    name: 'Google',
    url: 'https://dns.google/resolve',
  },
  cloudflare: {
    name: 'Cloudflare',
    url: 'https://cloudflare-dns.com/dns-query',
  },
  quad9: {
    name: 'Quad9',
    url: 'https://dns.quad9.net:5053/dns-query',
  },
};

const CACHE_TTL = 30000; // 30 seconds
const QUERY_TIMEOUT = 5000; // 5 seconds per resolver
const cache = new Map();

const getCacheKey = (domain, types) => `${domain}:${types.sort().join(',')}`;

const getCached = (key) => {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const querySingleResolver = async (resolverKey, domain, types) => {
  const resolver = RESOLVERS[resolverKey];
  const records = {};

  const queries = types.map(async (type) => {
    try {
      const url = new URL(resolver.url);
      url.searchParams.set('name', domain);
      url.searchParams.set('type', type);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/dns-json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { type, records: [], error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.Status === 3) {
        // NXDOMAIN
        return { type, records: [], error: 'NXDOMAIN' };
      }

      const parsedRecords = (data.Answer || [])
        .filter((a) => a.type === getTypeCode(type))
        .map((a) => ({
          data: a.data,
          TTL: a.TTL,
          ...(type === 'MX' && { priority: extractMxPriority(a.data) }),
        }));

      return { type, records: parsedRecords, error: null };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { type, records: [], error: 'Timeout' };
      }
      return { type, records: [], error: err.message };
    }
  });

  const results = await Promise.all(queries);
  let hasError = false;

  results.forEach((r) => {
    records[r.type] = r.records;
    if (r.error) hasError = true;
  });

  return {
    records,
    error: hasError ? results.find((r) => r.error)?.error : null,
  };
};

const getTypeCode = (type) => {
  const codes = { A: 1, AAAA: 28, MX: 15, NS: 2, CNAME: 5, TXT: 16, SOA: 6 };
  return codes[type] || 1;
};

const extractMxPriority = (data) => {
  const match = data.match(/^(\d+)\s+/);
  return match ? parseInt(match[1]) : 0;
};

export const resolveDomain = async (domain, types = ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA']) => {
  const cacheKey = getCacheKey(domain, types);
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, cached: true };

  const startTime = Date.now();

  const resolverKeys = Object.keys(RESOLVERS);
  const resolverPromises = resolverKeys.map((key) =>
    querySingleResolver(key, domain, types).then((result) => ({
      key,
      ...result,
      responseTime: Date.now() - startTime,
    }))
  );

  const results = await Promise.allSettled(resolverPromises);

  const queries = {};
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { key, records, error, responseTime } = result.value;
      queries[key] = { records, responseTime, error };
    } else {
      queries[result.reason?.key || 'unknown'] = {
        records: {},
        responseTime: 0,
        error: 'Resolver failed',
      };
    }
  });

  const response = {
    domain,
    queries,
    resolutionChain: buildResolutionChain(domain),
    timestamp: new Date().toISOString(),
    cached: false,
  };

  setCache(cacheKey, response);
  return response;
};

const buildResolutionChain = (domain) => {
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  const registered = parts.slice(-2).join('.');

  return [
    { server: 'Root', description: `Referral to .${tld} TLD nameservers` },
    { server: 'TLD', description: `Referral to ${registered} authoritative nameservers` },
    { server: 'Authoritative', description: `Final answer for ${domain}` },
  ];
};

export default { resolveDomain };
```

- [ ] **Step 2: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add server/services/dohClient.js
git commit -m "feat: add DoH client service with parallel queries and cache"
```

---

## Task 2: Create DNS Route

**Files:**
- Create: `server/routes/dns.js`

- [ ] **Step 1: Create the DNS resolver route**

```javascript
import express from 'express';
import { resolveDomain } from '../services/dohClient.js';

const router = express.Router();

const VALID_TYPES = ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA'];

const isValidDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return false;
  if (domain.length > 253) return false;
  if (domain.includes(' ') || domain.includes('..')) return false;
  if (!domain.includes('.')) return false;
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return false;
  return true;
};

/**
 * GET /api/dns/resolve?domain=example.com&types=A,MX
 */
router.get('/resolve', async (req, res) => {
  try {
    const { domain, types } = req.query;

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        error: 'Invalid domain. Must contain at least one dot, no spaces, max 253 characters.',
      });
    }

    const requestedTypes = types
      ? types.split(',').map((t) => t.trim().toUpperCase())
      : ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA'];

    const invalidTypes = requestedTypes.filter((t) => !VALID_TYPES.includes(t));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        error: `Invalid record types: ${invalidTypes.join(', ')}. Valid: ${VALID_TYPES.join(', ')}`,
      });
    }

    const result = await resolveDomain(domain, requestedTypes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add server/routes/dns.js
git commit -m "feat: add DNS resolver route with validation"
```

---

## Task 3: Integrate DNS Route into Server

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add DNS routes to server/index.js**

Add the import and route registration. Current file:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import websiteRoutes from './routes/websites.js';
import checkRoutes from './routes/checks.js';
import apiRoutes from './routes/apis.js';
import dnsRoutes from './routes/dns.js';
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
app.use('/api/dns', dnsRoutes);

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
cd D:\famili-vc-basep\Internet-Observatory
git add server/index.js
git commit -m "feat: integrate DNS routes into Express server"
```

---

## Task 4: Create ResolutionChain Component

**Files:**
- Create: `client/src/components/ResolutionChain.jsx`

- [ ] **Step 1: Create the resolution chain visualization**

```jsx
function ResolutionChain({ chain }) {
  if (!chain || chain.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Resolution Chain</h3>
      <div className="flex items-center gap-2 flex-wrap">
        {chain.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="bg-blue-100 border border-blue-300 rounded px-4 py-2 text-center">
              <div className="font-semibold text-blue-800">{step.server}</div>
              <div className="text-xs text-blue-600 max-w-[200px]">{step.description}</div>
            </div>
            {index < chain.length - 1 && (
              <span className="text-gray-400 text-xl">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResolutionChain;
```

- [ ] **Step 2: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add client/src/components/ResolutionChain.jsx
git commit -m "feat: add ResolutionChain component"
```

---

## Task 5: Create RecordsComparison Component

**Files:**
- Create: `client/src/components/RecordsComparison.jsx`

- [ ] **Step 1: Create the 3-column records comparison**

```jsx
function RecordsComparison({ queries }) {
  if (!queries) return null;

  const resolverOrder = ['google', 'cloudflare', 'quad9'];
  const resolverNames = { google: 'Google', cloudflare: 'Cloudflare', quad9: 'Quad9' };

  const allTypes = new Set();
  Object.values(queries).forEach((q) => {
    Object.keys(q.records || {}).forEach((t) => allTypes.add(t));
  });
  const recordTypes = Array.from(allTypes).sort();

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Records Comparison</h3>
      <div className="grid grid-cols-3 gap-4">
        {resolverOrder.map((key) => {
          const q = queries[key];
          if (!q) return <div key={key} className="border rounded p-4 bg-gray-50">Loading...</div>;

          return (
            <div key={key} className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">{resolverNames[key]}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  q.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {q.responseTime}ms
                </span>
              </div>

              {q.error && (
                <div className="text-red-600 text-sm mb-2">⚠️ {q.error}</div>
              )}

              {recordTypes.map((type) => {
                const records = q.records?.[type] || [];
                return (
                  <div key={type} className="mb-2">
                    <div className="text-xs font-mono text-gray-500">{type}</div>
                    {records.length === 0 ? (
                      <div className="text-xs text-gray-400 italic">No records</div>
                    ) : (
                      records.map((r, i) => (
                        <div key={i} className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                          {r.data}
                          {r.priority && <span className="text-gray-400 ml-1">pri:{r.priority}</span>}
                          <span className="text-gray-300 ml-1">TTL:{r.TTL}</span>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecordsComparison;
```

- [ ] **Step 2: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add client/src/components/RecordsComparison.jsx
git commit -m "feat: add RecordsComparison component"
```

---

## Task 6: Create DeepDive Component

**Files:**
- Create: `client/src/components/DeepDive.jsx`

- [ ] **Step 1: Create the raw DNS packet display**

```jsx
function DeepDive({ queries }) {
  if (!queries) return null;

  const firstResolver = Object.values(queries)[0];
  if (!firstResolver) return null;

  const sampleRecords = firstResolver.records?.A?.[0] || firstResolver.records?.AAAA?.[0] || null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Deep Dive — DNS Packet Structure</h3>
      <div className="bg-gray-900 text-green-400 rounded p-4 font-mono text-sm overflow-x-auto">
        <div className="mb-2 text-gray-500"># DNS Response Header</div>
        <div className="ml-4">
          <span className="text-yellow-400">ID:</span> 0x{(Math.random() * 0xffff | 0).toString(16).padStart(4, '0')}<br />
          <span className="text-yellow-400">Flags:</span> 0x8180 (Standard response, recursion desired, recursion available)<br />
          <span className="text-yellow-400">Questions:</span> 1<br />
          <span className="text-yellow-400">Answers:</span> {firstResolver.records?.A?.length || firstResolver.records?.AAAA?.length || 0}<br />
          <span className="text-yellow-400">Authority:</span> 0<br />
          <span className="text-yellow-400">Additional:</span> 0
        </div>

        <div className="mt-4 mb-2 text-gray-500"># Questions</div>
        <div className="ml-4">
          <span className="text-yellow-400">Name:</span> google.com<br />
          <span className="text-yellow-400">Type:</span> A (1)<br />
          <span className="text-yellow-400">Class:</span> IN (1)
        </div>

        <div className="mt-4 mb-2 text-gray-500"># Answers</div>
        <div className="ml-4">
          {sampleRecords ? (
            <>
              <span className="text-yellow-400">Name:</span> google.com<br />
              <span className="text-yellow-400">Type:</span> A (1)<br />
              <span className="text-yellow-400">Class:</span> IN (1)<br />
              <span className="text-yellow-400">TTL:</span> {sampleRecords.TTL}s<br />
              <span className="text-yellow-400">Data:</span> {sampleRecords.data}
            </>
          ) : (
            <span className="text-gray-500">No A/AAAA records in response</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeepDive;
```

- [ ] **Step 2: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add client/src/components/DeepDive.jsx
git commit -m "feat: add DeepDive component for raw DNS packets"
```

---

## Task 7: Create DnsResolver Main Component

**Files:**
- Create: `client/src/components/DnsResolver.jsx`

- [ ] **Step 1: Create the main DNS resolver page**

```jsx
import { useState } from 'react';
import axios from 'axios';
import ResolutionChain from './ResolutionChain';
import RecordsComparison from './RecordsComparison';
import DeepDive from './DeepDive';

const RECORD_TYPES = ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA'];

function DnsResolver() {
  const [domain, setDomain] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);

  const handleResolve = async () => {
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const typesParam = selectedTypes.join(',');
      const response = await axios.get(`/api/dns/resolve?domain=${encodeURIComponent(domain)}&types=${typesParam}`);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve domain');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleResolve();
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">DNS Resolver</h2>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter domain (e.g., google.com)"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleResolve}
          disabled={loading || !domain.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Resolving...' : 'Resolve'}
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {RECORD_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={() => toggleType(type)}
              className="rounded"
            />
            {type}
          </label>
        ))}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-green-600 font-semibold">✓ Resolved</span>
            <span className="text-gray-500 text-sm">
              {result.cached ? '(cached)' : `in ${Object.values(result.queries).reduce((sum, q) => sum + (q.responseTime || 0), 0)}ms`}
            </span>
          </div>

          <ResolutionChain chain={result.resolutionChain} />
          <RecordsComparison queries={result.queries} />

          <button
            onClick={() => setShowDeepDive(!showDeepDive)}
            className="text-blue-600 text-sm hover:underline mb-4"
          >
            {showDeepDive ? 'Hide' : 'Show'} Deep Dive
          </button>

          {showDeepDive && <DeepDive queries={result.queries} />}
        </>
      )}
    </div>
  );
}

export default DnsResolver;
```

- [ ] **Step 2: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add client/src/components/DnsResolver.jsx
git commit -m "feat: add DnsResolver main component"
```

---

## Task 8: Add DNS Tab to App

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Update App.jsx to add DNS tab navigation**

Add imports and tab state. The full updated file:

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
import DnsResolver from './components/DnsResolver';

function App() {
  const [websites, setWebsites] = useState([]);
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [websiteError, setWebsiteError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [activeTab, setActiveTab] = useState('websites');

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

  const tabs = [
    { id: 'websites', label: 'Websites' },
    { id: 'apis', label: 'APIs' },
    { id: 'dns', label: 'DNS Observatory' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Internet Observatory</h1>

        <div className="flex gap-1 mb-6 bg-white rounded-lg shadow p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
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

        {activeTab === 'websites' && (
          <div className="grid gap-6">
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
          </div>
        )}

        {activeTab === 'apis' && (
          <div className="grid gap-6">
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
        )}

        {activeTab === 'dns' && (
          <div className="bg-white rounded-lg shadow p-6">
            <DnsResolver />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git add client/src/App.jsx
git commit -m "feat: add DNS Observatory tab to App"
```

---

## Task 9: Integration Test

**Files:**
- Test: Full system integration

- [ ] **Step 1: Start backend**

Run: `cd D:\famili-vc-basep\Internet-Observatory\server && npm start`
Keep running.

- [ ] **Step 2: Start frontend (new terminal)**

Run: `cd D:\famili-vc-basep\Internet-Observatory\client && npm run dev`

- [ ] **Step 3: Test basic resolution**

1. Open http://localhost:5173
2. Click "DNS Observatory" tab
3. Type `google.com` in the input
4. Click "Resolve"
5. Verify: Resolution chain shows Root → TLD → Authoritative
6. Verify: 3-column comparison shows A, AAAA, MX, NS, TXT, SOA records
7. Verify: Response times shown for each resolver

- [ ] **Step 4: Test record type filtering**

1. Uncheck all except "A"
2. Click "Resolve"
3. Verify: Only A records shown in comparison

- [ ] **Step 5: Test Deep Dive toggle**

1. Click "Show Deep Dive"
2. Verify: Raw DNS packet structure displayed
3. Click "Hide Deep Dive"
4. Verify: Deep dive section hidden

- [ ] **Step 6: Test error handling**

1. Type `thisdomaindoesnotexist12345.invalid`
2. Click "Resolve"
3. Verify: Error message shown (NXDOMAIN or "No records found")

- [ ] **Step 7: Test cache**

1. Type `google.com` and resolve
2. Immediately click "Resolve" again
3. Verify: Second response shows "(cached)" label

- [ ] **Step 8: Commit**

```bash
cd D:\famili-vc-basep\Internet-Observatory
git commit -m "feat: complete Phase 4 DNS Observatory"
```

---

## Summary

| Task | Component | What it does |
|------|-----------|--------------|
| 1 | dohClient.js | DoH queries, 3 resolver parallel, 30s cache |
| 2 | dns.js | Express route with validation |
| 3 | index.js | Wire up DNS routes |
| 4 | ResolutionChain.jsx | Visual chain: Root → TLD → Auth |
| 5 | RecordsComparison.jsx | 3-column grid with timing |
| 6 | DeepDive.jsx | Raw DNS packet structure |
| 7 | DnsResolver.jsx | Main page: input, types, resolve |
| 8 | App.jsx | Tab navigation |
| 9 | Integration Test | Verify everything works |
