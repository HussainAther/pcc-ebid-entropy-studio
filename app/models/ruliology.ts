export type EntityId = string;

export type RuleSpaceRepresentation = "finite" | "parameterized" | "programmatic";
export type RuleDimensionKind = "discrete" | "continuous" | "categorical";

export interface RuleDimension {
  id: EntityId;
  name: string;
  symbol: string;
  kind: RuleDimensionKind;
  description: string;
  min?: number;
  max?: number;
  step?: number;
  values?: Array<number | string>;
}

export interface RuleSpaceDefinition {
  id: EntityId;
  name: string;
  engineId: EntityId;
  representation: RuleSpaceRepresentation;
  description: string;
  dimensions: RuleDimension[];
  enumerable: boolean;
  size?: number;
  stateSpace: string;
  transitionDescription: string;
  observableIds: EntityId[];
  canonicalization?: string;
  tags: string[];
  projectId: EntityId;
}

export interface RuleCoordinate {
  ruleSpaceId: EntityId;
  ruleId: string;
  values: Record<string, number | string | boolean>;
}

export interface ObserverDefinition {
  id: EntityId;
  name: string;
  description: string;
  observableIds: EntityId[];
  coarseGraining: string;
  temporalResolution: string;
  spatialResolution: string;
  projectId: EntityId;
}

export interface RulialFeature {
  observableId: EntityId;
  value: number;
}

export interface RulialProfile {
  rule: RuleCoordinate;
  observerId: EntityId;
  features: RulialFeature[];
  sampleCount: number;
  seedCount: number;
  notes: string[];
}

export interface RuleEquivalenceClass {
  id: EntityId;
  ruleSpaceId: EntityId;
  observerId: EntityId;
  memberRuleIds: string[];
  criterion: string;
  epsilon: number;
}

export interface RulialTransition {
  ruleSpaceId: EntityId;
  fromRuleId: string;
  toRuleId: string;
  syntacticDistance: number;
  observableDistance: number;
  observerId: EntityId;
}
