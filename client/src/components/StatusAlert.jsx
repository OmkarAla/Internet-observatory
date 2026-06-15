import { useState, useEffect } from 'react';

function StatusAlert({ isDown, timestamp }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (timestamp) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [timestamp]);

  if (!visible || !timestamp) return null;

  return (
    <div className={`px-3 py-2 rounded text-sm mb-2 transition-opacity duration-500 ${
      isDown 
        ? 'bg-red-100 text-red-800 border border-red-200' 
        : 'bg-green-100 text-green-800 border border-green-200'
    }`}>
      {isDown ? '⚠️ Service is DOWN' : '✅ Service recovered'}
      <span className="float-right opacity-75">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

export default StatusAlert;
