export type Category = 'RAW' | 'EDIBLE' | 'ALMOST_BAD' | 'EXPIRED';

export type Destination = {
  id: string;
  name: string;
  distanceKm: number;
  pricePerKg: number;
  type: 'DC' | 'Retail' | 'Export' | 'Market' | 'Discount' | 'Recovery';
};

export type Product = {
  key: string;
  name: string;
  baselineDays: number;
  safeRange: { minC: number; maxC: number };
  climacteric: boolean;
  optimalTempC: number;
  avgTransitSpeedKmPerDay: number;
  priceBasePerKg: number;
};

export type Batch = {
  id: string;
  productKey: string;
  productName: string;
  category: Category;
  weightKg: number;
  tempC: number;
  humidity: number;
  ethylenePpm: number;
  visionScore: number;
  olfactoryScore: number;
  lat: number;
  lng: number;
  speedKmph: number;
  timeOutOfRangeMin: number;
  baselineDays: number;
  assignedDestination: Destination;
  dslDays: number;
  rMaxKm: number;
  probabilitySafeArrival: number;
  expectedRecoveryValue: number;
  financialPass: boolean;
  status: 'NORMAL' | 'ANOMALY' | 'REROUTED';
  eventLog: string[];
};
