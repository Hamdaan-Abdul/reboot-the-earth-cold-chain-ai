import type { Batch, Category, Destination, Product } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  RAW: '#22c55e',
  EDIBLE: '#3b82f6',
  ALMOST_BAD: '#f59e0b',
  EXPIRED: '#ef4444',
};

export const PRODUCTS: Record<string, Product> = {
  banana: {
    key: 'banana',
    name: 'Banana',
    baselineDays: 18,
    safeRange: { minC: 12, maxC: 14 },
    climacteric: true,
    optimalTempC: 13,
    avgTransitSpeedKmPerDay: 600,
    priceBasePerKg: 1.2,
  },
  tomato: {
    key: 'tomato',
    name: 'Tomato',
    baselineDays: 12,
    safeRange: { minC: 10, maxC: 14 },
    climacteric: true,
    optimalTempC: 12,
    avgTransitSpeedKmPerDay: 550,
    priceBasePerKg: 1.5,
  },
  mango: {
    key: 'mango',
    name: 'Mango',
    baselineDays: 21,
    safeRange: { minC: 12, maxC: 15 },
    climacteric: true,
    optimalTempC: 13,
    avgTransitSpeedKmPerDay: 500,
    priceBasePerKg: 2.8,
  },
  lettuce: {
    key: 'lettuce',
    name: 'Lettuce',
    baselineDays: 6,
    safeRange: { minC: 1, maxC: 6 },
    climacteric: false,
    optimalTempC: 4,
    avgTransitSpeedKmPerDay: 700,
    priceBasePerKg: 1.1,
  },
};

export const DESTINATIONS: Destination[] = [
  { id: 'doha_dc', name: 'Doha Distribution Center', distanceKm: 40, pricePerKg: 1.8, type: 'DC' },
  { id: 'al_khor_retail', name: 'Al Khor Retail Hub', distanceKm: 60, pricePerKg: 1.9, type: 'Retail' },
  { id: 'export_port', name: 'Export Port (Sea)', distanceKm: 500, pricePerKg: 3.5, type: 'Export' },
  { id: 'local_market', name: 'Local Market (Doha)', distanceKm: 15, pricePerKg: 1.6, type: 'Market' },
  { id: 'discount_store', name: 'Discount Clearance Store', distanceKm: 10, pricePerKg: 0.6, type: 'Discount' },
  { id: 'food_bank', name: 'Food Bank', distanceKm: 8, pricePerKg: 0, type: 'Recovery' },
];

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function computeDSL(batch: Pick<Batch, 'baselineDays' | 'tempC' | 'safeRange' | 'ethylenePpm' | 'climacteric'> & { safeRange: { minC: number; maxC: number; } }): number {
  const baseline = batch.baselineDays;
  const tempExcess = Math.max(0, batch.tempC - batch.safeRange.maxC);
  const thermalPenalty = tempExcess * 0.12;
  let ethylenePenalty = 0;
  if (batch.climacteric && batch.ethylenePpm > 0.5) {
    ethylenePenalty = batch.ethylenePpm * 0.25;
  }
  const dsl = baseline * (1 - (thermalPenalty + ethylenePenalty));
  return clamp(dsl, 0, baseline);
}

export function computeRMax(batch: Batch): number {
  const product = PRODUCTS[batch.productKey];
  const avgSpeed = product?.avgTransitSpeedKmPerDay ?? 500;
  return Math.max(0, (batch.dslDays - 1) * avgSpeed);
}

export function computeProbabilitySafeArrival(batch: Batch): number {
  const scale = Math.max(60, batch.baselineDays * 24 * 60 * 0.25);
  return clamp(Math.exp(-(batch.timeOutOfRangeMin / scale)), 0, 1);
}

export function financialCheck(batch: Batch, destination: Destination): { expectedRecoveryValue: number; probability: number; cost: number } {
  const probability = computeProbabilitySafeArrival(batch);
  const transportCost = destination.distanceKm * 0.8 + 25;
  const revenue = destination.pricePerKg * batch.weightKg * probability;
  const expectedRecoveryValue = revenue - transportCost;

  return {
    expectedRecoveryValue,
    probability,
    cost: transportCost,
  };
}

export function classifyByDSL(dsl: number): Category {
  if (dsl <= 0.5) return 'EXPIRED';
  if (dsl <= 2) return 'ALMOST_BAD';
  if (dsl <= 6) return 'EDIBLE';
  return 'RAW';
}

