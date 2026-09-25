import type { Destination, FlightSchedule, Product } from '../types';

export const PRODUCTS: Record<string, Product> = {
  banana: { key: 'banana', name: 'Banana', baselineDays: 18, safeRange: { minC: 12, maxC: 14 }, optimalMaxTempC: 14, climacteric: true, averageTransitSpeedKmPerDay: 600, priceBasePerKg: 1.2 },
  tomato: { key: 'tomato', name: 'Tomato', baselineDays: 12, safeRange: { minC: 10, maxC: 14 }, optimalMaxTempC: 14, climacteric: true, averageTransitSpeedKmPerDay: 550, priceBasePerKg: 1.5 },
  mango: { key: 'mango', name: 'Mango', baselineDays: 21, safeRange: { minC: 12, maxC: 15 }, optimalMaxTempC: 15, climacteric: true, averageTransitSpeedKmPerDay: 500, priceBasePerKg: 2.8 },
  lettuce: { key: 'lettuce', name: 'Lettuce', baselineDays: 10, safeRange: { minC: 1, maxC: 6 }, optimalMaxTempC: 6, climacteric: false, averageTransitSpeedKmPerDay: 700, priceBasePerKg: 1.1 },
  cucumber: { key: 'cucumber', name: 'Cucumber', baselineDays: 14, safeRange: { minC: 7, maxC: 10 }, optimalMaxTempC: 10, climacteric: false, averageTransitSpeedKmPerDay: 650, priceBasePerKg: 1 },
  avocado: { key: 'avocado', name: 'Avocado', baselineDays: 18, safeRange: { minC: 5, maxC: 8 }, optimalMaxTempC: 8, climacteric: true, averageTransitSpeedKmPerDay: 560, priceBasePerKg: 2.4 },
  orange: { key: 'orange', name: 'Orange', baselineDays: 28, safeRange: { minC: 3, maxC: 8 }, optimalMaxTempC: 8, climacteric: false, averageTransitSpeedKmPerDay: 640, priceBasePerKg: 1.3 },
  grapes: { key: 'grapes', name: 'Table grapes', baselineDays: 16, safeRange: { minC: -1, maxC: 2 }, optimalMaxTempC: 2, climacteric: false, averageTransitSpeedKmPerDay: 680, priceBasePerKg: 2.1 },
  blueberry: { key: 'blueberry', name: 'Blueberry', baselineDays: 10, safeRange: { minC: 0, maxC: 2 }, optimalMaxTempC: 2, climacteric: false, averageTransitSpeedKmPerDay: 700, priceBasePerKg: 4.2 },
  pepper: { key: 'pepper', name: 'Bell pepper', baselineDays: 14, safeRange: { minC: 7, maxC: 10 }, optimalMaxTempC: 10, climacteric: false, averageTransitSpeedKmPerDay: 650, priceBasePerKg: 1.8 },
};

