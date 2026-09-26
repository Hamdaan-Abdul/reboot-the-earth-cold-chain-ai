import { useEffect, useRef, useState } from 'react';
import {
  makeInitialBatches,
  createDemoArrival,
  recordOperatorDecision,
  resetOperatorDecision,
  tickSimulation,
  triggerEthyleneSpike,
  triggerRefrigerationFailure,
  triggerTrafficDelay,
  learnRouteTemperature,
  updateBatchCore,
  type RouteLearningRecord,
} from './engine';
import { PRODUCTS } from './engine/products';
import type { AuditEvent, Batch, CalibrationCheck, Product } from './types';
import { BatchDetailDrawer } from './components/Shared';
import { QRScanner } from './components/QRScanner';
import { ActivityPage, IntakePage, OverviewPage, MapPage, InspectorPage, NotificationsPage, PipelinePage, SimulatorPage, ReferencePage, PredictionsPage, SettingsPage } from './pages/Pages';

const navigation = [
  { id: 'overview', label: 'Home', icon: '⌂' },
  { id: 'inspector', label: 'Lots', icon: '◈' },
  { id: 'notifications', label: 'Action needed', icon: '♧' },
  { id: 'intake', label: 'Add a lot', icon: '+' },
] as const;

const moreNavigation = [
  { id: 'map', label: 'Route map', icon: '⌁' },
  { id: 'pipeline', label: 'Workflow', icon: '⇢' },
  { id: 'activity', label: 'Recent activity', icon: '◷' },
  { id: 'simulator', label: 'Anomaly lab', icon: '⚡' },
  { id: 'reference', label: 'Reference', icon: '≡' },
  { id: 'predictions', label: 'Predictions', icon: '↗' },
  { id: 'settings', label: 'Sensor settings', icon: '⚙' },
] as const;

type PageId = (typeof navigation)[number]['id'] | (typeof moreNavigation)[number]['id'];

const actionFunctions = {
  refrigeration: triggerRefrigerationFailure,
  ethylene: triggerEthyleneSpike,
  traffic: triggerTrafficDelay,
};

function initialAudit(batches: Batch[]): AuditEvent[] {
  return [{
    id: 'simulation-start',
    at: new Date().toLocaleTimeString(),
    batchId: 'SYSTEM',
    message: `${batches.length} international produce lots initialized; simulated sensor and route streams active.`,
    kind: 'INFO',
  }];
}

const STORAGE_KEY = 'cold-chain-prototype-state';

function isStoredProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const product = value as Partial<Product>;
  return typeof product.key === 'string'
    && typeof product.name === 'string'
    && typeof product.foodGroup === 'string'
    && ['FRUIT', 'VEGETABLE', 'MEAT', 'POULTRY', 'SEAFOOD', 'DAIRY', 'OTHER'].includes(product.foodGroup)
    && typeof product.baselineDays === 'number'
    && Number.isFinite(product.baselineDays)
    && Boolean(product.safeRange && typeof product.safeRange.minC === 'number' && typeof product.safeRange.maxC === 'number')
    && typeof product.optimalMaxTempC === 'number'
    && typeof product.climacteric === 'boolean'
    && typeof product.averageTransitSpeedKmPerDay === 'number'
    && typeof product.priceBasePerKg === 'number';
}

function isStoredBatch(value: unknown): value is Batch {
  if (!value || typeof value !== 'object') return false;
  const batch = value as Partial<Batch>;
  return typeof batch.id === 'string'
    && typeof batch.productKey === 'string'
    && typeof batch.productName === 'string'
    && ['RAW', 'EDIBLE', 'ALMOST_BAD', 'EXPIRED'].includes(batch.category ?? '')
    && typeof batch.weightKg === 'number'
    && typeof batch.tempC === 'number'
    && typeof batch.dslDays === 'number'
    && typeof batch.dispatchConfirmed === 'boolean'
    && Boolean(batch.assignedDestination && typeof batch.assignedDestination.name === 'string')
    && Boolean(batch.safeRange && typeof batch.safeRange.minC === 'number' && typeof batch.safeRange.maxC === 'number')
    && Array.isArray(batch.history)
    && Array.isArray(batch.eventLog);
}

