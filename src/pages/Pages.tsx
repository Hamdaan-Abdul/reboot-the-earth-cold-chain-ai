import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AuditEvent, Batch, Category, FoodGroup, Product } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS, createManualBatch, createProductProfile, DESTINATIONS, FLIGHTS, FOOD_GROUP_LABELS, PRODUCTS } from '../engine';
import { EthyleneChart, HumidityChart, RouteMap, SensorChart, SpeedChart, TemperatureChart } from '../components/Charts';
import { CategoryBadge, EventList, FoodGroupBadge, SectionHeading } from '../components/Shared';
import { fetchAmbientWeather, fetchRoadRoute, type AmbientWeather, type RoadRoute } from '../sources/live';

const needsOperatorReview = (batch: Batch) => batch.contaminated || batch.status === 'ANOMALY_DETECTED' || batch.status === 'PENDING_APPROVAL';

export function OverviewPage({ batches, events, onSelectBatch, onOpenNotifications, onOpenLots, onOpenActivity }: { batches: Batch[]; events: AuditEvent[]; onSelectBatch: (id: string) => void; onOpenNotifications: () => void; onOpenLots: () => void; onOpenActivity: () => void }) {
  const actionBatches = batches.filter(needsOperatorReview)
    .sort((a, b) => Number(b.contaminated) - Number(a.contaminated) || a.dslDays - b.dslDays);
  const actionCount = actionBatches.length;
  const viableValueBatches = batches.filter((batch) => batch.financialPass && !batch.contaminated && batch.category !== 'EXPIRED');
  const estimatedValue = viableValueBatches.reduce((total, batch) => total + Math.max(0, batch.expectedRecoveryValue), 0);
  const estimatedFoodSavedKg = batches.reduce((total, batch) => total + (!batch.contaminated && batch.category !== 'EXPIRED' ? batch.weightKg * batch.probabilitySafeArrival : 0), 0);
  return <div className="page-stack">
    <SectionHeading eyebrow="Operations" title="Start with the lots that need you." detail="Review safety alerts and proposed routes. Nothing moves without an operator’s approval." action={<div className="home-quick-actions"><button className="home-activity-button" onClick={onOpenActivity}>Recent activity <span aria-hidden="true">↗</span></button><button className="action-needed-count notification-shortcut" onClick={onOpenNotifications}>Review queue · {actionCount}</button></div>} />
    <div className="home-priority-grid">
    <section className="panel home-action-panel" aria-labelledby="home-action-heading">
      <div className="panel-title-row"><div><div className="eyebrow">Your queue</div><h3 id="home-action-heading">Needs your review</h3></div><span className="small-muted">{actionCount} {actionCount === 1 ? 'lot' : 'lots'}</span></div>
      {actionBatches.length ? actionBatches.slice(0, 3).map((batch) => <button className="home-action-row selectable-row" key={batch.id} onClick={() => onSelectBatch(batch.id)} aria-label={`Review ${batch.productName}, lot ${batch.id}`}>
        <span className={`notification-mark ${batch.contaminated ? 'danger' : ''}`} aria-hidden="true">{batch.contaminated ? '!' : '↗'}</span>
        <span className="home-action-copy"><strong>{batch.productName} <span>· {batch.id}</span></strong><span className="home-food-tags"><FoodGroupBadge foodGroup={batch.foodGroup} /><CategoryBadge category={batch.category} /></span><small>{batch.anomalyReason ? `Alert: ${batch.anomalyReason}.` : batch.lastActionReason}</small><small><b>Suggested:</b> {batch.lastAction}</small></span>
        <span className="notification-open">Open lot <span aria-hidden="true">→</span></span>
      </button>) : <p className="empty-action-state">No lots need review. Search or scan a lot to check its current status.</p>}
    </section>
    <section className="impact-widget" aria-label="Estimated recovery impact">
      <div className="impact-widget-heading"><div><div className="eyebrow">Current inventory estimate</div><h3>Recovery opportunity · food at risk</h3></div><small>Potential outcomes from current lot assessments</small></div>
      <div className="impact-widget-metrics"><div><small>Potential value on positive routes</small><strong>QAR {estimatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong><span>{viableValueBatches.length} lots · modeled net after route and handling costs · not realized profit</span></div><div><small>Potential food kept in use</small><strong>{(estimatedFoodSavedKg / 1000).toFixed(1)} t</strong><span>{estimatedFoodSavedKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg · safe-arrival-weighted estimate, not confirmed savings</span></div></div>
    </section>
    </div>
    <section className="panel live-batches">
        <div className="panel-title-row"><div><div className="eyebrow">Inventory</div><h3>Recent lots</h3></div><span className="small-muted">{batches.length} in view</span></div>
        {batches.slice(0, 5).map((batch) => <button className="batch-health-row selectable-row" key={batch.id} onClick={() => onSelectBatch(batch.id)} aria-label={`Open details for ${batch.id}`}>
          <span className="health-product-icon" style={{ color: CATEGORY_COLORS[batch.category] }}>{batch.productName.slice(0, 1)}</span>
          <div className="health-meta"><strong>{batch.productName}</strong><small>{batch.id} · {batch.weightKg} kg</small></div>
          <div className="health-days"><strong>{batch.dslDays.toFixed(1)} d</strong><small>freshness</small></div>
          <div className="home-row-tags"><FoodGroupBadge foodGroup={batch.foodGroup} /><CategoryBadge category={batch.category} /></div>
        </button>)}
        <button className="text-link inventory-link" onClick={onOpenLots}>View all lots →</button>
    </section>
    <section className="panel home-activity-panel">
      <div className="panel-title-row"><div><div className="eyebrow">Activity</div><h3>Recent updates</h3></div><button className="text-link" onClick={onOpenActivity}>View activity log →</button></div>
      <EventList events={events} batches={batches} limit={3} />
    </section>
  </div>;
}

export function ActivityPage({ batches, events }: { batches: Batch[]; events: AuditEvent[] }) {
  return <div className="page-stack">
    <SectionHeading eyebrow="Audit trail · this browser" title="Recent activity" detail="Sensor alerts, route suggestions, operator decisions, and lot updates from this demo." />
    <section className="panel"><EventList events={events} batches={batches} limit={40} /></section>
    <p className="prototype-warning">Activity is stored only in this browser. It is not a shared or tamper-proof production audit log.</p>
  </div>;
}

export function NotificationsPage({ batches, events, onSelectBatch, onRecordDecision }: { batches: Batch[]; events: AuditEvent[]; onSelectBatch: (id: string) => void; onRecordDecision: (id: string, operatorName: string, decision: 'APPROVED_SUGGESTION', note: string) => void }) {
  const [query, setQuery] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const actionBatches = batches.filter(needsOperatorReview)
    .filter((batch) => `${batch.id} ${batch.productName} ${batch.supplierLotCode} ${batch.foodGroup} ${FOOD_GROUP_LABELS[batch.foodGroup]}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.contaminated) - Number(a.contaminated) || a.dslDays - b.dslDays);
  return <div className="page-stack">
    <SectionHeading eyebrow="Operator queue" title="Needs your review" detail="Check the alert, evidence, and suggested next step. This demo will not dispatch a shipment." />
    <label className="inventory-filter">Search actions<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Food, lot code, or food group" /></label>
    {actionBatches.length ? <section className="panel"><div className="quick-approval-bar"><label>Name for approval log<input value={operatorName} onChange={(event) => { setOperatorName(event.target.value); setApprovalError(''); }} placeholder="Your name" /></label><small>Approval is recorded locally for the selected suggested route. It does not dispatch a real shipment.</small></div>{approvalError && <p className="form-error" role="alert">{approvalError}</p>}<div className="simple-notification-list">{actionBatches.map((batch) => <article key={batch.id} className="simple-notification">
      <span className={`notification-mark ${batch.contaminated ? 'danger' : ''}`}>{batch.contaminated ? '!' : '↗'}</span>
      <span className="notification-main"><strong>{batch.productName} <span>· {batch.id}</span></strong><span className="home-food-tags"><FoodGroupBadge foodGroup={batch.foodGroup} /><CategoryBadge category={batch.category} /></span><small>{batch.anomalyReason ? `Alert: ${batch.anomalyReason}.` : batch.lastActionReason}</small><small>Temperature {batch.tempC.toFixed(1)}°C · safe range {batch.safeRange.minC}–{batch.safeRange.maxC}°C · freshness estimate {batch.dslDays.toFixed(1)} days</small><small><b>Suggested:</b> {batch.lastAction} · estimated net {batch.expectedRecoveryValue >= 0 ? '+' : ''}QAR {batch.expectedRecoveryValue.toFixed(0)}</small></span>
      <div className="notification-actions"><button className="notification-open" onClick={() => onSelectBatch(batch.id)}>Review lot →</button><button className="quick-approve-button" disabled={!operatorName.trim() || batch.contaminated || batch.dispatchConfirmed} onClick={() => {
        try {
          onRecordDecision(batch.id, operatorName.trim(), 'APPROVED_SUGGESTION', '');
          setApprovalError('');
        } catch (error) {
          setApprovalError(error instanceof Error ? error.message : `Could not approve ${batch.id}.`);
        }
      }}>{batch.contaminated ? 'Safety hold required' : batch.dispatchConfirmed ? 'Already approved' : 'Approve suggested route'}</button></div>
    </article>)}</div></section> : <section className="panel empty-action-state">{query ? 'No action items match your search.' : 'No lots need review right now. New alerts will appear here.'}</section>}
    <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Recent activity</div><h3>Latest updates</h3></div></div><EventList events={events} batches={batches} limit={8} /></section>
  </div>;
}

export function IntakePage({ batches, products, onAddBatch }: { batches: Batch[]; products: Record<string, Product>; onAddBatch: (batch: Batch) => void }) {
  const origins = Array.from(new Map(batches.map((batch) => [batch.originCountry, batch])).values());
  const [id, setId] = useState(() => `LOT-MANUAL-${String(batches.length + 1).padStart(3, '0')}`);
  const [foodGroup, setFoodGroup] = useState<FoodGroup>('FRUIT');
  const groupProducts = Object.values(products).filter((product) => product.foodGroup === foodGroup);
  const [productKey, setProductKey] = useState(() => Object.values(PRODUCTS).find((product) => product.foodGroup === 'FRUIT')?.key ?? Object.keys(PRODUCTS)[0]);
  const [originCountry, setOriginCountry] = useState(origins[0]?.originCountry ?? '');
  const [originCity, setOriginCity] = useState(origins[0]?.originCity ?? '');
  const [supplierName, setSupplierName] = useState('');
  const [weightKg, setWeightKg] = useState('400');
  const [tempC, setTempC] = useState(String(products[productKey]?.optimalMaxTempC ?? 5));
  const [ageDays, setAgeDays] = useState('1');
  const [ethylenePpm, setEthylenePpm] = useState('0.1');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Batch>();
  const selectedProduct = products[productKey] ?? groupProducts[0] ?? Object.values(PRODUCTS)[0];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id.trim()) {
      setError('Enter a lot code.');
      return;
    }
    try {
      const numbers = [weightKg, tempC, ageDays, ethylenePpm].map(Number);
      if (!numbers.every(Number.isFinite) || Number(weightKg) <= 0 || Number(ageDays) < 0 || Number(ethylenePpm) < 0) {
        setError('Check the weight, temperature, age, and ethylene values.');
        return;
      }
      const batch = createManualBatch({ id, productKey, originCity, originCountry, supplierName, weightKg: Number(weightKg), tempC: Number(tempC), ageDays: Number(ageDays), ethylenePpm: Number(ethylenePpm) }, batches, products);
      setPreview(batch);
      setError('');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not create lot.');
    }
  };

  return <div className="page-stack">
    <SectionHeading eyebrow="Manual intake" title="Check a new lot" detail="Enter a few known details. The engine will estimate freshness, safety, and a recommended next step." />
    <div className="intake-layout"><form className="panel intake-form" onSubmit={submit}>
      <label>What type of food?<select value={foodGroup} onChange={(event) => { const nextGroup = event.target.value as FoodGroup; const nextProduct = Object.values(products).find((product) => product.foodGroup === nextGroup); setFoodGroup(nextGroup); if (nextProduct) { setProductKey(nextProduct.key); setTempC(String(nextProduct.optimalMaxTempC)); } setPreview(undefined); }}>{Object.entries(FOOD_GROUP_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label>Food type<select value={productKey} onChange={(event) => { setProductKey(event.target.value); setTempC(String(products[event.target.value].optimalMaxTempC)); setPreview(undefined); }}>{groupProducts.map((product) => <option value={product.key} key={product.key}>{product.name}{product.custom ? ' · custom reference' : ''}</option>)}</select></label>
      <label>Lot code<input required value={id} onChange={(event) => { setId(event.target.value); setPreview(undefined); }} /></label>
      <label>Origin country<select value={originCountry} onChange={(event) => { setOriginCountry(event.target.value); setOriginCity(origins.find((origin) => origin.originCountry === event.target.value)?.originCity ?? ''); setPreview(undefined); }}>{origins.map((origin) => <option key={origin.originCountry} value={origin.originCountry}>{origin.originCountry}</option>)}</select></label>
      <label>Origin city<input required value={originCity} onChange={(event) => { setOriginCity(event.target.value); setPreview(undefined); }} /></label>
      <label>Supplier<input value={supplierName} onChange={(event) => { setSupplierName(event.target.value); setPreview(undefined); }} placeholder="Optional" /></label>
      <label>Weight (kg)<input required type="number" min="1" step="any" value={weightKg} onChange={(event) => { setWeightKg(event.target.value); setPreview(undefined); }} /></label>
      <label>Current temperature (°C)<input required type="number" step="0.1" value={tempC} onChange={(event) => { setTempC(event.target.value); setPreview(undefined); }} /></label>
      <label>Age since harvest (days)<input required type="number" min="0" step="0.1" value={ageDays} onChange={(event) => { setAgeDays(event.target.value); setPreview(undefined); }} /></label>
      <label>Ethylene (ppm)<input required type="number" min="0" step="0.01" value={ethylenePpm} onChange={(event) => { setEthylenePpm(event.target.value); setPreview(undefined); }} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="apply-route-button" type="submit">Preview recommendation</button>
    </form>
      <section className="panel intake-explainer"><div className="eyebrow">What the assessment returns</div><h3>One clear recommendation</h3><p>For {selectedProduct.name}, the engine checks the crop's {selectedProduct.baselineDays}-day baseline and safe temperature range ({selectedProduct.safeRange.minC}–{selectedProduct.safeRange.maxC}°C).</p><p>It then chooses an eligible destination based on freshness, travel time, contamination risk, and expected recovery value.</p><small>Manual entries use sample route and market data for this prototype.</small></section>
    </div>
    {preview && <section className="panel intake-preview" aria-live="polite">
      <div><div className="eyebrow">Assessment preview · not yet added</div><h3>{preview.productName} · {preview.id}</h3><p>{preview.lastActionReason}</p></div>
      <div className="intake-preview-facts"><span><small>Freshness</small><strong>{preview.dslDays.toFixed(1)} days</strong></span><span><small>Condition</small><strong>{CATEGORY_LABELS[preview.category]}</strong></span><span><small>Destination</small><strong>{preview.assignedDestination.name}</strong></span><span><small>Safe arrival estimate</small><strong>{Math.round(preview.probabilitySafeArrival * 100)}%</strong></span><span><small>Estimated net value</small><strong>{preview.expectedRecoveryValue >= 0 ? '+' : ''}QAR {preview.expectedRecoveryValue.toFixed(0)}</strong></span></div>
      <p className="prototype-warning">Preview only. Confirm food safety and verify the example route details before taking any real-world action.</p>
      <button className="apply-route-button" onClick={() => {
        if (batches.some((batch) => batch.id.toLowerCase() === preview.id.toLowerCase() || batch.supplierLotCode.toLowerCase() === preview.id.toLowerCase())) {
          setError('That lot code is already in use. Choose a unique code.');
          setPreview(undefined);
          return;
        }
        onAddBatch(preview);
        setPreview(undefined);
        setId(`LOT-MANUAL-${String(batches.length + 2).padStart(3, '0')}`);
        setSupplierName('');
        setError('');
      }}>Add lot and review</button>
    </section>}
  </div>;
}

export function MapPage({ batches, onSelectBatch }: { batches: Batch[]; onSelectBatch: (id: string) => void }) {
  const [telemetryBatchId, setTelemetryBatchId] = useState(batches[0]?.id ?? '');
  const telemetryBatch = batches.find((batch) => batch.id === telemetryBatchId) ?? batches[0];
  const [ambientWeather, setAmbientWeather] = useState<AmbientWeather>();
  const [roadRoute, setRoadRoute] = useState<RoadRoute>();
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [weatherRefresh, setWeatherRefresh] = useState(0);
  useEffect(() => {
    if (!telemetryBatch) return;
    let current = true;
    setAmbientWeather(undefined);
    setWeatherLoading(true);
    // Open-Meteo supplies current outdoor conditions for this lot's displayed coordinate; it is not cargo-sensor telemetry.
    fetchAmbientWeather(telemetryBatch.lat, telemetryBatch.lng, {
      temperatureC: telemetryBatch.outsideTempC,
      humidityPercent: telemetryBatch.humidity,
    }, weatherRefresh > 0).then((result) => {
      if (current) setAmbientWeather(result);
    }).finally(() => {
      if (current) setWeatherLoading(false);
    });
    return () => { current = false; };
  }, [telemetryBatch?.id, weatherRefresh]);
  const openBatch = (id: string) => {
    setTelemetryBatchId(id);
    setRoadRoute(undefined);
    setWeatherRefresh(0);
    onSelectBatch(id);
  };
  const selectTelemetryBatch = (id: string) => {
    setTelemetryBatchId(id);
    setRoadRoute(undefined);
    setWeatherRefresh(0);
  };
  const checkRoadRoute = async () => {
    if (!telemetryBatch || telemetryBatch.assignedDestination.routeMode !== 'ROAD') return;
    setRouteLoading(true);
    // OSRM calculates road routes only; air and sea schedules remain illustrative until a flight/port feed is selected.
    const result = await fetchRoadRoute(
      { latitude: telemetryBatch.lat, longitude: telemetryBatch.lng },
      { latitude: telemetryBatch.assignedDestination.lat, longitude: telemetryBatch.assignedDestination.lng },
      { distanceKm: telemetryBatch.assignedDestination.distanceKm, durationHours: telemetryBatch.assignedDestination.transitHours },
    );
    setRoadRoute(result);
    setRouteLoading(false);
  };
  const mapBatches = batches.map((batch) => {
    return {
      id: batch.id, productName: batch.productName, lat: batch.lat, lng: batch.lng, category: batch.category,
      originCity: batch.originCity, destination: batch.assignedDestination.name, destinationCountry: batch.assignedDestination.country,
      destinationLat: batch.assignedDestination.lat, destinationLng: batch.assignedDestination.lng,
      color: CATEGORY_COLORS[batch.category], routeMode: batch.assignedDestination.routeMode,
    };
  });
  const readings = useMemo(() => telemetryBatch?.history ?? [], [telemetryBatch]);
  return <div className="page-stack">
    <SectionHeading eyebrow="Route planning · simulated" title="Explore suggested routes." detail="Illustrative flight and road schedules. Every destination is checked against estimated freshness." action={<label className="filter-label">Lot<select value={telemetryBatch?.id ?? ''} onChange={(event) => selectTelemetryBatch(event.target.value)}>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id} · {batch.productName}</option>)}</select></label>} />
    {telemetryBatch && <section className="panel live-source-panel" aria-label="Live context for selected lot">
      <div className="panel-title-row"><div><div className="eyebrow">External context · selected lot</div><h3>{telemetryBatch.productName} · {telemetryBatch.id}</h3></div><span className="small-muted">Cargo sensors remain simulated</span></div>
      <div className="live-source-grid">
        <div><strong>Outdoor weather</strong>{weatherLoading && !ambientWeather ? <span>Loading current conditions…</span> : ambientWeather ? <><span>{ambientWeather.temperatureC.toFixed(1)}°C · {ambientWeather.humidityPercent.toFixed(0)}% RH</span><small>{ambientWeather.status === 'live' ? 'Live' : ambientWeather.status === 'cached' ? 'Cached' : 'Sample fallback'} · {new Date(ambientWeather.observedAt).toLocaleString()}</small><small><a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></small>{ambientWeather.message && <small className="source-warning">{ambientWeather.message}</small>}</> : <span>Weather unavailable.</span>}<button className="text-link" onClick={() => setWeatherRefresh((count) => count + 1)} disabled={weatherLoading}>Refresh weather</button></div>
        <div><strong>Road distance · duration</strong>{telemetryBatch.assignedDestination.routeMode === 'ROAD' ? roadRoute ? <><span>{roadRoute.distanceKm.toFixed(1)} km · {roadRoute.durationHours.toFixed(1)} h</span><small>{roadRoute.status === 'live' ? 'Live route · OSRM' : roadRoute.status === 'cached' ? 'Cached route · OSRM' : 'Modeled fallback'}</small><small><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</a></small>{roadRoute.message && <small className="source-warning">{roadRoute.message}</small>}</> : <span>Not checked yet.</span> : <span>OSRM is road-only; this lot uses {telemetryBatch.assignedDestination.routeMode.toLowerCase()} routing.</span>}{telemetryBatch.assignedDestination.routeMode === 'ROAD' && !roadRoute && <small><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</a></small>}<button className="text-link" onClick={checkRoadRoute} disabled={routeLoading || telemetryBatch.assignedDestination.routeMode !== 'ROAD'}>{routeLoading ? 'Checking route…' : 'Check live road route'}</button></div>
      </div>
      <p className="prototype-warning">Weather is measured at a displayed coordinate; the lot's GPS position may itself be sample data. It is not a temperature reading inside the shipment. OSRM's public demo service is best-effort; its route result does not include live traffic.</p>
    </section>}
    <section className="panel map-panel"><div className="panel-title-row"><div><div className="eyebrow">Sample international lanes</div><h3>Suggested routes by lot</h3></div><span className="small-muted">{batches.length} lots</span></div>
      <RouteMap batches={mapBatches} onSelectBatch={openBatch} />
      <div className="map-legend">{(['RAW', 'EDIBLE', 'ALMOST_BAD', 'EXPIRED'] as Category[]).map((category) => <span key={category}><i style={{ background: CATEGORY_COLORS[category] }} />{CATEGORY_LABELS[category]}</span>)}</div>
    </section>
    <div className="telemetry-grid">
      <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Selected lot · {telemetryBatch?.id}</div><h3>Temperature</h3></div><span className="small-muted">Safe limit {telemetryBatch?.safeRange.minC}–{telemetryBatch?.safeRange.maxC}°C</span></div>{readings.length > 1 && telemetryBatch ? <TemperatureChart readings={readings} safeRange={{ min: telemetryBatch.safeRange.minC, max: telemetryBatch.safeRange.maxC }} /> : <div className="chart-empty">Waiting for telemetry samples…</div>}</section>
      <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Selected lot · {telemetryBatch?.id}</div><h3>Humidity</h3></div><span className="small-muted">Safe limit 85–95%</span></div>{readings.length > 1 ? <HumidityChart readings={readings} /> : <div className="chart-empty">Waiting for telemetry samples…</div>}</section>
      <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Selected lot · {telemetryBatch?.id}</div><h3>Ethylene</h3></div><span className="small-muted">DSL penalty &gt;0.5 ppm · alert &gt;1.2 ppm</span></div>{readings.length > 1 ? <EthyleneChart readings={readings} /> : <div className="chart-empty">Waiting for telemetry samples…</div>}</section>
      <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Selected lot · {telemetryBatch?.id}</div><h3>GPS speed · km/h</h3></div><span className="small-muted">Simulated position stream</span></div>{readings.length > 1 ? <SpeedChart readings={readings} /> : <div className="chart-empty">Collecting sample readings…</div>}</section>
    </div>
    <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Simulated vehicle signals</div><h3>Modeled positions & speed</h3></div></div>
      <div className="telemetry-table-wrap"><table className="data-table"><thead><tr><th>Load</th><th>GPS coordinates</th><th>Speed</th><th>ETA delay</th><th>Weather heat</th><th>Demand</th><th>Destination</th></tr></thead><tbody>
        {batches.map((batch) => <tr key={batch.id} className="selectable-table-row" onClick={() => openBatch(batch.id)} tabIndex={0} aria-label={`Open ${batch.productName} lot ${batch.id}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openBatch(batch.id); } }}><td><span className="table-product"><i style={{ background: CATEGORY_COLORS[batch.category] }} />{batch.id} · {batch.productName}</span><small className="table-subline">{FOOD_GROUP_LABELS[batch.foodGroup]} · {CATEGORY_LABELS[batch.category]}</small></td><td>{batch.lat.toFixed(3)}, {batch.lng.toFixed(3)}</td><td>{batch.speedKmph.toFixed(0)} km/h</td><td>{batch.trafficDelayHours.toFixed(1)} h</td><td>{batch.weatherHeatIndexC.toFixed(0)}°C</td><td>{Math.round(batch.demandProbability * 100)}%</td><td>{batch.assignedDestination.name}</td></tr>)}
      </tbody></table></div>
    </section>
    <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Air-cargo routine · simulated schedule feed</div><h3>Flight board & available reefer capacity</h3></div><span className="small-muted">Illustrative schedules · not live airline data</span></div>
      <div className="table-scroll"><table className="data-table flight-board"><thead><tr><th>Flight / carrier</th><th>Lane</th><th>Departure → arrival</th><th>Flight time</th><th>Reefer space</th><th>Next action</th><th>Status</th></tr></thead><tbody>
        {FLIGHTS.map((flight) => {
          const activeLoad = batches.find((batch) => batch.flight?.id === flight.id);
          const freeCapacity = flight.cargoCapacityKg - flight.cargoBookedKg;
          return <tr key={flight.id} className={activeLoad ? 'selectable-table-row' : ''} onClick={() => activeLoad && onSelectBatch(activeLoad.id)} tabIndex={activeLoad ? 0 : undefined} aria-label={activeLoad ? `Open lot ${activeLoad.id}, flight ${flight.flightNumber}` : undefined} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && activeLoad) { event.preventDefault(); onSelectBatch(activeLoad.id); } }}>
            <td><strong>{flight.flightNumber}</strong><small className="table-subline">{flight.airline}</small></td>
            <td>{flight.originAirportCode} → {flight.destinationAirportCode}<small className="table-subline">{flight.originCity} → {flight.destinationCity}</small></td>
            <td>{flight.departureLocal} → {flight.arrivalLocal}<small className="table-subline">{flight.daysOfWeek}</small></td>
            <td>{flight.durationHours.toFixed(1)} h</td><td>{freeCapacity.toLocaleString()} kg · {flight.onTimeProbability * 100}% OTP</td>
            <td>{activeLoad ? `${activeLoad.id} · ${activeLoad.dslDays.toFixed(1)} days freshness` : 'Capacity available'}</td>
            <td><span className={`flight-status ${activeLoad ? 'flight-active' : ''}`}>{activeLoad?.flightStatus?.replace('_', ' ') ?? 'SCHEDULED'}</span></td>
          </tr>;
        })}
      </tbody></table></div>
    </section>
  </div>;
}