// Representative schedules for the prototype. These are illustrative, not a live airline feed.
export const FLIGHTS: FlightSchedule[] = [
  { id: 'sim-uio-bog', flightNumber: 'QR-SIM 184', airline: 'Qatar Airways Cargo · sample', originAirportCode: 'UIO', originCity: 'Quito', destinationAirportCode: 'BOG', destinationCity: 'Bogotá', departureLocal: '21:40', arrivalLocal: '02:10 +1', durationHours: 3.6, distanceKm: 830, cargoCapacityKg: 12000, cargoBookedKg: 7400, cargoRatePerKg: 0.44, onTimeProbability: 0.91, daysOfWeek: 'Daily' },
  { id: 'sim-uio-mia', flightNumber: 'QR-SIM 186', airline: 'Qatar Airways Cargo · sample', originAirportCode: 'UIO', originCity: 'Quito', destinationAirportCode: 'MIA', destinationCity: 'Miami', departureLocal: '23:15', arrivalLocal: '05:50 +1', durationHours: 6.6, distanceKm: 3100, cargoCapacityKg: 15000, cargoBookedKg: 9100, cargoRatePerKg: 0.68, onTimeProbability: 0.88, daysOfWeek: 'Mon · Wed · Fri · Sun' },
  { id: 'sim-bom-dxb', flightNumber: 'QR-SIM 238', airline: 'Gulf Fresh Air Cargo · sample', originAirportCode: 'BOM', originCity: 'Mumbai', destinationAirportCode: 'DXB', destinationCity: 'Dubai', departureLocal: '02:20', arrivalLocal: '04:10', durationHours: 3.2, distanceKm: 1930, cargoCapacityKg: 10000, cargoBookedKg: 6800, cargoRatePerKg: 0.38, onTimeProbability: 0.94, daysOfWeek: 'Daily' },
  { id: 'sim-bom-doh', flightNumber: 'QR-SIM 244', airline: 'Gulf Fresh Air Cargo · sample', originAirportCode: 'BOM', originCity: 'Mumbai', destinationAirportCode: 'DOH', destinationCity: 'Doha', departureLocal: '05:40', arrivalLocal: '08:10', durationHours: 4.1, distanceKm: 2300, cargoCapacityKg: 11500, cargoBookedKg: 5600, cargoRatePerKg: 0.41, onTimeProbability: 0.93, daysOfWeek: 'Daily' },
  { id: 'sim-mad-cdg', flightNumber: 'QR-SIM 311', airline: 'Iberia Fresh Cargo · sample', originAirportCode: 'MAD', originCity: 'Madrid', destinationAirportCode: 'CDG', destinationCity: 'Paris', departureLocal: '09:15', arrivalLocal: '11:20', durationHours: 2.1, distanceKm: 1050, cargoCapacityKg: 9200, cargoBookedKg: 5100, cargoRatePerKg: 0.31, onTimeProbability: 0.9, daysOfWeek: 'Daily' },
  { id: 'sim-mad-doh', flightNumber: 'QR-SIM 318', airline: 'Iberia Fresh Cargo · sample', originAirportCode: 'MAD', originCity: 'Madrid', destinationAirportCode: 'DOH', destinationCity: 'Doha', departureLocal: '15:25', arrivalLocal: '22:05', durationHours: 6.7, distanceKm: 5200, cargoCapacityKg: 14000, cargoBookedKg: 8800, cargoRatePerKg: 0.59, onTimeProbability: 0.89, daysOfWeek: 'Tue · Thu · Sat' },
  { id: 'sim-ams-doh', flightNumber: 'QR-SIM 405', airline: 'NorthSea Cargo · sample', originAirportCode: 'AMS', originCity: 'Amsterdam', destinationAirportCode: 'DOH', destinationCity: 'Doha', departureLocal: '18:50', arrivalLocal: '01:25 +1', durationHours: 6.6, distanceKm: 4900, cargoCapacityKg: 13000, cargoBookedKg: 7200, cargoRatePerKg: 0.55, onTimeProbability: 0.9, daysOfWeek: 'Daily' },
  { id: 'sim-nbo-dxb', flightNumber: 'SIM 512', airline: 'Continental Fresh Cargo · sample', originAirportCode: 'NBO', originCity: 'Nairobi', destinationAirportCode: 'DXB', destinationCity: 'Dubai', departureLocal: '22:10', arrivalLocal: '04:30 +1', durationHours: 5.3, distanceKm: 3550, cargoCapacityKg: 11000, cargoBookedKg: 6200, cargoRatePerKg: 0.46, onTimeProbability: 0.89, daysOfWeek: 'Daily' },
  { id: 'sim-nbo-doh', flightNumber: 'SIM 518', airline: 'Continental Fresh Cargo · sample', originAirportCode: 'NBO', originCity: 'Nairobi', destinationAirportCode: 'DOH', destinationCity: 'Doha', departureLocal: '01:40', arrivalLocal: '07:35', durationHours: 5.9, distanceKm: 3500, cargoCapacityKg: 12000, cargoBookedKg: 7900, cargoRatePerKg: 0.48, onTimeProbability: 0.9, daysOfWeek: 'Mon · Tue · Thu · Sat' },
  { id: 'sim-gru-mia', flightNumber: 'SIM 624', airline: 'Atlantic Produce Cargo · sample', originAirportCode: 'GRU', originCity: 'São Paulo', destinationAirportCode: 'MIA', destinationCity: 'Miami', departureLocal: '23:55', arrivalLocal: '07:30 +1', durationHours: 7.6, distanceKm: 6570, cargoCapacityKg: 16000, cargoBookedKg: 8900, cargoRatePerKg: 0.64, onTimeProbability: 0.87, daysOfWeek: 'Daily' },
  { id: 'sim-gru-lis', flightNumber: 'SIM 629', airline: 'Atlantic Produce Cargo · sample', originAirportCode: 'GRU', originCity: 'São Paulo', destinationAirportCode: 'LIS', destinationCity: 'Lisbon', departureLocal: '21:20', arrivalLocal: '10:15 +1', durationHours: 10.9, distanceKm: 7950, cargoCapacityKg: 14500, cargoBookedKg: 9700, cargoRatePerKg: 0.71, onTimeProbability: 0.86, daysOfWeek: 'Tue · Wed · Fri · Sun' },
  { id: 'sim-mex-mia', flightNumber: 'SIM 733', airline: 'Americas Fresh Cargo · sample', originAirportCode: 'MEX', originCity: 'Mexico City', destinationAirportCode: 'MIA', destinationCity: 'Miami', departureLocal: '08:35', arrivalLocal: '12:05', durationHours: 3.5, distanceKm: 2060, cargoCapacityKg: 10500, cargoBookedKg: 6400, cargoRatePerKg: 0.42, onTimeProbability: 0.9, daysOfWeek: 'Daily' },
  { id: 'sim-ams-cdg', flightNumber: 'SIM 811', airline: 'NorthSea Cargo · sample', originAirportCode: 'AMS', originCity: 'Amsterdam', destinationAirportCode: 'CDG', destinationCity: 'Paris', departureLocal: '10:10', arrivalLocal: '11:25', durationHours: 1.3, distanceKm: 400, cargoCapacityKg: 8000, cargoBookedKg: 4500, cargoRatePerKg: 0.22, onTimeProbability: 0.93, daysOfWeek: 'Daily' },
  { id: 'sim-doh-dxb', flightNumber: 'SIM 905', airline: 'Gulf Fresh Cargo · sample', originAirportCode: 'DOH', originCity: 'Doha', destinationAirportCode: 'DXB', destinationCity: 'Dubai', departureLocal: '11:40', arrivalLocal: '13:00', durationHours: 1.3, distanceKm: 380, cargoCapacityKg: 9000, cargoBookedKg: 3900, cargoRatePerKg: 0.2, onTimeProbability: 0.94, daysOfWeek: 'Daily' },
];

