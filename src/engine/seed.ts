import type { Batch, Product, SensorReading } from '../types';
import { classifyByDSL, updateBatchCore } from './calculations';
import { CATEGORY_LABELS, DESTINATIONS, PRODUCTS } from './products';

type SeedSpec = {
  productKey: string;
  originCity: string;
  originCountry: string;
  originAirportCode: string;
  outsideTempC: number;
  ageDays: number;
  tempC: number;
  ethylenePpm: number;
  gas: number;
  lat: number;
  lng: number;
  weightKg: number;
  ripeness: number;
  blemish: number;
  demand?: number;
  humidity: number;
  outOfRangeMin: number;
  supplier: string;
  supplierLot: string;
  packedDaysAgo: number;
  pallets: number;
};

const seedSpecs: SeedSpec[] = [
  { productKey: 'banana', originCity: 'Quito', originCountry: 'Ecuador', originAirportCode: 'UIO', outsideTempC: 23, ageDays: 1, tempC: 13.4, ethylenePpm: 0.24, gas: 0.08, lat: -0.18, lng: -78.47, weightKg: 840, ripeness: 0.24, blemish: 0.06, humidity: 91, outOfRangeMin: 0, supplier: 'Valle Verde Export Co-op', supplierLot: 'EC-UIO-BAN-260924-18', packedDaysAgo: 1, pallets: 40 },
  { productKey: 'tomato', originCity: 'Madrid', originCountry: 'Spain', originAirportCode: 'MAD', outsideTempC: 31, ageDays: 7, tempC: 12.6, ethylenePpm: 0.62, gas: 0.18, lat: 40.49, lng: -3.57, weightKg: 620, ripeness: 0.78, blemish: 0.12, humidity: 88, outOfRangeMin: 3, supplier: 'Huerta del Sur S.C.A.', supplierLot: 'ES-MAD-TOM-260917-07', packedDaysAgo: 2, pallets: 31 },
  { productKey: 'mango', originCity: 'Mumbai', originCountry: 'India', originAirportCode: 'BOM', outsideTempC: 33, ageDays: 19, tempC: 14.1, ethylenePpm: 0.48, gas: 0.3, lat: 19.09, lng: 72.87, weightKg: 710, ripeness: 0.94, blemish: 0.22, demand: 0.35, humidity: 86, outOfRangeMin: 13, supplier: 'Konkan Crown Growers', supplierLot: 'IN-BOM-MNG-260906-42', packedDaysAgo: 3, pallets: 34 },
  { productKey: 'lettuce', originCity: 'Doha', originCountry: 'Qatar', originAirportCode: 'DOH', outsideTempC: 41, ageDays: 9.7, tempC: 5.8, ethylenePpm: 0.05, gas: 0.48, lat: 25.25, lng: 51.39, weightKg: 530, ripeness: 1, blemish: 0.24, humidity: 95, outOfRangeMin: 7, supplier: 'Al Wukair Hydroponic Farms', supplierLot: 'QA-DOH-LET-260915-11', packedDaysAgo: 1, pallets: 26 },
  { productKey: 'cucumber', originCity: 'Doha', originCountry: 'Qatar', originAirportCode: 'DOH', outsideTempC: 41, ageDays: 16, tempC: 11.2, ethylenePpm: 0.06, gas: 1.35, lat: 25.42, lng: 51.56, weightKg: 475, ripeness: 1, blemish: 0.74, humidity: 82, outOfRangeMin: 26, supplier: 'Rawdat Al Hamama Produce', supplierLot: 'QA-DOH-CUC-260909-05', packedDaysAgo: 2, pallets: 23 },
  { productKey: 'avocado', originCity: 'Nairobi', originCountry: 'Kenya', originAirportCode: 'NBO', outsideTempC: 27, ageDays: 1.5, tempC: 7.4, ethylenePpm: 0.32, gas: 0.08, lat: -1.32, lng: 36.93, weightKg: 960, ripeness: 0.2, blemish: 0.05, humidity: 90, outOfRangeMin: 1, supplier: 'Kiambu Highlands Growers', supplierLot: 'KE-NBO-AVO-260923-31', packedDaysAgo: 1, pallets: 46 },
  { productKey: 'orange', originCity: 'São Paulo', originCountry: 'Brazil', originAirportCode: 'GRU', outsideTempC: 29, ageDays: 2, tempC: 7.1, ethylenePpm: 0.08, gas: 0.04, lat: -23.43, lng: -46.47, weightKg: 1250, ripeness: 0.32, blemish: 0.04, humidity: 92, outOfRangeMin: 0, supplier: 'Citrosuco Partner Orchards', supplierLot: 'BR-GRU-ORG-260923-74', packedDaysAgo: 1, pallets: 60 },
  { productKey: 'grapes', originCity: 'Madrid', originCountry: 'Spain', originAirportCode: 'MAD', outsideTempC: 30, ageDays: 11, tempC: 1.5, ethylenePpm: 0.04, gas: 0.11, lat: 40.42, lng: -3.7, weightKg: 410, ripeness: 0.84, blemish: 0.13, humidity: 94, outOfRangeMin: 2, supplier: 'Vinalopó Table Grapes Co-op', supplierLot: 'ES-MAD-GRP-260913-26', packedDaysAgo: 2, pallets: 20 },
  { productKey: 'blueberry', originCity: 'Amsterdam', originCountry: 'Netherlands', originAirportCode: 'AMS', outsideTempC: 19, ageDays: 4, tempC: 1.1, ethylenePpm: 0.03, gas: 0.05, lat: 52.31, lng: 4.77, weightKg: 285, ripeness: 0.72, blemish: 0.08, humidity: 94, outOfRangeMin: 0, supplier: 'Noord-Holland Berry Collective', supplierLot: 'NL-AMS-BLU-260921-63', packedDaysAgo: 1, pallets: 14 },
  { productKey: 'avocado', originCity: 'Mexico City', originCountry: 'Mexico', originAirportCode: 'MEX', outsideTempC: 26, ageDays: 2, tempC: 7.2, ethylenePpm: 0.25, gas: 0.09, lat: 19.44, lng: -99.07, weightKg: 1020, ripeness: 0.27, blemish: 0.07, humidity: 89, outOfRangeMin: 0, supplier: 'Michoacán Select Packers', supplierLot: 'MX-MEX-AVO-260922-09', packedDaysAgo: 1, pallets: 49 },
  { productKey: 'pepper', originCity: 'Nairobi', originCountry: 'Kenya', originAirportCode: 'NBO', outsideTempC: 26, ageDays: 9, tempC: 9.1, ethylenePpm: 0.05, gas: 0.16, lat: -1.29, lng: 36.82, weightKg: 560, ripeness: 0.81, blemish: 0.14, humidity: 92, outOfRangeMin: 2, supplier: 'Athi River Horticulture Ltd.', supplierLot: 'KE-NBO-PEP-260915-22', packedDaysAgo: 1, pallets: 27 },
  { productKey: 'mango', originCity: 'Quito', originCountry: 'Ecuador', originAirportCode: 'UIO', outsideTempC: 25, ageDays: 15, tempC: 14.7, ethylenePpm: 0.42, gas: 0.2, lat: -0.2, lng: -78.5, weightKg: 680, ripeness: 0.76, blemish: 0.16, humidity: 89, outOfRangeMin: 4, supplier: 'Manabí Sunrise Exporters', supplierLot: 'EC-UIO-MNG-260911-37', packedDaysAgo: 2, pallets: 33 },
  { productKey: 'lettuce', originCity: 'Amsterdam', originCountry: 'Netherlands', originAirportCode: 'AMS', outsideTempC: 18, ageDays: 9.7, tempC: 5.7, ethylenePpm: 0.02, gas: 0.31, lat: 52.37, lng: 4.9, weightKg: 345, ripeness: 1, blemish: 0.19, humidity: 96, outOfRangeMin: 0, supplier: 'Westland Leaf Growers', supplierLot: 'NL-AMS-LET-260915-14', packedDaysAgo: 1, pallets: 17 },
  { productKey: 'cucumber', originCity: 'Doha', originCountry: 'Qatar', originAirportCode: 'DOH', outsideTempC: 42, ageDays: 12, tempC: 9.4, ethylenePpm: 0.04, gas: 0.18, lat: 25.29, lng: 51.52, weightKg: 390, ripeness: 0.94, blemish: 0.26, humidity: 91, outOfRangeMin: 5, supplier: 'Qatar Greenhouse Partners', supplierLot: 'QA-DOH-CUC-260913-19', packedDaysAgo: 1, pallets: 19 },
  { productKey: 'orange', originCity: 'Nairobi', originCountry: 'Kenya', originAirportCode: 'NBO', outsideTempC: 28, ageDays: 8, tempC: 7.7, ethylenePpm: 0.06, gas: 0.09, lat: -1.36, lng: 36.91, weightKg: 890, ripeness: 0.58, blemish: 0.08, humidity: 91, outOfRangeMin: 2, supplier: 'Rift Valley Citrus Union', supplierLot: 'KE-NBO-ORG-260916-51', packedDaysAgo: 2, pallets: 43 },
  { productKey: 'tomato', originCity: 'Mumbai', originCountry: 'India', originAirportCode: 'BOM', outsideTempC: 34, ageDays: 11.7, tempC: 13.2, ethylenePpm: 0.42, gas: 0.46, lat: 19.02, lng: 72.85, weightKg: 510, ripeness: 0.98, blemish: 0.31, humidity: 85, outOfRangeMin: 6, supplier: 'Maharashtra Fresh Produce Board', supplierLot: 'IN-BOM-TOM-260913-08', packedDaysAgo: 2, pallets: 25 },
];

