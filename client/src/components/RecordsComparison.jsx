function RecordsComparison({ queries }) {
  if (!queries) return null;

  const resolverOrder = ['google', 'cloudflare', 'quad9'];
  const resolverNames = { google: 'Google', cloudflare: 'Cloudflare', quad9: 'Quad9' };

  const allTypes = new Set();
  Object.values(queries).forEach((q) => {
    Object.keys(q.records || {}).forEach((t) => allTypes.add(t));
  });
  const recordTypes = Array.from(allTypes).sort();

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Records Comparison</h3>
      <div className="grid grid-cols-3 gap-4">
        {resolverOrder.map((key) => {
          const q = queries[key];
          if (!q) return <div key={key} className="border rounded p-4 bg-gray-50">Loading...</div>;

          return (
            <div key={key} className="border rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">{resolverNames[key]}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  q.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {q.responseTime}ms
                </span>
              </div>

              {q.error && (
                <div className="text-red-600 text-sm mb-2">⚠️ {q.error}</div>
              )}

              {recordTypes.map((type) => {
                const records = q.records?.[type] || [];
                return (
                  <div key={type} className="mb-2">
                    <div className="text-xs font-mono text-gray-500">{type}</div>
                    {records.length === 0 ? (
                      <div className="text-xs text-gray-400 italic">No records</div>
                    ) : (
                      records.map((r, i) => (
                        <div key={i} className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                          {r.data}
                          {r.priority && <span className="text-gray-400 ml-1">pri:{r.priority}</span>}
                          <span className="text-gray-300 ml-1">TTL:{r.TTL}</span>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecordsComparison;
