import { useState, useEffect } from 'react';
import { 
  getWebsites, addWebsite, deleteWebsite, triggerCheck,
  getApis, addApi, deleteApi, triggerApiCheck
} from './services/api';
import { useSocket } from './hooks/useSocket';
import WebsiteList from './components/WebsiteList';
import WebsiteForm from './components/WebsiteForm';
import ApiList from './components/ApiList';
import ApiForm from './components/ApiForm';
import DnsResolver from './components/DnsResolver';

function App() {
  const [websites, setWebsites] = useState([]);
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [websiteError, setWebsiteError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [activeTab, setActiveTab] = useState('websites');

  const { subscribe, unsubscribe, onCheckResult } = useSocket();

  const fetchWebsites = async () => {
    try {
      const response = await getWebsites();
      setWebsites(response.data);
      setWebsiteError(null);
    } catch (err) {
      setWebsiteError('Failed to fetch websites');
    } finally {
      setLoading(false);
    }
  };

  const fetchApis = async () => {
    try {
      const response = await getApis();
      setApis(response.data);
      setApiError(null);
    } catch (err) {
      setApiError('Failed to fetch APIs');
    } finally {
      setLoading(false);
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
      setWebsiteError('Failed to add website');
    }
  };

  const handleDeleteWebsite = async (id) => {
    try {
      await deleteWebsite(id);
      fetchWebsites();
    } catch (err) {
      setWebsiteError('Failed to delete website');
    }
  };

  const handleCheckWebsite = async (id) => {
    try {
      await triggerCheck(id);
      fetchWebsites();
    } catch (err) {
      setWebsiteError('Failed to trigger check');
    }
  };

  const handleAddApi = async (data) => {
    try {
      await addApi(data);
      fetchApis();
    } catch (err) {
      setApiError('Failed to add API');
    }
  };

  const handleDeleteApi = async (id) => {
    try {
      await deleteApi(id);
      fetchApis();
    } catch (err) {
      setApiError('Failed to delete API');
    }
  };

  const handleCheckApi = async (id) => {
    try {
      await triggerApiCheck(id);
      fetchApis();
    } catch (err) {
      setApiError('Failed to trigger API check');
    }
  };

  const tabs = [
    { id: 'websites', label: 'Websites' },
    { id: 'apis', label: 'APIs' },
    { id: 'dns', label: 'DNS Observatory' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Internet Observatory</h1>

        <div className="flex gap-1 mb-6 bg-white rounded-lg shadow p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {websiteError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {websiteError}
          </div>
        )}

        {apiError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {apiError}
          </div>
        )}

        {activeTab === 'websites' && (
          <div className="grid gap-6">
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
                  subscribe={subscribe}
                  unsubscribe={unsubscribe}
                  onCheckResult={onCheckResult}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'apis' && (
          <div className="grid gap-6">
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
                  subscribe={subscribe}
                  unsubscribe={unsubscribe}
                  onCheckResult={onCheckResult}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'dns' && (
          <div className="bg-white rounded-lg shadow p-6">
            <DnsResolver />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