function loadAppState(): { batches: Batch[]; events: AuditEvent[]; products: Record<string, Product>; learning: RouteLearningRecord[]; calibrations: CalibrationCheck[]; warning: string; lastUpdated: Date } {
  const seeded = makeInitialBatches();
  const now = new Date();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { batches: seeded, events: initialAudit(seeded), products: PRODUCTS, learning: [], calibrations: [], warning: '', lastUpdated: now };
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return { batches: seeded, events: initialAudit(seeded), products: PRODUCTS, learning: [], calibrations: [], warning: 'Saved local data was invalid; starting with sample lots.', lastUpdated: now };
    const state = parsed as { schemaVersion?: unknown; batches?: unknown; manualLots?: unknown; events?: unknown; products?: unknown; learning?: unknown; calibrations?: unknown; savedAt?: unknown };
    const storedProducts = Array.isArray(state.products) ? state.products.filter(isStoredProduct) : [];
    const products = Object.fromEntries([...Object.values(PRODUCTS), ...storedProducts].map((product) => [product.key, product]));
    const upgradeBatch = (batch: Batch): Batch => {
      const profile = products[batch.productKey];
      return {
        ...batch,
        foodGroup: profile?.foodGroup ?? batch.foodGroup ?? 'OTHER',
        baselineDays: profile?.baselineDays ?? batch.baselineDays,
        safeRange: profile?.safeRange ?? batch.safeRange,
        optimalMaxTempC: profile?.optimalMaxTempC ?? batch.optimalMaxTempC,
        climacteric: profile?.climacteric ?? batch.climacteric,
        averageTransitSpeedKmPerDay: profile?.averageTransitSpeedKmPerDay ?? batch.averageTransitSpeedKmPerDay ?? 600,
        priceBasePerKg: profile?.priceBasePerKg ?? batch.priceBasePerKg ?? 1,
      };
    };
    const savedBatches = (state.schemaVersion === 4 || state.schemaVersion === 5) && Array.isArray(state.batches) && state.batches.length > 0 && state.batches.every(isStoredBatch)
      ? state.batches.map(upgradeBatch)
      : undefined;
    const legacyManualLots = Array.isArray(state.manualLots)
      ? state.manualLots.filter((lot): lot is Batch => isStoredBatch(lot) && lot.isManual === true).map(upgradeBatch)
      : [];
    const savedManualLots = Array.isArray(state.batches)
      ? state.batches.filter((lot): lot is Batch => isStoredBatch(lot) && lot.isManual === true).map(upgradeBatch)
      : [];
    const preservedManualLots = Array.from(new Map([...legacyManualLots, ...savedManualLots].map((lot) => [lot.id, lot])).values());
    const savedEvents = Array.isArray(state.events)
      ? state.events.filter((event): event is AuditEvent => Boolean(event && typeof event === 'object' && typeof (event as AuditEvent).id === 'string' && typeof (event as AuditEvent).message === 'string' && typeof (event as AuditEvent).at === 'string' && typeof (event as AuditEvent).batchId === 'string' && ['INFO', 'WARNING', 'SUCCESS', 'CRITICAL'].includes((event as AuditEvent).kind)))
      : [];
    const validBatches = savedBatches ?? [...preservedManualLots, ...seeded];
    const migratedSampleData = !savedBatches && (state.schemaVersion === 1 || state.schemaVersion === 2 || state.schemaVersion === 3);
    const learning = Array.isArray(state.learning) ? state.learning.filter((record): record is RouteLearningRecord => Boolean(
      record && typeof record === 'object'
      && typeof (record as RouteLearningRecord).routeKey === 'string'
      && typeof (record as RouteLearningRecord).routeName === 'string'
      && ['FRUIT', 'VEGETABLE', 'MEAT', 'POULTRY', 'SEAFOOD', 'DAIRY', 'OTHER'].includes((record as RouteLearningRecord).foodGroup)
      && Number.isInteger((record as RouteLearningRecord).sampleCount)
      && (record as RouteLearningRecord).sampleCount > 0
      && Number.isFinite((record as RouteLearningRecord).averageTempRiseC)
      && Number.isFinite((record as RouteLearningRecord).maxTempRiseC),
    )) : [];
    const calibrations = Array.isArray(state.calibrations) ? state.calibrations.filter((check): check is CalibrationCheck => Boolean(
      check && typeof check === 'object'
      && ['temperature', 'humidity', 'ethylene'].includes((check as CalibrationCheck).sensor)
      && typeof (check as CalibrationCheck).lotId === 'string'
      && Number.isFinite((check as CalibrationCheck).referenceValue)
      && Number.isFinite((check as CalibrationCheck).observedValue)
      && Number.isFinite((check as CalibrationCheck).error)
      && typeof (check as CalibrationCheck).checkedAt === 'string'
      && Number.isFinite(Date.parse((check as CalibrationCheck).checkedAt)),
    )) : [];
    const validEvents = savedBatches ? savedEvents : savedEvents.filter((event) => preservedManualLots.some((lot) => lot.id === event.batchId));
    const updatedEvents = initialAudit(validBatches);
    const validSavedAt = typeof state.savedAt === 'string' && Number.isFinite(Date.parse(state.savedAt)) ? new Date(state.savedAt) : now;
    return {
      batches: validBatches,
      events: savedBatches && savedEvents.length ? savedEvents.slice(0, 40) : [...validEvents, ...updatedEvents].slice(0, 40),
      products,
      learning,
      calibrations,
      warning: migratedSampleData
        ? 'Sample lots were refreshed to restore their starting condition; manually entered lots were kept. Prediction history and calibration notes were preserved.'
        : (state.schemaVersion === 4 || state.schemaVersion === 5) && !savedBatches
          ? 'Saved lot data was invalid; starting with fresh sample lots.'
          : '',
      lastUpdated: savedBatches || legacyManualLots.length ? validSavedAt : now,
    };
  } catch {
    return { batches: seeded, events: initialAudit(seeded), products: PRODUCTS, learning: [], calibrations: [], warning: 'Local storage is unavailable; changes will not persist after this session.', lastUpdated: now };
  }
}