export function InspectorPage({ batches, onSelectBatch }: { batches: Batch[]; onSelectBatch: (id: string) => void }) {
  const [filter, setFilter] = useState<'ALL' | Category>('ALL');
  const [query, setQuery] = useState('');
  const filtered = batches.filter((batch) => (filter === 'ALL' || batch.category === filter)
    && `${batch.id} ${batch.productName} ${batch.supplierLotCode}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack">
    <SectionHeading eyebrow="Lot inventory" title="Find and review a lot" detail="Plain-language condition and next step. Open any lot for decision evidence and full details." action={<label className="filter-label">Stage <select value={filter} onChange={(event) => setFilter(event.target.value as 'ALL' | Category)}><option value="ALL">All stages</option>{(['RAW', 'EDIBLE', 'ALMOST_BAD', 'EXPIRED'] as Category[]).map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>} />
    <label className="inventory-filter">Filter lots<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, lot code, or supplier lot" /></label>
    <section className="panel inventory-list" aria-label="Produce lots">
      {filtered.map((batch) => <button key={batch.id} className="inventory-row selectable-row" onClick={() => onSelectBatch(batch.id)}>
        <span className="inventory-title"><strong>{batch.productName}</strong><small>{batch.id} · {batch.originCity}, {batch.originCountry}</small><FoodGroupBadge foodGroup={batch.foodGroup} /></span>
        <span className="inventory-cell"><small>Condition</small><CategoryBadge category={batch.category} /></span>
        <span className="inventory-cell"><small>Est. freshness</small><strong>{batch.dslDays.toFixed(1)} days</strong></span>
        <span className="inventory-cell"><small>Temperature</small><strong>{batch.tempC.toFixed(1)}°C <span className={batch.tempC > batch.safeRange.maxC || batch.tempC < batch.safeRange.minC ? 'text-warning' : 'text-good'}>{batch.tempC > batch.safeRange.maxC || batch.tempC < batch.safeRange.minC ? '· Above safe range' : '· In safe range'}</span></strong></span>
        <span className="inventory-cell inventory-destination"><small>Suggested next step</small><strong>{batch.lastAction}</strong><small>{batch.assignedDestination.name}</small></span>
        <span className="inventory-open" aria-hidden="true">Review →</span>
      </button>)}
      {!filtered.length && <p className="empty-action-state">No lots match this filter.</p>}
    </section>
  </div>;
}

const flowStages = [
  { id: 'INPUT', label: 'Food input', note: 'Lots received & weighed' },
  { id: 'CATEGORIZING', label: 'Categorizing', note: 'Sensors & quality signals' },
  { id: 'DISTRIBUTION', label: 'Distribution', note: 'Route economics checked' },
  { id: 'OUTPUT', label: 'Output / action', note: 'Delivery or recovery' },
] as const;

export function PipelinePage({ batches, onSelectBatch }: { batches: Batch[]; onSelectBatch: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const placed = useMemo(() => batches.filter((batch) => `${batch.id} ${batch.productName} ${batch.supplierLotCode} ${batch.foodGroup} ${FOOD_GROUP_LABELS[batch.foodGroup]}`.toLowerCase().includes(query.toLowerCase())).map((batch) => {
    const index = flowStages.findIndex((stage) => stage.id === batch.workflowStage);
    return { batch, index: index < 0 ? 0 : index };
  }), [batches, query]);
  const inputGroups = Object.entries(placed.filter((item) => item.index === 0).reduce<Record<string, number>>((counts, { batch }) => {
    counts[batch.foodGroup] = (counts[batch.foodGroup] ?? 0) + 1;
    return counts;
  }, {}));
  return <div className="page-stack">
    <SectionHeading eyebrow="Decision workflow" title="From incoming load to best outcome." detail="Batch movement is derived from current classification and destination — no fixed demo cards." />
    <label className="inventory-filter workflow-search">Search workflow<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Food, lot code, or food group" /></label>
    <div className="workflow-track">{flowStages.map((stage, index) => <div className={`workflow-stage ${index < flowStages.length - 1 ? 'has-connector' : ''}`} key={stage.id}>
      <div className="workflow-head"><span className="workflow-number">0{index + 1}</span><span className="workflow-count">{placed.filter((item) => item.index === index).length}</span></div>
      <h3>{stage.label}</h3><p>{stage.note}</p>
      {index === 0 && inputGroups.length > 0 && <div className="workflow-food-groups">{inputGroups.map(([group, count]) => <span key={group}>{FOOD_GROUP_LABELS[group as FoodGroup]} · {count}</span>)}</div>}
      <div className="workflow-items">{placed.filter((item) => item.index === index).map(({ batch }) => <button className="workflow-card selectable-row" key={batch.id} style={{ borderLeftColor: CATEGORY_COLORS[batch.category] }} onClick={() => onSelectBatch(batch.id)}><div><strong>{batch.id}</strong><CategoryBadge category={batch.category} /></div><span>{batch.productName} · {batch.weightKg} kg</span><FoodGroupBadge foodGroup={batch.foodGroup} /><small>{batch.dslDays.toFixed(1)} days left · {batch.lastAction}</small></button>)}{!placed.some((item) => item.index === index) && <div className="workflow-empty">{query ? 'No matching lots in this step.' : index === 0 ? 'New lots appear here when they are added from Manual intake.' : 'No batches in this step.'}</div>}</div>
    </div>)}</div>
    <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Routing policy</div><h3>Every move respects food safety first.</h3></div></div><div className="policy-grid"><div><strong>01 · Match freshness</strong><span>Rmax must cover destination distance; closer positive routes are preferred as DSL falls.</span></div><div><strong>02 · Protect value</strong><span>Expected recovery is destination price × safe-arrival probability less transport and handling.</span></div><div><strong>03 · Recover responsibly</strong><span>Unsafe or contaminated expired food is the only batch sent to landfill.</span></div></div></section>
  </div>;
}

export function SimulatorPage({ batches, events, onAction, onSelectBatch }: { batches: Batch[]; events: AuditEvent[]; onAction: (id: string, action: 'refrigeration' | 'ethylene' | 'traffic') => void; onSelectBatch: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(batches[0]?.id ?? '');
  const selected = batches.find((batch) => batch.id === selectedId) ?? batches[0];
  const [query, setQuery] = useState('');
  const matchingBatches = batches.filter((batch) => `${batch.id} ${batch.productName} ${batch.supplierLotCode} ${batch.foodGroup} ${FOOD_GROUP_LABELS[batch.foodGroup]}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack">
    <SectionHeading eyebrow="What-if lab" title="Stress-test the cold chain." detail="Inject real faults into a selected batch. Sensor streams, shelf life, route decisions, and audit events update together." />
    <section className="panel simulator-panel">
      <div className="simulator-select"><label htmlFor="sim-search">Find lot</label><input id="sim-search" type="search" value={query} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); const matches = batches.filter((batch) => `${batch.id} ${batch.productName} ${batch.supplierLotCode} ${batch.foodGroup} ${FOOD_GROUP_LABELS[batch.foodGroup]}`.toLowerCase().includes(nextQuery.toLowerCase())); if (matches.length && !matches.some((batch) => batch.id === selectedId)) { setSelectedId(matches[0].id); onSelectBatch(matches[0].id); } }} placeholder="Name, lot code, or food group" /><label htmlFor="sim-batch">Selected lot</label><select id="sim-batch" value={matchingBatches.some((batch) => batch.id === selected?.id) ? selected?.id : ''} disabled={!matchingBatches.length} onChange={(event) => { setSelectedId(event.target.value); onSelectBatch(event.target.value); }}>{matchingBatches.length ? matchingBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id} · {batch.productName} · {FOOD_GROUP_LABELS[batch.foodGroup]} · {CATEGORY_LABELS[batch.category]}</option>) : <option value="">No lots match</option>}</select></div>
      <div className="simulator-actions">
        <button className="sim-action" onClick={() => selected && onAction(selected.id, 'refrigeration')}><span className="sim-action-icon">♨</span><strong>Refrigeration failure</strong><small>Ramp 12°C → 20°C over the next four sensor ticks</small></button>
        <button className="sim-action" onClick={() => selected && onAction(selected.id, 'ethylene')}><span className="sim-action-icon purple">◉</span><strong>Ethylene spike</strong><small>Inject a climacteric gas leak above 1.2 ppm</small></button>
        <button className="sim-action" onClick={() => selected && onAction(selected.id, 'traffic')}><span className="sim-action-icon blue">⌁</span><strong>Traffic delay</strong><small>Add 12 hours to ETA and recheck arrival risk</small></button>
      </div>
    </section>
    {selected && <div className="simulator-grid">
      <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Selected sample lot</div><h3>{selected.productName} <span className="small-muted">· {selected.id}</span></h3><FoodGroupBadge foodGroup={selected.foodGroup} /></div><div><CategoryBadge category={selected.category} /><button className="text-link" onClick={() => onSelectBatch(selected.id)}>Open lot summary</button></div></div>
        <div className="sim-metrics"><div><small>Temperature · safe {selected.safeRange.minC}–{selected.safeRange.maxC}°C</small><strong>{selected.tempC.toFixed(1)}°C</strong></div><div><small>Ethylene · simulated</small><strong>{selected.ethylenePpm.toFixed(2)} ppm</strong></div><div><small>Time outside safe range</small><strong>{selected.timeOutOfRangeMin.toFixed(1)} min</strong></div><div><small>Estimated freshness</small><strong>{selected.dslDays.toFixed(1)} days</strong></div><div><small>Estimated safe arrival</small><strong>{Math.round(selected.probabilitySafeArrival * 100)}%</strong></div><div><small>Suggested route</small><strong>{selected.assignedDestination.name}</strong></div></div>
        <div className="chart-title"><strong>Simulated sensor readings</strong><span>Updated {selected.history.at(-1)?.time ?? 'not available'}</span></div><SensorChart readings={selected.history} safeRange={{ min: selected.safeRange.minC, max: selected.safeRange.maxC }} />
      </section>
      <section className="panel"><div className="panel-title-row"><div><div className="eyebrow">Local activity log</div><h3>Decision & sensor history</h3></div><span className="small-muted">{events.filter((event) => event.batchId === selected.id).length} events</span></div><EventList events={events.filter((event) => event.batchId === selected.id)} batches={batches} limit={12} /></section>
    </div>}
  </div>;
}

