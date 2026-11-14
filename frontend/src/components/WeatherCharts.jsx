import React, { useState } from 'react';

export function TemperatureChart({ data, width = 900, height = 260 }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <div className="chart-empty">No temperature data available for this range.</div>;
  }

  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allTemps = data.flatMap((d) => [d.t2m_min, d.t2m_max, d.t2m]);
  const minTemp = Math.floor(Math.min(...allTemps) - 2);
  const maxTemp = Math.ceil(Math.max(...allTemps) + 2);
  const tempRange = maxTemp - minTemp || 1;

  const getX = (index) => padding.left + (index / (data.length - 1 || 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minTemp) / tempRange) * chartH;

  const pointsMax = data.map((d, i) => `${getX(i)},${getY(d.t2m_max)}`).join(' ');
  const pointsMean = data.map((d, i) => `${getX(i)},${getY(d.t2m)}`).join(' ');
  const pointsMin = data.map((d, i) => `${getX(i)},${getY(d.t2m_min)}`).join(' ');

  // Range band polygon (between min and max)
  const rangePolygon = [
    ...data.map((d, i) => `${getX(i)},${getY(d.t2m_max)}`),
    ...data.slice().reverse().map((d, i) => `${getX(data.length - 1 - i)},${getY(d.t2m_min)}`),
  ].join(' ');

  // Y-axis grid ticks
  const yTicks = [];
  const step = Math.ceil(tempRange / 5);
  for (let t = minTemp; t <= maxTemp; t += step) {
    yTicks.push(t);
  }

  // X-axis label samples (up to 6 dates)
  const xIndices = [];
  const xCount = Math.min(6, data.length);
  for (let k = 0; k < xCount; k++) {
    xIndices.push(Math.floor((k / (xCount - 1 || 1)) * (data.length - 1)));
  }

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="svg-chart-wrapper">
      <div className="chart-legend-row">
        <span className="legend-item"><span className="legend-box" style={{ background: '#ef4444' }}></span> Tmax (°C)</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#16a34a' }}></span> Tmean (°C)</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#0284c7' }}></span> Tmin (°C)</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}></span> Daily Diurnal Range</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="responsive-svg"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines */}
        {yTicks.map((val) => (
          <g key={val}>
            <line
              x1={padding.left}
              y1={getY(val)}
              x2={width - padding.right}
              y2={getY(val)}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <text
              x={padding.left - 8}
              y={getY(val) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
            >
              {val}°
            </text>
          </g>
        ))}

        {/* Temperature range area fill */}
        <polygon points={rangePolygon} fill="#fef3c7" opacity="0.6" />

        {/* Temperature lines */}
        <polyline points={pointsMin} fill="none" stroke="#0284c7" strokeWidth="1.5" />
        <polyline points={pointsMax} fill="none" stroke="#ef4444" strokeWidth="1.5" />
        <polyline points={pointsMean} fill="none" stroke="#16a34a" strokeWidth="2" />

        {/* X-axis date labels */}
        {xIndices.map((idx) => {
          const item = data[idx];
          return (
            <text
              key={idx}
              x={getX(idx)}
              y={height - 12}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {item.date}
            </text>
          );
        })}

        {/* Interactive hover overlay */}
        {data.map((d, i) => {
          const barW = chartW / data.length;
          return (
            <rect
              key={i}
              x={getX(i) - barW / 2}
              y={padding.top}
              width={Math.max(barW, 3)}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}

        {/* Hover vertical line & markers */}
        {hoveredItem && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={height - padding.bottom}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle cx={getX(hoverIndex)} cy={getY(hoveredItem.t2m_max)} r="4" fill="#ef4444" />
            <circle cx={getX(hoverIndex)} cy={getY(hoveredItem.t2m)} r="4" fill="#16a34a" />
            <circle cx={getX(hoverIndex)} cy={getY(hoveredItem.t2m_min)} r="4" fill="#0284c7" />
          </g>
        )}
      </svg>

      {hoveredItem && (
        <div className="chart-tooltip">
          <strong>📅 {hoveredItem.date} (DOY {hoveredItem.doy})</strong>
          <div className="tooltip-row">
            <span>Mean Temp (T2M): <strong>{hoveredItem.t2m}°C</strong></span>
            <span>Max: <strong style={{ color: '#ef4444' }}>{hoveredItem.t2m_max}°C</strong></span>
            <span>Min: <strong style={{ color: '#0284c7' }}>{hoveredItem.t2m_min}°C</strong></span>
            <span>Diurnal Range: <strong>{(hoveredItem.t2m_max - hoveredItem.t2m_min).toFixed(1)}°C</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

export function HumidityChart({ data, width = 900, height = 220 }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <div className="chart-empty">No humidity data available.</div>;
  }

  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minH = 0;
  const maxH = 100;

  const getX = (index) => padding.left + (index / (data.length - 1 || 1)) * chartW;
  const getY = (val) => padding.top + chartH - (val / 100) * chartH;

  const points = data.map((d, i) => `${getX(i)},${getY(d.rh2m)}`).join(' ');
  const areaPolygon = [
    `${padding.left},${getY(0)}`,
    ...data.map((d, i) => `${getX(i)},${getY(d.rh2m)}`),
    `${padding.left + chartW},${getY(0)}`,
  ].join(' ');

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="svg-chart-wrapper">
      <div className="chart-legend-row">
        <span className="legend-item"><span className="legend-box" style={{ background: '#0284c7' }}></span> Relative Humidity RH2M (%)</span>
        <span className="legend-item" style={{ fontSize: '0.75rem', color: '#64748b' }}>Monsoon saturation &gt; 70% • Winter/Summer dry &lt; 40%</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="responsive-svg"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {[20, 40, 60, 80, 100].map((val) => (
          <g key={val}>
            <line
              x1={padding.left}
              y1={getY(val)}
              x2={width - padding.right}
              y2={getY(val)}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <text x={padding.left - 8} y={getY(val) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {val}%
            </text>
          </g>
        ))}

        <polygon points={areaPolygon} fill="#e0f2fe" opacity="0.6" />
        <polyline points={points} fill="none" stroke="#0284c7" strokeWidth="2" />

        {/* X labels */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, idx) => {
          const itemIndex = Math.min(Math.floor(ratio * (data.length - 1)), data.length - 1);
          const item = data[itemIndex];
          if (!item) return null;
          return (
            <text key={idx} x={getX(itemIndex)} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748b">
              {item.date}
            </text>
          );
        })}

        {/* Hover bars */}
        {data.map((d, i) => (
          <rect
            key={i}
            x={getX(i) - 2}
            y={padding.top}
            width={4}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}

        {hoveredItem && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={height - padding.bottom}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle cx={getX(hoverIndex)} cy={getY(hoveredItem.rh2m)} r="4" fill="#0284c7" />
          </g>
        )}
      </svg>

      {hoveredItem && (
        <div className="chart-tooltip">
          <strong>📅 {hoveredItem.date}</strong>: Relative Humidity <strong>{hoveredItem.rh2m}%</strong>
        </div>
      )}
    </div>
  );
}

export function RainfallChart({ data, width = 900, height = 220 }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <div className="chart-empty">No rainfall data available.</div>;
  }

  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxRain = Math.max(10, Math.ceil(Math.max(...data.map((d) => d.prectotcorr)) * 1.1));

  const getX = (index) => padding.left + (index / (data.length - 1 || 1)) * chartW;
  const getY = (val) => padding.top + chartH - (val / maxRain) * chartH;

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="svg-chart-wrapper">
      <div className="chart-legend-row">
        <span className="legend-item"><span className="legend-box" style={{ background: '#2563eb' }}></span> Daily Precipitation PRECTOTCORR (mm/day)</span>
        <span className="legend-item" style={{ fontSize: '0.75rem', color: '#64748b' }}>Dry day &lt; 0.1 mm</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="responsive-svg"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {[0, maxRain * 0.25, maxRain * 0.5, maxRain * 0.75, maxRain].map((val, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={getY(val)}
              x2={width - padding.right}
              y2={getY(val)}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <text x={padding.left - 8} y={getY(val) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {val.toFixed(0)} mm
            </text>
          </g>
        ))}

        {/* Rain bars */}
        {data.map((d, i) => {
          if (d.prectotcorr <= 0.05) return null;
          const barH = chartH - (getY(d.prectotcorr) - padding.top);
          const barW = Math.max(2, chartW / data.length);
          const isHigh = d.prectotcorr >= 30;

          return (
            <rect
              key={i}
              x={getX(i) - barW / 2}
              y={getY(d.prectotcorr)}
              width={barW}
              height={barH}
              fill={isHigh ? '#1d4ed8' : '#3b82f6'}
              opacity="0.85"
            />
          );
        })}

        {/* Date labels */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, idx) => {
          const itemIndex = Math.min(Math.floor(ratio * (data.length - 1)), data.length - 1);
          const item = data[itemIndex];
          if (!item) return null;
          return (
            <text key={idx} x={getX(itemIndex)} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748b">
              {item.date}
            </text>
          );
        })}

        {/* Hover detection */}
        {data.map((d, i) => (
          <rect
            key={i}
            x={getX(i) - 2}
            y={padding.top}
            width={4}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}

        {hoveredItem && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={height - padding.bottom}
              stroke="#1e3a8a"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle cx={getX(hoverIndex)} cy={getY(hoveredItem.prectotcorr)} r="4" fill="#2563eb" />
          </g>
        )}
      </svg>

      {hoveredItem && (
        <div className="chart-tooltip">
          <strong>📅 {hoveredItem.date}</strong>: Rainfall <strong>{hoveredItem.prectotcorr} mm/day</strong>
          {hoveredItem.prectotcorr === 0 && ' (Dry day)'}
        </div>
      )}
    </div>
  );
}

export function MonthlySummaryChart({ summaries, width = 900, height = 240 }) {
  if (!summaries || summaries.length === 0) {
    return <div className="chart-empty">No monthly summary data available.</div>;
  }

  const padding = { top: 25, right: 45, bottom: 50, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxRain = Math.max(50, Math.ceil(Math.max(...summaries.map((s) => s.total_precipitation_mm)) * 1.15));
  const maxTemp = 45;
  const minTemp = 15;

  const barCount = summaries.length;
  const slotW = chartW / barCount;
  const barW = Math.min(28, slotW * 0.65);

  const getBarX = (i) => padding.left + i * slotW + (slotW - barW) / 2;
  const getCenterPointX = (i) => padding.left + i * slotW + slotW / 2;
  const getRainY = (val) => padding.top + chartH - (val / maxRain) * chartH;
  const getTempY = (val) => padding.top + chartH - ((val - minTemp) / (maxTemp - minTemp)) * chartH;

  const tempPoints = summaries.map((s, i) => `${getCenterPointX(i)},${getTempY(s.mean_t2m)}`).join(' ');

  return (
    <div className="svg-chart-wrapper">
      <div className="chart-legend-row">
        <span className="legend-item"><span className="legend-box" style={{ background: '#3b82f6' }}></span> Monthly Total Rainfall (mm) [Left Axis]</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#16a34a' }}></span> Monthly Mean Temp (°C) [Right Axis]</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg">
        {/* Left Y ticks (Rainfall) */}
        {[0, maxRain * 0.33, maxRain * 0.66, maxRain].map((val, idx) => (
          <g key={idx}>
            <line x1={padding.left} y1={getRainY(val)} x2={width - padding.right} y2={getRainY(val)} stroke="#f1f5f9" />
            <text x={padding.left - 6} y={getRainY(val) + 4} textAnchor="end" fontSize="10" fill="#2563eb">
              {val.toFixed(0)} mm
            </text>
          </g>
        ))}

        {/* Right Y ticks (Temperature) */}
        {[20, 30, 40].map((val) => (
          <text key={val} x={width - padding.right + 6} y={getTempY(val) + 4} textAnchor="start" fontSize="10" fill="#16a34a">
            {val}°C
          </text>
        ))}

        {/* Rainfall Bars */}
        {summaries.map((s, i) => {
          const bH = chartH - (getRainY(s.total_precipitation_mm) - padding.top);
          return (
            <g key={s.year_month}>
              <rect
                x={getBarX(i)}
                y={getRainY(s.total_precipitation_mm)}
                width={barW}
                height={bH}
                fill="#3b82f6"
                rx="2"
                opacity="0.85"
              />
              {s.total_precipitation_mm > 5 && (
                <text
                  x={getBarX(i) + barW / 2}
                  y={getRainY(s.total_precipitation_mm) - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#1e3a8a"
                  fontWeight="600"
                >
                  {s.total_precipitation_mm.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Mean Temperature Line */}
        <polyline points={tempPoints} fill="none" stroke="#16a34a" strokeWidth="2.5" />
        {summaries.map((s, i) => (
          <circle
            key={s.year_month}
            cx={getCenterPointX(i)}
            cy={getTempY(s.mean_t2m)}
            r="3.5"
            fill="#ffffff"
            stroke="#16a34a"
            strokeWidth="2"
          />
        ))}

        {/* X month labels */}
        {summaries.map((s, i) => (
          <text
            key={s.year_month}
            x={getCenterPointX(i)}
            y={height - 18}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
            transform={`rotate(-25, ${getCenterPointX(i)}, ${height - 18})`}
          >
            {s.year_month}
          </text>
        ))}
      </svg>
    </div>
  );
}
