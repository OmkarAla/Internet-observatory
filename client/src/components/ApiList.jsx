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