const destination = (
  id: string, name: string, distanceKm: number, pricePerKg: number, type: Destination['type'],
  handlingCostPerKg: number, country: string, region: string, lat: number, lng: number,
  routeMode: Destination['routeMode'], transitHours: number, options: Partial<Destination> = {},
): Destination => ({
  id, name, distanceKm, pricePerKg, type, handlingCostPerKg, country, region, lat, lng,
  routeMode, transitHours, ...options,
});

export const DESTINATIONS: Destination[] = [
  destination('bogota-ripening', 'Bogotá Ripening & Wholesale Hub', 830, 2.25, 'RIPENING', 0.1, 'Colombia', 'South America', 4.71, -74.07, 'AIR', 9, { airportCode: 'BOG', flightId: 'sim-uio-bog', ripeningCostPerKg: 0.16 }),
  destination('miami-export', 'Miami Produce Exchange', 3100, 3.15, 'EXPORT', 0.16, 'United States', 'North America', 25.79, -80.29, 'AIR', 14, { airportCode: 'MIA', flightId: 'sim-uio-mia', ripeningCostPerKg: 0.18 }),
  destination('doha-ripening', 'Doha Regional Ripening Hub', 2300, 2.55, 'RIPENING', 0.08, 'Qatar', 'Middle East', 25.26, 51.61, 'AIR', 9, { airportCode: 'DOH', flightId: 'sim-bom-doh', ripeningCostPerKg: 0.2 }),
  destination('dubai-ripening', 'Dubai Fresh Produce Market', 1930, 2.85, 'EXPORT', 0.12, 'United Arab Emirates', 'Middle East', 25.25, 55.36, 'AIR', 7, { airportCode: 'DXB', flightId: 'sim-bom-dxb', ripeningCostPerKg: 0.18 }),
  destination('paris-market', 'Paris Wholesale Produce Market', 1050, 2.1, 'RETAIL', 0.1, 'France', 'Europe', 49.01, 2.55, 'AIR', 6, { airportCode: 'CDG', flightId: 'sim-mad-cdg' }),
  destination('madrid-market', 'Madrid Local Fresh Market', 28, 1.82, 'DC', 0.08, 'Spain', 'Europe', 40.46, -3.68, 'ROAD', 1.1),
  destination('doha-air-market', 'Doha Fresh Produce Exchange', 5200, 2.7, 'EXPORT', 0.15, 'Qatar', 'Middle East', 25.26, 51.61, 'AIR', 12, { airportCode: 'DOH', flightId: 'sim-mad-doh', ripeningCostPerKg: 0.14 }),
  destination('doha-air-import', 'Doha Produce Import Hub', 4900, 2.65, 'RIPENING', 0.1, 'Qatar', 'Middle East', 25.26, 51.61, 'AIR', 12, { airportCode: 'DOH', flightId: 'sim-ams-doh', ripeningCostPerKg: 0.16 }),
  destination('doha-dc', 'Doha Distribution Center', 38, 1.9, 'DC', 0.08, 'Qatar', 'Middle East', 25.31, 51.52, 'ROAD', 1.4),
  destination('al-khor-retail', 'Al Khor Retail Hub', 62, 2.05, 'RETAIL', 0.1, 'Qatar', 'Middle East', 25.68, 51.5, 'ROAD', 2.2),
  destination('doha-market', 'Doha Local Market', 14, 1.65, 'LOCAL', 0.06, 'Qatar', 'Middle East', 25.29, 51.53, 'ROAD', 0.8),
  destination('discount-retail', 'Discount Retailer', 9, 0.78, 'DISCOUNT', 0.05, 'Qatar', 'Middle East', 25.32, 51.51, 'ROAD', 0.5),
  destination('community-fridge', 'Community Fridge Network', 7, 0, 'COMMUNITY', 0.03, 'Qatar', 'Middle East', 25.3, 51.51, 'ROAD', 0.4),
  destination('food-bank', 'Qatar Food Bank', 11, 0, 'FOOD_BANK', 0.03, 'Qatar', 'Middle East', 25.32, 51.49, 'ROAD', 0.6, { recoveryTier: 1 }),
  destination('animal-feed', 'Licensed Animal Feed Partner', 28, 0.12, 'ANIMAL_FEED', 0.07, 'Qatar', 'Middle East', 25.42, 51.38, 'ROAD', 1.2, { recoveryTier: 2 }),
  destination('industrial-reuse', 'Industrial Oils & Biodiesel', 34, 0.09, 'INDUSTRIAL', 0.08, 'Qatar', 'Middle East', 25.21, 51.57, 'ROAD', 1.4, { recoveryTier: 3 }),
  destination('compost', 'Municipal Composting', 22, 0.02, 'COMPOST', 0.04, 'Qatar', 'Middle East', 25.18, 51.45, 'ROAD', 1, { recoveryTier: 4 }),
  destination('anaerobic-digestion', 'Anaerobic Digestion Facility', 31, 0.04, 'DIGESTION', 0.06, 'Qatar', 'Middle East', 25.4, 51.4, 'ROAD', 1.3, { recoveryTier: 5 }),
  destination('landfill', 'Sanitary Landfill', 25, 0, 'LANDFILL', 0.1, 'Qatar', 'Middle East', 25.2, 51.33, 'ROAD', 1, { recoveryTier: 6 }),
];

