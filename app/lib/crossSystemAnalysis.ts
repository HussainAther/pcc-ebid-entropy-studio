import type { RulialProfile } from "../models/ruliology";

export interface CrossSystemFeatureSummary {
  observableId: string;
  systems: Array<{ ruleSpaceId: string; mean: number; min: number; max: number; count: number }>;
}

export function summarizeSharedObservables(profiles: RulialProfile[]): CrossSystemFeatureSummary[] {
  const values = new Map<string, Map<string, number[]>>();
  for (const profile of profiles) {
    for (const feature of profile.features) {
      const bySystem = values.get(feature.observableId) ?? new Map<string, number[]>();
      const bucket = bySystem.get(profile.rule.ruleSpaceId) ?? [];
      bucket.push(feature.value);
      bySystem.set(profile.rule.ruleSpaceId, bucket);
      values.set(feature.observableId, bySystem);
    }
  }
  return [...values.entries()]
    .filter(([, bySystem]) => bySystem.size > 1)
    .map(([observableId, bySystem]) => ({
      observableId,
      systems: [...bySystem.entries()].map(([ruleSpaceId, samples]) => ({
        ruleSpaceId,
        mean: samples.reduce((a, b) => a + b, 0) / samples.length,
        min: Math.min(...samples),
        max: Math.max(...samples),
        count: samples.length,
      })),
    }));
}
