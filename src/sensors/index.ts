import type { Batch, SensorReading } from '../types';
import { updateEnvironment } from './environment';
import { updateEthylene } from './ethylene';
import { updateExposure } from './exposure';
import { updateGps } from './gps';
import { updateOlfactory, updateVision } from './quality';
import { updateRouteSignals } from './route';

export function sampleSensors(batch: Batch, at = new Date(), random = Math.random, hour = at.getHours()): Batch {
  const sampled = {
    ...batch,
    ...updateEnvironment(batch, random, hour),
    ...updateGps(batch, random),
    ...updateEthylene(batch, random),
    ...updateRouteSignals(batch, random),
    ...updateVision(batch, random),
    ...updateOlfactory(batch, random),
  };
  const exposure = updateExposure(sampled);
  const next = {
    ...sampled,
    ...exposure,
    refrigerationFailureTicks: Math.max(0, batch.refrigerationFailureTicks - 1),
  };
  const reading: SensorReading = {
    time: at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    tempC: next.tempC,
    humidity: next.humidity,
    ethylenePpm: next.ethylenePpm,
    speedKmph: next.speedKmph,
  };
  return { ...next, history: [...batch.history, reading].slice(-24) };
}