DESTINATIONS.push(
  destination('bogota-wholesale', 'Bogotá Central Produce Market', 38, 2.0, 'DC', 0.08, 'Colombia', 'South America', 4.68, -74.08, 'ROAD', 1.4),
  destination('miami-distribution', 'Miami Produce Distribution Center', 33, 2.3, 'DC', 0.08, 'United States', 'North America', 25.8, -80.3, 'ROAD', 1.3),
  destination('nairobi-wholesale', 'Nairobi Fresh Produce Market', 21, 1.8, 'DC', 0.07, 'Kenya', 'Africa', -1.3, 36.9, 'ROAD', 1),
  destination('dubai-wholesale', 'Dubai Central Fruit & Vegetable Market', 35, 2.1, 'DC', 0.08, 'United Arab Emirates', 'Middle East', 25.14, 55.25, 'ROAD', 1.5),
  destination('lisbon-market', 'Lisbon Wholesale Market', 24, 1.9, 'DC', 0.08, 'Portugal', 'Europe', 38.76, -9.15, 'ROAD', 1),
  destination('paris-air-market', 'Paris Rungis Fresh Market', 28, 2.1, 'DC', 0.08, 'France', 'Europe', 48.75, 2.35, 'ROAD', 1.2),
  destination('amsterdam-market', 'Amsterdam Fresh Market', 18, 2.0, 'DC', 0.08, 'Netherlands', 'Europe', 52.31, 4.77, 'ROAD', 0.8),
  destination('mumbai-market', 'Mumbai Agricultural Produce Market', 24, 1.8, 'DC', 0.07, 'India', 'South Asia', 19.09, 72.87, 'ROAD', 1),
  destination('doha-crossdock', 'Doha Airport Produce Cross-dock', 14, 1.9, 'DC', 0.06, 'Qatar', 'Middle East', 25.26, 51.61, 'ROAD', 0.6),
  destination('bogota-air-wholesale', 'Bogotá Air-cargo Produce Terminal', 12, 2.2, 'RIPENING', 0.08, 'Colombia', 'South America', 4.71, -74.14, 'ROAD', 0.5, { ripeningCostPerKg: 0.14 }),
  destination('miami-air-wholesale', 'Miami Air-cargo Produce Terminal', 11, 2.35, 'RIPENING', 0.08, 'United States', 'North America', 25.79, -80.29, 'ROAD', 0.5, { ripeningCostPerKg: 0.15 }),
  destination('dubai-air-wholesale', 'Dubai Air-cargo Produce Terminal', 12, 2.15, 'RIPENING', 0.08, 'United Arab Emirates', 'Middle East', 25.25, 55.36, 'ROAD', 0.5, { ripeningCostPerKg: 0.15 }),
  destination('lisbon-air-wholesale', 'Lisbon Air-cargo Produce Terminal', 10, 2.05, 'RIPENING', 0.08, 'Portugal', 'Europe', 38.78, -9.14, 'ROAD', 0.5, { ripeningCostPerKg: 0.14 }),
  destination('paris-air-wholesale', 'Paris Air-cargo Produce Terminal', 12, 2.15, 'RIPENING', 0.08, 'France', 'Europe', 49.01, 2.55, 'ROAD', 0.5, { ripeningCostPerKg: 0.15 }),
  destination('doha-air-wholesale', 'Doha Air-cargo Produce Terminal', 13, 2.1, 'RIPENING', 0.08, 'Qatar', 'Middle East', 25.26, 51.61, 'ROAD', 0.5, { ripeningCostPerKg: 0.16 }),
);

