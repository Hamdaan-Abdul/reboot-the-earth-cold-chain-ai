import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuditEvent, Batch, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS, FLIGHTS, operatorRouteOptions } from '../engine';
import type { OperatorDecision } from '../engine';
import { SensorChart } from './Charts';

export function CategoryBadge({ category }: { category: Category }) {
  return <span className={`category-badge category-${category.toLowerCase()}`} style={{ '--category-color': CATEGORY_COLORS[category] } as React.CSSProperties}>{CATEGORY_LABELS[category]}</span>;
}

export function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) {
  return <article className="stat-card">
    <div className="stat-icon" aria-hidden="true">{icon}</div>
    <div className="stat-label">{label}</div>
    <strong className="stat-value">{value}</strong>
    <div className="stat-detail">{detail}</div>
  </article>;
}

export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="section-heading">
    <div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{detail}</p></div>
    {action}
  </div>;
}

export function EventList({ events, batches, limit = 7 }: { events: AuditEvent[]; batches: Batch[]; limit?: number }) {
  const batchMap = new Map(batches.map((batch) => [batch.id, batch.productName]));
  return <ul className="audit-list">
    {events.slice(0, limit).map((event) => <li key={event.id} className={`audit-item audit-${event.kind.toLowerCase()}`}>
      <span className="audit-dot" />
      <div className="audit-copy"><strong>{event.batchId} · {batchMap.get(event.batchId) ?? 'Cold-chain system'}</strong><span>{event.message}</span></div>
      <time>{event.at}</time>
    </li>)}
    {!events.length && <li className="empty-state">Sensor streams are normal. No anomalies in the audit trail.</li>}
  </ul>;
}

export function RecoveryLabel({ batch }: { batch: Batch }) {
  if (batch.category === 'EXPIRED') {
    return <span className={`destination-tag ${batch.contaminated ? 'danger' : 'recovery'}`}>{batch.contaminated ? 'Landfill · unsafe' : `Tier ${batch.assignedDestination.recoveryTier} recovery`}</span>;
  }
  return <span className="destination-tag">{batch.assignedDestination.name}</span>;
}

