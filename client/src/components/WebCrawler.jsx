import { useState } from 'react';
import axios from 'axios';

function WebCrawler() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('single');
  const [depth, setDepth] = useState(1);
  const [maxPages, setMaxPages] = useState(10);
  const [sameDomain, setSameDomain] = useState(false);
  const [concurrency, setConcurrency] = useState(3);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCrawl = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      if (mode === 'single') {
        response = await axios.get(`/api/crawler/crawl?url=${encodeURIComponent(url)}`);
      } else {
        const params = new URLSearchParams({
          url,
          depth: depth.toString(),
          maxPages: maxPages.toString(),
          sameDomain: sameDomain.toString(),
          concurrency: concurrency.toString()
        });
        response = await axios.get(`/api/crawler/bfs?${params}`);
      }
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to crawl');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCrawl();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Web Crawler</h2>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL (e.g., https://example.com)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCrawl}
          disabled={loading || !url.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Crawling...' : 'Crawl'}
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="single"
            checked={mode === 'single'}
            onChange={() => setMode('single')}
          />
          Single Page
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="bfs"
            checked={mode === 'bfs'}
            onChange={() => setMode('bfs')}
          />
          BFS Traversal
        </label>
      </div>

      {mode === 'bfs' && (
        <div className="bg-gray-50 rounded p-3 mb-4">
          <div className="flex gap-4 mb-3">
            <div>
              <label className="block text-sm text-gray-600">Depth (max 3)</label>
              <input
                type="number"
                value={depth}
                onChange={(e) => setDepth(Math.min(parseInt(e.target.value) || 1, 3))}
                min="1"
                max="3"
                className="w-20 px-2 py-1 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Max Pages (max 50)</label>
              <input
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(Math.min(parseInt(e.target.value) || 10, 50))}
                min="1"
                max="50"
                className="w-20 px-2 py-1 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Concurrency (1-5)</label>
              <input
                type="number"
                value={concurrency}
                onChange={(e) => setConcurrency(Math.min(Math.max(parseInt(e.target.value) || 3, 1), 5))}
                min="1"
                max="5"
                className="w-20 px-2 py-1 border border-gray-300 rounded"
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sameDomain}
              onChange={(e) => setSameDomain(e.target.checked)}
            />
            <span className="text-sm text-gray-600">Same domain only</span>
          </label>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Results</h3>

          {mode === 'single' ? (
            <div>
              <p><strong>URL:</strong> {result.url}</p>
              <p><strong>Status:</strong> {result.status || 'N/A'}</p>
              <p><strong>Response Time:</strong> {result.responseTime}ms</p>
              <p><strong>Size:</strong> {result.size?.toLocaleString()} bytes</p>
              <p><strong>Links Found:</strong> {result.linksCount}</p>

              {result.error && (
                <p className="text-red-600 mt-2"><strong>Error:</strong> {result.error}</p>
              )}

              {result.links?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Discovered Links:</h4>
                  <ul className="list-disc list-inside text-sm max-h-60 overflow-y-auto">
                    {result.links.map((link, i) => (
                      <li key={i} className="text-blue-600">{link}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex gap-4 text-sm text-gray-600 mb-3">
                <span>Start: {result.startUrl}</span>
                <span>Crawled: {result.pagesCrawled}</span>
                <span>Visited: {result.visitedCount}</span>
                <span>Queue: {result.queueRemaining}</span>
                {result.sameDomain && <span className="text-green-600">Same domain</span>}
              </div>

              {result.errors?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                  <p className="text-sm font-medium text-yellow-800">
                    {result.errors.length} error(s) during crawl
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {result.results?.map((page, i) => (
                  <div key={i} className={`bg-white p-3 rounded border ${page.error ? 'border-red-200' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{page.url}</p>
                        <p className="text-xs text-gray-500">
                          Depth: {page.depth} | Status: {page.status || 'ERR'} |
                          Time: {page.responseTime}ms | Links: {page.linksCount}
                        </p>
                      </div>
                      {page.error && (
                        <span className="text-red-600 text-xs ml-2 shrink-0">{page.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WebCrawler;