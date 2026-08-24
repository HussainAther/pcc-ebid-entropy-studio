import type { RuleCoordinate, RuleSpaceDefinition } from "../models/ruliology";

export function enumerateFiniteRuleSpace(ruleSpace: RuleSpaceDefinition): RuleCoordinate[] {
  if (!ruleSpace.enumerable) throw new Error(`${ruleSpace.id} is not declared enumerable.`);
  if (ruleSpace.dimensions.length !== 1) throw new Error("Generic finite enumeration currently supports exactly one dimension.");
  const dimension = ruleSpace.dimensions[0];
  if (dimension.kind !== "discrete" || dimension.min === undefined || dimension.max === undefined) {
    throw new Error("Enumerable rule spaces require a bounded discrete dimension.");
  }
  const step = dimension.step ?? 1;
  const rules: RuleCoordinate[] = [];
  for (let value = dimension.min; value <= dimension.max + Number.EPSILON; value += step) {
    rules.push({ ruleSpaceId: ruleSpace.id, ruleId: String(value), values: { [dimension.id]: value } });
  }
  if (ruleSpace.size !== undefined && rules.length !== ruleSpace.size) {
    throw new Error(`${ruleSpace.id} declared size ${ruleSpace.size} but enumerated ${rules.length}.`);
  }
  return rules;
}

export function normalizedRuleDistance(a: RuleCoordinate, b: RuleCoordinate, ruleSpace: RuleSpaceDefinition): number {
  if (a.ruleSpaceId !== b.ruleSpaceId || a.ruleSpaceId !== ruleSpace.id) throw new Error("Rules must belong to the same rule space.");
  let sumSquares = 0;
  let dimensions = 0;
  for (const dimension of ruleSpace.dimensions) {
    const av = a.values[dimension.id];
    const bv = b.values[dimension.id];
    if (typeof av !== "number" || typeof bv !== "number") continue;
    const range = dimension.max !== undefined && dimension.min !== undefined ? dimension.max - dimension.min : 1;
    const normalized = range > 0 ? (av - bv) / range : av - bv;
    sumSquares += normalized * normalized;
    dimensions += 1;
  }
  return dimensions ? Math.sqrt(sumSquares / dimensions) : Number.NaN;
}
