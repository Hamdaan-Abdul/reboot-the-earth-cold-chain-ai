import type { SensorReading } from '../types';

type Series = { label: string; color: string; values: number[] };

function SparkChart({ labels, series, height = 150, min, max, yAxis, xAxis, threshold, safeBand }: {
  labels: string[];
  series: Series[];
  height?: number;
  min: number;
  max: number;
  yAxis: string;
  xAxis: string;
  threshold?: { value: number; label: string; color: string } | Array<{ value: number; label: string; color: string }>;
  safeBand?: { min: number; max: number };
}) {
  const width = 540;
  const pad = { left: 50, right: 15, top: 15, bottom: 35 };
  const allValues = series.flatMap((line) => line.values);
  const low = Math.min(min, ...allValues);
  const high = Math.max(max, ...allValues);
  const range = Math.max(0.01, high - low);
  const thresholds = threshold ? Array.isArray(threshold) ? threshold : [threshold] : [];
  const plotHeight = height - pad.top - pad.bottom;
  const plotWidth = width - pad.left - pad.right;
  const x = (index: number, count: number) => pad.left + (count < 2 ? 0 : index * plotWidth / (count - 1));
  const y = (value: number) => pad.top + plotHeight - ((value - low) / range) * plotHeight;

  return (
    <div className="chart-wrap">
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${yAxis} over ${xAxis}. ${thresholds.map((item) => item.label).join('; ')}`}>
        {safeBand && <rect x={pad.left} y={y(safeBand.max)} width={plotWidth} height={Math.max(0, y(safeBand.min) - y(safeBand.max))} fill="rgba(134,213,148,.08)" />}
        {[0, 1, 2, 3].map((step) => {
          const value = low + (high - low) * (3 - step) / 3;
          const yy = y(value);
          return <g key={step}><line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} className="chart-gridline" /><text x={pad.left - 7} y={yy + 3} textAnchor="end" className="chart-axis">{value.toFixed(high - low <= 3 ? 1 : 0)}</text></g>;
        })}
        {thresholds.map((item) => <g key={item.label}><line x1={pad.left} x2={width - pad.right} y1={y(item.value)} y2={y(item.value)} stroke={item.color} strokeWidth="1.5" strokeDasharray="5 4" /><text x={width - pad.right - 2} y={y(item.value) - 4} textAnchor="end" fill={item.color} className="chart-threshold">{item.label}</text></g>)}
        {series.map((line) => {
          const points = line.values.map((value, index) => `${x(index, line.values.length)},${y(value)}`).join(' ');
          return <polyline key={line.label} points={points} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />;
        })}
        <text x={pad.left} y={height - 18} className="chart-axis">{labels[0] ?? '—'}</text>
        <text x={width - pad.right} y={height - 18} textAnchor="end" className="chart-axis">{labels[labels.length - 1] ?? 'now'}</text>
        <text x={(pad.left + width - pad.right) / 2} y={height - 3} textAnchor="middle" className="chart-axis chart-axis-title">{xAxis}</text>
        <text x="12" y={pad.top + plotHeight / 2} transform={`rotate(-90 12 ${pad.top + plotHeight / 2})`} textAnchor="middle" className="chart-axis chart-axis-title">{yAxis}</text>
      </svg>
      <div className="chart-legend">
        {series.map((line) => <span key={line.label}><i style={{ background: line.color }} />{line.label}</span>)}
        {thresholds.map((item) => <span key={item.label}><i className="threshold-key" style={{ background: item.color }} />{item.label}</span>)}
        {safeBand && <span><i className="safe-band-key" />Safe range</span>}
      </div>
    </div>
  );
}

export function SensorChart({ readings, safeRange = { min: 0, max: 8 } }: { readings: SensorReading[]; safeRange?: { min: number; max: number } }) {
  const history = readings.slice(-18);
  return <div className="simple-chart-stack">
    <SparkChart labels={history.map((reading) => reading.time)}
      series={[{ label: 'Temperature', color: '#fb923c', values: history.map((reading) => reading.tempC) }]}
      height={160} min={safeRange.min - 2} max={safeRange.max + 3} yAxis="Temperature (°C)" xAxis="Time (local)"
      safeBand={safeRange} threshold={{ value: safeRange.max, label: `Max safe ${safeRange.max}°C`, color: '#f5ae69' }} />
    <SparkChart labels={history.map((reading) => reading.time)}
      series={[{ label: 'Humidity', color: '#60a5fa', values: history.map((reading) => reading.humidity) }]}
      height={150} min={50} max={100} yAxis="Humidity (%)" xAxis="Time (local)"
      safeBand={{ min: 85, max: 95 }} threshold={{ value: 95, label: 'Max safe 95%', color: '#60a5fa' }} />
  </div>;
}

export function TemperatureChart({ readings, safeRange }: { readings: SensorReading[]; safeRange: { min: number; max: number } }) {
  const history = readings.slice(-18);
  return <SparkChart labels={history.map((reading) => reading.time)}
    series={[{ label: 'Temperature', color: '#fb923c', values: history.map((reading) => reading.tempC) }]}
    height={160} min={safeRange.min - 2} max={safeRange.max + 3} yAxis="Temperature (°C)" xAxis="Time (local)"
    safeBand={safeRange} threshold={{ value: safeRange.max, label: `Max safe ${safeRange.max}°C`, color: '#f5ae69' }} />;
}

export function HumidityChart({ readings }: { readings: SensorReading[] }) {
  const history = readings.slice(-18);
  return <SparkChart labels={history.map((reading) => reading.time)}
    series={[{ label: 'Humidity', color: '#60a5fa', values: history.map((reading) => reading.humidity) }]}
    height={150} min={50} max={100} yAxis="Humidity (%)" xAxis="Time (local)"
    safeBand={{ min: 85, max: 95 }} threshold={{ value: 95, label: 'Max safe 95%', color: '#60a5fa' }} />;
}

export function EthyleneChart({ readings }: { readings: SensorReading[] }) {
  const history = readings.slice(-18);
  return <SparkChart
    labels={history.map((reading) => reading.time)}
    series={[{ label: 'Ethylene ppm', color: '#c084fc', values: history.map((reading) => reading.ethylenePpm) }]}
    height={130}
    min={0} max={2.2} yAxis="Ethylene (ppm)" xAxis="Time (local)"
    safeBand={{ min: 0, max: 0.5 }} threshold={[
      { value: 0.5, label: 'DSL penalty >0.5 ppm', color: '#c084fc' },
      { value: 1.2, label: 'Alert >1.2 ppm', color: '#f5ae69' },
    ]}
  />;
}

export function SpeedChart({ readings }: { readings: SensorReading[] }) {
  const history = readings.slice(-18);
  return <SparkChart
    labels={history.map((reading) => reading.time)}
    series={[{ label: 'GPS speed km/h', color: '#a6e6af', values: history.map((reading) => reading.speedKmph) }]}
    height={130}
    min={0} max={90} yAxis="Speed (km/h)" xAxis="Time (local)"
  />;
}

export function DecayCurve({ dslDays, categoryColor }: { dslDays: number; categoryColor: string }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const value = Math.max(0, dslDays - i * Math.max(0.12, dslDays * 0.12));
    return `${12 + i * 29},${76 - Math.min(62, (value / Math.max(1, dslDays)) * 62)}`;
  }).join(' ');
  return (
    <svg className="decay-curve" viewBox="0 0 285 88" role="img" aria-label={`Freshness decay curve, ${dslDays.toFixed(1)} days remaining`}>
      <line x1="10" y1="76" x2="275" y2="76" className="chart-gridline" />
      <polyline points={points} fill="none" stroke={categoryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="87" className="chart-axis">now</text><text x="275" y="87" textAnchor="end" className="chart-axis">projected</text>
    </svg>
  );
}

export function RouteMap({ batches, onSelectBatch }: { batches: Array<{ id: string; productName: string; lat: number; lng: number; originCity: string; destination: string; destinationCountry: string; destinationLat: number; destinationLng: number; color: string; routeMode: string }>; onSelectBatch: (id: string) => void }) {
  const x = (lng: number) => 32 + ((lng + 110) / 210) * 736;
  const y = (lat: number) => 340 - ((lat + 35) / 105) * 300;
  return (
    <svg className="route-map" viewBox="0 0 800 370" role="img" aria-label="International cold-chain routes and flight paths">
      <defs>
        <pattern id="mapGrid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(148,163,184,.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="800" height="370" fill="url(#mapGrid)" />
      <path d="M47 100 L82 67 136 62 175 80 204 116 187 147 161 166 148 210 119 221 102 196 79 185 72 151 48 136 Z M217 208 L258 195 301 211 327 242 319 283 293 318 278 346 256 326 254 290 236 271 215 244 Z M370 91 L415 76 474 82 493 105 474 130 426 131 405 156 376 140 355 113 Z M450 150 L498 133 555 144 599 169 637 175 668 200 652 219 614 212 584 232 548 220 519 238 488 215 454 213 439 185 Z M614 114 L649 102 689 113 716 132 704 158 670 159 644 145 Z M654 247 L687 234 723 241 743 258 728 278 696 281 667 268 Z" fill="rgba(115,147,119,.11)" stroke="rgba(154,185,158,.16)" strokeWidth="1" />
      <text x={x(-74)} y={y(4) - 12} className="map-city">Bogotá</text>
      <text x={x(-80)} y={y(26) - 12} className="map-city">Miami</text>
      <text x={x(-3)} y={y(40) - 12} className="map-city">Madrid</text>
      <text x={x(51)} y={y(25) - 12} className="map-city">Doha</text>
      <text x="45" y="25" className="map-city">INTERNATIONAL TRADE LANES · SAMPLE DATA</text>
      {batches.map((batch) => (
        <g key={batch.id} role="button" tabIndex={0} aria-label={`Open ${batch.id} ${batch.productName} details`} className="map-batch-marker" onClick={() => onSelectBatch(batch.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectBatch(batch.id); } }}>
          {batch.routeMode === 'AIR'
            ? <path d={`M ${x(batch.lng)} ${y(batch.lat)} Q ${(x(batch.lng) + x(batch.destinationLng)) / 2} ${Math.min(y(batch.lat), y(batch.destinationLat)) - 42} ${x(batch.destinationLng)} ${y(batch.destinationLat)}`} fill="none" stroke={batch.color} strokeWidth="2" strokeDasharray="5 5" opacity=".85" />
            : <line x1={x(batch.lng)} y1={y(batch.lat)} x2={x(batch.destinationLng)} y2={y(batch.destinationLat)} stroke={batch.color} strokeWidth="2" strokeDasharray="5 5" opacity=".8" />}
          <circle cx={x(batch.destinationLng)} cy={y(batch.destinationLat)} r="6" fill="#101b2b" stroke={batch.color} strokeWidth="2" />
          <circle cx={x(batch.lng)} cy={y(batch.lat)} r="10" fill={batch.color} stroke="#0b1220" strokeWidth="3" />
          <text x={x(batch.lng) + 13} y={y(batch.lat) - 10} className="map-label">{batch.id}</text>
          <text x={x(batch.destinationLng) + 8} y={y(batch.destinationLat) + 15} className="map-city">{batch.destinationCountry}</text>
        </g>
      ))}
    </svg>
  );
}
