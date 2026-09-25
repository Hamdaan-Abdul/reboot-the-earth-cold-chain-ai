export type Category = 'RAW' | 'EDIBLE' | 'ALMOST_BAD' | 'EXPIRED';
export type BatchStatus = 'STATUS_NORMAL' | 'ANOMALY_DETECTED' | 'PENDING_APPROVAL' | 'DISPATCH_CONFIRMED';

export type DestinationType =
  | 'RIPENING'
  | 'EXPORT'
  | 'DC'
  | 'RETAIL'
  | 'LOCAL'
  | 'DISCOUNT'
  | 'COMMUNITY'
  | 'FOOD_BANK'
  | 'ANIMAL_FEED'
  | 'INDUSTRIAL'
  | 'COMPOST'
  | 'DIGESTION'
  | 'LANDFILL';

export type RouteMode = 'AIR' | 'ROAD' | 'SEA';
export type FlightStatus = 'SCHEDULED' | 'BOARDING' | 'IN_TRANSIT' | 'ARRIVED';

export type FlightSchedule = {
  id: string;
  flightNumber: string;
  airline: string;
  originAirportCode: string;
  originCity: string;
  destinationAirportCode: string;
  destinationCity: string;
  departureLocal: string;
  arrivalLocal: string;
  durationHours: number;
  distanceKm: number;
  cargoCapacityKg: number;
  cargoBookedKg: number;
  cargoRatePerKg: number;
  onTimeProbability: number;
  daysOfWeek: string;
};

export type Destination = {
  id: string;
  name: string;
  distanceKm: number;
  pricePerKg: number;
  type: DestinationType;
  handlingCostPerKg: number;
  ripeningCostPerKg?: number;
  recoveryTier?: number;
  country: string;
  region: string;
  lat: number;
  lng: number;
  airportCode?: string;
  routeMode: RouteMode;
  transitHours: number;
  flightId?: string;
};

export type Product = {
  key: string;
  name: string;
  baselineDays: number;
  safeRange: { minC: number; maxC: number };
  optimalMaxTempC: number;
  climacteric: boolean;
  averageTransitSpeedKmPerDay: number;
  priceBasePerKg: number;
};

export type SensorReading = {
  time: string;
  tempC: number;
  humidity: number;
  ethylenePpm: number;
  speedKmph: number;
};

export type Batch = {
  id: string;
  isManual?: boolean;
  productKey: string;
  productName: string;
  category: Category;
  weightKg: number;
  tempC: number;
  humidity: number;
  ethylenePpm: number;
  visionRipeness: number;
  visionBlemish: number;
  olfactoryGasPpm: number;
  lat: number;
  lng: number;
  speedKmph: number;
  timeOutOfRangeMin: number;
  ageDays: number;
  baselineDays: number;
  safeRange: { minC: number; maxC: number };
  optimalMaxTempC: number;
  climacteric: boolean;
  assignedDestination: Destination;
  dslDays: number;
  rMaxKm: number;
  probabilitySafeArrival: number;
  expectedRecoveryValue: number;
  financialPass: boolean;
  status: BatchStatus;
  anomalyReason?: string;
  dispatchConfirmed: boolean;
  originCity: string;
  originCountry: string;
  originAirportCode: string;
  supplierName: string;
  supplierLotCode: string;
  packedAt: string;
  palletCount: number;
  flight?: FlightSchedule;
  flightStatus?: FlightStatus;
  flightOriginLat?: number;
  flightOriginLng?: number;
  flightHoursUntilDeparture?: number;
  flightHoursRemaining?: number;
  lastAction: string;
  lastActionReason: string;
  contaminated: boolean;
  trafficDelayHours: number;
  demandProbability: number;
  outsideTempC: number;
  weatherHeatIndexC: number;
  refrigerationFailureTicks: number;
  workflowStage: 'INPUT' | 'CATEGORIZING' | 'DISTRIBUTION' | 'OUTPUT';
  rerouteKmSaved: number;
  costSaved: number;
  eventLog: string[];
  history: SensorReading[];
};

export type AuditEvent = {
  id: string;
  at: string;
  batchId: string;
  message: string;
  kind: 'INFO' | 'WARNING' | 'SUCCESS' | 'CRITICAL';
};
