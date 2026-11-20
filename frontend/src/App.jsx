import React, { useEffect, useState } from 'react';
import { getHealth } from './api/client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';

// Core 5 Workflows
import GISWorkspace from './pages/GISWorkspace';
import DataInputHub from './pages/DataInputHub';
import CropHealth from './pages/CropHealth';
import AIModelManagement from './pages/AIModelManagement';
import AIAnalysisView from './pages/AIAnalysisView';

// Intelligence & Reports
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import DatasetManagement from './pages/DatasetManagement';

// Supporting Environmental Modules
import Weather from './pages/Weather';
import Soil from './pages/Soil';
import PinkBollworm from './pages/PinkBollworm';

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace');
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

          {/* Workflow 1: Data Input Hub */}
          {activeTab === 'data_input' && <DataInputHub onNavigateTab={setActiveTab} />}

          {/* Workflow 2: Spectral & SAR Image Processing Engine */}
          {(activeTab === 'image_processing' || activeTab === 'crop_health') && (
            <CropHealth onNavigateTab={setActiveTab} />
          )}

          {/* Workflow 3: AI Model Management Hub */}
          {activeTab === 'ai_models' && <AIModelManagement onNavigateTab={setActiveTab} />}

          {/* Workflow 4: AI Analysis & Multi-Factor Inference */}
          {activeTab === 'ai_analysis' && <AIAnalysisView onNavigateTab={setActiveTab} />}

          {/* Workflow 5: GIS Workspace / Results */}
          {(activeTab === 'workspace' || activeTab === 'dashboard' || activeTab === 'fields') && (
            <GISWorkspace onNavigateTab={setActiveTab} />
          )}

          {/* Intelligence & Reports */}
          {activeTab === 'alerts' && <Alerts onNavigateTab={setActiveTab} />}
          {activeTab === 'reports' && <Reports onNavigateTab={setActiveTab} />}
          {activeTab === 'datasets' && <DatasetManagement onNavigateTab={setActiveTab} />}

          {/* Supporting modules */}
          {activeTab === 'weather' && <Weather onNavigateTab={setActiveTab} />}
          {activeTab === 'soil' && <Soil onNavigateTab={setActiveTab} />}
          {activeTab === 'pbw' && <PinkBollworm onNavigateTab={setActiveTab} />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
