import type { RulialProfile, RulialTransition } from "../models/ruliology";

function featureMap(profile: RulialProfile) {
  return new Map(profile.features.map(feature => [feature.observableId, feature.value]));
}

export function observableDistance(a: RulialProfile, b: RulialProfile): number {
  const left = featureMap(a);
  const right = featureMap(b);
  const shared = [...left.keys()].filter(key => right.has(key));
  if (!shared.length) return Number.NaN;
  const sumSquares = shared.reduce((sum, key) => {
    const delta = (left.get(key) ?? 0) - (right.get(key) ?? 0);
    return sum + delta * delta;
  }, 0);
  return Math.sqrt(sumSquares / shared.length);
}

export function equivalenceComponents(profiles: RulialProfile[], epsilon: number): string[][] {
  const remaining = new Set(profiles.map(profile => profile.rule.ruleId));
  const byId = new Map(profiles.map(profile => [profile.rule.ruleId, profile]));
  const components: string[][] = [];
  while (remaining.size) {
    const seed = remaining.values().next().value as string;
    const queue = [seed];
    const component: string[] = [];
    remaining.delete(seed);
    while (queue.length) {
      const currentId = queue.shift() as string;
      component.push(currentId);
      const current = byId.get(currentId);
      if (!current) continue;
      for (const candidateId of [...remaining]) {
        const candidate = byId.get(candidateId);
        if (candidate && observableDistance(current, candidate) <= epsilon) {
          remaining.delete(candidateId);
          queue.push(candidateId);
        }
      }
    }
    components.push(component.sort());
  }
  return components;
}

export function detectHighSensitivityTransitions(transitions: RulialTransition[], ratioThreshold = 10): RulialTransition[] {
  return transitions.filter(transition => {
    if (!Number.isFinite(transition.observableDistance) || transition.syntacticDistance <= 0) return false;
    return transition.observableDistance / transition.syntacticDistance >= ratioThreshold;
  });
}
