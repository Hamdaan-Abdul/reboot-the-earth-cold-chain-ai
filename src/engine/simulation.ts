import type { AuditEvent, Batch } from '../types';
import { updateBatchCore } from './calculations';
import { DESTINATIONS } from './products';
import { sampleSensors } from '../sensors';

function appendLog(batch: Batch, message: string): Batch {
  return { ...batch, eventLog: [`${new Date().toLocaleTimeString()} · ${message}`, ...batch.eventLog].slice(0, 12) };
}

const categoryName = (category: Batch['category']) => ({
  RAW: 'Raw / Unripe',
  EDIBLE: 'Edible / Ripe',
  ALMOST_BAD: 'Almost-Bad',
  EXPIRED: 'Expired',
})[category];

function anomalyReason(batch: Batch): string | undefined {
  if (batch.tempC > batch.safeRange.maxC + 2) return 'temperature above safe range';
  if (batch.ethylenePpm > 1.2) return 'ethylene leak above 1.2 ppm';
  if (batch.timeOutOfRangeMin >= 20) return '20+ minutes cumulative out of range';
  if (batch.trafficDelayHours >= 6) return 'route delay threatens safe arrival';
  if (batch.olfactoryGasPpm >= 1.2) return 'spoilage gas detected';
  return undefined;
}

export function tickSimulation(batches: Batch[], at = new Date(), random = Math.random): { batches: Batch[]; events: AuditEvent[] } {
  const events: AuditEvent[] = [];
  const nextBatches = batches.map((original) => {
    const sampled = sampleSensors(original, at, random);
    const reason = anomalyReason(sampled);
    const calculated = updateBatchCore(sampled, reason ? 'shortest-positive' : 'long-range');
    let next = calculated;

    if (reason && original.anomalyReason !== reason) {
      next = appendLog({ ...next, status: 'ANOMALY_DETECTED', anomalyReason: reason }, `Safety alert: ${reason}. Freshness and route recommendation recalculated.`);
      events.push({ id: `${original.id}-${at.getTime()}-anomaly`, at: at.toLocaleTimeString(), batchId: original.id, message: `Safety alert · ${reason}`, kind: 'WARNING' });
    }

    const routeChanged = calculated.assignedDestination.id !== original.assignedDestination.id;
    const closer = calculated.assignedDestination.distanceKm < original.assignedDestination.distanceKm;
    if ((reason || routeChanged) && calculated.financialPass && calculated.assignedDestination.distanceKm <= calculated.rMaxKm && closer) {
      const savedKm = Math.max(0, original.assignedDestination.distanceKm - calculated.assignedDestination.distanceKm);
      next = appendLog({
        ...next,
        status: 'PENDING_APPROVAL',
        dispatchConfirmed: false,
      }, `Suggested route: ${calculated.assignedDestination.name} (${savedKm.toFixed(0)} km shorter). Waiting for operator review.`);
      events.push({ id: `${original.id}-${at.getTime()}-recommendation`, at: at.toLocaleTimeString(), batchId: original.id, message: `Route suggestion · ${calculated.assignedDestination.name} · operator review required`, kind: 'WARNING' });
    } else if (routeChanged) {
      const message = `Suggested route changed · ${original.assignedDestination.name} → ${calculated.assignedDestination.name}; operator review needed.`;
      next = appendLog({ ...next, status: 'PENDING_APPROVAL', dispatchConfirmed: false }, message);
      events.push({ id: `${original.id}-${at.getTime()}-route-action`, at: at.toLocaleTimeString(), batchId: original.id, message: `${message} Operator approval required.`, kind: 'WARNING' });
    } else if (original.anomalyReason && !reason) {
      next = appendLog({ ...next, status: original.dispatchConfirmed ? 'DISPATCH_CONFIRMED' : 'PENDING_APPROVAL', anomalyReason: undefined }, 'Safety alert cleared: readings are back within modeled limits.');
      events.push({ id: `${original.id}-${at.getTime()}-resolved`, at: at.toLocaleTimeString(), batchId: original.id, message: 'Safety alert cleared · readings back within modeled limits', kind: 'INFO' });
    }

    if (original.category !== next.category) {
      next = appendLog(next, `Freshness stage changed: ${categoryName(original.category)} → ${categoryName(next.category)}.`);
      events.push({ id: `${original.id}-${at.getTime()}-stage`, at: at.toLocaleTimeString(), batchId: original.id, message: `Freshness stage · ${categoryName(original.category)} → ${categoryName(next.category)}`, kind: next.category === 'EXPIRED' ? 'CRITICAL' : 'INFO' });
    }
    const flightStatus = next.flightStatus;
    if (original.flightStatus !== flightStatus && flightStatus) {
      const message = flightStatus === 'IN_TRANSIT'
        ? `Simulation: ${next.flight?.flightNumber} is now in transit ${next.flight?.originAirportCode} → ${next.flight?.destinationAirportCode}; modeled duration ${next.flight?.durationHours.toFixed(1)} h.`
        : flightStatus === 'ARRIVED'
          ? `Simulation: ${next.flight?.flightNumber} arrived at ${next.flight?.destinationAirportCode}; modeled handoff to ${next.assignedDestination.name}.`
          : `Simulated flight status: ${next.flight?.flightNumber} ${flightStatus.toLowerCase().replace('_', ' ')}.`;
      next = appendLog(next, message);
      events.push({
        id: `${original.id}-${at.getTime()}-flight-${flightStatus.toLowerCase()}`,
        at: at.toLocaleTimeString(),
        batchId: original.id,
        message,
        kind: flightStatus === 'ARRIVED' ? 'SUCCESS' : 'INFO',
      });
    }
    return next;
  });
  return { batches: nextBatches, events };
}

function simulateAction(batch: Batch, message: string, update: (batch: Batch) => Batch): Batch {
  return updateBatchCore(appendLog(update(batch), message));
}

export function triggerRefrigerationFailure(batch: Batch): Batch {
  return simulateAction(batch, 'Refrigeration failure: temperature ramp armed from 12°C to 20°C over four sensor ticks.', (current) => ({
    ...current,
    tempC: 12,
    refrigerationFailureTicks: 4,
  }));
}

export function triggerEthyleneSpike(batch: Batch): Batch {
  return simulateAction(batch, 'Ethylene spike injected; concentration now above 1.2 ppm.', (current) => ({
    ...current,
    ethylenePpm: Math.max(1.35, current.ethylenePpm + 1.1),
  }));
}

export function triggerTrafficDelay(batch: Batch): Batch {
  return simulateAction(batch, 'Traffic disruption added 12 hours to ETA; route financial checks refreshed.', (current) => ({
    ...current,
    trafficDelayHours: current.trafficDelayHours + 12,
  }));
}

export function confirmDispatch(batch: Batch, operatorName = 'Local operator'): Batch {
  const routed = updateBatchCore(batch);
  const approved: Batch = {
    ...routed,
    dispatchConfirmed: true,
    status: 'DISPATCH_CONFIRMED',
    flightStatus: routed.flight ? 'BOARDING' : undefined,
    flightHoursUntilDeparture: routed.flight ? 0.25 : undefined,
    lastAction: routed.flight ? `Route approved in demo · ${routed.flight.flightNumber}` : 'Local route approved in demo',
    lastActionReason: `${operatorName} approved the simulated recommendation for ${routed.assignedDestination.name}, ${routed.assignedDestination.country}. No real booking or dispatch was made.`,
  };
  return appendLog(approved, `Simulated route approved by ${operatorName}: ${routed.assignedDestination.name}. No real dispatch.`);
}

export { DESTINATIONS };
