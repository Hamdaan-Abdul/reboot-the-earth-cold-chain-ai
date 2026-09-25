import type { Batch } from '../types';

export function updateExposure(batch: Batch, tickMinutes = 2.5): Pick<Batch, 'timeOutOfRangeMin' | 'ageDays'> {
  const outsideRange = batch.tempC < batch.safeRange.minC || batch.tempC > batch.safeRange.maxC;
  return {
    timeOutOfRangeMin: Math.max(0, batch.timeOutOfRangeMin + (outsideRange ? tickMinutes : -tickMinutes * 0.4)),
    ageDays: batch.ageDays + tickMinutes / (60 * 24),
  };
}
