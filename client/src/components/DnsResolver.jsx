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
