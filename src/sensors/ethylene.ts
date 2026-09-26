import type { Batch } from '../types';
import { clamp } from '../engine/products';

export function updateEthylene(batch: Batch, random = Math.random): Pick<Batch, 'ethylenePpm'> {
  if (batch.refrigerationFailureTicks > 0 && batch.climacteric) return { ethylenePpm: clamp(batch.ethylenePpm + 0.12, 0, 3) };
  return { ethylenePpm: clamp(batch.ethylenePpm + (random() - 0.52) * 0.08, 0.02, 2.8) };
}
