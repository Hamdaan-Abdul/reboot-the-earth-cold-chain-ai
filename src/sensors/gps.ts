import type { Batch } from '../types';
import { clamp } from '../engine/products';

export function updateGps(batch: Batch, random = Math.random): Pick<Batch, 'lat' | 'lng' | 'speedKmph'> {
  const speedKmph = clamp(batch.speedKmph + (random() - 0.5) * 8, 8, 90);
  if (batch.flight && (batch.flightStatus === 'IN_TRANSIT' || batch.flightStatus === 'ARRIVED')) {
    const progress = batch.flightStatus === 'ARRIVED'
      ? 1
      : clamp(1 - (batch.flightHoursRemaining ?? batch.flight.durationHours) / batch.flight.durationHours, 0, 1);
    return {
      speedKmph,
      lat: (batch.flightOriginLat ?? batch.lat) + (batch.assignedDestination.lat - (batch.flightOriginLat ?? batch.lat)) * progress,
      lng: (batch.flightOriginLng ?? batch.lng) + (batch.assignedDestination.lng - (batch.flightOriginLng ?? batch.lng)) * progress,
    };
  }
  return {
    speedKmph,
    lat: clamp(batch.lat + (random() - 0.5) * 0.008, -55, 70),
    lng: clamp(batch.lng + (random() - 0.5) * 0.01, -180, 180),
  };
}