const airDestinationRoutes: Array<{ destinationId: string; flightId: string; airportCode: string }> = [
  { destinationId: 'bogota-air-wholesale', flightId: 'sim-uio-bog', airportCode: 'BOG' },
  { destinationId: 'miami-air-wholesale', flightId: 'sim-uio-mia', airportCode: 'MIA' },
  { destinationId: 'dubai-air-wholesale', flightId: 'sim-bom-dxb', airportCode: 'DXB' },
  { destinationId: 'doha-air-wholesale', flightId: 'sim-bom-doh', airportCode: 'DOH' },
  { destinationId: 'dubai-air-wholesale', flightId: 'sim-nbo-dxb', airportCode: 'DXB' },
  { destinationId: 'doha-air-wholesale', flightId: 'sim-nbo-doh', airportCode: 'DOH' },
  { destinationId: 'miami-air-wholesale', flightId: 'sim-gru-mia', airportCode: 'MIA' },
  { destinationId: 'lisbon-air-wholesale', flightId: 'sim-gru-lis', airportCode: 'LIS' },
  { destinationId: 'miami-air-wholesale', flightId: 'sim-mex-mia', airportCode: 'MIA' },
  { destinationId: 'paris-air-wholesale', flightId: 'sim-mad-cdg', airportCode: 'CDG' },
  { destinationId: 'doha-air-wholesale', flightId: 'sim-mad-doh', airportCode: 'DOH' },
  { destinationId: 'paris-air-wholesale', flightId: 'sim-ams-cdg', airportCode: 'CDG' },
  { destinationId: 'doha-air-wholesale', flightId: 'sim-ams-doh', airportCode: 'DOH' },
  { destinationId: 'dubai-air-wholesale', flightId: 'sim-doh-dxb', airportCode: 'DXB' },
];
for (const route of airDestinationRoutes) {
  const flight = FLIGHTS.find((candidate) => candidate.id === route.flightId)!;
  const airDestination = DESTINATIONS.find((candidate) => candidate.id === route.destinationId)!;
  airDestination.flightId = route.flightId;
  airDestination.airportCode = route.airportCode;
  airDestination.distanceKm = flight.distanceKm;
  airDestination.transitHours = flight.durationHours + 1.5;
}