export function makeInitialBatches(): Batch[] {
  return seedSpecs.map((spec, index) => {
    const product = PRODUCTS[spec.productKey];
    const batch: Batch = {
      id: `LOT-${260901 + index}`,
      productKey: product.key,
      productName: product.name,
      foodGroup: product.foodGroup,
      category: 'RAW',
      weightKg: spec.weightKg,
      tempC: spec.tempC,
      humidity: spec.humidity,
      ethylenePpm: spec.ethylenePpm,
      visionRipeness: spec.ripeness,
      visionBlemish: spec.blemish,
      olfactoryGasPpm: spec.gas,
      lat: spec.lat,
      lng: spec.lng,
      speedKmph: 8 + ((index * 11) % 54),
      timeOutOfRangeMin: spec.outOfRangeMin,
      ageDays: spec.ageDays,
      baselineDays: product.baselineDays,
      safeRange: product.safeRange,
      optimalMaxTempC: product.optimalMaxTempC,
      climacteric: product.climacteric,
      averageTransitSpeedKmPerDay: product.averageTransitSpeedKmPerDay,
      priceBasePerKg: product.priceBasePerKg,
      assignedDestination: DESTINATIONS[0],
      dslDays: 0,
      rMaxKm: 0,
      probabilitySafeArrival: 1,
      expectedRecoveryValue: 0,
      financialPass: false,
      status: 'STATUS_NORMAL',
      dispatchConfirmed: false,
      originCity: spec.originCity,
      originCountry: spec.originCountry,
      originAirportCode: spec.originAirportCode,
      supplierName: spec.supplier,
      supplierLotCode: spec.supplierLot,
      packedAt: new Date(Date.now() - spec.packedDaysAgo * 86400000).toISOString(),
      palletCount: spec.pallets,
      lastAction: '',
      lastActionReason: '',
      contaminated: spec.gas >= 1.2,
      trafficDelayHours: 0,
      demandProbability: spec.demand ?? 0.72 + (index % 4) * 0.06,
      outsideTempC: spec.outsideTempC,
      weatherHeatIndexC: spec.outsideTempC + 7,
      refrigerationFailureTicks: 0,
      workflowStage: 'INPUT',
      rerouteKmSaved: 0,
      costSaved: 0,
      eventLog: [`Intake recorded · ${spec.supplierLot} · ${new Date().toLocaleTimeString()}`],
      history: [],
    };
    const computed = updateBatchCore(batch);
    computed.category = classifyByDSL(computed.dslDays);
    computed.status = computed.contaminated ? 'ANOMALY_DETECTED' : 'STATUS_NORMAL';
    computed.eventLog = [
      ...batch.eventLog,
      `Quality grading · ripeness ${Math.round(spec.ripeness * 100)}% · blemish ${Math.round(spec.blemish * 100)}%`,
      `${CATEGORY_LABELS[computed.category]} condition · estimated ${computed.dslDays.toFixed(1)} days freshness`,
      `Suggested next step: ${computed.lastAction} · ${computed.assignedDestination.country}`,
    ];
    const firstReading: SensorReading = {
      time: new Date().toLocaleTimeString(),
      tempC: batch.tempC,
      humidity: batch.humidity,
      ethylenePpm: batch.ethylenePpm,
      speedKmph: batch.speedKmph,
    };
    computed.history = [firstReading];
    return computed;
  });
}

