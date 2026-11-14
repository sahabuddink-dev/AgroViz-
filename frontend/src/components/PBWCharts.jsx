import React, { useState } from 'react';

export function DegreeDayCumulativeChart({ dailySeries, setAInfo, setBInfo, width = 900, height = 300 }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!dailySeries || dailySeries.length === 0) {
    return <div className="chart-empty">No degree-day data available for this range.</div>;
  }

  const padding = { top: 25, right: 35, bottom: 40, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxDDA = Math.max(...dailySeries.map((d) => d.cum_dd_a));
  const maxDDB = Math.max(...dailySeries.map((d) => d.cum_dd_b));
  const maxDD = Math.max(maxDDA, maxDDB, 500);

  const getX = (index) => padding.left + (index / (dailySeries.length - 1 || 1)) * chartW;
  const getY = (val) => padding.top + chartH - (val / maxDD) * chartH;

  const pointsA = dailySeries.map((d, i) => `${getX(i)},${getY(d.cum_dd_a)}`).join(' ');
  const pointsB = dailySeries.map((d, i) => `${getX(i)},${getY(d.cum_dd_b)}`).join(' ');

  // Generation threshold markers (for Set A: 503.62 DD increments)
  const genInterval = setAInfo?.dd_per_generation || 503.62;
  const genMarkers = [];
  for (let g = 1; g * genInterval <= maxDD; g++) {
    genMarkers.push({ gen: g, dd: g * genInterval });
  }

  const hoveredItem = hoverIndex !== null ? dailySeries[hoverIndex] : null;

  return (
    <div className="svg-chart-wrapper">
      <div className="chart-legend-row">
        <span className="legend-item"><span className="legend-box" style={{ background: '#16a34a' }}></span> Set A (Default, Indian States: 13.4/35.5°C)</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#0284c7' }}></span> Set B (Alternative, California: 13.9/32.8°C)</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#f59e0b', border: '1px dashed #d97706' }}></span> Potential Generation Markers (Set A)</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="responsive-svg"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Y-axis grid ticks */}
        {[0, 500, 1000, 1500, 2000, 2500, 3000].filter((val) => val <= maxDD * 1.1).map((val) => (
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
              {val} DD
            </text>
          </g>
        ))}

        {/* Generation threshold horizontal dashed lines */}
        {genMarkers.map((gm) => (
          <g key={gm.gen}>
            <line
              x1={padding.left}
              y1={getY(gm.dd)}
              x2={width - padding.right}
              y2={getY(gm.dd)}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth="1.2"
            />
            <text
              x={width - padding.right - 6}
              y={getY(gm.dd) - 4}
              textAnchor="end"
              fontSize="10"
              fill="#b45309"
              fontWeight="600"
            >
              Gen {gm.gen} ({gm.dd.toFixed(0)} DD)
            </text>
          </g>
        ))}

        {/* Curves */}
        <polyline points={pointsB} fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 2" />
        <polyline points={pointsA} fill="none" stroke="#16a34a" strokeWidth="2.5" />

        {/* Date labels on X-axis */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, idx) => {
          const itemIndex = Math.min(Math.floor(ratio * (dailySeries.length - 1)), dailySeries.length - 1);
          const item = dailySeries[itemIndex];
          if (!item) return null;
          return (
            <text key={idx} x={getX(itemIndex)} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748b">
              {item.date}
            </text>
          );
        })}

        {/* Hover detection */}
        {dailySeries.map((d, i) => (
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
            <circle cx={getX(hoverIndex)} cy={getY(hoveredItem.cum_dd_a)} r="4" fill="#16a34a" />
            <circle cx={getX(hoverIndex)} cy={getY(hoveredItem.cum_dd_b)} r="4" fill="#0284c7" />
          </g>
        )}
      </svg>

      {hoveredItem && (
        <div className="chart-tooltip">
          <strong>📅 {hoveredItem.date}</strong>
          <div className="tooltip-row">
            <span>Daily: Set A <strong>{hoveredItem.daily_dd_a} DD</strong> • Set B <strong>{hoveredItem.daily_dd_b} DD</strong></span>
            <span>Cumulative: Set A <strong style={{ color: '#86efac' }}>{hoveredItem.cum_dd_a} DD</strong> ({hoveredItem.potential_gen_a} gens)</span>
            <span>Set B <strong style={{ color: '#7dd3fc' }}>{hoveredItem.cum_dd_b} DD</strong> ({hoveredItem.potential_gen_b} gens)</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function MonthlyDegreeDayChart({ summaries, width = 900, height = 240 }) {
  if (!summaries || summaries.length === 0) {
    return <div className="chart-empty">No monthly degree-day data available.</div>;
  }

  const padding = { top: 25, right: 30, bottom: 50, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxMonthlyDD = Math.max(
    ...summaries.map((s) => Math.max(s.monthly_dd_a, s.monthly_dd_b)),
    100
  );

  const slotW = chartW / summaries.length;
  const barW = Math.min(14, (slotW - 4) / 2);

  const getY = (val) => padding.top + chartH - (val / (maxMonthlyDD * 1.15)) * chartH;

  return (
    <div className="svg-chart-wrapper">
      <div className="chart-legend-row">
        <span className="legend-item"><span className="legend-box" style={{ background: '#16a34a' }}></span> Set A Monthly DD</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#0284c7' }}></span> Set B Monthly DD</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg">
        {[0, maxMonthlyDD * 0.33, maxMonthlyDD * 0.66, maxMonthlyDD].map((val, idx) => (
          <g key={idx}>
            <line x1={padding.left} y1={getY(val)} x2={width - padding.right} y2={getY(val)} stroke="#f1f5f9" />
            <text x={padding.left - 6} y={getY(val) + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {val.toFixed(0)} DD
            </text>
          </g>
        ))}

        {summaries.map((s, i) => {
          const slotX = padding.left + i * slotW;
          const barXa = slotX + slotW / 2 - barW - 1;
          const barXb = slotX + slotW / 2 + 1;
          const barHa = chartH - (getY(s.monthly_dd_a) - padding.top);
          const barHb = chartH - (getY(s.monthly_dd_b) - padding.top);

          return (
            <g key={s.year_month}>
              <rect x={barXa} y={getY(s.monthly_dd_a)} width={barW} height={barHa} fill="#16a34a" rx="2" />
              <rect x={barXb} y={getY(s.monthly_dd_b)} width={barW} height={barHb} fill="#0284c7" rx="2" />
              <text
                x={slotX + slotW / 2}
                y={height - 18}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                transform={`rotate(-25, ${slotX + slotW / 2}, ${height - 18})`}
              >
                {s.year_month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Annexure3SeasonalChart({ seasonsData, publishedMean = 21.602, width = 600, height = 240 }) {
  if (!seasonsData || seasonsData.length === 0) return null;

  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxDamage = 75; // NBt was 69.95% in 2017-18
  const slotW = chartW / seasonsData.length;
  const barW = 18;

  const getY = (val) => padding.top + chartH - (val / maxDamage) * chartH;

  return (
    <div className="svg-chart-wrapper">
      <div className="chart-legend-row">
        <span className="legend-item"><span className="legend-box" style={{ background: '#7c3aed' }}></span> NBt Loculi Damage (%)</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#059669' }}></span> Bt Loculi Damage (%)</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#ef4444', border: '1px dashed red' }}></span> Bt 5-Season Mean (21.602%)</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg">
        {[0, 20, 40, 60].map((val) => (
          <g key={val}>
            <line x1={padding.left} y1={getY(val)} x2={width - padding.right} y2={getY(val)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={padding.left - 6} y={getY(val) + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {val}%
            </text>
          </g>
        ))}

        {/* 5-season mean reference line */}
        <line
          x1={padding.left}
          y1={getY(publishedMean)}
          x2={width - padding.right}
          y2={getY(publishedMean)}
          stroke="#ef4444"
          strokeDasharray="4 3"
          strokeWidth="1.5"
        />
        <text x={width - padding.right - 4} y={getY(publishedMean) - 4} textAnchor="end" fontSize="10" fill="#b91c1c" fontWeight="600">
          Published Bt Mean: {publishedMean}%
        </text>

        {seasonsData.map((s, i) => {
          const slotX = padding.left + i * slotW;
          const barXnbt = slotX + slotW / 2 - barW - 2;
          const barXbt = slotX + slotW / 2 + 2;
          const barHnbt = chartH - (getY(s.nbt_loculi_damage_pct) - padding.top);
          const barHbt = chartH - (getY(s.bt_loculi_damage_pct) - padding.top);

          return (
            <g key={s.season}>
              <rect x={barXnbt} y={getY(s.nbt_loculi_damage_pct)} width={barW} height={barHnbt} fill="#7c3aed" rx="2" />
              <text x={barXnbt + barW / 2} y={getY(s.nbt_loculi_damage_pct) - 3} textAnchor="middle" fontSize="9" fill="#5b21b6" fontWeight="600">
                {s.nbt_loculi_damage_pct}%
              </text>

              <rect x={barXbt} y={getY(s.bt_loculi_damage_pct)} width={barW} height={barHbt} fill="#059669" rx="2" />
              <text x={barXbt + barW / 2} y={getY(s.bt_loculi_damage_pct) - 3} textAnchor="middle" fontSize="9" fill="#065f46" fontWeight="600">
                {s.bt_loculi_damage_pct}%
              </text>

              <text x={slotX + slotW / 2} y={height - 12} textAnchor="middle" fontSize="11" fill="#475569" fontWeight="500">
                {s.season}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