export function ReferencePage({ batches, products, onAddProduct, onSelectBatch }: { batches: Batch[]; products: Record<string, Product>; onAddProduct: (product: Product) => void; onSelectBatch: (id: string) => void }) {
  const rows = Object.values(products);
  const [showAddReference, setShowAddReference] = useState(false);
  const [referenceName, setReferenceName] = useState('');
  const [referenceGroup, setReferenceGroup] = useState<FoodGroup>('VEGETABLE');
  const [baselineDays, setBaselineDays] = useState('7');
  const [minTemp, setMinTemp] = useState('0');
  const [maxTemp, setMaxTemp] = useState('4');
  const [optimalMax, setOptimalMax] = useState('4');
  const [transitSpeed, setTransitSpeed] = useState('500');
  const [basePrice, setBasePrice] = useState('2');
  const [climacteric, setClimacteric] = useState(false);
  const [referenceError, setReferenceError] = useState('');

  const addReference = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const profile = createProductProfile({
        name: referenceName,
        foodGroup: referenceGroup,
        baselineDays: Number(baselineDays),
        safeRange: { minC: Number(minTemp), maxC: Number(maxTemp) },
        optimalMaxTempC: Number(optimalMax),
        climacteric,
        averageTransitSpeedKmPerDay: Number(transitSpeed),
        priceBasePerKg: Number(basePrice),
      }, products);
      onAddProduct(profile);
      setReferenceName('');
      setReferenceError('');
      setShowAddReference(false);
    } catch (profileError) {
      setReferenceError(profileError instanceof Error ? profileError.message : 'Could not add food reference.');
    }
  };

  return <div className="page-stack">
    <SectionHeading eyebrow="Transparent by design" title="Reference & safety rules." detail="Crop assumptions, engine formulas, routing rules, and expired-food recovery order." />
    <section className="panel data-sources-panel">
      <div className="eyebrow">Data sources · reviewed 26 September 2026</div><h3>What is live, what is reference, and what is still simulated</h3>
      <p className="reference-note">External sources add context; they do not certify food safety or replace shipment sensors. Live requests use a time limit and fall back to cached or clearly marked sample values.</p>
      <div className="source-list">
        <article><div><strong>Open-Meteo · live ambient weather</strong><span className="source-status live">Connected on Route map</span></div><p>Current outdoor temperature and humidity at the selected lot position. CC BY 4.0 requires credit and a link to the license; free API is non-commercial and limited to 10,000 calls/day, 5,000/hour, 600/minute.</p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">API and terms ↗</a></article>
        <article><div><strong>OSRM · live road-route lookup</strong><span className="source-status live">On demand · roads only</span></div><p>Road distance and estimated duration via OpenStreetMap. OSM data is ODbL: show “© OpenStreetMap contributors” and link the license. The public demo is best-effort, has no SLA, and does not provide live traffic; air and sea routes are not covered.</p><a href="https://project-osrm.org/docs/v5.24.0/api/" target="_blank" rel="noreferrer">OSRM API docs</a><span> · </span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OSM copyright</a></article>
        <article><div><strong>NASA POWER · climate reference candidate</strong><span className="source-status reference">Not queried by this demo</span></div><p>Historical and climate-quality meteorology/solar data for regional baselines, not shipment-level live weather. Public API examples need no key; excessive synchronous requests can be blocked and HTTP 429 is possible. Cite NASA POWER and check product metadata for any product-specific reuse conditions.</p><a href="https://power.larc.nasa.gov/docs/services/api/" target="_blank" rel="noreferrer">API documentation</a></article>
        <article><div><strong>FAO Food Loss and Waste Database · benchmark candidate</strong><span className="source-status reference">Not queried by this demo</span></div><p>Country, commodity, and value-chain loss estimates compiled from heterogeneous research and reports; these are context, not a lot-level measured reduction. FAO statistical databases are generally CC BY 4.0, but the FLW collection's individual studies can carry separate rights; verify each record before reuse and cite FAO. No API contract, key requirement, or request quota is documented for this database.</p><a href="https://www.fao.org/platform-food-loss-waste/flw-data/en" target="_blank" rel="noreferrer">Database</a><span> · </span><a href="https://www.fao.org/contact-us/terms/db-terms-of-use/en/" target="_blank" rel="noreferrer">FAO database terms</a></article>
        <article><div><strong>Our World in Data · benchmark candidate</strong><span className="source-status reference">No indicator selected</span></div><p>The supplied “Food Waste” URL currently redirects to environmental impacts of food. Chart CSV/JSON APIs do not require a key; no numeric quota is published. Licensing depends on the specific indicator: OWID-created material is CC BY 4.0, while underlying third-party data keep their own terms.</p><a href="https://ourworldindata.org/faqs" target="_blank" rel="noreferrer">API, reuse, and citation guidance</a></article>
        <article><div><strong>US EPA Wasted Food Scale · guidance reference</strong><span className="source-status reference">Guidance only</span></div><p>Static U.S. guidance for comparing wasted-food management options; not an API or numerical impact dataset. The old Food Recovery Hierarchy link redirects to the updated Wasted Food Scale. Attribute EPA and verify that any embedded third-party material has separate permission.</p><a href="https://www.epa.gov/sustainable-management-food/wasted-food-scale" target="_blank" rel="noreferrer">EPA guidance</a></article>
      </div>
      <p className="prototype-warning">Still simulated: in-container temperature/humidity, GPS motion, ethylene, vision grading, spoilage gas, traffic, demand, prices, cargo flights, and batch records. None of the supplied sources provides these lot-specific feeds. Product shelf-life/safe-range profiles and impact calculations remain unchanged pending authoritative per-food data and your approval.</p>
    </section>
    <section className="panel">
      <div className="panel-title-row"><div><div className="eyebrow">Food profiles · {rows.length}</div><h3>Handling parameters by food type</h3><p className="reference-note">Profiles here are used when assessing new lots. Changes are saved in this browser.</p></div><button className="apply-route-button reference-add-toggle" onClick={() => setShowAddReference((open) => !open)}>{showAddReference ? 'Close form' : '+ Add food reference'}</button></div>
      {showAddReference && <form className="reference-form" onSubmit={addReference}>
        <label>Food name<input required value={referenceName} onChange={(event) => setReferenceName(event.target.value)} placeholder="e.g. Fresh turkey" /></label>
        <label>Food group<select value={referenceGroup} onChange={(event) => setReferenceGroup(event.target.value as FoodGroup)}>{Object.entries(FOOD_GROUP_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <label>Baseline shelf life (days)<input required type="number" min="0.1" step="0.1" value={baselineDays} onChange={(event) => setBaselineDays(event.target.value)} /></label>
        <label>Safe minimum (°C)<input required type="number" step="0.1" value={minTemp} onChange={(event) => setMinTemp(event.target.value)} /></label>
        <label>Safe maximum (°C)<input required type="number" step="0.1" value={maxTemp} onChange={(event) => setMaxTemp(event.target.value)} /></label>
        <label>Optimal maximum (°C)<input required type="number" step="0.1" value={optimalMax} onChange={(event) => setOptimalMax(event.target.value)} /></label>
        <label>Average transit speed (km/day)<input required type="number" min="1" step="1" value={transitSpeed} onChange={(event) => setTransitSpeed(event.target.value)} /></label>
        <label>Base value (QAR/kg)<input required type="number" min="0" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} /></label>
        <label className="reference-checkbox"><input type="checkbox" checked={climacteric} onChange={(event) => setClimacteric(event.target.checked)} /> Climacteric food (ethylene-sensitive)</label>
        {referenceError && <p className="form-error" role="alert">{referenceError}</p>}
        <p className="prototype-warning">Use verified local food-safety guidance for these values. A saved profile changes later lot assessments; this browser does not sync the reference to other users.</p>
        <button className="apply-route-button" type="submit">Save food reference</button>
      </form>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Food</th><th>Group</th><th>Baseline shelf life</th><th>Safe temperature range</th><th>Ethylene-sensitive</th><th>Live lots · open</th><th>Base market value</th></tr></thead><tbody>{rows.map((product) => <tr key={product.key}><td><strong>{product.name}{product.custom ? ' · custom' : ''}</strong></td><td>{FOOD_GROUP_LABELS[product.foodGroup]}</td><td>{product.baselineDays} days</td><td>{product.safeRange.minC}–{product.safeRange.maxC}°C</td><td>{product.climacteric ? 'Yes' : 'No'}</td><td>{batches.filter((batch) => batch.productKey === product.key).map((batch) => <button className="text-link" key={batch.id} onClick={() => onSelectBatch(batch.id)}>{batch.id}</button>)}</td><td>QAR {product.priceBasePerKg.toFixed(2)}/kg</td></tr>)}</tbody></table></div>
    </section>
    <div className="reference-grid"><section className="panel"><div className="eyebrow">Engine formulas</div><h3>Calculated each sensor tick</h3><div className="formula-list">
      <div><strong>Dynamic shelf life</strong><code>baseline days × (1 − thermal penalty − ethylene penalty)</code><span>Thermal penalty = (temp − crop safe max) × 0.12/day above the maximum only. Ethylene penalty = ppm × 0.25 when &gt;0.5 ppm and crop is climacteric. Elapsed age is accounted for separately to calculate remaining days.</span></div>
      <div><strong>Maximum route range</strong><code>(DSL − 1 day safety buffer) × average transit speed km/day</code><span>A destination outside Rmax is not eligible for a fresh-food route.</span></div>
      <div><strong>Expected recovery</strong><code>destination price × safe-arrival probability − transport − handling</code><span>Safe-arrival probability decays exponentially as time out of range and ETA delay accumulate.</span></div>
    </div></section>
    <section className="panel"><div className="eyebrow">When time is short</div><h3>Expired food recovery hierarchy</h3><p className="reference-note">Safe, uncontaminated lots are routed in strict priority order. Contaminated food bypasses recovery and goes to landfill only.</p><ol className="recovery-list">{[['01', 'Redistribution', 'Food banks · surplus apps'], ['02', 'Animal feed', 'Licensed feed partners'], ['03', 'Industrial reuse', 'Biodiesel · oils'], ['04', 'Composting', 'Municipal organics'], ['05', 'Anaerobic digestion', 'Biogas recovery'], ['06', 'Landfill', 'Unsafe or contaminated only']].map(([number, title, detail]) => <li key={number}><b>{number}</b><span><strong>{title}</strong><small>{detail}</small></span></li>)}</ol></section></div>
    <div className="summer-callout"><span>☼</span><div><strong>Qatar summer operating note</strong><p>Route recommendations account for extreme ambient heat and weather heat index. Prioritize early-morning or night transport windows for heat-sensitive produce.</p></div></div>
  </div>;
}
