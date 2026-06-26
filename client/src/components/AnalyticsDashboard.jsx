import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/analytics';

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(24);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/dashboard?hours=${period}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-500">No data available</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Traffic Analytics</h2>
        <div className="flex gap-2">
          {[1, 6, 12, 24, 48, 168].map((h) => (
            <button
              key={h}
              onClick={() => setPeriod(h)}
              className={`px-3 py-1 rounded text-sm ${
                period === h
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Checks</div>
          <div className="text-3xl font-bold">{data.summary.totalChecks}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Overall Uptime</div>
          <div className={`text-3xl font-bold ${
            parseFloat(data.summary.uptime) >= 99 ? 'text-green-600' :
            parseFloat(data.summary.uptime) >= 95 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {data.summary.uptime}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Avg Response Time</div>
          <div className="text-3xl font-bold">{data.summary.avgResponseTime}ms</div>
        </div>
      </div>

      {/* Websites vs APIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Websites</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Checks</span>
              <span className="font-medium">{data.websites.checks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uptime</span>
              <span className={`font-medium ${
                parseFloat(data.websites.uptime) >= 99 ? 'text-green-600' :
                parseFloat(data.websites.uptime) >= 95 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.websites.uptime}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Response</span>
              <span className="font-medium">{data.websites.avgResponseTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min / Max</span>
              <span className="font-medium">{data.websites.minResponseTime}ms / {data.websites.maxResponseTime}ms</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">APIs</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Checks</span>
              <span className="font-medium">{data.apis.checks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uptime</span>
              <span className={`font-medium ${
                parseFloat(data.apis.uptime) >= 99 ? 'text-green-600' :
                parseFloat(data.apis.uptime) >= 95 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.apis.uptime}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Response</span>
              <span className="font-medium">{data.apis.avgResponseTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min / Max</span>
              <span className="font-medium">{data.apis.minResponseTime}ms / {data.apis.maxResponseTime}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Slow Endpoints */}
      {data.topSlow && data.topSlow.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Slowest Endpoints</h3>
          <div className="space-y-2">
            {data.topSlow.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{item._id || 'Unknown'}</span>
                <span className="font-medium">{item.avgResponseTime?.toFixed(0)}ms ({item.checks} checks)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
