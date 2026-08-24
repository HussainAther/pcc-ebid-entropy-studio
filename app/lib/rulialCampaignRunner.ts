import { observers, ruleSpaces } from "../data/ruleSpaces.ts";
import type { ObserverDefinition, RuleCoordinate, RulialFeature, RulialProfile, RulialTransition } from "../models/ruliology.ts";
import { binaryEntropy, binaryRunLengthCompressionRatio, ecaOneBitNeighbors, ecaRuleTableDistance, normalizedHamming, runElementaryCA, singleCellPerturbation } from "./elementaryCA.ts";
import { enumerateFiniteRuleSpace } from "./ruleSpaceExplorer.ts";
import { scaledObservableDistance } from "./rulialAnalysis.ts";

export const RULIAL_CAMPAIGN_SCHEMA_VERSION = "entropy-rulial-campaign-report/1.0.0" as const;
export const RULIAL_PROFILE_SCHEMA_VERSION = "entropy-rulial-profile/1.0.0" as const;
export const DEFAULT_ECA_SEEDS = [11, 29, 47, 83] as const;

export interface EcaRulialCampaignOptions {
  ruleIds?: number[];
  seeds?: number[];
  width?: number;
  steps?: number;
  density?: number;
  perturbationIndex?: number;
  observerId?: string;
  sourceRevision?: string;
  observableRegistryVersion?: string;
  createdAt?: string;
}

export interface EcaSeedRunSummary {
  ruleId: string;
  seed: number;
  width: number;
  steps: number;
  initialDensity: number;
  meanEntropy: number;
  terminalEntropy: number;
  meanHamming: number;
  terminalHamming: number;
  perturbationGrowth: number;
  autocorrelationTime: number;
  compressionRatio: number;
}

export interface RulialProfileArtifact extends RulialProfile {
  schemaVersion: typeof RULIAL_PROFILE_SCHEMA_VERSION;
  provenance: {
    sourceRevision: string;
    observableRegistryVersion: string;
    createdAt: string;
    engineId: string;
    campaignId: string;
  };
}

