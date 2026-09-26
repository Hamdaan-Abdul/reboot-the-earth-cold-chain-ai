import type { Batch, Category, Destination } from '../types';
import { clamp, CATEGORY_LABELS, DESTINATIONS, flightForRoute, PRODUCTS } from './products';

export function computeDSL(batch: Pick<Batch, 'baselineDays' | 'tempC' | 'optimalMaxTempC' | 'ethylenePpm' | 'climacteric'>): number {
  const thermalPenalty = Math.max(0, batch.tempC - batch.optimalMaxTempC) * 0.12;
  const ethylenePenalty = batch.climacteric && batch.ethylenePpm > 0.5 ? batch.ethylenePpm * 0.25 : 0;
  return clamp(batch.baselineDays * (1 - (thermalPenalty + ethylenePenalty)), 0, batch.baselineDays);
}

export function computeRemainingDSL(batch: Pick<Batch, 'baselineDays' | 'tempC' | 'optimalMaxTempC' | 'ethylenePpm' | 'climacteric' | 'ageDays'>): number {
  return clamp(computeDSL(batch) - batch.ageDays, 0, batch.baselineDays);
}

export function computeRMax(batch: Pick<Batch, 'dslDays' | 'averageTransitSpeedKmPerDay'>): number {
  return Math.max(0, (batch.dslDays - 1) * batch.averageTransitSpeedKmPerDay);
}

export function computeProbabilitySafeArrival(
  batch: Pick<Batch, 'timeOutOfRangeMin' | 'baselineDays' | 'trafficDelayHours' | 'dslDays' | 'originAirportCode'>,
  destination?: Destination,
): number {
  const exposureScaleMinutes = Math.max(60, batch.baselineDays * 24 * 60 * 0.25);
  const totalExposure = Math.max(0, batch.timeOutOfRangeMin) + Math.max(0, batch.trafficDelayHours) * 60;
  const exposureProbability = Math.exp(-(totalExposure / exposureScaleMinutes));
  const remainingFreshness = destination
    ? clamp((batch.dslDays - destination.transitHours / 24) / Math.max(0.5, batch.dslDays), 0, 1)
    : 1;
  const onTimeProbability = destination?.flightId ? flightForRoute(batch.originAirportCode, destination)?.onTimeProbability ?? 0.9 : 1;
  return clamp(exposureProbability * remainingFreshness * onTimeProbability, 0, 1);
}

export function financialCheck(
  batch: Pick<Batch, 'weightKg' | 'timeOutOfRangeMin' | 'baselineDays' | 'trafficDelayHours' | 'dslDays' | 'originAirportCode'>,
  destination: Destination,
): { expectedRecoveryValue: number; probability: number; cost: number } {
  const flight = flightForRoute(batch.originAirportCode, destination);
  const probability = computeProbabilitySafeArrival(batch, destination);
  const transportCost = destination.distanceKm * (destination.routeMode === 'AIR' ? 0.08 : destination.routeMode === 'SEA' ? 0.025 : 0.8)
    + batch.weightKg * (destination.handlingCostPerKg + (destination.ripeningCostPerKg ?? 0) + (flight?.cargoRatePerKg ?? 0));
  const revenue = destination.pricePerKg * batch.weightKg * probability;
  return { expectedRecoveryValue: revenue - transportCost, probability, cost: transportCost };
}

export function classifyByDSL(dsl: number): Category {
  if (dsl <= 0.5) return 'EXPIRED';
  if (dsl <= 2) return 'ALMOST_BAD';
  if (dsl <= 6) return 'EDIBLE';
  return 'RAW';
}

export function routeDistanceKm(batch: Pick<Batch, 'lat' | 'lng' | 'originAirportCode'>, destination: Destination): number {
  const flight = flightForRoute(batch.originAirportCode, destination);
  if (flight) return flight.distanceKm;
  if (destination.routeMode === 'SEA') return destination.distanceKm;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = radians(batch.lat);
  const lat2 = radians(destination.lat);
  const dLat = lat2 - lat1;
  const dLng = radians(destination.lng - batch.lng);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, 2 * 6371 * Math.asin(Math.sqrt(haversine)) * 1.25);
}

