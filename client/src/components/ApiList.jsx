import { useState } from 'react';
import { getApiCheckHistory } from '../services/api';
import ApiCheckHistory from './ApiCheckHistory';

function ApiList({ apis, onDelete, onCheck }) {
  const [expanded, setExpanded] = useState(null);
  const [historyMap, setHistoryMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});

  const handleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setLoadingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await getApiCheckHistory(id);
      setHistoryMap((prev) => ({ ...prev, [id]: response.data }));
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [id]: false }));
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
            <ApiCheckHistory history={historyMap[api._id] || []} loading={loadingMap[api._id] || false} />
          )}
        </div>
      ))}
    </div>
  );
}

export default ApiList;