export interface EcaRulialCampaignReport {
  schemaVersion: typeof RULIAL_CAMPAIGN_SCHEMA_VERSION;
  campaignId: "CAMPAIGN-RUL-ECA-001";
  ruleSpaceId: "RSPACE-ECA-256";
  observerId: string;
  engineId: "ENGINE-LOCAL-ECA";
  createdAt: string;
  configuration: {
    seeds: number[];
    width: number;
    steps: number;
    density: number;
    perturbationIndex: number;
    boundary: "periodic";
    initialization: "seeded-bernoulli";
    perturbation: "single-cell-flip";
  };
  runs: EcaSeedRunSummary[];
  profiles: RulialProfileArtifact[];
  transitions: RulialTransition[];
  summary: {
    ruleCount: number;
    runCount: number;
    profileCount: number;
    transitionCount: number;
  };
  notes: string[];
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededBinaryInitialCondition(seed: number, width: number, density = 0.5): number[] {
  if (!Number.isInteger(seed)) throw new Error("seed must be an integer.");
  if (!Number.isInteger(width) || width < 3) throw new Error("width must be an integer >= 3.");
  if (!Number.isFinite(density) || density <= 0 || density >= 1) throw new Error("density must be strictly between 0 and 1.");
  const random = mulberry32(seed);
  return Array.from({ length: width }, () => random() < density ? 1 : 0);
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function slope(values: number[], start = 0, end = values.length): number {
  const segment = values.slice(start, end);
  if (segment.length < 2) return 0;
  const xMean = (segment.length - 1) / 2;
  const yMean = mean(segment);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < segment.length; index += 1) {
    const dx = index - xMean;
    numerator += dx * (segment[index] - yMean);
    denominator += dx * dx;
  }
  return denominator ? numerator / denominator : 0;
}

export function thresholdAutocorrelationTime(values: number[], maxLag = 64): number {
  if (values.length < 3) return 0;
  const average = mean(values);
  const centered = values.map(value => value - average);
  const variance = centered.reduce((sum, value) => sum + value * value, 0) / centered.length;
  if (variance <= Number.EPSILON) return 0;
  const limit = Math.min(maxLag, values.length - 1);
  const threshold = Math.exp(-1);
  for (let lag = 1; lag <= limit; lag += 1) {
    let covariance = 0;
    const count = values.length - lag;
    for (let index = 0; index < count; index += 1) covariance += centered[index] * centered[index + lag];
    const rho = covariance / count / variance;
    if (rho <= threshold) return lag;
  }
  return limit;
}

export function executeEcaSeedRun(rule: number, seed: number, width: number, steps: number, density = 0.5, perturbationIndex = Math.floor(width / 2)): EcaSeedRunSummary {
  const initial = seededBinaryInitialCondition(seed, width, density);
  const perturbedInitial = singleCellPerturbation(initial, perturbationIndex);
  const control = runElementaryCA(rule, initial, steps);
  const perturbed = runElementaryCA(rule, perturbedInitial, steps);
  const entropySeries = control.trajectory.map(binaryEntropy);
  const hammingSeries = control.trajectory.map((state, index) => normalizedHamming(state, perturbed.trajectory[index]));
  const tailStart = Math.floor(steps * 0.75);
  const growthEnd = Math.max(3, Math.floor(steps * 0.25));
  return {
    ruleId: String(rule),
    seed,
    width,
    steps,
    initialDensity: mean(initial),
    meanEntropy: mean(entropySeries.slice(tailStart)),
    terminalEntropy: entropySeries.at(-1) ?? 0,
    meanHamming: mean(hammingSeries.slice(tailStart)),
    terminalHamming: hammingSeries.at(-1) ?? 0,
    perturbationGrowth: slope(hammingSeries, 0, growthEnd),
    autocorrelationTime: thresholdAutocorrelationTime(entropySeries),
    compressionRatio: binaryRunLengthCompressionRatio(control.trajectory),
  };
}

export function observerFeatures(observer: ObserverDefinition, runs: EcaSeedRunSummary[]): RulialFeature[] {
  const candidates: Record<string, number> = {
    "OBS-SHANNON": mean(runs.map(run => run.meanEntropy)),
    "OBS-HAMMING": mean(runs.map(run => run.meanHamming)),
    "OBS-PERTURB-GROWTH": mean(runs.map(run => run.perturbationGrowth)),
    "OBS-AUTOCORR-TIME": mean(runs.map(run => run.autocorrelationTime)),
    "OBS-COMPRESSION": mean(runs.map(run => run.compressionRatio)),
  };
  return observer.observableIds
    .filter(observableId => Object.hasOwn(candidates, observableId))
    .map(observableId => ({ observableId, value: candidates[observableId] }));
}

export function buildEcaProfile(rule: RuleCoordinate, observer: ObserverDefinition, runs: EcaSeedRunSummary[], provenance: RulialProfileArtifact["provenance"]): RulialProfileArtifact {
  return {
    schemaVersion: RULIAL_PROFILE_SCHEMA_VERSION,
    rule,
    observerId: observer.id,
    features: observerFeatures(observer, runs),
    sampleCount: runs.length,
    seedCount: new Set(runs.map(run => run.seed)).size,
    provenance,
    notes: [
      "Profile features are seed-ensemble means; no external cellular-automaton class labels are used.",
      "Perturbation growth is a finite-horizon linear slope of normalized Hamming distance, not a Lyapunov exponent.",
      "Autocorrelation time uses the first 1/e threshold crossing of the entropy-series autocorrelation.",
    ],
  };
}

export function buildEcaOneBitTransitions(profiles: RulialProfileArtifact[], coordinates: RuleCoordinate[]) {
  const profileByRule = new Map(profiles.map(profile => [profile.rule.ruleId, profile]));
  const allowed = new Set(coordinates.map(rule => Number(rule.ruleId)));
  const transitions: RulialTransition[] = [];
  for (const rule of [...allowed].sort((a, b) => a - b)) {
    for (const neighbor of ecaOneBitNeighbors(rule)) {
      if (!allowed.has(neighbor) || neighbor <= rule) continue;
      const leftProfile = profileByRule.get(String(rule));
      const rightProfile = profileByRule.get(String(neighbor));
      if (!leftProfile || !rightProfile) continue;
      transitions.push({
        ruleSpaceId: "RSPACE-ECA-256",
        fromRuleId: String(rule),
        toRuleId: String(neighbor),
        syntacticDistance: ecaRuleTableDistance(rule, neighbor),
        observableDistance: scaledObservableDistance(leftProfile, rightProfile),
        observerId: leftProfile.observerId,
      });
    }
  }
  return transitions;
}

export function runEcaRulialCampaign(options: EcaRulialCampaignOptions = {}): EcaRulialCampaignReport {
  const ruleSpace = ruleSpaces.find(space => space.id === "RSPACE-ECA-256");
  if (!ruleSpace) throw new Error("Missing RSPACE-ECA-256 rule-space definition.");
  const observer = observers.find(item => item.id === (options.observerId ?? "OBSERVER-EBID-CORE"));
  if (!observer) throw new Error(`Unknown observer ${options.observerId}.`);

  const allCoordinates = enumerateFiniteRuleSpace(ruleSpace);
  const requested = options.ruleIds ? new Set(options.ruleIds.map(String)) : null;
  const coordinates = requested ? allCoordinates.filter(rule => requested.has(rule.ruleId)) : allCoordinates;
  if (requested && coordinates.length !== requested.size) throw new Error("One or more requested rule IDs fall outside RSPACE-ECA-256.");

  const seeds = [...(options.seeds ?? DEFAULT_ECA_SEEDS)];
  const width = options.width ?? 257;
  const steps = options.steps ?? 256;
  const density = options.density ?? 0.5;
  const perturbationIndex = options.perturbationIndex ?? Math.floor(width / 2);
  const createdAt = options.createdAt ?? new Date().toISOString();
  const sourceRevision = options.sourceRevision ?? "working-tree";
  const observableRegistryVersion = options.observableRegistryVersion ?? "0.3";

  const runs: EcaSeedRunSummary[] = [];
  for (const coordinate of coordinates) {
    const rule = Number(coordinate.ruleId);
    for (const seed of seeds) runs.push(executeEcaSeedRun(rule, seed, width, steps, density, perturbationIndex));
  }

  const profiles = coordinates.map(rule => buildEcaProfile(
    rule,
    observer,
    runs.filter(run => run.ruleId === rule.ruleId),
    {
      sourceRevision,
      observableRegistryVersion,
      createdAt,
      engineId: "ENGINE-LOCAL-ECA",
      campaignId: "CAMPAIGN-RUL-ECA-001",
    },
  ));
  const transitions = buildEcaOneBitTransitions(profiles, coordinates);

  return {
    schemaVersion: RULIAL_CAMPAIGN_SCHEMA_VERSION,
    campaignId: "CAMPAIGN-RUL-ECA-001",
    ruleSpaceId: "RSPACE-ECA-256",
    observerId: observer.id,
    engineId: "ENGINE-LOCAL-ECA",
    createdAt,
    configuration: {
      seeds,
      width,
      steps,
      density,
      perturbationIndex,
      boundary: "periodic",
      initialization: "seeded-bernoulli",
      perturbation: "single-cell-flip",
    },
    runs,
    profiles,
    transitions,
    summary: {
      ruleCount: coordinates.length,
      runCount: runs.length,
      profileCount: profiles.length,
      transitionCount: transitions.length,
    },
    notes: [
      "This report is a computational benchmark artifact, not evidence of a universal rulial taxonomy.",
      "Rule neighborhoods use the preregistered Hamming geometry of the 8-bit ECA transition table; each edge flips exactly one local-output bit.",
      "Observable distances use frozen feature scales: ln(2) for Shannon entropy, 1 for Hamming and perturbation-growth statistics, 64 steps for autocorrelation time, and 2 for the binary-RLE ratio.",
      "External Wolfram classes are intentionally absent from profile construction and may only be compared post hoc.",
    ],
  };
}

export function reprofileEcaCampaignWithObserver(
  source: EcaRulialCampaignReport,
  observer: ObserverDefinition,
  seeds: number[] = source.configuration.seeds,
): EcaRulialCampaignReport {
  const allowedSeeds = new Set(seeds);
  const runs = source.runs.filter(run => allowedSeeds.has(run.seed));
  const actualSeeds = [...new Set(runs.map(run => run.seed))].sort((a, b) => a - b);
  if (actualSeeds.length !== new Set(seeds).size) throw new Error("One or more requested seeds are absent from the source campaign.");
  const coordinates = source.profiles.map(profile => profile.rule);
  const provenance = source.profiles[0]?.provenance ?? {
    sourceRevision: "working-tree",
    observableRegistryVersion: "0.3",
    createdAt: source.createdAt,
    engineId: source.engineId,
    campaignId: source.campaignId,
  };
  const profiles = coordinates.map(rule => buildEcaProfile(
    rule,
    observer,
    runs.filter(run => run.ruleId === rule.ruleId),
    { ...provenance, createdAt: source.createdAt },
  ));
  const transitions = buildEcaOneBitTransitions(profiles, coordinates);
  return {
    ...source,
    observerId: observer.id,
    configuration: { ...source.configuration, seeds: actualSeeds },
    runs,
    profiles,
    transitions,
    summary: {
      ruleCount: profiles.length,
      runCount: runs.length,
      profileCount: profiles.length,
      transitionCount: transitions.length,
    },
    notes: [
      ...source.notes,
      `Profiles were reprojected from the same stored ECA run summaries under ${observer.id}; no trajectories were re-simulated for this observer.`,
    ],
  };
}

export function reprofileEcaCampaign(
  source: EcaRulialCampaignReport,
  observerId: string,
  seeds: number[] = source.configuration.seeds,
): EcaRulialCampaignReport {
  const observer = observers.find(item => item.id === observerId);
  if (!observer) throw new Error(`Unknown observer ${observerId}.`);
  return reprofileEcaCampaignWithObserver(source, observer, seeds);
}

export function profilesToCsv(profiles: RulialProfileArtifact[]): string {
  const observableIds = [...new Set(profiles.flatMap(profile => profile.features.map(feature => feature.observableId)))].sort();
  const header = ["rule_id", "observer_id", "sample_count", "seed_count", ...observableIds];
  const rows = profiles.map(profile => {
    const features = new Map(profile.features.map(feature => [feature.observableId, feature.value]));
    return [profile.rule.ruleId, profile.observerId, profile.sampleCount, profile.seedCount, ...observableIds.map(id => features.get(id) ?? "")];
  });
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [header, ...rows].map(row => row.map(escape).join(",")).join("\n") + "\n";
}
