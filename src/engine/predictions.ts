import type { FoodGroup } from '../types';

export type RouteLearningRecord = {
  routeKey: string;
  routeName: string;
  foodGroup: FoodGroup;
  sampleCount: number;
  averageTempRiseC: number;
  maxTempRiseC: number;
  lastObservedAt: string;
  lastBatchId: string;
};

export type RouteTemperatureObservation = {
  routeKey: string;
  routeName: string;
  foodGroup: FoodGroup;
  temperatureRiseC: number;
  observedAt: string;
  batchId: string;
};

export function learnRouteTemperature(
  records: RouteLearningRecord[],
  observation: RouteTemperatureObservation,
): RouteLearningRecord[] {
  if (!Number.isFinite(observation.temperatureRiseC)) return records;
  const previous = records.find((record) => record.routeKey === observation.routeKey && record.foodGroup === observation.foodGroup);
  const nextRecord: RouteLearningRecord = previous
    ? {
      ...previous,
      routeName: observation.routeName,
      sampleCount: previous.sampleCount + 1,
      averageTempRiseC: (previous.averageTempRiseC * previous.sampleCount + observation.temperatureRiseC) / (previous.sampleCount + 1),
      maxTempRiseC: Math.max(previous.maxTempRiseC, observation.temperatureRiseC),
      lastObservedAt: observation.observedAt,
      lastBatchId: observation.batchId,
    }
    : {
      routeKey: observation.routeKey,
      routeName: observation.routeName,
      foodGroup: observation.foodGroup,
      sampleCount: 1,
      averageTempRiseC: observation.temperatureRiseC,
      maxTempRiseC: observation.temperatureRiseC,
      lastObservedAt: observation.observedAt,
      lastBatchId: observation.batchId,
    };
  return [nextRecord, ...records.filter((record) => record !== previous)].slice(0, 100);
}

export function recommendPreCoolingTarget(
  safeRange: { minC: number; maxC: number },
  optimalMaxTempC: number,
  record: RouteLearningRecord,
): number {
  const learnedBuffer = Math.max(0, record.averageTempRiseC);
  return Math.max(safeRange.minC, Math.min(optimalMaxTempC, safeRange.maxC - learnedBuffer));
}
