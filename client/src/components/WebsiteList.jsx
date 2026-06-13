import { useState } from 'react';
import { getCheckHistory } from '../services/api';
import CheckHistory from './CheckHistory';

function WebsiteList({ websites, onDelete, onCheck }) {
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
      const response = await getCheckHistory(id);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  if (websites.length === 0) {
    return <p className="text-gray-500">No websites monitored yet.</p>;
  }

  return (
    <div className="space-y-4">
      {websites.map((website) => (
        <div key={website._id} className="border rounded p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{website.name}</h3>
              <p className="text-gray-600 text-sm">{website.url}</p>
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
            <CheckHistory history={history} loading={loadingHistory} />
          )}
        </div>
      ))}
    </div>
  );
}

export default WebsiteList;