function candidatesFor(batch: Batch): Destination[] {
  const localDestinations = DESTINATIONS.filter((destination) => destination.country === batch.originCountry);
  if (batch.contaminated) return localDestinations.filter((destination) => destination.type === 'LANDFILL');
  switch (batch.category) {
    case 'RAW':
      if (batch.foodGroup === 'FRUIT' || batch.foodGroup === 'VEGETABLE') {
        return DESTINATIONS.filter((destination) => (destination.type === 'RIPENING' || destination.type === 'EXPORT')
          && (destination.routeMode !== 'AIR' || flightForRoute(batch.originAirportCode, destination) !== undefined));
      }
      return localDestinations.filter((destination) => ['DC', 'RETAIL', 'LOCAL'].includes(destination.type)
        && destination.distanceKm <= 1400
        && (destination.routeMode !== 'AIR' || flightForRoute(batch.originAirportCode, destination) !== undefined));
    case 'EDIBLE':
      return localDestinations.filter((destination) => ['DC', 'RETAIL', 'LOCAL'].includes(destination.type) && destination.distanceKm <= 1400
        && (destination.routeMode !== 'AIR' || flightForRoute(batch.originAirportCode, destination) !== undefined));
    case 'ALMOST_BAD':
      return localDestinations.filter((destination) => ['LOCAL', 'DISCOUNT', 'COMMUNITY', 'FOOD_BANK'].includes(destination.type) && destination.distanceKm <= 150);
    case 'EXPIRED':
      return localDestinations.filter((destination) => destination.recoveryTier !== undefined);
  }
}

function destinationForBatch(batch: Batch, destination: Destination): Destination {
  if (batch.category === 'ALMOST_BAD' && ['LOCAL', 'DISCOUNT'].includes(destination.type)) {
    const marketPrice = batch.priceBasePerKg || PRODUCTS[batch.productKey]?.priceBasePerKg || destination.pricePerKg;
    return { ...destination, pricePerKg: marketPrice * 0.5 };
  }
  return destination;
}

