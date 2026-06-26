import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/cache';

const CacheDemo = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoResults, setDemoResults] = useState({});
  const [demoLoading, setDemoLoading] = useState({});

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const runDemo = async (demoName) => {
    setDemoLoading(prev => ({ ...prev, [demoName]: true }));
    try {
      const start = Date.now();
      const response = await axios.get(`${API_BASE}/demo/${demoName}`);
      const duration = Date.now() - start;
      setDemoResults(prev => ({
        ...prev,
        [demoName]: { ...response.data, duration }
      }));
    } catch (err) {
      setDemoResults(prev => ({
        ...prev,
        [demoName]: { error: err.message }
      }));
    } finally {
      setDemoLoading(prev => ({ ...prev, [demoName]: false }));
    }
  };

  const clearCache = async () => {
    try {
      await axios.post(`${API_BASE}/clear`);
      fetchStats();
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading cache stats...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Cache Demonstration</h2>

      {/* Cache Stats */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Cache Statistics</h3>
          <button
            onClick={clearCache}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Clear Cache
          </button>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.size}</div>
              <div className="text-sm text-gray-500">Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.hitRate}</div>
              <div className="text-sm text-gray-500">Hit Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.hits}</div>
              <div className="text-sm text-gray-500">Hits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.misses}</div>
              <div className="text-sm text-gray-500">Misses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.sets}</div>
              <div className="text-sm text-gray-500">Sets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.evictions}</div>
              <div className="text-sm text-gray-500">Evictions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.staleServes}</div>
              <div className="text-sm text-gray-500">Stale Serves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.maxSize}</div>
              <div className="text-sm text-gray-500">Max Size</div>
            </div>
          </div>
        )}
      </div>

      {/* TTL Demo */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">TTL (Time-To-Live) Demo</h3>
        <p className="text-sm text-gray-600 mb-4">
          First request: cache miss (slow). Subsequent requests: cache hit (fast).
          After 10 seconds: cache expires, next request is a miss again.
        </p>
        <button
          onClick={() => runDemo('ttl')}
          disabled={demoLoading.ttl}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {demoLoading.ttl ? 'Fetching...' : 'Run TTL Demo'}
        </button>
        {demoResults.ttl && !demoResults.ttl.error && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div><strong>Source:</strong> {demoResults.ttl.source}</div>
            <div><strong>Value:</strong> {demoResults.ttl.data?.value?.toFixed(6)}</div>
            <div><strong>Time:</strong> {demoResults.ttl.data?.timestamp}</div>
            <div><strong>Duration:</strong> {demoResults.ttl.duration}ms</div>
            <div><strong>Age:</strong> {demoResults.ttl.age}ms</div>
          </div>
        )}
      </div>

      {/* Stale-While-Revalidate Demo */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Stale-While-Revalidate Demo</h3>
        <p className="text-sm text-gray-600 mb-4">
          After 5s TTL expires: returns stale data instantly, refreshes in background.
          Click multiple times after 5s to see stale data served while refreshing.
        </p>
        <button
          onClick={() => runDemo('stale')}
          disabled={demoLoading.stale}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {demoLoading.stale ? 'Fetching...' : 'Run Stale Demo'}
        </button>
        {demoResults.stale && !demoResults.stale.error && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div><strong>Source:</strong> {demoResults.stale.source}</div>
            <div><strong>Value:</strong> {demoResults.stale.data?.value?.toFixed(6)}</div>
            <div><strong>Time:</strong> {demoResults.stale.data?.timestamp}</div>
            <div><strong>Duration:</strong> {demoResults.stale.duration}ms</div>
            <div><strong>Age:</strong> {demoResults.stale.age}ms</div>
            {demoResults.stale.source === 'stale-cache' && (
              <div className="text-yellow-600 mt-2">
                ⚡ Stale data served while refreshing in background
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thundering Herd Demo */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Thundering Herd Protection Demo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Click multiple times rapidly. Without protection: N requests = N DB queries.
          With protection: N requests = 1 DB query. Check server console.
        </p>
        <button
          onClick={() => runDemo('thundering-herd')}
          disabled={demoLoading['thundering-herd']}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {demoLoading['thundering-herd'] ? 'Fetching...' : 'Run Thundering Herd Demo'}
        </button>
        {demoResults['thundering-herd'] && !demoResults['thundering-herd'].error && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div><strong>Source:</strong> {demoResults['thundering-herd'].source}</div>
            <div><strong>Value:</strong> {demoResults['thundering-herd'].data?.value?.toFixed(6)}</div>
            <div><strong>Duration:</strong> {demoResults['thundering-herd'].duration}ms</div>
            <div><strong>Message:</strong> {demoResults['thundering-herd'].data?.message}</div>
          </div>
        )}
      </div>

      {/* Cache-Aside Pattern Explanation */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Cache-Aside Pattern</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>1. Check cache first</strong> — Is the data already cached?</p>
          <p><strong>2. Cache hit?</strong> — Return cached value (fast)</p>
          <p><strong>3. Cache miss?</strong> — Fetch from origin (slow)</p>
          <p><strong>4. Store in cache</strong> — So next request is fast</p>
          <p><strong>5. Return value</strong> — Client gets the data</p>
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <strong>Key insight:</strong> The cache is "aside" from the application.
            The app explicitly checks cache, then decides whether to fetch from origin.
            This is different from "read-through" where the cache automatically fetches.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheDemo;
