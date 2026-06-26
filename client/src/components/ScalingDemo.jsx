import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/scaling';

const ScalingDemo = () => {
  const [activeTab, setActiveTab] = useState('rate-limit');
  const [rateLimitStats, setRateLimitStats] = useState(null);
  const [slidingWindowStats, setSlidingWindowStats] = useState(null);
  const [loadBalancerStats, setLoadBalancerStats] = useState(null);
  const [bottleneckAnalysis, setBottleneckAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const tabs = [
    { id: 'rate-limit', label: 'Rate Limiting' },
    { id: 'load-balance', label: 'Load Balancing' },
    { id: 'bottleneck', label: 'Bottleneck Analysis' },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [rl, sw, lb, bn] = await Promise.all([
        axios.get(`${API_BASE}/rate-limit/stats`),
        axios.get(`${API_BASE}/sliding-window/stats`),
        axios.get(`${API_BASE}/load-balance/stats`),
        axios.get(`${API_BASE}/bottleneck`)
      ]);
      setRateLimitStats(rl.data);
      setSlidingWindowStats(sw.data);
      setLoadBalancerStats(lb.data);
      setBottleneckAnalysis(bn.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const testRateLimit = async (type) => {
    setLoading(true);
    try {
      const endpoint = type === 'token' ? '/rate-limit' : '/sliding-window';
      const response = await axios.post(`${API_BASE}${endpoint}`);
      setResults(prev => [{ type, ...response.data }, ...prev].slice(0, 20));
      fetchStats();
    } catch (err) {
      console.error('Rate limit test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const burstRateLimit = async () => {
    setLoading(true);
    try {
      const promises = Array(15).fill().map(() => axios.post(`${API_BASE}/rate-limit`));
      const responses = await Promise.all(promises);
      const newResults = responses.map((r, i) => ({ 
        type: 'burst', 
        attempt: i + 1,
        ...r.data 
      }));
      setResults(prev => [...newResults, ...prev].slice(0, 50));
      fetchStats();
    } catch (err) {
      console.error('Burst test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const distributeRequest = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/load-balance`);
      setResults(prev => [{ type: 'distribute', ...response.data }, ...prev].slice(0, 20));
      fetchStats();
    } catch (err) {
      console.error('Distribute failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeAlgorithm = async (algorithm) => {
    try {
      await axios.post(`${API_BASE}/load-balance/algorithm`, { algorithm });
      fetchStats();
    } catch (err) {
      console.error('Change algorithm failed:', err);
    }
  };

  const toggleServer = async (serverId) => {
    try {
      await axios.post(`${API_BASE}/load-balance/toggle`, { serverId });
      fetchStats();
    } catch (err) {
      console.error('Toggle server failed:', err);
    }
  };

  const simulateLoad = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/simulate`, {
        requests: 200,
        avgResponseTime: 150
      });
      setBottleneckAnalysis(response.data.analysis);
      fetchStats();
    } catch (err) {
      console.error('Simulate failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderRateLimitTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Token Bucket</h3>
        <p className="text-sm text-gray-600 mb-4">
          Tokens refill at a fixed rate. Burst up to capacity, then limited to refill rate.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => testRateLimit('token')}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Test Token Bucket
          </button>
          <button
            onClick={burstRateLimit}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            Burst (15 requests)
          </button>
        </div>
        {rateLimitStats && (
          <div className="grid grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-green-600">{rateLimitStats.allowed}</div>
              <div className="text-gray-500">Allowed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{rateLimitStats.rejected}</div>
              <div className="text-gray-500">Rejected</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{rateLimitStats.tokens}</div>
              <div className="text-gray-500">Tokens Left</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{rateLimitStats.capacity}</div>
              <div className="text-gray-500">Capacity</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Sliding Window</h3>
        <p className="text-sm text-gray-600 mb-4">
          Counts requests in a rolling time window. More accurate than fixed windows.
        </p>
        <button
          onClick={() => testRateLimit('sliding')}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 mb-4"
        >
          Test Sliding Window
        </button>
        {slidingWindowStats && (
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-green-600">{slidingWindowStats.allowed}</div>
              <div className="text-gray-500">Allowed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{slidingWindowStats.rejected}</div>
              <div className="text-gray-500">Rejected</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{slidingWindowStats.requestsInWindow}/{slidingWindowStats.maxRequests}</div>
              <div className="text-gray-500">In Window</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLoadBalanceTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Load Balancer</h3>
        <div className="flex gap-2 mb-4">
          <button
            onClick={distributeRequest}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Distribute Request
          </button>
        </div>
        
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mr-2">Algorithm:</label>
          <div className="inline-flex gap-1">
            {['round-robin', 'least-connections', 'weighted'].map(algo => (
              <button
                key={algo}
                onClick={() => changeAlgorithm(algo)}
                className={`px-3 py-1 rounded text-sm ${
                  loadBalancerStats?.algorithm === algo
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>
        </div>

        {loadBalancerStats?.servers && (
          <div className="space-y-3">
            {loadBalancerStats.servers.map(server => (
              <div key={server.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${server.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">{server.id}</span>
                  <span className="text-sm text-gray-500">Weight: {server.weight}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">Connections: {server.connections}</span>
                  <span className="text-sm">Total: {server.totalRequests}</span>
                  <button
                    onClick={() => toggleServer(server.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Toggle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderBottleneckTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Bottleneck Analysis</h3>
        <button
          onClick={simulateLoad}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 mb-4"
        >
          Simulate 200 Requests
        </button>
        
        {bottleneckAnalysis && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-center">
              <div>
                <div className="text-2xl font-bold">{bottleneckAnalysis.metrics?.requests?.perSecond || 0}</div>
                <div className="text-sm text-gray-500">Req/sec</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{bottleneckAnalysis.metrics?.responseTime?.avg || 0}ms</div>
                <div className="text-sm text-gray-500">Avg Response</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{bottleneckAnalysis.metrics?.responseTime?.p95 || 0}ms</div>
                <div className="text-sm text-gray-500">P95 Response</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{bottleneckAnalysis.metrics?.database?.avgQueryTime || 0}ms</div>
                <div className="text-sm text-gray-500">Avg Query</div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded mb-4">
              <h4 className="font-medium mb-2">Little's Law (L = λW)</h4>
              <div className="text-sm space-y-1">
                <div>Arrival Rate (λ): {bottleneckAnalysis.littleLaw?.arrivalRate}</div>
                <div>Avg Response Time (W): {bottleneckAnalysis.littleLaw?.avgResponseTime}</div>
                <div>Requests in System (L): {bottleneckAnalysis.littleLaw?.requestsInSystem}</div>
                <div className="font-medium mt-2">{bottleneckAnalysis.littleLaw?.interpretation}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Bottlenecks Detected:</h4>
              {bottleneckAnalysis.bottlenecks?.map((b, i) => (
                <div key={i} className={`p-3 rounded ${
                  b.severity === 'high' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="font-medium">{b.type}: {b.message}</div>
                  <div className="text-sm text-gray-600 mt-1">Solution: {b.solution}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Scaling & Performance</h2>

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rate-limit' && renderRateLimitTab()}
      {activeTab === 'load-balance' && renderLoadBalanceTab()}
      {activeTab === 'bottleneck' && renderBottleneckTab()}

      {/* Results Log */}
      {results.length > 0 && (
        <div className="mt-6 bg-gray-900 text-green-400 rounded-lg p-4 max-h-64 overflow-y-auto">
          <h3 className="text-sm font-medium mb-2 text-gray-400">Results Log:</h3>
          {results.map((r, i) => (
            <div key={i} className="text-xs font-mono mb-1">
              {r.type === 'token' && (
                <span>{r.allowed ? '✓ ALLOWED' : '✗ REJECTED'} — Tokens: {r.tokensRemaining}</span>
              )}
              {r.type === 'sliding' && (
                <span>{r.allowed ? '✓ ALLOWED' : '✗ REJECTED'} — In window: {r.requestsInWindow}/{r.maxRequests}</span>
              )}
              {r.type === 'burst' && (
                <span>{r.allowed ? '✓' : '✗'} Attempt {r.attempt} — {r.tokensRemaining} tokens left</span>
              )}
              {r.type === 'distribute' && (
                <span>→ {r.server?.id} ({r.server?.connections} conn)</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScalingDemo;
