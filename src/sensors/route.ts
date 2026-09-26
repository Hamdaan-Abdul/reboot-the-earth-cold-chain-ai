import type { Batch, FlightStatus } from '../types';
import { clamp } from '../engine/products';

export function updateRouteSignals(batch: Batch, random = Math.random): Pick<Batch,
  'trafficDelayHours' | 'demandProbability' | 'flightHoursUntilDeparture' | 'flightHoursRemaining' | 'flightStatus'> {
  const minutesPerTick = 2.5;
  const departureHours = batch.dispatchConfirmed
    ? Math.max(0, (batch.flightHoursUntilDeparture ?? 0) - minutesPerTick / 60)
    : batch.flightHoursUntilDeparture;
  const flightHoursRemaining = batch.dispatchConfirmed && batch.flightStatus === 'IN_TRANSIT'
    ? Math.max(0, (batch.flightHoursRemaining ?? 0) - minutesPerTick / 60)
    : batch.flightHoursRemaining;
  const flightStatus: FlightStatus | undefined = !batch.flight ? undefined
    : !batch.dispatchConfirmed ? batch.flightStatus ?? 'SCHEDULED'
    : batch.flightStatus === 'ARRIVED' ? 'ARRIVED'
      : flightHoursRemaining === 0 && batch.flightStatus === 'IN_TRANSIT' ? 'ARRIVED'
        : batch.flightStatus === 'IN_TRANSIT' ? 'IN_TRANSIT'
          : batch.dispatchConfirmed && departureHours === 0 ? 'IN_TRANSIT'
            : departureHours !== undefined && departureHours <= 0.25 ? 'BOARDING' : 'SCHEDULED';
  return {
    trafficDelayHours: Math.max(0, batch.trafficDelayHours - 0.015),
    demandProbability: clamp(batch.demandProbability + (random() - 0.5) * 0.06, 0.25, 0.98),
    flightHoursUntilDeparture: batch.flight ? departureHours : undefined,
    flightHoursRemaining,
    flightStatus,
  };
}
