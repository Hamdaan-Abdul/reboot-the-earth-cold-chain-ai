import { useEffect, useMemo, useState } from 'react';
import {
  DESTINATIONS,
  CATEGORY_COLORS,
  PRODUCTS,
  classifyByDSL,
  makeInitialBatches,
  tickSimulation,
  triggerEthyleneSpike,
  triggerRefrigerationFailure,
  triggerTrafficDelay,
} from './engine';
import type { Batch, Category } from './types';

const pages = [
  { id: 'overview', label: 'Overview' },
  { id: 'map', label: 'Map' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'reference', label: 'Reference' },
] as const;

type PageId = (typeof pages)[number]['id'];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card kpi-card">
      <div className="muted-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="badge" style={{ background: CATEGORY_COLORS[category], color: '#0b1220' }}>
      {category.replace('_', ' ')}
    </span>
  );
}

function OverviewPage({ batches }: { batches: Batch[] }) {
  const savedKg = batches.reduce((sum, batch) => sum + (batch.category === 'ALMOST_BAD' || batch.category === 'EXPIRED' ? batch.weightKg * 0.35 : 0), 0);
  const reroutes = batches.filter((batch) => batch.status === 'REROUTED').length;
  const co2 = Math.round(batches.reduce((sum, batch) => sum + (batch.category === 'ALMOST_BAD' ? batch.weightKg * 0.2 : 0), 0));
  const meals = Math.round((savedKg / 0.35) * 0.5);

  return (
    <div className="page-stack">
      <div className="kpi-grid">
        <StatCard label="Total Active Batches" value={String(batches.length)} />
        <StatCard label="Food Saved (kg)" value={`${Math.round(savedKg)} kg`} />
        <StatCard label="CO2 Emissions Avoided" value={`${co2} kg CO2e`} />
        <StatCard label="Dynamic Reroutes" value={String(reroutes)} />
      </div>

      <div className="two-col">
        <div className="card">
          <h3>SDG Impact Tracker</h3>
          <div className="sdg-grid">
            <div><small>SDG 2</small><strong>{meals} meals redirected</strong></div>
            <div><small>SDG 12.3</small><strong>{Math.min(66, Math.round((savedKg / 6000) * 100))}% loss reduction</strong></div>
            <div><small>SDG 13</small><strong>{co2} kg CO2e avoided</strong></div>
            <div><small>SDG 9</small><strong>{Math.round(batches.reduce((sum, b) => sum + b.rMaxKm, 0))} km optimized</strong></div>
          </div>
        </div>

        <div className="card">
          <h3>About / Approach</h3>
          <p>
            This system plugs into an operator’s existing logistics and inventory workflow as an add-on
            monitoring and decision layer. It uses low-cost sensors, cumulative time-out-of-range logic,
            and multi-modal signals such as temperature, humidity, ethylene, and vision to classify every
            batch into four food stages and reroute automatically when shelf life drops.
          </p>
          <p>
            Qatar-specific assumptions are included: early-morning/night scheduling is recommended during
            extreme heat, and alerts trigger on cumulative time outside the safe range, not just a momentary spike.
          </p>
        </div>
      </div>
    </div>
  );
}

function MapPage({ batches }: { batches: Batch[] }) {
  return (
    <div className="page-stack">
      <div className="card map-panel">
        <div className="map-grid">
          {batches.map((batch) => {
            const x = ((batch.lng - 51.2) / (51.8 - 51.2)) * 100;
            const y = 100 - ((batch.lat - 25.1) / (25.9 - 25.1)) * 100;
            return (
              <div
                key={batch.id}
                className="route-marker"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  background: CATEGORY_COLORS[batch.category],
                }}
                title={`${batch.id} • ${batch.productName} • ${batch.category}`}
              >
                {batch.productName.slice(0, 1)}
              </div>
            );
          })}
        </div>
      </div>
      <div className="legend-row">
        <span className="legend"><i style={{ background: CATEGORY_COLORS.RAW }} /> Raw / Unripe</span>
        <span className="legend"><i style={{ background: CATEGORY_COLORS.EDIBLE }} /> Edible</span>
        <span className="legend"><i style={{ background: CATEGORY_COLORS.ALMOST_BAD }} /> Almost-Bad</span>
        <span className="legend"><i style={{ background: CATEGORY_COLORS.EXPIRED }} /> Expired</span>
      </div>
    </div>
  );
}

