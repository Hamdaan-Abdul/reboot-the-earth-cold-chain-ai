import { describe, expect, it } from 'vitest';
import {
  computeDSL,
  computeProbabilitySafeArrival,
  createManualBatch,
  createProductProfile,
  confirmDispatch,
  financialCheck,
  makeInitialBatches,
  operatorRouteOptions,
  recordOperatorDecision,
  routeDistanceKm,
  selectDestination,
  tickSimulation,
  triggerEthyleneSpike,
  triggerRefrigerationFailure,
  triggerTrafficDelay,
  learnRouteTemperature,
  recommendPreCoolingTarget,
} from '../src/engine';
import { sampleSensors } from '../src/sensors';
import { DESTINATIONS, FLIGHTS, PRODUCTS } from '../src/engine/products';
import type { Batch } from '../src/types';

describe('cold-chain engine calculations', () => {
  it('learns route-specific temperature rises and clamps pre-cooling to the food profile', () => {
    const routeObservation = {
      routeKey: 'flight-doha-paris',
      routeName: 'Doha → Paris',
      foodGroup: 'FRUIT' as const,
      temperatureRiseC: 3,
      observedAt: '2025-01-01T00:00:00.000Z',
      batchId: 'lot-1',
    };
    const first = learnRouteTemperature([], routeObservation);
    const learned = learnRouteTemperature(first, { ...routeObservation, temperatureRiseC: 5, batchId: 'lot-2' });
    expect(learned).toHaveLength(1);
    expect(learned[0].sampleCount).toBe(2);
    expect(learned[0].averageTempRiseC).toBe(4);
    expect(learned[0].maxTempRiseC).toBe(5);
    expect(learned[0].lastBatchId).toBe('lot-2');
    expect(recommendPreCoolingTarget({ minC: 2, maxC: 8 }, 7, learned[0])).toBe(4);
    expect(recommendPreCoolingTarget({ minC: 6, maxC: 8 }, 7, learned[0])).toBe(6);
  });

  it('keeps route learning separate for each food group and ignores invalid observations', () => {
    const observation = {
      routeKey: 'flight-doha-paris',
      routeName: 'Doha → Paris',
      foodGroup: 'FRUIT' as const,
      temperatureRiseC: 2,
      observedAt: '2025-01-01T00:00:00.000Z',
      batchId: 'fruit-lot',
    };
    const fruitRecords = learnRouteTemperature([], observation);
    const distinctRecords = learnRouteTemperature(fruitRecords, { ...observation, foodGroup: 'SEAFOOD', batchId: 'seafood-lot' });
    expect(distinctRecords).toHaveLength(2);
    expect(learnRouteTemperature(distinctRecords, { ...observation, temperatureRiseC: Number.NaN })).toBe(distinctRecords);
  });

  it('applies the stated thermal and climacteric ethylene penalties only when eligible', () => {
    const base = { baselineDays: 20, tempC: 16, optimalMaxTempC: 14, ethylenePpm: 0.8, climacteric: true };
    expect(computeDSL(base)).toBeCloseTo(20 * (1 - (2 * 0.12 + 0.8 * 0.25)));
    expect(computeDSL({ ...base, tempC: 14 })).toBeCloseTo(20 * (1 - 0.2));
    expect(computeDSL({ ...base, optimalMaxTempC: 12 })).toBeCloseTo(20 * (1 - (4 * 0.12 + 0.8 * 0.25)));
    expect(computeDSL({ ...base, climacteric: false })).toBeCloseTo(20 * (1 - 0.24));
    expect(computeDSL({ ...base, ethylenePpm: 0.5 })).toBeCloseTo(20 * (1 - 0.24));
  });

  it('reduces safe-arrival probability as out-of-range exposure or ETA delay accumulates', () => {
    const batch = makeInitialBatches()[0];
    const baseline = computeProbabilitySafeArrival({ ...batch, timeOutOfRangeMin: 0, trafficDelayHours: 0 });
    const exposed = computeProbabilitySafeArrival({ ...batch, timeOutOfRangeMin: 90, trafficDelayHours: 0 });
    const delayed = computeProbabilitySafeArrival({ ...batch, timeOutOfRangeMin: 90, trafficDelayHours: 8 });
    expect(baseline).toBe(1);
    expect(exposed).toBeLessThan(baseline);
    expect(delayed).toBeLessThan(exposed);
    const flightDestination = DESTINATIONS.find((destination) => destination.flightId === batch.flight?.id);
    if (flightDestination) {
      expect(computeProbabilitySafeArrival(batch, flightDestination)).toBeLessThan(computeProbabilitySafeArrival(batch));
    }
  });

  it('calculates net recovery using probability-weighted sales less transport and handling', () => {
    const batch = makeInitialBatches()[0];
    const destination = DESTINATIONS.find((item) => item.id === 'doha-dc')!;
    const result = financialCheck(batch, destination);
    expect(result.expectedRecoveryValue).toBeCloseTo(destination.pricePerKg * batch.weightKg * result.probability - result.cost);
  });

  it('seeds all four food stages with matching workflow positions', () => {
    const batches = makeInitialBatches();
    expect(new Set(batches.map((batch) => batch.category))).toEqual(new Set(['RAW', 'EDIBLE', 'ALMOST_BAD', 'EXPIRED']));
    expect(batches).toHaveLength(16);
    expect(batches.filter((batch) => batch.category === 'RAW').length).toBeGreaterThanOrEqual(4);
    expect(batches.filter((batch) => batch.category === 'EXPIRED').length).toBeLessThanOrEqual(4);
    expect(batches.filter((batch) => batch.financialPass && !batch.contaminated && batch.category !== 'EXPIRED').length).toBeGreaterThan(0);
    expect(batches.every((batch) => batch.supplierLotCode.length > 8 && batch.palletCount > 0)).toBe(true);
    expect(batches.every((batch) => batch.workflowStage === ({
      RAW: 'INPUT',
      EDIBLE: 'CATEGORIZING',
      ALMOST_BAD: 'DISTRIBUTION',
      EXPIRED: 'OUTPUT',
    })[batch.category])).toBe(true);
    expect(batches.filter((batch) => batch.status === 'PENDING_APPROVAL')).toHaveLength(0);
    expect(batches.filter((batch) => batch.contaminated).every((batch) => batch.status === 'ANOMALY_DETECTED')).toBe(true);
  });

  it('assesses manually entered lots using live engine routing and freshness logic', () => {
    const existing = makeInitialBatches();
    const batch = createManualBatch({
      id: 'lot-manual-101',
      productKey: 'tomato',
      originCity: 'Valencia',
      originCountry: 'Spain',
      supplierName: 'Local supplier',
      weightKg: 250,
      tempC: 14,
      ageDays: 1,
      ethylenePpm: 0.2,
    }, existing);
    expect(batch.id).toBe('LOT-MANUAL-101');
    expect(batch.originCity).toBe('Valencia');
    expect(batch.category).toBe('RAW');
    expect(batch.dslDays).toBeGreaterThan(0);
    expect(batch.assignedDestination.name).toBeTruthy();
    expect(batch.lastActionReason).toContain(batch.assignedDestination.name);
    expect(batch.status).toBe('PENDING_APPROVAL');
    expect(batch.dispatchConfirmed).toBe(false);
    expect(batch.history).toHaveLength(1);
  });

  it('rejects duplicate lot codes and impossible manual measurements', () => {
    const existing = makeInitialBatches();
    const base = {
      id: 'new-lot',
      productKey: 'tomato',
      originCity: 'Valencia',
      originCountry: 'Spain',
      supplierName: '',
      weightKg: 250,
      tempC: 12,
      ageDays: 1,
      ethylenePpm: 0.2,
    };
    expect(() => createManualBatch({ ...base, id: existing[0].id.toLowerCase() }, existing)).toThrow('already in use');
    expect(() => createManualBatch({ ...base, weightKg: 0 }, existing)).toThrow('Weight must be positive');
    expect(() => createManualBatch({ ...base, ageDays: Number.NaN }, existing)).toThrow('all measurements must be numbers');
  });

  it('uses user-added profiles for grouped foods when assessing new lots', () => {
    const existing = makeInitialBatches();
    const profile = createProductProfile({
      name: 'Fresh turkey',
      foodGroup: 'POULTRY',
      baselineDays: 5,
      safeRange: { minC: 0, maxC: 4 },
      optimalMaxTempC: 4,
      climacteric: false,
      averageTransitSpeedKmPerDay: 400,
      priceBasePerKg: 7,
    });
    const batch = createManualBatch({
      id: 'LOT-TURKEY-01',
      productKey: profile.key,
      originCity: 'Madrid',
      originCountry: 'Spain',
      supplierName: 'Local poultry supplier',
      weightKg: 150,
      tempC: 3,
      ageDays: 1,
      ethylenePpm: 0,
    }, existing, { ...PRODUCTS, [profile.key]: profile });
    expect(profile.foodGroup).toBe('POULTRY');
    expect(batch.productName).toBe('Fresh turkey');
    expect(batch.foodGroup).toBe('POULTRY');
    expect(batch.safeRange).toEqual({ minC: 0, maxC: 4 });
    expect(batch.priceBasePerKg).toBe(7);
    expect(batch.assignedDestination.country).toBe('Spain');
    expect(new Set(Object.values(PRODUCTS).map((item) => item.foodGroup))).toEqual(new Set(['FRUIT', 'VEGETABLE', 'MEAT', 'POULTRY', 'SEAFOOD', 'DAIRY', 'OTHER']));
    expect(() => createProductProfile({
      name: 'Invalid profile',
      foodGroup: 'MEAT',
      baselineDays: 3,
      safeRange: { minC: 4, maxC: 0 },
      optimalMaxTempC: 2,
      climacteric: false,
      averageTransitSpeedKmPerDay: 400,
      priceBasePerKg: 5,
    })).toThrow('Check the shelf life');
  });

  it('records operator notes for hold and alternate-route decisions', () => {
    const batch = makeInitialBatches().find((item) => item.originAirportCode === 'UIO' && item.category === 'RAW')!;
    const held = recordOperatorDecision(batch, 'Ari', 'HOLD_FOR_INSPECTION', 'Check pallet 4 first');
    expect(held.operatorDecision).toBe('HOLD_FOR_INSPECTION');
    expect(held.operatorNote).toBe('Check pallet 4 first');
    expect(held.dispatchConfirmed).toBe(false);
    expect(held.eventLog[0]).toContain('Check pallet 4 first');

    const alternate = operatorRouteOptions(batch).find((option) => option.id !== batch.assignedDestination.id);
    expect(alternate).toBeDefined();
    const chosen = recordOperatorDecision(batch, 'Ari', 'ALTERNATE_ROUTE', 'Use the nearer hub', alternate!.id);
    expect(chosen.operatorDecision).toBe('ALTERNATE_ROUTE');
    expect(chosen.assignedDestination.id).toBe(alternate!.id);
    expect(chosen.operatorNote).toBe('Use the nearer hub');
    expect(chosen.dispatchConfirmed).toBe(true);

    const unsafe = makeInitialBatches().find((item) => item.contaminated)!;
    expect(() => recordOperatorDecision(unsafe, 'Ari', 'APPROVED_SUGGESTION')).toThrow('must be checked');
    expect(recordOperatorDecision(unsafe, 'Ari', 'HOLD_FOR_INSPECTION', 'Quarantine it').dispatchConfirmed).toBe(false);
  });

  it('moves produce from edible to almost-bad as freshness ages and records the stage transition', () => {
    const tomato = makeInitialBatches().find((batch) => batch.category === 'EDIBLE')!;
    const nearTransition = { ...tomato, ageDays: 8.139 };
    const result = tickSimulation([nearTransition], new Date('2026-09-25T02:00:00'), () => 0.52);
    expect(result.batches[0].category).toBe('ALMOST_BAD');
    expect(result.batches[0].workflowStage).toBe('DISTRIBUTION');
    expect(result.events.some((event) => event.message === 'Freshness stage · Edible / Ripe → Almost-Bad')).toBe(true);
  });

  it('prices almost-bad store routes at a 50 percent crop-specific discount', () => {
    const batch = makeInitialBatches().find((item) => item.category === 'ALMOST_BAD')!;
    const marketRoute = selectDestination({ ...batch, demandProbability: 0.8 });
    expect(marketRoute.pricePerKg).toBeCloseTo(PRODUCTS[batch.productKey].priceBasePerKg * 0.5);
  });

  it('keeps contaminated expired produce on landfill-only routing', () => {
    const batch = makeInitialBatches().find((item) => item.category === 'EXPIRED' && item.contaminated)!;
    expect(batch.contaminated).toBe(true);
    expect(batch.assignedDestination.type).toBe('LANDFILL');
  });

  it('routes contaminated produce to landfill even before its freshness category expires', () => {
    const batch = makeInitialBatches().find((item) => item.category === 'EDIBLE')!;
    expect(selectDestination({ ...batch, contaminated: true }).type).toBe('LANDFILL');
  });

  it('sends safe expired food to the first redistribution tier and low-demand almost-bad food to the food bank', () => {
    const batches = makeInitialBatches();
    const safeExpired = batches.find((item) => item.category === 'EXPIRED' && !item.contaminated)!;
    const almostBad = batches.find((item) => item.category === 'ALMOST_BAD')!;
    expect(safeExpired.assignedDestination.recoveryTier).toBe(1);
    expect(almostBad.assignedDestination.type).toBe('FOOD_BANK');
  });

  it('routes raw produce on available international flights farther than edible or almost-bad produce', () => {
    const batches = makeInitialBatches();
    const raw = batches.find((batch) => batch.category === 'RAW')!;
    const edible = batches.find((batch) => batch.category === 'EDIBLE')!;
    const almostBad = batches.find((batch) => batch.category === 'ALMOST_BAD')!;
    expect(raw.assignedDestination.routeMode).toBe('AIR');
    expect(raw.flight?.originAirportCode).toBe(raw.originAirportCode);
    expect(raw.assignedDestination.distanceKm).toBeGreaterThan(edible.assignedDestination.distanceKm);
    expect(edible.assignedDestination.distanceKm).toBeLessThanOrEqual(1400);
    expect(almostBad.assignedDestination.distanceKm).toBeLessThanOrEqual(150);
  });

  it('carries flight routine and gives a clear action and reason for each batch', () => {
    const batches = makeInitialBatches();
    expect(DESTINATIONS.every((destination) => destination.country && destination.region)).toBe(true);
    expect(batches.every((batch) => batch.lastAction.length > 0 && batch.lastActionReason.length > 0)).toBe(true);
    expect(batches.find((batch) => batch.category === 'RAW')?.flight?.departureLocal).toMatch(/^\d\d:\d\d$/);
    expect(FLIGHTS.length).toBeGreaterThanOrEqual(6);
    expect(FLIGHTS.every((flight) => flight.cargoCapacityKg > flight.cargoBookedKg && flight.daysOfWeek.length > 0)).toBe(true);
    expect(new Set(batches.map((batch) => batch.originCountry)).size).toBeGreaterThanOrEqual(8);
  });

  it('does not send edible or near-expiry batches on long-haul or international routes', () => {
    const batches = makeInitialBatches();
    const edible = batches.find((batch) => batch.category === 'EDIBLE')!;
    const almostBad = batches.find((batch) => batch.category === 'ALMOST_BAD')!;
    expect(selectDestination(edible).routeMode).not.toBe('AIR');
    expect(selectDestination(almostBad).routeMode).toBe('ROAD');
    expect(selectDestination(almostBad).distanceKm).toBeLessThanOrEqual(150);
  });

  it('downgrades an unprofitable edible route to a nearby local clearance or donation action', () => {
    const edible = makeInitialBatches().find((batch) => batch.category === 'EDIBLE')!;
    const constrainedLoad = { ...edible, weightKg: 1 };
    const selected = selectDestination(constrainedLoad);
    expect(['LOCAL', 'DISCOUNT', 'COMMUNITY', 'FOOD_BANK']).toContain(selected.type);
    expect(selected.routeMode).toBe('ROAD');
  });

  it('calculates last-mile distance from the live batch position, not a fixed Qatar-only distance', () => {
    const dohaBatch = makeInitialBatches().find((batch) => batch.originCountry === 'Qatar' && batch.category === 'ALMOST_BAD')!;
    const market = DESTINATIONS.find((destination) => destination.id === 'market-doh')!;
    const dohaDistance = routeDistanceKm(dohaBatch, market);
    const crossCountryDistance = routeDistanceKm(dohaBatch, DESTINATIONS.find((destination) => destination.id === 'market-mad')!);
    const madridBatch = { ...dohaBatch, lat: 40.49, lng: -3.57, originAirportCode: 'MAD' };
    const madridMarket = DESTINATIONS.find((destination) => destination.id === 'market-mad')!;
    const madridDistance = routeDistanceKm(madridBatch, madridMarket);
    expect(dohaDistance).toBeLessThan(150);
    expect(crossCountryDistance).toBeGreaterThan(madridDistance * 100);
  });
});