const localMarketPartners = [
  { code: 'UIO', country: 'Ecuador', region: 'South America', lat: -0.18, lng: -78.47, city: 'Quito', market: 'Quito Produce Terminal' },
  { code: 'NBO', country: 'Kenya', region: 'Africa', lat: -1.32, lng: 36.93, city: 'Nairobi', market: 'Nairobi Fresh Produce Market' },
  { code: 'BOM', country: 'India', region: 'South Asia', lat: 19.09, lng: 72.87, city: 'Mumbai', market: 'Mumbai Agricultural Produce Market' },
  { code: 'GRU', country: 'Brazil', region: 'South America', lat: -23.43, lng: -46.47, city: 'São Paulo', market: 'CEAGESP Produce Exchange' },
  { code: 'MEX', country: 'Mexico', region: 'North America', lat: 19.44, lng: -99.07, city: 'Mexico City', market: 'Central de Abasto' },
  { code: 'BOG', country: 'Colombia', region: 'South America', lat: 4.71, lng: -74.07, city: 'Bogotá', market: 'Bogotá Central Produce Market' },
  { code: 'MIA', country: 'United States', region: 'North America', lat: 25.79, lng: -80.29, city: 'Miami', market: 'Miami Produce Distribution Center' },
  { code: 'LIS', country: 'Portugal', region: 'Europe', lat: 38.76, lng: -9.15, city: 'Lisbon', market: 'Lisbon Wholesale Market' },
  { code: 'CDG', country: 'France', region: 'Europe', lat: 49.01, lng: 2.55, city: 'Paris', market: 'Paris Rungis Fresh Market' },
  { code: 'DXB', country: 'United Arab Emirates', region: 'Middle East', lat: 25.25, lng: 55.36, city: 'Dubai', market: 'Dubai Central Fruit & Vegetable Market' },
  { code: 'MAD', country: 'Spain', region: 'Europe', lat: 40.47, lng: -3.56, city: 'Madrid', market: 'Mercamadrid' },
  { code: 'AMS', country: 'Netherlands', region: 'Europe', lat: 52.31, lng: 4.77, city: 'Amsterdam', market: 'Amsterdam Fresh Market' },
  { code: 'DOH', country: 'Qatar', region: 'Middle East', lat: 25.26, lng: 51.61, city: 'Doha', market: 'Doha Wholesale Market' },
];