export default function App() {
  const [page, setPage] = useState<PageId>('overview');
  const [initialState] = useState(loadAppState);
  const [batches, setBatches] = useState<Batch[]>(initialState.batches);
  const batchesRef = useRef(batches);
  const [events, setEvents] = useState<AuditEvent[]>(initialState.events);
  const [products, setProducts] = useState<Record<string, Product>>(initialState.products);
  const [learning, setLearning] = useState<RouteLearningRecord[]>(initialState.learning);
  const learningRef = useRef(learning);
  const [calibrations, setCalibrations] = useState<CalibrationCheck[]>(initialState.calibrations);
  const tripTrackers = useRef<Record<string, { routeKey: string; routeName: string; foodGroup: Batch['foodGroup']; startTempC: number; peakTempC: number }>>({});
  const arrivalSequence = useRef(0);
  const lastDemoArrivalAt = useRef(Date.now());
  const [now, setNow] = useState(initialState.lastUpdated);
  const [selectedBatchId, setSelectedBatchId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return window.localStorage.getItem('cold-chain-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storageWarning, setStorageWarning] = useState(initialState.warning);

  const advanceSimulation = () => {
    const at = new Date();
    setNow(at);
    const result = tickSimulation(batchesRef.current, at);
    const trackers = { ...tripTrackers.current };
    const completedTrips: Parameters<typeof learnRouteTemperature>[1][] = [];
    for (const batch of result.batches) {
      const previous = batchesRef.current.find((item) => item.id === batch.id);
      if (!previous || !batch.flight) continue;
      const routeKey = batch.flight.id;
      if (batch.flightStatus === 'IN_TRANSIT') {
        const tracker = trackers[batch.id] ?? {
          routeKey,
          routeName: `${batch.originCity} → ${batch.flight.destinationCity}`,
          foodGroup: batch.foodGroup,
          startTempC: previous.tempC,
          peakTempC: previous.tempC,
        };
        trackers[batch.id] = { ...tracker, peakTempC: Math.max(tracker.peakTempC, batch.tempC) };
      }
      if (previous.flightStatus === 'IN_TRANSIT' && batch.flightStatus === 'ARRIVED') {
        const tracker = trackers[batch.id];
        if (tracker) {
          completedTrips.push({
            routeKey: tracker.routeKey,
            routeName: tracker.routeName,
            foodGroup: tracker.foodGroup,
            temperatureRiseC: tracker.peakTempC - tracker.startTempC,
            observedAt: at.toISOString(),
            batchId: batch.id,
          });
          delete trackers[batch.id];
        }
      }
    }
    tripTrackers.current = trackers;
    batchesRef.current = result.batches;
    setBatches(result.batches);
    if (result.events.length) setEvents((previous) => [...result.events, ...previous].slice(0, 40));
    if (completedTrips.length) {
      const updatedLearning = completedTrips.reduce((records, observation) => learnRouteTemperature(records, observation), learningRef.current);
      learningRef.current = updatedLearning;
      setLearning(updatedLearning);
      setEvents((previous) => [
        ...completedTrips.map((trip) => ({
          id: `${trip.batchId}-${at.getTime()}-route-learning`,
          at: at.toLocaleTimeString(),
          batchId: trip.batchId,
          message: `Prediction recorded · simulated ${trip.routeName} route showed a ${trip.temperatureRiseC.toFixed(1)}°C peak temperature rise. Used as a future pre-cooling advisory only.`,
          kind: 'INFO' as const,
        })),
        ...previous,
      ].slice(0, 40));
    }
  };

  const addDemoArrival = () => {
    const at = new Date();
    const newBatch = createDemoArrival(batchesRef.current, products, at, ++arrivalSequence.current);
    const generated = [newBatch, ...batchesRef.current];
    const recentDemoIds = new Set(generated.filter((batch) => batch.isAutoDemo).slice(0, 24).map((batch) => batch.id));
    const next = generated.filter((batch) => !batch.isAutoDemo || recentDemoIds.has(batch.id));
    batchesRef.current = next;
    setBatches(next);
    setNow(at);
    lastDemoArrivalAt.current = at.getTime();
    const event: AuditEvent = {
      id: `${newBatch.id}-arrival`,
      at: at.toLocaleTimeString(),
      batchId: newBatch.id,
      message: `Illustrative demo arrival added · ${newBatch.productName}, ${newBatch.weightKg} kg from ${newBatch.originCity}. Generated sample values, not a real shipment or calibrated measurement.`,
      kind: 'INFO',
    };
    setEvents((previous) => [event, ...previous].slice(0, 40));
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('cold-chain-theme', theme);
    } catch {
      setStorageWarning('Browser storage is unavailable; this setting will reset after the session.');
    }
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setOnline(navigator.onLine);
    const handleVisibility = () => { if (document.visibilityState === 'visible') advanceSimulation(); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: 5,
        batches,
        events: events.slice(0, 40),
        products: Object.values(products).filter((product) => product.custom),
        learning,
        calibrations,
        savedAt: now.toISOString(),
      }));
    } catch {
      setStorageWarning('Could not save this session locally; new lots and activity will be lost after closing the browser.');
    }
  }, [batches, events, now, products, learning, calibrations]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      advanceSimulation();
      if (Date.now() - lastDemoArrivalAt.current >= 5 * 60 * 1000) {
        addDemoArrival();
      }
    }, 150000);
    return () => window.clearInterval(interval);
  }, [products]);

  const triggerAction = (batchId: string, action: keyof typeof actionFunctions) => {
    setNow(new Date());
    const transform = actionFunctions[action];
    const previous = batchesRef.current.find((batch) => batch.id === batchId);
    const next = batchesRef.current.map((batch) => batch.id === batchId ? transform(batch) : batch);
    batchesRef.current = next;
    setBatches(next);
    const updated = next.find((batch) => batch.id === batchId);
    const messages = {
      refrigeration: 'Refrigeration failure simulated · 12°C → 20°C ramp armed',
      ethylene: 'Ethylene spike simulated · concentration raised above 1.2 ppm',
      traffic: 'Traffic disruption simulated · 12-hour ETA added',
    };
    setEvents((current) => {
      const at = new Date().toLocaleTimeString();
      const appended: AuditEvent[] = [{
        id: `${batchId}-${Date.now()}-${action}`,
        at,
        batchId,
        message: messages[action],
        kind: 'WARNING' as const,
      }];
      if (updated && previous && updated.assignedDestination.id !== previous.assignedDestination.id) {
        appended.push({
          id: `${batchId}-${Date.now()}-${action}-route`,
          at,
          batchId,
          message: `Suggested route changed · ${previous.assignedDestination.name} → ${updated.assignedDestination.name}. Operator review needed. ${updated.lastActionReason}`,
          kind: 'WARNING' as const,
        });
      } else if (updated) {
        appended.push({
          id: `${batchId}-${Date.now()}-${action}-decision`,
          at,
          batchId,
          message: `Suggested next step · ${updated.lastAction}. ${updated.lastActionReason}`,
          kind: 'INFO',
        });
      }
      return [...appended, ...current].slice(0, 40);
    });
  };

  const recordDecision = (batchId: string, operatorName: string, decision: 'APPROVED_SUGGESTION' | 'ALTERNATE_ROUTE' | 'HOLD_FOR_INSPECTION', note: string, destinationId?: string) => {
    const previous = batchesRef.current.find((batch) => batch.id === batchId);
    if (!previous) return;
    const updated = recordOperatorDecision(previous, operatorName, decision, note, destinationId);
    setNow(new Date());
    const next = batchesRef.current.map((batch) => batch.id === batchId ? updated : batch);
    batchesRef.current = next;
    setBatches(next);
    const decisionEvent: AuditEvent = {
      id: `${batchId}-${Date.now()}-dispatch`,
      at: new Date().toLocaleTimeString(),
      batchId,
      message: decision === 'HOLD_FOR_INSPECTION'
        ? `Lot held for inspection by ${operatorName}.${note.trim() ? ` Note: ${note.trim()}` : ''}`
        : decision === 'ALTERNATE_ROUTE'
          ? `Operator chose ${updated.assignedDestination.name} · ${operatorName}.${note.trim() ? ` Note: ${note.trim()}` : ''} Demo only; no real shipment was made.`
          : `Suggested route approved by ${operatorName}.${note.trim() ? ` Note: ${note.trim()}` : ''} Demo only; no real shipment was made.`,
      kind: decision === 'HOLD_FOR_INSPECTION' ? 'WARNING' : 'SUCCESS',
    };
    setEvents((current) => [decisionEvent, ...current].slice(0, 40));
  };

  const resetDecisions = () => {
    const decisions = batchesRef.current.filter((batch) => batch.operatorDecision);
    if (!decisions.length) return;
    const next = batchesRef.current.map(resetOperatorDecision);
    batchesRef.current = next;
    setBatches(next);
    const at = new Date();
    setNow(at);
    const resetEvent: AuditEvent = {
      id: `SYSTEM-${at.getTime()}-decisions-reset`,
      at: at.toLocaleTimeString(),
      batchId: 'SYSTEM',
      message: `Operator reset · cleared saved decisions and notes for ${decisions.length} lot${decisions.length === 1 ? '' : 's'} and returned routes to current recommendations. Lots, sensor data, and active safety alerts were preserved.`,
      kind: 'INFO',
    };
    setEvents((current) => [resetEvent, ...current].slice(0, 40));
  };

  const findBatch = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return undefined;
    return batchesRef.current.find((batch) => batch.id.toLowerCase() === normalized || batch.supplierLotCode.toLowerCase() === normalized)
      ?? batchesRef.current.find((batch) => batch.id.toLowerCase().includes(normalized) || batch.supplierLotCode.toLowerCase().includes(normalized) || batch.productName.toLowerCase().includes(normalized));
  };

  const searchBatch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const batch = findBatch(searchQuery);
    if (batch) {
      setSearchMessage('');
      setSelectedBatchId(batch.id);
    } else {
      setSearchMessage(`No lot matches “${searchQuery.trim()}”.`);
    }
  };

  const handleScannedCode = (value: string) => {
    setScannerOpen(false);
    const code = value.trim().replace(/[?#].*$/, '').split('/').filter(Boolean).pop() ?? value.trim();
    const batch = findBatch(code) ?? findBatch(value);
    if (batch) {
      setSearchQuery(batch.id);
      setSearchMessage('');
      setSelectedBatchId(batch.id);
    } else {
      setSearchMessage(`No lot matches QR code “${code}”.`);
    }
  };

  const addBatch = (batch: Batch) => {
    setNow(new Date());
    const next = [batch, ...batchesRef.current];
    batchesRef.current = next;
    setBatches(next);
    setEvents((current) => [{
      id: `${batch.id}-${Date.now()}-intake`,
      at: new Date().toLocaleTimeString(),
      batchId: batch.id,
      message: `New manual lot assessed · ${batch.lastAction}. ${batch.lastActionReason}`,
      kind: 'WARNING' as const,
    }, ...current].slice(0, 40));
    setSelectedBatchId(batch.id);
  };

  const addProduct = (product: Product) => {
    setProducts((current) => ({ ...current, [product.key]: product }));
    const referenceEvent: AuditEvent = {
      id: `${product.key}-${Date.now()}-reference`,
      at: new Date().toLocaleTimeString(),
      batchId: 'SYSTEM',
      message: `Food reference added · ${product.name} (${product.foodGroup}) · model parameters saved in this browser.`,
      kind: 'INFO',
    };
    setEvents((current) => [referenceEvent, ...current].slice(0, 40));
  };

  const applyPreCooling = (batchId: string, targetC: number, routeName: string) => {
    const previous = batchesRef.current.find((batch) => batch.id === batchId);
    if (!previous || targetC < previous.safeRange.minC || targetC > previous.safeRange.maxC) return;
    const cooled = updateBatchCore({ ...previous, tempC: Math.min(previous.tempC, targetC) });
    const next = batchesRef.current.map((batch) => batch.id === batchId ? {
      ...cooled,
      status: previous.status,
      dispatchConfirmed: previous.dispatchConfirmed,
      flightStatus: previous.flightStatus,
    } : batch);
    batchesRef.current = next;
    setBatches(next);
    setNow(new Date());
    const event: AuditEvent = {
      id: `${batchId}-${Date.now()}-precool`,
      at: new Date().toLocaleTimeString(),
      batchId,
      message: `Simulated pre-cooling set ${batchId} to ${Math.min(previous.tempC, targetC).toFixed(1)}°C before ${routeName}, based on local route history. No physical refrigeration control was sent.`,
      kind: 'INFO',
    };
    setEvents((current) => [event, ...current].slice(0, 40));
  };

  const addCalibration = (check: CalibrationCheck) => {
    setCalibrations((previous) => [check, ...previous].slice(0, 30));
    setNow(new Date());
    const event: AuditEvent = {
      id: `${check.lotId}-${Date.now()}-calibration`,
      at: new Date().toLocaleTimeString(),
      batchId: check.lotId,
      message: `Calibration check recorded for ${check.sensor} · reference difference ${check.error > 0 ? '+' : ''}${check.error.toFixed(2)}. Recorded locally; this does not calibrate a physical device.`,
      kind: Math.abs(check.error) > (check.sensor === 'temperature' ? 0.5 : check.sensor === 'humidity' ? 5 : 0.1) ? 'WARNING' : 'INFO',
    };
    setEvents((previous) => [event, ...previous].slice(0, 40));
  };

  const selectBatch = (batchId: string) => setSelectedBatchId(batchId);
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);
  const simulationStale = Date.now() - now.getTime() > 180000;

  const renderPage = () => {
    switch (page) {
      case 'overview': return <OverviewPage batches={batches} events={events} onSelectBatch={selectBatch} onOpenNotifications={() => setPage('notifications')} onOpenLots={() => setPage('inspector')} onOpenActivity={() => setPage('activity')} />;
      case 'map': return <MapPage batches={batches} onSelectBatch={selectBatch} />;
      case 'inspector': return <InspectorPage batches={batches} onSelectBatch={selectBatch} />;
      case 'notifications': return <NotificationsPage batches={batches} events={events} onSelectBatch={selectBatch} onRecordDecision={recordDecision} onResetDecisions={resetDecisions} />;
      case 'intake': return <IntakePage batches={batches} products={products} onAddBatch={addBatch} onAddDemoBatch={addDemoArrival} />;
      case 'pipeline': return <PipelinePage batches={batches} onSelectBatch={selectBatch} />;
      case 'activity': return <ActivityPage batches={batches} events={events} />;
      case 'simulator': return <SimulatorPage batches={batches} events={events} onAction={triggerAction} onSelectBatch={selectBatch} />;
      case 'reference': return <ReferencePage batches={batches} products={products} onAddProduct={addProduct} onSelectBatch={selectBatch} />;
      case 'predictions': return <PredictionsPage batches={batches} learning={learning} onApplyPreCooling={applyPreCooling} />;
      case 'settings': return <SettingsPage batches={batches} calibrations={calibrations} onAddCalibration={addCalibration} />;
    }
  };

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); setPage('overview'); }} aria-label="Project Light 19 home">
        <span className="brand-symbol"><span /></span>
        <span><strong>project<span>.</span></strong><small>LIGHT 19 · CMUQ</small></span>
      </a>
      <div className="workspace-label">COLD-CHAIN ASSISTANT</div>
      <nav className="nav" aria-label="Main navigation">
        {navigation.map((item) => <button key={item.id} className={`nav-btn ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)} aria-current={page === item.id ? 'page' : undefined}>
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
          {item.id === 'notifications' && batches.some((batch) => batch.status === 'ANOMALY_DETECTED' || batch.status === 'PENDING_APPROVAL' || batch.contaminated) && <i className="nav-alert" aria-label="Action needed" />}
        </button>)}
        <button className={`nav-btn ${moreOpen || moreNavigation.some((item) => item.id === page) ? 'active' : ''}`} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}><span className="nav-icon">···</span>More</button>
        {moreOpen && moreNavigation.map((item) => <button key={item.id} className={`nav-btn nav-subitem ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMoreOpen(false); }}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="system-status"><span className="status-dot" /><div><strong>Demo running</strong><small>Sample data updates locally</small></div></div>
        <div className="campus-label">Carnegie Mellon University<br />in Qatar · Doha</div>
      </div>
    </aside>
    <main id="main-content" className="main-panel">
      <header className="topbar">
        <div className="breadcrumb"><span>PROJECT LIGHT 19</span><i>/</i><strong>{[...navigation, ...moreNavigation].find((item) => item.id === page)?.label}</strong></div>
        <div className="topbar-right">
          <form className="lot-search" onSubmit={searchBatch}><input aria-label="Search lots by ID, supplier code, or produce" list="lot-search-suggestions" placeholder="Search lots…" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSearchMessage(''); }} /><datalist id="lot-search-suggestions">{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.productName} · {batch.supplierLotCode}</option>)}</datalist><button type="submit">Search</button></form>
          <button className="topbar-icon-button" onClick={() => setScannerOpen(true)} aria-label="Scan a lot QR code" title="Scan lot QR">▦ <span>Scan</span></button>
          <button className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☼ Light' : '☾ Dark'}</button>
          <span className="current-time">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </header>
      <div className={`data-status-strip ${simulationStale ? 'stale' : online ? 'online' : 'offline'}`} role="status">
        <span className="data-status-dot" />
        <strong>{simulationStale ? 'Demo update delayed' : online ? 'Demo · simulated data' : 'Offline · local demo'}</strong>
        <span>{online ? 'Sensors, schedules, and market values are examples—not connected feeds' : 'No external services connected'}</span>
        <time>Updated {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
      </div>
      {storageWarning && <div className="storage-warning" role="status">{storageWarning}</div>}
      {searchMessage && <div className="search-message" role="status">{searchMessage}</div>}
      <div className="content-panel" key={page}>{renderPage()}</div>
      <footer className="app-footer"><span>PROJECT LIGHT 19 <i>·</i> COLD-CHAIN DECISION SUPPORT</span><span>Demo only · example data · no real bookings or dispatches</span></footer>
    </main>
    {selectedBatch && <BatchDetailDrawer batch={selectedBatch} events={events} onClose={() => setSelectedBatchId(undefined)} onAction={triggerAction} onRecordDecision={recordDecision} />}
    {scannerOpen && <QRScanner onClose={() => setScannerOpen(false)} onDetected={handleScannedCode} />}
  </div>;
}