export type ManualBatchInput = {
  id: string;
  productKey: string;
  foodGroup?: Batch['foodGroup'];
  originCity: string;
  originCountry: string;
  supplierName: string;
  weightKg: number;
  tempC: number;
  ageDays: number;
  ethylenePpm: number;
};

export type ProductProfileInput = Omit<Product, 'key' | 'custom'>;

export function createProductProfile(input: ProductProfileInput, existing: Record<string, Product> = PRODUCTS): Product {
  const name = input.name.trim();
  const key = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/-$/, '');
  if (!name) throw new Error('Enter a food name.');
  if (existing[key]) throw new Error('A reference for this food already exists.');
  if (![input.baselineDays, input.safeRange.minC, input.safeRange.maxC, input.optimalMaxTempC, input.averageTransitSpeedKmPerDay, input.priceBasePerKg].every(Number.isFinite)
    || input.baselineDays <= 0
    || input.safeRange.minC > input.safeRange.maxC
    || input.optimalMaxTempC < input.safeRange.minC
    || input.optimalMaxTempC > input.safeRange.maxC
    || input.averageTransitSpeedKmPerDay <= 0
    || input.priceBasePerKg < 0) {
    throw new Error('Check the shelf life, temperature range, transit speed, and price.');
  }
  return { ...input, key, name, custom: true };
}

