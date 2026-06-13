import { useState } from 'react';

function ApiForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !url) return;
    
    setLoading(true);
    await onSubmit({ name, url, method });
    setName('');
    setUrl('');
    setMethod('GET');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          placeholder="GitHub API"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          placeholder="https://api.github.com/users/octocat"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading || !name || !url}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add API'}
      </button>
    </form>
  );
}

export default ApiForm;