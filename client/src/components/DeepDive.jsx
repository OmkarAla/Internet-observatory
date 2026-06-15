function DeepDive({ queries }) {
  if (!queries) return null;

  const firstResolver = Object.values(queries)[0];
  if (!firstResolver) return null;

  const sampleRecords = firstResolver.records?.A?.[0] || firstResolver.records?.AAAA?.[0] || null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Deep Dive — DNS Packet Structure</h3>
      <div className="bg-gray-900 text-green-400 rounded p-4 font-mono text-sm overflow-x-auto">
        <div className="mb-2 text-gray-500"># DNS Response Header</div>
        <div className="ml-4">
          <span className="text-yellow-400">ID:</span> 0x{(Math.random() * 0xffff | 0).toString(16).padStart(4, '0')}<br />
          <span className="text-yellow-400">Flags:</span> 0x8180 (Standard response, recursion desired, recursion available)<br />
          <span className="text-yellow-400">Questions:</span> 1<br />
          <span className="text-yellow-400">Answers:</span> {firstResolver.records?.A?.length || firstResolver.records?.AAAA?.length || 0}<br />
          <span className="text-yellow-400">Authority:</span> 0<br />
          <span className="text-yellow-400">Additional:</span> 0
        </div>

        <div className="mt-4 mb-2 text-gray-500"># Questions</div>
        <div className="ml-4">
          <span className="text-yellow-400">Name:</span> google.com<br />
          <span className="text-yellow-400">Type:</span> A (1)<br />
          <span className="text-yellow-400">Class:</span> IN (1)
        </div>

        <div className="mt-4 mb-2 text-gray-500"># Answers</div>
        <div className="ml-4">
          {sampleRecords ? (
            <>
              <span className="text-yellow-400">Name:</span> google.com<br />
              <span className="text-yellow-400">Type:</span> A (1)<br />
              <span className="text-yellow-400">Class:</span> IN (1)<br />
              <span className="text-yellow-400">TTL:</span> {sampleRecords.TTL}s<br />
              <span className="text-yellow-400">Data:</span> {sampleRecords.data}
            </>
          ) : (
            <span className="text-gray-500">No A/AAAA records in response</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeepDive;
