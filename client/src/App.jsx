import { useState, useEffect } from 'react';
import { getWebsites, addWebsite, deleteWebsite, triggerCheck } from './services/api';
import WebsiteList from './components/WebsiteList';
import WebsiteForm from './components/WebsiteForm';

function App() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWebsites = async () => {
    try {
      const response = await getWebsites();
      setWebsites(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch websites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleAdd = async (data) => {
    try {
      await addWebsite(data);
      fetchWebsites();
    } catch (err) {
      setError('Failed to add website');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWebsite(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to delete website');
    }
  };

  const handleCheck = async (id) => {
    try {
      await triggerCheck(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to trigger check');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Internet Observatory</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Website</h2>
            <WebsiteForm onSubmit={handleAdd} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monitored Websites</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <WebsiteList 
                websites={websites} 
                onDelete={handleDelete}
                onCheck={handleCheck}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;