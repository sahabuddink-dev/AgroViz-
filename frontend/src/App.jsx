import React, { useEffect, useState } from 'react';
import { getHealth, getDatasets } from './api/client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import DatasetManagement from './pages/DatasetManagement';
import Weather from './pages/Weather';
import Soil from './pages/Soil';
import PinkBollworm from './pages/PinkBollworm';
import CropHealth from './pages/CropHealth';
import GISWorkspace from './pages/GISWorkspace';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import About from './pages/About';

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [healthResponse, setHealthResponse] = useState(null);
  const [datasetsResponse, setDatasetsResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [health, datasets] = await Promise.all([
        getHealth(),
        getDatasets(),
      ]);
      setHealthResponse(health);
      setDatasetsResponse(datasets);
    } catch (err) {
      console.error('Failed to connect to AgroViz backend API:', err);
      setError(err.message || 'Unable to connect to backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInspectDataset = (datasetId) => {
    setActiveTab('datasets');
  };

  return (
    <div className="layout-root">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="layout-main">
        <Header activeTab={activeTab} healthData={healthResponse} error={error} />

        <main className="content-container">
          {error && (
            <div className="error-banner card">
              <div className="error-icon">⚠️</div>
              <div className="error-info">
                <strong>Backend Connection Error</strong>
                <p>{error}</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Please ensure FastAPI is running at <code>http://localhost:8000</code>.
                </p>
                <button className="btn-secondary btn-sm" onClick={fetchData} style={{ marginTop: '0.5rem' }}>
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {activeTab === 'workspace' && <GISWorkspace onNavigateTab={setActiveTab} />}

          {activeTab === 'alerts' && <Alerts />}

          {activeTab === 'reports' && <Reports />}

          {activeTab === 'weather' && <Weather />}

          {activeTab === 'soil' && <Soil />}

          {activeTab === 'crop_health' && <CropHealth />}

          {activeTab === 'pbw' && <PinkBollworm />}

          {activeTab === 'datasets' && (
            <DatasetManagement
              registryData={datasetsResponse?.data}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'about' && <About />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
