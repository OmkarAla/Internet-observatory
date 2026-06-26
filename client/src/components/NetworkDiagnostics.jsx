import { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/network';

const NetworkDiagnostics = () => {
  const [activeTest, setActiveTest] = useState('tcp');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [tcpHost, setTcpHost] = useState('example.com');
  const [tcpPort, setTcpPort] = useState('80');
  const [scanHost, setScanHost] = useState('example.com');
  const [udpDomain, setUdpDomain] = useState('example.com');
  const [udpServer, setUdpServer] = useState('8.8.8.8');
  const [pingHost, setPingHost] = useState('8.8.8.8');
  const [tracerouteHost, setTracerouteHost] = useState('8.8.8.8');
  const [latencyHost, setLatencyHost] = useState('example.com');
  const [latencyPort, setLatencyPort] = useState('80');

  const tests = [
    { id: 'tcp', label: 'TCP Connect' },
    { id: 'scan', label: 'Port Scan' },
    { id: 'udp', label: 'UDP DNS' },
    { id: 'ping', label: 'ICMP Ping' },
    { id: 'traceroute', label: 'Traceroute' },
    { id: 'latency', label: 'Latency Test' },
  ];

  const runTest = async (testFn) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await testFn();
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const tcpConnectTest = () => runTest(() =>
    axios.post(`${API_BASE}/tcp-connect`, { host: tcpHost, port: parseInt(tcpPort) }).then(r => r.data)
  );

  const portScanTest = () => runTest(() =>
    axios.post(`${API_BASE}/port-scan`, { host: scanHost }).then(r => r.data)
  );

  const udpDnsTest = () => runTest(() =>
    axios.post(`${API_BASE}/udp-dns`, { domain: udpDomain, server: udpServer }).then(r => r.data)
  );

  const pingTest = () => runTest(() =>
    axios.post(`${API_BASE}/ping`, { host: pingHost, count: 4 }).then(r => r.data)
  );

  const tracerouteTest = () => runTest(() =>
    axios.post(`${API_BASE}/traceroute`, { host: tracerouteHost }).then(r => r.data)
  );

  const latencyTestFn = () => runTest(() =>
    axios.post(`${API_BASE}/latency`, { host: latencyHost, port: parseInt(latencyPort), count: 5 }).then(r => r.data)
  );

  const renderForm = () => {
    switch (activeTest) {
      case 'tcp':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={tcpHost}
                onChange={(e) => setTcpHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={tcpPort}
                onChange={(e) => setTcpPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="80"
              />
            </div>
            <button
              onClick={tcpConnectTest}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Testing...' : 'Test TCP Connect'}
            </button>
          </div>
        );

      case 'scan':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={scanHost}
                onChange={(e) => setScanHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example.com"
              />
            </div>
            <button
              onClick={portScanTest}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Scanning...' : 'Scan Ports'}
            </button>
          </div>
        );

      case 'udp':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                type="text"
                value={udpDomain}
                onChange={(e) => setUdpDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNS Server</label>
              <input
                type="text"
                value={udpServer}
                onChange={(e) => setUdpServer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8.8.8.8"
              />
            </div>
            <button
              onClick={udpDnsTest}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Querying...' : 'Query DNS over UDP'}
            </button>
          </div>
        );

      case 'ping':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={pingHost}
                onChange={(e) => setPingHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8.8.8.8"
              />
            </div>
            <button
              onClick={pingTest}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Pinging...' : 'Ping Host'}
            </button>
          </div>
        );

      case 'traceroute':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={tracerouteHost}
                onChange={(e) => setTracerouteHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8.8.8.8"
              />
            </div>
            <button
              onClick={tracerouteTest}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Tracing...' : 'Run Traceroute'}
            </button>
          </div>
        );

      case 'latency':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={latencyHost}
                onChange={(e) => setLatencyHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={latencyPort}
                onChange={(e) => setLatencyPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="80"
              />
            </div>
            <button
              onClick={latencyTestFn}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Testing...' : 'Test Latency'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    switch (activeTest) {
      case 'tcp':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">TCP Connect Result</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Host:</span> {result.host}</div>
              <div><span className="font-medium">Port:</span> {result.port}</div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-1 rounded ${result.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {result.status}
                </span>
              </div>
              <div><span className="font-medium">Latency:</span> {result.latency}ms</div>
              {result.error && <div className="col-span-2 text-red-600">{result.error}</div>}
            </div>
          </div>
        );

      case 'scan':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Port Scan Results</h3>
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.openPorts}</div>
                <div className="text-gray-500">Open</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{result.closedPorts}</div>
                <div className="text-gray-500">Closed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.timeoutPorts}</div>
                <div className="text-gray-500">Timeout</div>
              </div>
            </div>
            <div className="space-y-2">
              {result.ports.map((port, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span>Port {port.port}</span>
                  <span className={`px-2 py-1 rounded ${port.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {port.status} ({port.latency}ms)
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'udp':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">UDP DNS Query Result</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">Domain:</span> {result.domain}</div>
              <div><span className="font-medium">Server:</span> {result.server}</div>
              <div><span className="font-medium">Status:</span> {result.status}</div>
              <div><span className="font-medium">Latency:</span> {result.latency}ms</div>
            </div>
            {result.response?.answers && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Answers:</h4>
                <div className="space-y-1">
                  {result.response.answers.map((a, i) => (
                    <div key={i} className="text-sm bg-white p-2 rounded">
                      {a.type}: {a.data} (TTL: {a.ttl}s)
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.error && <div className="mt-4 text-red-600">{result.error}</div>}
          </div>
        );

      case 'ping':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Ping Result</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="font-medium">Host:</span> {result.host}</div>
              <div><span className="font-medium">Status:</span> {result.status}</div>
              <div><span className="font-medium">Sent:</span> {result.packets?.sent}</div>
              <div><span className="font-medium">Received:</span> {result.packets?.received}</div>
              <div><span className="font-medium">Loss:</span> {result.packets?.loss}%</div>
              <div><span className="font-medium">Avg:</span> {result.statistics?.avg?.toFixed(2)}ms</div>
              <div><span className="font-medium">Min:</span> {result.statistics?.min}ms</div>
              <div><span className="font-medium">Max:</span> {result.statistics?.max}ms</div>
            </div>
            {result.times?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Individual Times:</h4>
                <div className="flex gap-2">
                  {result.times.map((t, i) => (
                    <span key={i} className="px-2 py-1 bg-white rounded text-sm">{t}ms</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'traceroute':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Traceroute Result</h3>
            <div className="text-sm mb-4">
              <span className="font-medium">Host:</span> {result.host} |{' '}
              <span className="font-medium">Hops:</span> {result.hopCount}
            </div>
            <div className="space-y-2">
              {result.hops.map((hop, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <span className="w-8 text-right text-gray-500">{hop.hop}</span>
                  <span className="w-32 font-mono">{hop.ip}</span>
                  <span className="text-gray-600">{hop.time}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'latency':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Latency Test Result</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="font-medium">Host:</span> {result.host}</div>
              <div><span className="font-medium">Port:</span> {result.port}</div>
              <div><span className="font-medium">Successful:</span> {result.successful}/{result.count}</div>
              <div><span className="font-medium">Failed:</span> {result.failed}/{result.count}</div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold">{result.statistics?.min}ms</div>
                <div className="text-xs text-gray-500">Min</div>
              </div>
              <div>
                <div className="text-lg font-bold">{result.statistics?.max}ms</div>
                <div className="text-xs text-gray-500">Max</div>
              </div>
              <div>
                <div className="text-lg font-bold">{result.statistics?.avg?.toFixed(1)}ms</div>
                <div className="text-xs text-gray-500">Avg</div>
              </div>
              <div>
                <div className="text-lg font-bold">{result.statistics?.median}ms</div>
                <div className="text-xs text-gray-500">Median</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Network Diagnostics</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {tests.map((test) => (
          <button
            key={test.id}
            onClick={() => { setActiveTest(test.id); setResult(null); setError(null); }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTest === test.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {test.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        {renderForm()}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {renderResult()}
    </div>
  );
};

export default NetworkDiagnostics;