export function makeInitialBatches(): Batch[] {
  const products = ['banana', 'tomato', 'mango', 'lettuce'];
  const destinations = DESTINATIONS;

  return products.map((productKey, i) => {
    const product = PRODUCTS[productKey];
    const destination = destinations[(i + 1) % destinations.length];
    const baseTemp = product.safeRange.maxC + (i % 2 === 0 ? 0.8 : -0.4);
    const batch: Batch = {
      id: `B-${1000 + i}`,
      productKey,
      productName: product.name,
      category: 'RAW',
      weightKg: 600 + i * 150,
      tempC: baseTemp,
      humidity: 65 + i * 6,
      ethylenePpm: product.climacteric ? 0.2 + i * 0.15 : 0.05,
      visionScore: 0.76 + i * 0.06,
      olfactoryScore: 0.8 + i * 0.04,
      lat: 25.32 + i * 0.03,
      lng: 51.44 + i * 0.05,
      speedKmph: 42 + i * 14,
      timeOutOfRangeMin: 5 + i * 3,
      baselineDays: product.baselineDays,
      assignedDestination: destination,
      dslDays: 0,
      rMaxKm: 0,
      probabilitySafeArrival: 1,
      expectedRecoveryValue: 0,
      financialPass: true,
      status: 'NORMAL',
      eventLog: [`Created ${product.name} batch at ${new Date().toLocaleTimeString()}`],
    };

    batch.dslDays = computeDSL(batch);
    batch.category = classifyByDSL(batch.dslDays);
    batch.rMaxKm = computeRMax(batch);
    const financial = financialCheck(batch, destination);
    batch.probabilitySafeArrival = financial.probability;
    batch.expectedRecoveryValue = financial.expectedRecoveryValue;
    batch.financialPass = financial.expectedRecoveryValue > 0;
    return batch;
  });
}

export function updateBatchCore(batch: Batch): void {
  batch.dslDays = computeDSL(batch);
  batch.category = classifyByDSL(batch.dslDays);
  batch.rMaxKm = computeRMax(batch);
  const financial = financialCheck(batch, batch.assignedDestination);
  batch.probabilitySafeArrival = financial.probability;
  batch.expectedRecoveryValue = financial.expectedRecoveryValue;
  batch.financialPass = financial.expectedRecoveryValue > 0;
}

export function triggerRefrigerationFailure(batch: Batch): void {
  batch.tempC += 7;
  batch.timeOutOfRangeMin += 18;
  batch.status = 'ANOMALY';
  batch.eventLog.unshift(`${new Date().toLocaleTimeString()} - Refrigeration failure simulated.`);
  updateBatchCore(batch);
}

export function triggerEthyleneSpike(batch: Batch): void {
  batch.ethylenePpm += 1.4;
  batch.status = 'ANOMALY';
  batch.eventLog.unshift(`${new Date().toLocaleTimeString()} - Ethylene spike detected.`);
  updateBatchCore(batch);
}

export function triggerTrafficDelay(batch: Batch): void {
  batch.timeOutOfRangeMin += 40;
  batch.status = 'REROUTED';
  batch.assignedDestination = DESTINATIONS.find((d) => d.type === 'Discount') ?? batch.assignedDestination;
  batch.eventLog.unshift(`${new Date().toLocaleTimeString()} - Traffic delay triggered earlier clearance route.`);
  updateBatchCore(batch);
}

export function tickSimulation(batches: Batch[], onEvent?: (message: string) => void): Batch[] {
  return batches.map((batch) => {
    const product = PRODUCTS[batch.productKey];
    if (!product) return batch;

    const timeBias = (new Date().getHours() >= 10 && new Date().getHours() <= 17) ? 0.25 : 0;
    batch.tempC += (Math.random() - 0.5) * 1.4 + timeBias;
    batch.humidity = clamp(batch.humidity + (Math.random() - 0.5) * 4, 35, 98);
    if (product.climacteric) {
      batch.ethylenePpm = clamp(batch.ethylenePpm + (Math.random() - 0.45) * 0.18, 0, 2.2);
    }
    if (batch.tempC > batch.assignedDestination.distanceKm * 0.02) {
      batch.timeOutOfRangeMin += 0.5;
    } else {
      batch.timeOutOfRangeMin = Math.max(0, batch.timeOutOfRangeMin - 0.2);
    }

    batch.speedKmph = clamp(batch.speedKmph + (Math.random() - 0.5) * 12, 18, 90);
    batch.lat = clamp(batch.lat + (Math.random() - 0.5) * 0.02, 25.1, 25.9);
    batch.lng = clamp(batch.lng + (Math.random() - 0.5) * 0.03, 51.2, 51.8);

    if (batch.tempC > product.safeRange.maxC + 2 || batch.ethylenePpm > 1.2 || batch.timeOutOfRangeMin > 20) {
      batch.status = 'ANOMALY';
      if (Math.random() > 0.7) {
        batch.assignedDestination = DESTINATIONS.filter((d) => d.distanceKm < 100)[0] ?? batch.assignedDestination;
        batch.status = 'REROUTED';
      }
      onEvent?.(`${batch.id}: anomaly detected, reroute consideration triggered.`);
    } else {
      batch.status = 'NORMAL';
    }

    updateBatchCore(batch);

    if (Math.random() > 0.75) {
      batch.eventLog.unshift(`${new Date().toLocaleTimeString()} - Route recalculated for ${batch.productName}.`);
      if (batch.eventLog.length > 10) batch.eventLog = batch.eventLog.slice(0, 10);
    }

    return batch;
  });
}
