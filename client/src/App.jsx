import { useState, useEffect } from 'react';
import { 
  getWebsites, addWebsite, deleteWebsite, triggerCheck,
  getApis, addApi, deleteApi, triggerApiCheck
} from './services/api';
import WebsiteList from './components/WebsiteList';
import WebsiteForm from './components/WebsiteForm';
import ApiList from './components/ApiList';
import ApiForm from './components/ApiForm';

function App() {
  const [websites, setWebsites] = useState([]);
  const [apis, setApis] = useState([]);
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

  const fetchApis = async () => {
    try {
      const response = await getApis();
      setApis(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch APIs');
    }
  };

  useEffect(() => {
    fetchWebsites();
    fetchApis();
  }, []);

  const handleAddWebsite = async (data) => {
    try {
      await addWebsite(data);
      fetchWebsites();
    } catch (err) {
      setError('Failed to add website');
    }
  };

  const handleDeleteWebsite = async (id) => {
    try {
      await deleteWebsite(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to delete website');
    }
  };

  const handleCheckWebsite = async (id) => {
    try {
      await triggerCheck(id);
      fetchWebsites();
    } catch (err) {
      setError('Failed to trigger check');
    }
  };

  const handleAddApi = async (data) => {
    try {
      await addApi(data);
      fetchApis();
    } catch (err) {
      setError('Failed to add API');
    }
  };

  const handleDeleteApi = async (id) => {
    try {
      await deleteApi(id);
      fetchApis();
    } catch (err) {
      setError('Failed to delete API');
    }
  };

  const handleCheckApi = async (id) => {
    try {
      await triggerApiCheck(id);
      fetchApis();
    } catch (err) {
      setError('Failed to trigger API check');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Internet Observatory</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          {/* Website Monitoring Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Website</h2>
            <WebsiteForm onSubmit={handleAddWebsite} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monitored Websites</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <WebsiteList 
                websites={websites} 
                onDelete={handleDeleteWebsite}
                onCheck={handleCheckWebsite}
              />
            )}
          </div>

          {/* API Monitoring Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add API</h2>
            <ApiForm onSubmit={handleAddApi} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monitored APIs</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <ApiList 
                apis={apis} 
                onDelete={handleDeleteApi}
                onCheck={handleCheckApi}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;