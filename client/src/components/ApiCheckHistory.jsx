function ApiCheckHistory({ history, loading }) {
  if (loading) {
    return <p className="text-gray-500 mt-4">Loading history...</p>;
  }

  if (history.length === 0) {
    return <p className="text-gray-500 mt-4">No check history yet.</p>;
  }

  return (
    <div className="mt-4">
      <h4 className="font-medium text-gray-700 mb-2">Check History</h4>
      <div className="space-y-2">
        {history.map((check) => (
          <div
            key={check._id}
            className={`p-2 rounded text-sm ${
              check.success ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            <div className="flex justify-between">
              <span className={check.success ? 'text-green-800' : 'text-red-800'}>
                {check.success ? 'UP' : 'DOWN'}
              </span>
              <span className="text-gray-600">
                {check.status || 'N/A'} • {check.responseTime}ms
              </span>
            </div>
            {check.error && (
              <p className="text-red-600 text-xs mt-1">{check.error}</p>
            )}
            <p className="text-gray-500 text-xs">
              {new Date(check.checkedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApiCheckHistory;