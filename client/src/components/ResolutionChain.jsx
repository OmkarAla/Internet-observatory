function ResolutionChain({ chain }) {
  if (!chain || chain.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Resolution Chain</h3>
      <div className="flex items-center gap-2 flex-wrap">
        {chain.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="bg-blue-100 border border-blue-300 rounded px-4 py-2 text-center">
              <div className="font-semibold text-blue-800">{step.server}</div>
              <div className="text-xs text-blue-600 max-w-[200px]">{step.description}</div>
            </div>
            {index < chain.length - 1 && (
              <span className="text-gray-400 text-xl">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResolutionChain;
