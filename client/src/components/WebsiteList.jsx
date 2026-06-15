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
