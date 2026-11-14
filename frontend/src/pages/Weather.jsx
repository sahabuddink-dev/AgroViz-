import React, { useEffect, useState } from 'react';
import { getWeather, getWeatherSummary } from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';
import {
  TemperatureChart,
  HumidityChart,
  RainfallChart,
  MonthlySummaryChart,
} from '../components/WeatherCharts';

const PRESETS = [
  { label: 'Full 19 Months', start: '2023-06-01', end: '2024-12-31' },
  { label: '2023 Season (Jun–Dec)', start: '2023-06-01', end: '2023-12-31' },
  { label: '2024 Full Year', start: '2024-01-01', end: '2024-12-31' },
  { label: 'Kharif 2023 (Jun–Oct)', start: '2023-06-01', end: '2023-10-31' },
  { label: 'Kharif 2024 (Jun–Oct)', start: '2024-06-01', end: '2024-10-31' },
];

export default function Weather() {
  const [startDate, setStartDate] = useState('2023-06-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [weatherData, setWeatherData] = useState(null);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('charts');
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchWeather = async (start = startDate, end = endDate) => {
    try {
      setLoading(true);
      setError(null);
      const [dailyRes, sumRes] = await Promise.all([
        getWeather(start, end),
        getWeatherSummary(start, end),
      ]);
      setWeatherData(dailyRes);
      setSummaryData(sumRes.data || []);
      setTablePage(1);
    } catch (err) {
      console.error('Failed to load weather data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch weather records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(startDate, endDate);
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchWeather(startDate, endDate);
  };

  const handleApplyPreset = (preset) => {
    setStartDate(preset.start);
    setEndDate(preset.end);
    fetchWeather(preset.start, preset.end);
  };

  const latest = weatherData?.data?.latest_observation;
  const stats = weatherData?.data?.statistics;
  const records = weatherData?.data?.records || [];

  // Pagination for daily records table
  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const paginatedRecords = records.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  return (
    <div className="weather-page-container">
      {/* Overview Cards */}
      <div className="metrics-summary-grid">
        {latest && (
          <div className="summary-stat-card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
            <div className="stat-sub" style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Latest Available ({latest.date})
            </div>
            <div className="stat-num">{latest.t2m}°C</div>
            <div className="stat-label">
              Range: <span style={{ color: '#ef4444' }}>{latest.t2m_max}°</span> / <span style={{ color: '#0284c7' }}>{latest.t2m_min}°C</span>
            </div>
            <div className="stat-sub" style={{ color: 'var(--text-main)', marginTop: '0.4rem' }}>
              RH: <strong>{latest.rh2m}%</strong> • Rain: <strong>{latest.prectotcorr} mm</strong>
            </div>
          </div>
        )}

        {stats && (
          <>
            <div className="summary-stat-card">
              <div className="stat-sub">Period Mean Temperature</div>
              <div className="stat-num">{stats.temperature.mean_c}°C</div>
              <div className="stat-label">
                Peak: <strong style={{ color: '#ef4444' }}>{stats.temperature.max_c}°C</strong> ({stats.temperature.max_date})
              </div>
              <div className="stat-sub" style={{ color: '#0284c7' }}>
                Lowest: {stats.temperature.min_c}°C ({stats.temperature.min_date})
              </div>
            </div>

            <div className="summary-stat-card">
              <div className="stat-sub">Mean Relative Humidity</div>
              <div className="stat-num">{stats.humidity.mean_pct}%</div>
              <div className="stat-label">
                Range: {stats.humidity.min_pct}% – {stats.humidity.max_pct}%
              </div>
              <div className="stat-sub">Volumetric moisture proxy</div>
            </div>

            <div className="summary-stat-card">
              <div className="stat-sub">Total Precipitation</div>
              <div className="stat-num">{stats.precipitation.total_mm} mm</div>
              <div className="stat-label">
                Rainy days (&gt;0.1 mm): <strong>{stats.precipitation.rainy_days_count}</strong> of {stats.days_count}
              </div>
              <div className="stat-sub" style={{ color: '#1d4ed8' }}>
                Max daily: {stats.precipitation.max_daily_mm} mm ({stats.precipitation.max_daily_date})
              </div>
            </div>
          </>
        )}
      </div>

      {/* Date Range Filter Bar */}
      <div className="card filter-bar">
        <form onSubmit={handleApplyFilter} className="date-filter-form">
          <div className="filter-group">
            <span className="filter-label">Date Filter:</span>
            <div className="date-inputs">
              <label>
                From:{' '}
                <input
                  type="date"
                  className="input-date"
                  min="2023-06-01"
                  max="2024-12-31"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label>
                To:{' '}
                <input
                  type="date"
                  className="input-date"
                  min="2023-06-01"
                  max="2024-12-31"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <button type="submit" className="btn-primary btn-sm">
                Apply Date Filter
              </button>
            </div>
          </div>
        </form>

        <div className="presets-row">
          <span className="preset-label">Quick Presets:</span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              className={`preset-btn ${startDate === p.start && endDate === p.end ? 'preset-btn-active' : ''}`}
              onClick={() => handleApplyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Provenance and Reanalysis Notice Banner */}
      <div className="card notice-box" style={{ borderLeftColor: 'var(--accent-amber)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>NASA POWER Surface Meteorology (MERRA-2 Reanalysis)</strong>
          <ProvenanceBadge provenance="model_estimated" />
        </div>
        <p style={{ marginTop: '0.35rem', fontSize: '0.825rem' }}>
          Data is extracted from NASA POWER at coordinates <strong>20.7069°N, 77.0022°E</strong> (Akola district center).
          This dataset originates from the NASA GMAO MERRA-2 atmospheric reanalysis model (~0.5° × 0.625° grid cell) and is
          a <strong>model-estimated reanalysis product</strong>, not a physical ground weather station measurement.
          No station climatology is implied; analysis covers historical monitoring (June 2023 – December 2024).
        </p>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="modal-tabs" style={{ padding: '0 1.5rem' }}>
          <button
            className={`modal-tab ${activeTab === 'charts' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            📈 Time-Series Charts
          </button>
          <button
            className={`modal-tab ${activeTab === 'monthly' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            📊 Monthly Aggregations ({summaryData.length} Months)
          </button>
          <button
            className={`modal-tab ${activeTab === 'table' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            📋 Daily Records Table ({records.length} Days)
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading weather records from NASA POWER dataset...</p>
            </div>
          )}

          {error && (
            <div className="notice-box" style={{ borderLeftColor: '#ef4444' }}>
              <strong>Error Loading Weather:</strong>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && activeTab === 'charts' && (
            <div className="weather-charts-tab">
              <div className="chart-section">
                <h3 className="card-title">Daily Temperature Trends (°C)</h3>
                <p className="chart-caption">
                  Daily maximum, mean, and minimum 2-meter air temperature (°C). The shaded band represents the diurnal temperature fluctuation.
                </p>
                <TemperatureChart data={records} />
              </div>

              <div className="chart-section" style={{ marginTop: '2rem' }}>
                <h3 className="card-title">Daily Relative Humidity (RH2M %)</h3>
                <p className="chart-caption">
                  Relative humidity at 2 meters. Indian monsoon saturation typically peaks above 70% during July–September, dropping below 30% in summer.
                </p>
                <HumidityChart data={records} />
              </div>

              <div className="chart-section" style={{ marginTop: '2rem' }}>
                <h3 className="card-title">Daily Precipitation (PRECTOTCORR mm/day)</h3>
                <p className="chart-caption">
                  Bias-corrected daily precipitation. High-rainfall monsoon events are highlighted in dark blue.
                </p>
                <RainfallChart data={records} />
              </div>

              <div className="chart-section" style={{ marginTop: '2rem' }}>
                <h3 className="card-title">Monthly Rainfall Totals vs Mean Temperature</h3>
                <p className="chart-caption">
                  Monthly aggregated precipitation bars (left axis) superimposed with monthly mean temperature curve (right axis).
                </p>
                <MonthlySummaryChart summaries={summaryData} />
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'monthly' && (
            <div className="monthly-summary-tab">
              <h3 className="card-title">Monthly Weather Summaries (Akola, MH)</h3>
              <p className="chart-caption" style={{ marginBottom: '1rem' }}>
                Descriptive statistics aggregated by calendar month across the 19-month NASA POWER dataset.
              </p>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Days</th>
                      <th>Mean Temp (°C)</th>
                      <th>Mean Tmax (°C)</th>
                      <th>Mean Tmin (°C)</th>
                      <th>Mean RH (%)</th>
                      <th>Total Rain (mm)</th>
                      <th>Max Daily Rain (mm)</th>
                      <th>Rainy Days (&gt;0.1mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map((s) => (
                      <tr key={s.year_month}>
                        <td><strong>{s.month_label}</strong></td>
                        <td>{s.days_count}</td>
                        <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{s.mean_t2m}°C</td>
                        <td style={{ color: '#ef4444' }}>{s.mean_t2m_max}°C</td>
                        <td style={{ color: '#0284c7' }}>{s.mean_t2m_min}°C</td>
                        <td>{s.mean_rh2m}%</td>
                        <td>
                          <span style={{ fontWeight: 600, color: s.total_precipitation_mm > 50 ? '#1d4ed8' : 'inherit' }}>
                            {s.total_precipitation_mm} mm
                          </span>
                        </td>
                        <td>{s.max_daily_precipitation_mm} mm</td>
                        <td>{s.rainy_days_count} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === 'table' && (
            <div className="daily-table-tab">
              <div className="preview-controls">
                <span className="control-label">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setTablePage(1);
                  }}
                  className="select-sm"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <div className="pagination-controls" style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="btn-secondary btn-sm"
                    disabled={tablePage === 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: '0.85rem' }}>
                    Page <strong>{tablePage}</strong> of <strong>{totalPages}</strong> ({records.length} total)
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    disabled={tablePage === totalPages}
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Year</th>
                      <th>DOY</th>
                      <th>T2M (°C)</th>
                      <th>Tmax (°C)</th>
                      <th>Tmin (°C)</th>
                      <th>RH2M (%)</th>
                      <th>Precipitation (mm/day)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((r, idx) => {
                      const absoluteIndex = (tablePage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={r.date}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{absoluteIndex}</td>
                          <td><code>{r.date}</code></td>
                          <td>{r.year}</td>
                          <td>{r.doy}</td>
                          <td><strong>{r.t2m}°C</strong></td>
                          <td style={{ color: '#ef4444' }}>{r.t2m_max}°C</td>
                          <td style={{ color: '#0284c7' }}>{r.t2m_min}°C</td>
                          <td>{r.rh2m}%</td>
                          <td>
                            {r.prectotcorr > 0 ? (
                              <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{r.prectotcorr} mm</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>0.0 mm</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