export function selectDestination(batch: Batch, objective: 'long-range' | 'shortest-positive' = 'long-range'): Destination {
  if (batch.contaminated) return candidatesFor(batch)[0] ?? DESTINATIONS.find((destination) => destination.type === 'LANDFILL')!;
  if (batch.category === 'ALMOST_BAD'
    && batch.demandProbability < 0.45
    && computeProbabilitySafeArrival(batch) > 0.6) {
    return candidatesFor(batch).find((destination) => destination.type === 'FOOD_BANK')
      ?? DESTINATIONS.find((destination) => destination.type === 'FOOD_BANK')!;
  }
  const eligible = candidatesFor(batch)
    .map((destination) => ({ ...destination, distanceKm: routeDistanceKm(batch, destination) }))
    .filter((destination) => batch.category === 'EXPIRED'
      ? destination.distanceKm <= 35
      : destination.distanceKm <= batch.rMaxKm)
    .filter((destination) => {
      const flight = flightForRoute(batch.originAirportCode, destination);
      return !destination.flightId || (flight !== undefined && flight.cargoCapacityKg - flight.cargoBookedKg >= batch.weightKg);
    })
    .filter((destination) => {
      if (batch.category === 'RAW' && destination.type === 'EXPORT') {
        const flight = flightForRoute(batch.originAirportCode, destination);
        return !!flight && destination.pricePerKg > flight.cargoRatePerKg + (destination.ripeningCostPerKg ?? 0);
      }
      return true;
    })
    .map((destination) => destinationForBatch(batch, destination))
    .map((destination) => ({ destination, finance: financialCheck(batch, destination) }))
    .sort((a, b) => {
      if (batch.category === 'EXPIRED') return (a.destination.recoveryTier ?? 99) - (b.destination.recoveryTier ?? 99);
      if (batch.category === 'ALMOST_BAD' && a.destination.pricePerKg !== b.destination.pricePerKg) return b.destination.pricePerKg - a.destination.pricePerKg;
      if (batch.category === 'RAW') {
        return objective === 'long-range'
          ? b.destination.distanceKm - a.destination.distanceKm
          : a.destination.distanceKm - b.destination.distanceKm;
      }
      return a.destination.distanceKm - b.destination.distanceKm;
    });
  if (batch.category === 'EXPIRED') return eligible[0]?.destination ?? DESTINATIONS.find((destination) => destination.type === 'LANDFILL')!;
  const candidates = eligible.filter(({ finance }) => finance.expectedRecoveryValue > 0);
  if (candidates.length) return candidates[0].destination;
  const localFallback = (batch.category === 'EDIBLE' || batch.category === 'RAW')
    ? DESTINATIONS.filter((destination) => destination.country === batch.originCountry
      && ['DC', 'RETAIL', 'LOCAL', 'DISCOUNT', 'COMMUNITY', 'FOOD_BANK'].includes(destination.type))
      .map((destination) => ({ ...destination, distanceKm: routeDistanceKm(batch, destination) }))
      .filter((destination) => destination.distanceKm <= batch.rMaxKm)
      .map((destination) => destinationForBatch({ ...batch, category: 'ALMOST_BAD' }, destination))
      .map((destination) => ({ destination, finance: financialCheck(batch, destination) }))
      .sort((a, b) => {
        const aPositive = a.finance.expectedRecoveryValue > 0;
        const bPositive = b.finance.expectedRecoveryValue > 0;
        if (aPositive !== bPositive) return aPositive ? -1 : 1;
        return a.destination.distanceKm - b.destination.distanceKm;
      })[0]?.destination
    : undefined;
  if (localFallback) return localFallback;
  const selected = batch.category === 'ALMOST_BAD'
    ? eligible.find(({ destination }) => destination.type === 'COMMUNITY' || destination.type === 'FOOD_BANK')
    : undefined;
  const fallback = selected ?? eligible[0];
  return fallback?.destination ?? DESTINATIONS.find((destination) => destination.type === 'FOOD_BANK' && destination.country === batch.originCountry)
    ?? DESTINATIONS.find((destination) => destination.type === 'LANDFILL' && destination.country === batch.originCountry)
    ?? DESTINATIONS.find((destination) => destination.type === 'FOOD_BANK')!;
}