function InspectorPage({ batches }: { batches: Batch[] }) {
  const [filter, setFilter] = useState<'ALL' | Category>('ALL');
  const filtered = filter === 'ALL' ? batches : batches.filter((batch) => batch.category === filter);

  return (
    <div className="page-stack">
      <div className="toolbar-row">
        <label>
          Filter:
          <select value={filter} onChange={(e) => setFilter(e.target.value as 'ALL' | Category)}>
            <option value="ALL">All</option>
            <option value="RAW">Raw / Unripe</option>
            <option value="EDIBLE">Edible</option>
            <option value="ALMOST_BAD">Almost-Bad</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </label>
      </div>

      <div className="batch-grid">
        {filtered.map((batch) => (
          <div key={batch.id} className="card batch-card">
            <div className="card-header">
              <div>
                <strong>{batch.id}</strong>
                <div className="muted">{batch.productName}</div>
              </div>
              <CategoryBadge category={batch.category} />
            </div>

            <div className="metrics-row">
              <span>DSL {batch.dslDays.toFixed(1)}d</span>
              <span>Rmax {batch.rMaxKm.toFixed(0)} km</span>
              <span>{batch.financialPass ? 'Pass' : 'Fail'}</span>
            </div>

            <div className="mini-chart">
              <span style={{ height: `${Math.max(10, batch.dslDays * 8)}%` }} />
            </div>

            <div className="detail-list">
              <div><small>Destination</small><strong>{batch.assignedDestination.name}</strong></div>
              <div><small>Temp</small><strong>{batch.tempC.toFixed(1)}°C</strong></div>
              <div><small>Ethylene</small><strong>{batch.ethylenePpm.toFixed(2)} ppm</strong></div>
              <div><small>Prob. Safe</small><strong>{(batch.probabilitySafeArrival * 100).toFixed(0)}%</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelinePage({ batches }: { batches: Batch[] }) {
  const columns = [
    { key: 'input', title: 'Food Input', items: batches.slice(0, 2) },
    { key: 'classify', title: 'AI Engine', items: batches.slice(2, 3) },
    { key: 'distribution', title: 'Distribution', items: batches.slice(3, 4) },
    { key: 'output', title: 'Output / Action', items: batches.slice(4) },
  ];

  return (
    <div className="page-stack">
      <div className="pipeline-grid">
        {columns.map((col) => (
          <div key={col.key} className="card pipeline-column">
            <h3>{col.title}</h3>
            {col.items.map((batch) => (
              <div key={batch.id} className="pipeline-card">
                <div className="card-header small">
                  <strong>{batch.id}</strong>
                  <CategoryBadge category={batch.category} />
                </div>
                <small>{batch.productName}</small>
                <small>DSL {batch.dslDays.toFixed(1)}d</small>
                <small>{batch.assignedDestination.name}</small>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulatorPage({ batches, onEvent }: { batches: Batch[]; onEvent: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(batches[0]?.id ?? '');
  const selected = batches.find((batch) => batch.id === selectedId) ?? batches[0];

  const handleTrigger = (type: 'refrigeration' | 'ethylene' | 'traffic') => {
    const batch = batches.find((b) => b.id === selectedId) ?? batches[0];
    if (!batch) return;
    if (type === 'refrigeration') triggerRefrigerationFailure(batch);
    if (type === 'ethylene') triggerEthyleneSpike(batch);
    if (type === 'traffic') triggerTrafficDelay(batch);
    onEvent(`${type} simulated for ${batch.id}`);
  };

  return (
    <div className="page-stack">
      <div className="card simulator-toolbar">
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>{batch.id}</option>
          ))}
        </select>
        <button onClick={() => handleTrigger('refrigeration')}>Refrigeration Failure</button>
        <button onClick={() => handleTrigger('ethylene')}>Ethylene Spike</button>
        <button onClick={() => handleTrigger('traffic')}>Traffic Delay</button>
      </div>

      {selected && (
        <div className="two-col">
          <div className="card">
            <h3>Selected Batch</h3>
            <div className="detail-list">
              <div><small>Product</small><strong>{selected.productName}</strong></div>
              <div><small>Category</small><strong><CategoryBadge category={selected.category} /></strong></div>
              <div><small>Temp</small><strong>{selected.tempC.toFixed(1)}°C</strong></div>
              <div><small>Ethylene</small><strong>{selected.ethylenePpm.toFixed(2)} ppm</strong></div>
              <div><small>DSL</small><strong>{selected.dslDays.toFixed(1)} days</strong></div>
              <div><small>Destination</small><strong>{selected.assignedDestination.name}</strong></div>
            </div>
          </div>

          <div className="card">
            <h3>Activity Log</h3>
            <ul className="event-list">
              {selected.eventLog.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferencePage() {
  return (
    <div className="page-stack">
      <div className="card">
        <h3>Reference Data / Rules</h3>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Baseline</th>
              <th>Temp range</th>
              <th>Climacteric</th>
              <th>Price basis</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(PRODUCTS).map((product) => (
              <tr key={product.key}>
                <td>{product.name}</td>
                <td>{product.baselineDays} days</td>
                <td>{product.safeRange.minC}–{product.safeRange.maxC}°C</td>
                <td>{product.climacteric ? 'Yes' : 'No'}</td>
                <td>{product.priceBasePerKg} QAR/kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Recovery Hierarchy</h3>
        <ol>
          <li>Tier 1 — Food banks and surplus apps</li>
          <li>Tier 2 — Animal feed</li>
          <li>Tier 3 — Industrial reuse (biodiesel/oils)</li>
          <li>Tier 4 — Composting</li>
          <li>Tier 5 — Anaerobic digestion (biogas)</li>
          <li>Tier 6 — Landfill (unsafe/contaminated only)</li>
        </ol>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<PageId>('overview');
  const [batches, setBatches] = useState<Batch[]>(() => makeInitialBatches());
  const [events, setEvents] = useState<string[]>(['Simulation engine initialized.']);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBatches((current) => {
        const next = tickSimulation(current, (message) => setEvents((prev) => [message, ...prev].slice(0, 12)));
        return next;
      });
    }, 2500);
    return () => window.clearInterval(interval);
  }, []);

  const impactSummary = useMemo(() => {
    const savedKg = batches.reduce((sum, batch) => sum + (batch.category === 'ALMOST_BAD' ? batch.weightKg * 0.28 : 0), 0);
    const meals = Math.round(savedKg / 0.3);
    const co2 = Math.round(batches.reduce((sum, batch) => sum + (batch.category === 'ALMOST_BAD' ? batch.weightKg * 0.12 : 0), 0));
    return { savedKg: Math.round(savedKg), meals, co2 };
  }, [batches]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">R</div>
          <div className="brand-name">Reboot the Earth</div>
        </div>
        <nav className="nav">
          {pages.map((navPage) => (
            <button
              key={navPage.id}
              className={page === navPage.id ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setPage(navPage.id)}
            >
              {navPage.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="eyebrow">Cold-Chain Food AI</div>
            <h1>Reboot the Earth — Cold-Chain Food AI</h1>
          </div>
          <div className="status-pill">Live mock simulation</div>
        </header>

        <section className="content-panel">
          {page === 'overview' && <OverviewPage batches={batches} />}
          {page === 'map' && <MapPage batches={batches} />}
          {page === 'inspector' && <InspectorPage batches={batches} />}
          {page === 'pipeline' && <PipelinePage batches={batches} />}
          {page === 'simulator' && <SimulatorPage batches={batches} onEvent={(msg) => setEvents((prev) => [msg, ...prev].slice(0, 12))} />}
          {page === 'reference' && <ReferencePage />}
        </section>

        <footer className="footer-grid">
          <div className="card footer-card">
            <h4>AI impact summary</h4>
            <div className="foot-stats">
              <span>Saved {impactSummary.savedKg} kg</span>
              <span>{impactSummary.co2} kg CO2e avoided</span>
              <span>{impactSummary.meals} meals redirected</span>
            </div>
          </div>
          <div className="card footer-card">
            <h4>Recent events</h4>
            <ul className="event-list compact">
              {events.slice(0, 6).map((event, index) => (
                <li key={`${event}-${index}`}>{event}</li>
              ))}
            </ul>
          </div>
        </footer>
      </main>
    </div>
  );
}
