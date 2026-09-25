import type { Batch } from '../types';
import { clamp } from '../engine/products';

export function updateEnvironment(batch: Batch, random = Math.random, hour = new Date().getHours()): Pick<Batch, 'tempC' | 'humidity' | 'outsideTempC' | 'weatherHeatIndexC'> {
  const summerHeat = hour >= 10 && hour <= 17 ? 2 : 0;
  const outsideTempC = clamp(batch.outsideTempC + (random() - 0.5) * 1.4, 27, 45);
  const tempC = batch.refrigerationFailureTicks > 0
    ? Math.min(20, Math.max(12, batch.tempC) + 2)
    : clamp(batch.tempC + (random() - 0.5) * 0.55 + summerHeat * 0.12, batch.safeRange.minC - 1, 20);
  return {
    tempC,
    humidity: clamp(batch.humidity + (random() - 0.5) * 3, 35, 98),
    outsideTempC,
    weatherHeatIndexC: outsideTempC + 7 + (hour >= 10 && hour <= 17 ? 3 : 0),
  };
}