export function BatchDetailDrawer({
  batch,
  events,
  onClose,
  onAction,
  onRecordDecision,
}: {
  batch: Batch;
  events: AuditEvent[];
  onClose: () => void;
  onAction: (id: string, action: 'refrigeration' | 'ethylene' | 'traffic') => void;
  onRecordDecision: (id: string, operatorName: string, decision: OperatorDecision, note: string, destinationId?: string) => void;
}) {
  const flight = batch.flight;
  const flightSchedule = flight ? FLIGHTS.find((candidate) => candidate.id === flight.id) : undefined;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [operatorName, setOperatorName] = useState('');
  const [decision, setDecision] = useState<OperatorDecision>('APPROVED_SUGGESTION');
  const [operatorDestinationId, setOperatorDestinationId] = useState('');
  const [operatorNote, setOperatorNote] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const routeOptions = operatorRouteOptions(batch);
  const lastReading = batch.history.at(-1);
  const statusLabel = batch.contaminated ? 'Hold · safety check required' : batch.operatorDecision === 'HOLD_FOR_INSPECTION' ? 'Held · inspection requested' : batch.anomalyReason ? 'Alert · review required' : batch.dispatchConfirmed
    ? batch.flightStatus === 'IN_TRANSIT' ? 'Approved in demo · in transit' : 'Approved in demo'
    : batch.status === 'ANOMALY_DETECTED' ? 'Alert · review required' : batch.status === 'PENDING_APPROVAL' ? 'Route needs approval' : 'No current alert';

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('.batch-detail-drawer');
        const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, [href]')) : [];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateOperatorName = (value: string) => {
    setOperatorName(value);
  };

  return <div className="detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="batch-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="batch-detail-title">
      <div className="drawer-header"><div><div className="eyebrow">Lot {batch.id}</div><h2 id="batch-detail-title">{batch.productName}</h2><p>{batch.originCity}, {batch.originCountry} · {batch.weightKg.toLocaleString()} kg</p></div><button ref={closeButtonRef} className="drawer-close" aria-label="Close batch details" onClick={onClose}>×</button></div>
      <div className="drawer-scroll">
        <div className="drawer-status-row"><CategoryBadge category={batch.category} /><span className={`plain-status ${batch.contaminated ? 'danger' : batch.anomalyReason || batch.status === 'PENDING_APPROVAL' || batch.status === 'ANOMALY_DETECTED' ? 'review' : batch.dispatchConfirmed ? 'approved' : ''}`}>{statusLabel}</span></div>
        <section className="recommendation-card" aria-labelledby="recommendation-title">
          <div className="eyebrow">Suggested next step</div>
          <h3 id="recommendation-title">{batch.lastAction}</h3>
          <p>{batch.lastActionReason}</p>
          <div className="drawer-route"><span aria-hidden="true">→</span><strong>{batch.assignedDestination.name}</strong><small>{batch.assignedDestination.country} · {batch.assignedDestination.distanceKm.toLocaleString()} km · {batch.assignedDestination.routeMode} · {batch.assignedDestination.transitHours.toFixed(1)} h estimated</small></div>
        </section>
        <section className="evidence-section" aria-labelledby="evidence-heading">
          <div className="panel-title-row"><div><div className="eyebrow">Decision evidence</div><h3 id="evidence-heading">Why this recommendation</h3></div></div>
          <div className="evidence-grid">
            <div><small>Estimated freshness</small><strong>{batch.dslDays.toFixed(1)} days</strong><span>At current readings</span></div>
            <div><small>Temperature</small><strong>{batch.tempC.toFixed(1)}°C</strong><span>Safe {batch.safeRange.minC}–{batch.safeRange.maxC}°C</span></div>
            <div><small>Estimated safe arrival</small><strong>{Math.round(batch.probabilitySafeArrival * 100)}%</strong><span>{batch.timeOutOfRangeMin.toFixed(0)} min outside range · {batch.trafficDelayHours.toFixed(1)} h delay</span></div>
            <div><small>Estimated net value</small><strong>{batch.expectedRecoveryValue >= 0 ? '+' : ''}QAR {batch.expectedRecoveryValue.toFixed(0)}</strong><span>{batch.financialPass ? 'After modeled transport and handling' : 'Donation or recovery route may still apply'}</span></div>
          </div>
          <p className="evidence-footnote">Estimate uses illustrative product, route, and market assumptions; it is not a guarantee.</p>
        </section>
        {batch.operatorDecision && <section className="operator-record"><div className="eyebrow">Your last decision</div><strong>{batch.operatorDecision === 'HOLD_FOR_INSPECTION' ? 'Held for inspection' : batch.operatorDecision === 'ALTERNATE_ROUTE' ? 'Alternate route selected' : 'Suggested route approved'}</strong>{batch.operatorNote && <p>{batch.operatorNote}</p>}</section>}
        {flight && <details className="drawer-disclosure"><summary>Sample flight routine · {flight.flightNumber} · {batch.flightStatus?.replace('_', ' ') ?? 'scheduled'}</summary><div className="disclosure-content"><p>{flight.originAirportCode} → {flight.destinationAirportCode} · {flight.departureLocal} · {flight.durationHours.toFixed(1)} hours · {flight.daysOfWeek}</p><p>{flight.airline}. Schedule, capacity, and reliability are sample values, not a live airline feed.</p><p>Status: {batch.dispatchConfirmed ? batch.flightStatus === 'IN_TRANSIT' ? 'simulated flight in transit' : 'route approved; simulated flight will progress' : 'not approved; no movement in simulation'}.</p>{flightSchedule && <small>Illustrative capacity remaining: {(flightSchedule.cargoCapacityKg - flightSchedule.cargoBookedKg).toLocaleString()} kg · modeled on-time likelihood {Math.round(flight.onTimeProbability * 100)}%</small>}</div></details>}
        <details className="drawer-disclosure"><summary>Sensor readings & history</summary><div className="disclosure-content">
          <p>Last simulated reading: {lastReading?.time ?? 'Not available'}</p>
          <div className="drawer-metrics"><div><small>Humidity</small><strong>{batch.humidity.toFixed(0)}% · guide 85–95%</strong></div><div><small>Ethylene</small><strong>{batch.ethylenePpm.toFixed(2)} ppm · penalty above 0.5</strong></div><div><small>GPS speed</small><strong>{batch.speedKmph.toFixed(0)} km/h · simulated</strong></div><div><small>Spoilage gas</small><strong>{batch.olfactoryGasPpm.toFixed(2)} ppm · {batch.contaminated ? 'safety flag' : 'no safety flag'}</strong></div><div><small>Visual quality estimate</small><strong>{Math.round(batch.visionRipeness * 100)}% ripe · {Math.round(batch.visionBlemish * 100)}% blemish</strong></div><div><small>Outdoor heat</small><strong>{batch.weatherHeatIndexC.toFixed(0)}°C · simulated</strong></div></div>
          <SensorChart readings={batch.history} safeRange={{ min: batch.safeRange.minC, max: batch.safeRange.maxC }} />
        </div></details>
        <details className="drawer-disclosure"><summary>Traceability & activity · {events.filter((event) => event.batchId === batch.id).length} events</summary><div className="disclosure-content">
          <div className="drawer-trace"><span>Supplier<strong>{batch.supplierName}</strong></span><span>Supplier lot<strong>{batch.supplierLotCode}</strong></span><span>Packed date<strong>{new Date(batch.packedAt).toLocaleDateString()}</strong></span><span>Origin<strong>{batch.originCity}, {batch.originCountry}</strong></span></div>
          <EventList events={events.filter((event) => event.batchId === batch.id)} batches={[batch]} limit={8} />
        </div></details>
        <details className="drawer-disclosure"><summary>Run a what-if check</summary><div className="disclosure-content"><p>Simulation controls change this lot's sample readings; they do not affect real equipment.</p><div className="fault-actions"><button onClick={() => onAction(batch.id, 'refrigeration')}>Temperature fault</button><button onClick={() => onAction(batch.id, 'ethylene')}>Ethylene spike</button><button onClick={() => onAction(batch.id, 'traffic')}>Traffic delay</button></div></div></details>
      </div>
      <div className="drawer-actions">
        <label className="approver-label">Name for activity log <span>(not verified)</span><input value={operatorName} onChange={(event) => updateOperatorName(event.target.value)} placeholder="Your name" /></label>
        <label className="approver-label">Your decision<select value={decision} onChange={(event) => { setDecision(event.target.value as OperatorDecision); setDecisionError(''); }}>
          <option value="APPROVED_SUGGESTION" disabled={batch.contaminated}>Use the suggested route</option>
          <option value="ALTERNATE_ROUTE" disabled={batch.contaminated || !routeOptions.length}>Choose another safe route</option>
          <option value="HOLD_FOR_INSPECTION">Hold for inspection</option>
        </select></label>
        {decision === 'ALTERNATE_ROUTE' && <label className="approver-label">Choose destination<select value={operatorDestinationId || routeOptions[0]?.id || ''} onChange={(event) => setOperatorDestinationId(event.target.value)}>{routeOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · {Math.round(option.distanceKm)} km</option>)}</select></label>}
        <label className="approver-label">Note or reason <span>(optional)</span><textarea value={operatorNote} onChange={(event) => setOperatorNote(event.target.value)} placeholder="Why this choice, or what should be checked?" rows={2} /></label>
        {decisionError && <p className="form-error" role="alert">{decisionError}</p>}
        <button className="apply-route-button" onClick={() => {
          try {
            onRecordDecision(batch.id, operatorName, decision, operatorNote, decision === 'ALTERNATE_ROUTE' ? operatorDestinationId || routeOptions[0]?.id : undefined);
            setDecisionError('');
          } catch (error) {
            setDecisionError(error instanceof Error ? error.message : 'Could not record this decision.');
          }
        }} disabled={batch.dispatchConfirmed || !operatorName.trim() || (batch.contaminated && decision !== 'HOLD_FOR_INSPECTION') || (decision === 'ALTERNATE_ROUTE' && !routeOptions.length)}>{batch.dispatchConfirmed ? 'Decision already recorded' : decision === 'HOLD_FOR_INSPECTION' ? 'Record hold for inspection' : decision === 'ALTERNATE_ROUTE' ? 'Record my route choice · demo only' : batch.contaminated ? 'Safety check required before approval' : 'Record approval · demo only'}</button>
        <p className="prototype-warning">Your choice is recorded in this browser only. No real booking, dispatch, or partner handoff occurs.</p>
      </div>
    </aside>
  </div>;
}
