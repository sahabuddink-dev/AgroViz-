import React, { useEffect, useState } from 'react';
import { getHealth } from './api/client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import Weather from './pages/Weather';
import Soil from './pages/Soil';
import PinkBollworm from './pages/PinkBollworm';
import CropHealth from './pages/CropHealth';
import GISWorkspace from './pages/GISWorkspace';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [healthResponse, setHealthResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const health = await getHealth();
      setHealthResponse(health);
    } catch (err) {
      console.error('Failed to connect to AgroViz backend API:', err);
      setError(err.message || 'Unable to connect to backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="layout-root">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="layout-main">
        <Header
          activeTab={activeTab}
          healthData={healthResponse}
          error={error}
          onNavigateTab={setActiveTab}
        />

        <main className="content-container">
          {error && (
            <div className="error-banner card">
              <div className="error-icon">⚠️</div>
              <div className="error-info">
                <strong>Backend Connection Error</strong>
                <p>{error}</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Please ensure the backend service is running at <code>http://localhost:8000</code>.
                </p>
                <button className="btn-secondary btn-sm" onClick={fetchHealth} style={{ marginTop: '0.5rem' }}>
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'dashboard' || activeTab === 'workspace') && (
            <GISWorkspace onNavigateTab={setActiveTab} />
          )}

          {activeTab === 'fields' && (
            <GISWorkspace onNavigateTab={setActiveTab} initialMode="fields" />
          )}

          {activeTab === 'alerts' && <Alerts onNavigateTab={setActiveTab} />}

          {activeTab === 'reports' && <Reports onNavigateTab={setActiveTab} />}

          {activeTab === 'weather' && <Weather onNavigateTab={setActiveTab} />}

          {activeTab === 'soil' && <Soil onNavigateTab={setActiveTab} />}

          {activeTab === 'crop_health' && <CropHealth onNavigateTab={setActiveTab} />}

          {activeTab === 'pbw' && <PinkBollworm onNavigateTab={setActiveTab} />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