export function operatorRouteOptions(batch: Batch): Destination[] {
  return candidatesFor(batch)
    .map((destination) => ({ ...destination, distanceKm: routeDistanceKm(batch, destination) }))
    .filter((destination) => batch.category === 'EXPIRED'
      ? destination.distanceKm <= 35
      : destination.distanceKm <= batch.rMaxKm)
    .filter((destination) => {
      const flight = flightForRoute(batch.originAirportCode, destination);
      return !destination.flightId || Boolean(flight && flight.cargoCapacityKg - flight.cargoBookedKg >= batch.weightKg);
    })
    .filter((destination) => {
      if (batch.category === 'RAW' && destination.type === 'EXPORT') {
        const flight = flightForRoute(batch.originAirportCode, destination);
        return Boolean(flight && destination.pricePerKg > flight.cargoRatePerKg + (destination.ripeningCostPerKg ?? 0));
      }
      return true;
    })
    .map((destination) => destinationForBatch(batch, destination))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function updateBatchCore(
  batch: Batch,
  objective: 'long-range' | 'shortest-positive' = 'long-range',
  destinationOverride?: Destination,
): Batch {
  const next = { ...batch };
  next.dslDays = computeRemainingDSL(next);
  next.category = classifyByDSL(next.dslDays);
  next.contaminated = next.contaminated || next.olfactoryGasPpm >= 1.2;
  next.rMaxKm = computeRMax(next);
  const previousDestinationId = next.assignedDestination.id;
  next.assignedDestination = next.flightStatus === 'IN_TRANSIT' && next.flight
    ? next.assignedDestination
    : destinationOverride ?? selectDestination(next, objective);
  const routeChanged = next.assignedDestination.id !== previousDestinationId;
  if (routeChanged && next.dispatchConfirmed) {
    next.dispatchConfirmed = false;
    next.status = 'PENDING_APPROVAL';
  }
  next.flight = flightForRoute(next.originAirportCode, next.assignedDestination);
  if (routeChanged || next.flight?.id !== batch.flight?.id) {
    next.flightStatus = next.flight ? 'SCHEDULED' : undefined;
    next.flightHoursUntilDeparture = next.flight ? 0.5 : undefined;
    next.flightHoursRemaining = next.flight?.durationHours;
    next.flightOriginLat = next.flight ? next.lat : undefined;
    next.flightOriginLng = next.flight ? next.lng : undefined;
    if (routeChanged && !next.dispatchConfirmed) next.status = 'PENDING_APPROVAL';
  }
  const finance = financialCheck(next, next.assignedDestination);
  next.probabilitySafeArrival = finance.probability;
  next.expectedRecoveryValue = finance.expectedRecoveryValue;
  next.financialPass = finance.expectedRecoveryValue > 0;
  const workflowStages: Record<Category, Batch['workflowStage']> = {
    RAW: 'INPUT',
    EDIBLE: 'CATEGORIZING',
    ALMOST_BAD: 'DISTRIBUTION',
    EXPIRED: 'OUTPUT',
  };
  next.workflowStage = workflowStages[next.category];
  if (next.contaminated) {
    next.lastAction = 'Hold distribution and check safety';
    next.lastActionReason = 'A spoilage-gas reading is above the model threshold. Keep this lot out of distribution until a qualified person checks it.';
  } else if (next.category === 'EXPIRED') {
    next.lastAction = 'Check safe recovery options';
    next.lastActionReason = `Estimated freshness is exhausted. If a food-safety check confirms this lot is safe, consider ${next.assignedDestination.name} under the recovery order.`;
  } else if (next.flight) {
    next.lastAction = 'Review suggested cargo route';
    next.lastActionReason = `The model suggests ${next.assignedDestination.name}, ${next.assignedDestination.country}. Estimated freshness of ${next.dslDays.toFixed(1)} days may cover the route. Check the sample ${next.flight.flightNumber} schedule, handling needs, and availability before deciding.`;
  } else if (['LOCAL', 'DISCOUNT', 'COMMUNITY', 'FOOD_BANK'].includes(next.assignedDestination.type)
    && next.category === 'EDIBLE') {
    next.lastAction = `Review local delivery to ${next.assignedDestination.name}`;
    next.lastActionReason = `A longer route did not meet the model's value check. This nearby option is within the estimated freshness window; confirm quality and availability first.`;
  } else if (next.category === 'ALMOST_BAD') {
    next.lastAction = next.assignedDestination.type === 'FOOD_BANK' || next.assignedDestination.type === 'COMMUNITY' ? `Offer to ${next.assignedDestination.name}` : `Offer locally through ${next.assignedDestination.name}`;
    next.lastActionReason = `This lot is estimated to have ${next.dslDays.toFixed(1)} safe days left. A nearby, discounted or donation route is suggested; check quality and partner availability first.`;
  } else {
    next.lastAction = `Review delivery to ${next.assignedDestination.name}`;
    next.lastActionReason = `${CATEGORY_LABELS[next.category]} is estimated to have ${next.dslDays.toFixed(1)} days of freshness. This route fits the model's travel and value checks; verify the details before arranging delivery.`;
  }
  return next;
}

export function getCategoryDescription(category: Category): string {
  return ({
    RAW: '10–21+ days · protect from chilling and premature ripening',
    EDIBLE: '3–6 days · distribution center or retail',
    ALMOST_BAD: '1–2 safe days · local-only, 30–70% discount or donation',
    EXPIRED: 'Recovery hierarchy; landfill only when contaminated',
  })[category];
}