describe('simulated sensor streams and anomaly actions', () => {
  it('updates temperature, humidity, ethylene, GPS, demand, vision, olfactory and cumulative exposure', () => {
    const batch = { ...makeInitialBatches()[0], tempC: 14.3 };
    const next = sampleSensors(batch, new Date('2026-09-25T12:00:00'), () => 0.6, 12);
    expect(next.history).toHaveLength(batch.history.length + 1);
    expect(next.ageDays).toBeGreaterThan(batch.ageDays);
    expect(next.timeOutOfRangeMin).toBeGreaterThan(batch.timeOutOfRangeMin);
    expect(next.outsideTempC).not.toBe(batch.outsideTempC);
    expect(next.weatherHeatIndexC).toBeGreaterThan(next.outsideTempC);
    expect(next.demandProbability).not.toBe(batch.demandProbability);
    expect(next.visionRipeness).toBeGreaterThanOrEqual(batch.visionRipeness);
    expect(next.olfactoryGasPpm).toBeGreaterThanOrEqual(batch.olfactoryGasPpm);
  });

  it('ramps refrigeration temperature over four ticks, spikes ethylene, and adds a 12-hour traffic delay', () => {
    const batch = makeInitialBatches()[0];
    const failed = triggerRefrigerationFailure(batch);
    expect(failed.tempC).toBe(12);
    const temps: number[] = [];
    let current = failed;
    for (let i = 0; i < 4; i += 1) {
      current = tickSimulation([current], new Date(2026, 8, 25, 2, i), () => 0.5).batches[0];
      temps.push(current.tempC);
    }
    expect(temps).toEqual([14, 16, 18, 20]);
    expect(triggerEthyleneSpike(batch).ethylenePpm).toBeGreaterThan(1.2);
    expect(triggerTrafficDelay(batch).trafficDelayHours).toBe(batch.trafficDelayHours + 12);
  });

  it('holds an unapproved flight, then advances only the approved routine through transit and arrival', () => {
    const batch = makeInitialBatches().find((item) => item.flight !== undefined)!;
    let current = { ...batch, flightHoursUntilDeparture: 0.01, flightHoursRemaining: 0.01 };
    const held = tickSimulation([current], new Date('2026-09-25T02:00:00'), () => 0.5);
    current = held.batches[0];
    expect(current.flightStatus).toBe('SCHEDULED');
    expect(current.flightHoursUntilDeparture).toBe(0.01);
    current = confirmDispatch(current);
    current = { ...current, flightHoursUntilDeparture: 0.01, flightHoursRemaining: 0.01 };
    const departed = tickSimulation([current], new Date('2026-09-25T02:00:00'), () => 0.5);
    current = departed.batches[0];
    expect(current.flightStatus).toBe('IN_TRANSIT');
    expect(departed.events.some((event) => event.message.includes('Simulation:') && event.message.includes('in transit'))).toBe(true);
    const arrived = tickSimulation([{ ...current, flightHoursRemaining: 0.01 }], new Date('2026-09-25T02:01:00'), () => 0.5);
    expect(arrived.batches[0].flightStatus).toBe('ARRIVED');
    expect(arrived.events.some((event) => event.message.includes('Simulation:') && event.message.includes('arrived'))).toBe(true);
  });

  it('confirms the recommended batch action and starts its booked flight routine', () => {
    const raw = makeInitialBatches().find((batch) => batch.flight !== undefined)!;
    const confirmed = confirmDispatch(raw);
    expect(confirmed.flightStatus).toBe('BOARDING');
    expect(confirmed.lastAction).toContain('approved in demo');
    expect(confirmed.eventLog[0]).toContain('Simulated route approved by Local operator');
  });

  it('records the approving operator while clearly keeping approval simulated', () => {
    const raw = makeInitialBatches().find((batch) => batch.flight !== undefined)!;
    const approved = confirmDispatch(raw, 'Samira Ali');
    expect(approved.lastActionReason).toContain('Samira Ali approved');
    expect(approved.lastActionReason).toContain('No real booking or dispatch');
    expect(approved.dispatchConfirmed).toBe(true);
  });

  it('logs anomaly and route recommendation transitions for operator approval', () => {
    const edibleBatch = makeInitialBatches().find((batch) => batch.category === 'EDIBLE') as Batch;
    const delayed = triggerTrafficDelay(edibleBatch);
    const longRoute = { ...delayed, assignedDestination: DESTINATIONS.find((destination) => destination.id === 'al-khor-retail')! };
    const result = tickSimulation([longRoute], new Date('2026-09-25T02:00:00'), () => 0.5);
    expect(result.events.some((event) => event.message.includes('Safety alert'))).toBe(true);
    expect(result.events.some((event) => event.message.includes('Route suggestion') && event.message.includes('operator review required'))).toBe(true);
    expect(result.batches[0].dispatchConfirmed).toBe(false);
    expect(result.batches[0].eventLog.some((event) => event.includes('Safety alert:'))).toBe(true);
  });

  it('recommends a closer positive-value flight after a fault without dispatching it', () => {
    const raw = makeInitialBatches().find((batch) => batch.category === 'RAW')!;
    expect(raw.assignedDestination.id).toBe('miami-export');
    const faulted = triggerEthyleneSpike(raw);
    const result = tickSimulation([faulted], new Date('2026-09-25T02:00:00'), () => 0.5);
    expect(result.batches[0].assignedDestination.id).toBe('bogota-ripening');
    expect(result.events.some((event) => event.message.includes('Route suggestion'))).toBe(true);
    expect(result.batches[0].dispatchConfirmed).toBe(false);
    expect(result.batches[0].status).toBe('PENDING_APPROVAL');
  });
});
