import React, { useState } from 'react';

/**
 * Interactive SVG Chart: Multi-Spectral Vegetation Indices (Sentinel-2)
 * Renders NDVI (Green), NDRE (Purple), NDMI (Blue) over time.
 * Explicitly annotates and visualizes the July 2023 and July 2024 monsoon cloud gaps.
 */
export function CropIndicesTimeChart({ records }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!records || records.length === 0) {
    return <div className="chart-empty">No Sentinel-2 crop index observations available for this date range.</div>;
  }

  const width = 850;
  const height = 320;
  const margin = { top: 25, right: 35, bottom: 45, left: 55 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Y-axis bounds (-0.15 to 0.75 for NDVI/NDRE/NDMI in Akola)
  const allValues = records.flatMap((r) => [r.ndvi, r.ndre, r.ndmi]);
  const minVal = -0.15;
  const maxVal = 0.75;

  // Map dates to timestamps for accurate time spacing (including July gaps)
  const timestamps = records.map((r) => new Date(r.date).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeSpan = maxTime - minTime || 1;

  const getX = (dateStr) => {
    const t = new Date(dateStr).getTime();
    return margin.left + ((t - minTime) / timeSpan) * innerWidth;
  };

  const getY = (val) => {
    return margin.top + innerHeight - ((val - minVal) / (maxVal - minVal)) * innerHeight;
  };

  // Build SVG path lines
  const pathNDVI = records.map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.date).toFixed(1)} ${getY(r.ndvi).toFixed(1)}`).join(' ');
  const pathNDRE = records.map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.date).toFixed(1)} ${getY(r.ndre).toFixed(1)}`).join(' ');
  const pathNDMI = records.map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.date).toFixed(1)} ${getY(r.ndmi).toFixed(1)}`).join(' ');

  // Y-axis ticks
  const yTicks = [-0.1, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

  // Calculate July Gap Rectangles (only if within displayed time bounds)
  const july2023Start = new Date('2023-07-01').getTime();
  const july2023End = new Date('2023-07-31').getTime();
  const july2024Start = new Date('2024-07-01').getTime();
  const july2024End = new Date('2024-07-31').getTime();

  const gapsToRender = [];
  if (july2023End >= minTime && july2023Start <= maxTime) {
    const x1 = Math.max(margin.left, getX('2023-07-01'));
    const x2 = Math.min(width - margin.right, getX('2023-07-31'));
    gapsToRender.push({ label: 'July 2023 Cloud Gap', x1, width: Math.max(8, x2 - x1) });
  }
  if (july2024End >= minTime && july2024Start <= maxTime) {
    const x1 = Math.max(margin.left, getX('2024-07-01'));
    const x2 = Math.min(width - margin.right, getX('2024-07-31'));
    gapsToRender.push({ label: 'July 2024 Cloud Gap', x1, width: Math.max(8, x2 - x1) });
  }

  // Sample date labels along X axis
  const step = Math.max(1, Math.floor(records.length / 7));
  const xLabels = records.filter((_, idx) => idx % step === 0 || idx === records.length - 1);

  const activeRecord = hoverIndex !== null && records[hoverIndex] ? records[hoverIndex] : records[records.length - 1];

  return (
    <div className="chart-card">
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Sentinel-2 Harmonized Multi-Spectral Indices</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            10 km AOI Area-wide aggregate (Akola, MH) • Reflectance Index Ratio (-1.0 to 1.0)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 12, height: 3, background: '#16a34a', borderRadius: 2 }}></span>
            NDVI: <strong>{activeRecord?.ndvi}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 12, height: 3, background: '#9333ea', borderRadius: 2 }}></span>
            NDRE: <strong>{activeRecord?.ndre}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 12, height: 3, background: '#0284c7', borderRadius: 2 }}></span>
            NDMI: <strong>{activeRecord?.ndmi}</strong>
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normX = (mouseX / rect.width) * width;
            const boundedX = Math.max(margin.left, Math.min(width - margin.right, normX));
            // Find closest record by X coordinate
            let closestIdx = 0;
            let closestDist = Infinity;
            records.forEach((r, idx) => {
              const xPos = getX(r.date);
              const dist = Math.abs(xPos - boundedX);
              if (dist < closestDist) {
                closestDist = dist;
                closestIdx = idx;
              }
            });
            setHoverIndex(closestIdx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Zero baseline */}
          <line
            x1={margin.left}
            y1={getY(0.0)}
            x2={width - margin.right}
            y2={getY(0.0)}
            stroke="#94a3b8"
            strokeWidth="1.2"
          />

          {/* Grid lines */}
          {yTicks.map((val) => (
            <g key={val}>
              <line
                x1={margin.left}
                y1={getY(val)}
                x2={width - margin.right}
                y2={getY(val)}
                stroke="var(--border-color, #e2e8f0)"
                strokeDasharray="3 3"
              />
              <text
                x={margin.left - 8}
                y={getY(val) + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted, #64748b)"
              >
                {val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Shaded Monsoon Cloud Gap Annotations */}
          {gapsToRender.map((gap, i) => (
            <g key={i}>
              <rect
                x={gap.x1}
                y={margin.top}
                width={gap.width}
                height={innerHeight}
                fill="#fef3c7"
                fillOpacity="0.45"
                stroke="#f59e0b"
                strokeDasharray="4 2"
                strokeWidth="1"
              />
              <text
                x={gap.x1 + gap.width / 2}
                y={margin.top + 14}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="#b45309"
              >
                ☁️ {gap.label}
              </text>
              <text
                x={gap.x1 + gap.width / 2}
                y={margin.top + 26}
                textAnchor="middle"
                fontSize="8"
                fill="#b45309"
              >
                (Zero optical passes)
              </text>
            </g>
          ))}

          {/* Time Series Curves */}
          <path d={pathNDMI} fill="none" stroke="#0284c7" strokeWidth="2" strokeOpacity="0.9" />
          <path d={pathNDRE} fill="none" stroke="#9333ea" strokeWidth="2" strokeOpacity="0.9" />
          <path d={pathNDVI} fill="none" stroke="#16a34a" strokeWidth="2.5" />

          {/* Observation Points */}
          {records.map((r, i) => (
            <g key={i}>
              <circle cx={getX(r.date)} cy={getY(r.ndvi)} r="2.5" fill="#16a34a" />
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map((r, i) => (
            <text
              key={i}
              x={getX(r.date)}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted, #64748b)"
            >
              {r.date}
            </text>
          ))}

          {/* Interactive Hover Indicator */}
          {hoverIndex !== null && records[hoverIndex] && (
            <g>
              <line
                x1={getX(records[hoverIndex].date)}
                y1={margin.top}
                x2={getX(records[hoverIndex].date)}
                y2={height - margin.bottom}
                stroke="#475569"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <circle cx={getX(records[hoverIndex].date)} cy={getY(records[hoverIndex].ndvi)} r="4.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
              <circle cx={getX(records[hoverIndex].date)} cy={getY(records[hoverIndex].ndre)} r="4" fill="#9333ea" stroke="#fff" strokeWidth="1.5" />
              <circle cx={getX(records[hoverIndex].date)} cy={getY(records[hoverIndex].ndmi)} r="4" fill="#0284c7" stroke="#fff" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span>
          Selected Date: <strong>{activeRecord?.date}</strong> | Cloud: {activeRecord?.cloud_percentage}% | Valid Pixels: {activeRecord?.valid_pixels?.toLocaleString()}
        </span>
        <span style={{ color: '#b45309' }}>
          * Notice: July optical gaps are preserved as observed reality (never interpolated).
        </span>
      </div>
    </div>
  );
}

/**
 * Pixel Distribution Histogram for Computed Raster Index
 * Displays the frequency of pixel values across the uploaded field.
 */
export function RasterIndexDistributionChart({ indexName, stats }) {
  if (!stats || !stats.histogram || stats.status !== 'calculated') {
    return null;
  }

  const width = 400;
  const height = 180;
  const margin = { top: 15, right: 15, bottom: 35, left: 45 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const bins = stats.histogram;
  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  const barWidth = innerW / bins.length;

  return (
    <div style={{ marginTop: '1rem', background: '#fafbfc', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
        <strong>{indexName} Spatial Pixel Distribution</strong>
        <span style={{ color: 'var(--text-muted)' }}>
          Valid: {stats.valid_pixel_count.toLocaleString()} ({stats.valid_percentage}%)
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Y Grid */}
        <line x1={margin.left} y1={margin.top} x2={width - margin.right} y2={margin.top} stroke="#e2e8f0" strokeDasharray="2 2" />
        <line x1={margin.left} y1={margin.top + innerH / 2} x2={width - margin.right} y2={margin.top + innerH / 2} stroke="#e2e8f0" strokeDasharray="2 2" />
        <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#cbd5e1" />

        {/* Bars */}
        {bins.map((b, i) => {
          const barH = (b.count / maxCount) * innerH;
          const x = margin.left + i * barWidth;
          const y = height - margin.bottom - barH;

          // Color scale by index
          let fillColor = '#10b981';
          if (indexName === 'NDRE') fillColor = '#a855f7';
          if (indexName === 'NDMI') fillColor = '#0284c7';

          return (
            <g key={i}>
              <rect
                x={x + 2}
                y={y}
                width={Math.max(1, barWidth - 4)}
                height={barH}
                fill={fillColor}
                opacity="0.85"
                rx="2"
              >
                <title>{`Range: ${b.bin_start} to ${b.bin_end} | Count: ${b.count}`}</title>
              </rect>
              {/* Bin label */}
              {i % 2 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height - 18}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#64748b"
                >
                  {b.bin_start}
                </text>
              )}
            </g>
          );
        })}

        <text x={width - margin.right} y={height - 18} textAnchor="end" fontSize="8" fill="#64748b">
          {bins[bins.length - 1].bin_end}
        </text>
      </svg>
    </div>
  );
}
