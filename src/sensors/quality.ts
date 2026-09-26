import type { Batch } from '../types';
import { clamp } from '../engine/products';

export function updateVision(batch: Batch, random = Math.random): Pick<Batch, 'visionRipeness' | 'visionBlemish'> {
  const ripeningBoost = batch.tempC > batch.safeRange.maxC || batch.ethylenePpm > 0.5 ? 0.012 : 0.002;
  return {
    visionRipeness: clamp(batch.visionRipeness + random() * ripeningBoost, 0, 1),
    visionBlemish: clamp(batch.visionBlemish + (random() > 0.92 ? 0.01 : 0), 0, 1),
  };
}

export function updateOlfactory(batch: Batch, random = Math.random, tickMinutes = 2.5): Pick<Batch, 'olfactoryGasPpm'> {
  const gasRatePerDay = batch.ageDays > batch.baselineDays * 0.75 ? 0.5 : 0.06;
  return { olfactoryGasPpm: clamp(batch.olfactoryGasPpm + random() * gasRatePerDay * tickMinutes / (60 * 24), 0, 2.5) };
}