export function createManualBatch(input: ManualBatchInput, existing: Batch[], productProfiles: Record<string, Product> = PRODUCTS): Batch {
  const id = input.id.trim().toUpperCase();
  if (!id) throw new Error('Enter a lot code.');
  if (existing.some((batch) => batch.id.toUpperCase() === id || batch.supplierLotCode.toUpperCase() === id)) {
    throw new Error('That lot code is already in use. Choose a unique code.');
  }

  if (![input.weightKg, input.tempC, input.ageDays, input.ethylenePpm].every(Number.isFinite)
    || input.weightKg <= 0 || input.ageDays < 0 || input.ethylenePpm < 0) {
    throw new Error('Weight must be positive; age and ethylene cannot be negative; all measurements must be numbers.');
  }
  const template = existing.find((batch) => batch.originCountry === input.originCountry)
    ?? existing[0];
  const product = productProfiles[input.productKey];
  if (!template || !product || !input.originCountry.trim() || !input.originCity.trim()) throw new Error('A valid produce type, origin country, and origin city are required.');

  const batch: Batch = {
    ...template,
    id,
    isManual: true,
    productKey: product.key,
    productName: product.name,
    foodGroup: product.foodGroup,
    originCity: input.originCity.trim() || template.originCity,
    weightKg: input.weightKg,
    tempC: input.tempC,
    ethylenePpm: input.ethylenePpm,
    ageDays: input.ageDays,
    baselineDays: product.baselineDays,
    safeRange: product.safeRange,
    optimalMaxTempC: product.optimalMaxTempC,
    climacteric: product.climacteric,
    averageTransitSpeedKmPerDay: product.averageTransitSpeedKmPerDay,
    priceBasePerKg: product.priceBasePerKg,
    supplierName: input.supplierName.trim() || 'Manually entered supplier',
    supplierLotCode: id,
    packedAt: new Date(Date.now() - input.ageDays * 86400000).toISOString(),
    palletCount: Math.max(1, Math.ceil(input.weightKg / 400)),
    assignedDestination: DESTINATIONS[0],
    dslDays: 0,
    rMaxKm: 0,
    probabilitySafeArrival: 1,
    expectedRecoveryValue: 0,
    financialPass: false,
    status: 'STATUS_NORMAL',
    anomalyReason: undefined,
    dispatchConfirmed: false,
    flight: undefined,
    flightStatus: undefined,
    flightHoursUntilDeparture: undefined,
    flightHoursRemaining: undefined,
    contaminated: false,
    refrigerationFailureTicks: 0,
    workflowStage: 'INPUT',
    rerouteKmSaved: 0,
    costSaved: 0,
    eventLog: [`Manual lot entered · ${new Date().toLocaleTimeString()}`],
    history: [{
      time: new Date().toLocaleTimeString(),
      tempC: input.tempC,
      humidity: template.humidity,
      ethylenePpm: input.ethylenePpm,
      speedKmph: template.speedKmph,
    }],
  };
  const calculated = updateBatchCore(batch);
  calculated.status = 'PENDING_APPROVAL';
  calculated.eventLog = [`Suggested next step: ${calculated.lastAction}`, ...calculated.eventLog];
  return calculated;
}
