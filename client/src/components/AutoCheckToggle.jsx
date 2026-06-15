function AutoCheckToggle({ checkInterval, onIntervalChange }) {
  const isEnabled = checkInterval !== null;
  const intervalSeconds = (checkInterval || 30000) / 1000;

  const handleToggle = () => {
    onIntervalChange(isEnabled ? null : 30000);
  };

  const handleSliderChange = (e) => {
    const seconds = parseInt(e.target.value);
    onIntervalChange(seconds * 1000);
  };

  return (
    <div className="flex items-center gap-3 text-sm mt-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600">Auto-check</span>
      </label>
      
      {isEnabled && (
        <>
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={intervalSeconds}
            onChange={handleSliderChange}
            className="w-32"
          />
          <span className="text-gray-500 w-12">{intervalSeconds}s</span>
        </>
      )}
    </div>
  );
}

export default AutoCheckToggle;