for (const partner of localMarketPartners) {
  const suffix = partner.code.toLowerCase();
  DESTINATIONS.push(
    destination(`market-${suffix}`, partner.market, 18, 1.7, 'LOCAL', 0.06, partner.country, partner.region, partner.lat + 0.025, partner.lng + 0.02, 'ROAD', 0.9),
    destination(`discount-${suffix}`, `${partner.city} Discount Produce Market`, 12, 0.7, 'DISCOUNT', 0.05, partner.country, partner.region, partner.lat - 0.018, partner.lng + 0.012, 'ROAD', 0.6),
    destination(`fridge-${suffix}`, `${partner.city} Community Food Network`, 9, 0, 'COMMUNITY', 0.03, partner.country, partner.region, partner.lat + 0.01, partner.lng - 0.018, 'ROAD', 0.5),
    destination(`bank-${suffix}`, `${partner.country} Food Recovery Partner`, 16, 0, 'FOOD_BANK', 0.03, partner.country, partner.region, partner.lat - 0.02, partner.lng - 0.015, 'ROAD', 0.8, { recoveryTier: 1 }),
    destination(`feed-${suffix}`, `${partner.city} Licensed Feed Facility`, 25, 0.12, 'ANIMAL_FEED', 0.07, partner.country, partner.region, partner.lat + 0.04, partner.lng - 0.015, 'ROAD', 1.1, { recoveryTier: 2 }),
    destination(`industrial-${suffix}`, `${partner.city} Organics & Oils Recovery`, 27, 0.09, 'INDUSTRIAL', 0.08, partner.country, partner.region, partner.lat - 0.03, partner.lng + 0.025, 'ROAD', 1.2, { recoveryTier: 3 }),
    destination(`compost-${suffix}`, `${partner.city} Municipal Composting`, 21, 0.02, 'COMPOST', 0.04, partner.country, partner.region, partner.lat + 0.035, partner.lng + 0.03, 'ROAD', 1, { recoveryTier: 4 }),
    destination(`digestion-${suffix}`, `${partner.city} Anaerobic Digestion`, 29, 0.04, 'DIGESTION', 0.06, partner.country, partner.region, partner.lat - 0.035, partner.lng - 0.025, 'ROAD', 1.3, { recoveryTier: 5 }),
    destination(`landfill-${suffix}`, `${partner.city} Sanitary Landfill`, 24, 0, 'LANDFILL', 0.1, partner.country, partner.region, partner.lat + 0.045, partner.lng - 0.03, 'ROAD', 1.1, { recoveryTier: 6 }),
  );
}

const airportMarkets: Record<string, { country: string; region: string; lat: number; lng: number; price: number }> = {
  BOG: { country: 'Colombia', region: 'South America', lat: 4.71, lng: -74.14, price: 2.25 },
  MIA: { country: 'United States', region: 'North America', lat: 25.79, lng: -80.29, price: 3.15 },
  DXB: { country: 'United Arab Emirates', region: 'Middle East', lat: 25.25, lng: 55.36, price: 2.85 },
  DOH: { country: 'Qatar', region: 'Middle East', lat: 25.26, lng: 51.61, price: 2.65 },
  CDG: { country: 'France', region: 'Europe', lat: 49.01, lng: 2.55, price: 2.1 },
  LIS: { country: 'Portugal', region: 'Europe', lat: 38.78, lng: -9.14, price: 2.15 },
};
for (const flight of FLIGHTS) {
  const market = airportMarkets[flight.destinationAirportCode];
  if (!market) continue;
  DESTINATIONS.push(destination(
    `cargo-${flight.id}`,
    `${flight.destinationCity} Airport Cold-chain Terminal`,
    flight.distanceKm,
    market.price,
    'RIPENING',
    0.09,
    market.country,
    market.region,
    market.lat,
    market.lng,
    'AIR',
    flight.durationHours + 2,
    { airportCode: flight.destinationAirportCode, flightId: flight.id, ripeningCostPerKg: 0.16 },
  ));
}

export const CATEGORY_COLORS = { RAW: '#4ade80', EDIBLE: '#60a5fa', ALMOST_BAD: '#fb923c', EXPIRED: '#f87171' } as const;
export const CATEGORY_LABELS = { RAW: 'Raw / Unripe', EDIBLE: 'Edible / Ripe', ALMOST_BAD: 'Almost-Bad', EXPIRED: 'Expired' } as const;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function flightForRoute(originAirportCode: string, destination: Destination): FlightSchedule | undefined {
  if (!destination.flightId) return undefined;
  return FLIGHTS.find((flight) => flight.id === destination.flightId && flight.originAirportCode === originAirportCode);
}
