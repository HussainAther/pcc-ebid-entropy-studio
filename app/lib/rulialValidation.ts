import type { RulialProfileArtifact, EcaRulialCampaignReport, EcaSeedRunSummary } from "./rulialCampaignRunner.ts";
import { runEcaRulialCampaign } from "./rulialCampaignRunner.ts";
import { scaledObservableDistance } from "./rulialAnalysis.ts";

export const RULIAL_VALIDATION_SCHEMA_VERSION = "entropy-rulial-validation/1.0.0" as const;
export const DEFAULT_ECA_HOLDOUT_SEEDS = [101, 131, 173, 211] as const;
export const DEFAULT_BOOTSTRAP_REPLICATES = 2000;

const FEATURE_IDS = [
  "OBS-SHANNON",
  "OBS-HAMMING",
  "OBS-PERTURB-GROWTH",
  "OBS-AUTOCORR-TIME",
  "OBS-COMPRESSION",
] as const;

type FeatureId = typeof FEATURE_IDS[number];

export interface BootstrapInterval {
  ruleId: string;
  observableId: FeatureId;
  estimate: number;
  lower: number;
  upper: number;
  confidence: number;
  bootstrapReplicates: number;
}

export interface RuleSelfDistance {
  ruleId: string;
  calibrationHoldoutDistance: number;
}

export interface RobustTransition {
  fromRuleId: string;
  toRuleId: string;
  calibrationDistance: number;
  holdoutDistance: number;
  calibrationPercentile: number;
  holdoutPercentile: number;
  robustTopTail: boolean;
}

export interface CandidateEquivalenceClass {
  id: string;
  memberRuleIds: string[];
  size: number;
  maximumJointDistance: number;
}

export interface RulialValidationReport {
  schemaVersion: typeof RULIAL_VALIDATION_SCHEMA_VERSION;
  validationId: "RUL-002-003-ECA-VALIDATION-001";
  createdAt: string;
  calibrationCampaignId: string;
  ruleSpaceId: string;
  observerId: string;
  holdout: {
    seeds: number[];
    runCount: number;
    profileCount: number;
    policy: string;
  };
  bootstrap: {
    replicates: number;
    confidence: number;
    intervalCount: number;
    note: string;
  };
  stability: {
    ruleSelfDistances: RuleSelfDistance[];
    selfDistanceQuantiles: Record<"q25" | "q50" | "q75" | "q95", number>;
    allPairDistanceSpearman: number;
    oneBitEdgeDistanceSpearman: number;
    topFivePercentEdgeJaccard: number;
    robustTopTailEdgeCount: number;
    clustering: {
      calibrationClassCount: number;
      holdoutClassCount: number;
      calibrationNonSingletonClassCount: number;
      holdoutNonSingletonClassCount: number;
      coassignmentJaccard: number;
    };
  };
  neighborhoodSensitivity: {
    calibrationThresholdP95: number;
    holdoutThresholdP95: number;
    transitions: RobustTransition[];
  };
  equivalence: {
    criterion: string;
    epsilon: number;
    epsilonSource: string;
    classCount: number;
    nonSingletonClassCount: number;
    largestClassSize: number;
    classes: CandidateEquivalenceClass[];
    sensitivity: Array<{ quantile: "q25" | "q50" | "q75"; epsilon: number; classCount: number; nonSingletonClassCount: number; largestClassSize: number }>;
  };
  externalClassification: {
    status: "not-run";
    reason: string;
    requiredInput: string;
  };
  notes: string[];
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function quantile(values: number[], q: number): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
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

function runFeature(run: EcaSeedRunSummary, observableId: FeatureId): number {
  switch (observableId) {
    case "OBS-SHANNON": return run.meanEntropy;
    case "OBS-HAMMING": return run.meanHamming;
    case "OBS-PERTURB-GROWTH": return run.perturbationGrowth;
    case "OBS-AUTOCORR-TIME": return run.autocorrelationTime;
    case "OBS-COMPRESSION": return run.compressionRatio;
  }
}

export function bootstrapProfileIntervals(
  report: EcaRulialCampaignReport,
  replicates = DEFAULT_BOOTSTRAP_REPLICATES,
  confidence = 0.95,
): BootstrapInterval[] {
  if (!Number.isInteger(replicates) || replicates < 100) throw new Error("bootstrap replicates must be an integer >= 100.");
  if (!(confidence > 0 && confidence < 1)) throw new Error("bootstrap confidence must be strictly between 0 and 1.");
  const alpha = (1 - confidence) / 2;
  const runsByRule = new Map<string, EcaSeedRunSummary[]>();
  for (const run of report.runs) {
    const bucket = runsByRule.get(run.ruleId) ?? [];
    bucket.push(run);
    runsByRule.set(run.ruleId, bucket);
  }
  const intervals: BootstrapInterval[] = [];
  for (const [ruleId, runs] of [...runsByRule.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    for (const [featureIndex, observableId] of FEATURE_IDS.entries()) {
      const values = runs.map(run => runFeature(run, observableId));
      const random = mulberry32((Number(ruleId) + 1) * 1000003 + featureIndex * 7919 + replicates);
      const bootstrapMeans: number[] = [];
      for (let replicate = 0; replicate < replicates; replicate += 1) {
        let total = 0;
        for (let draw = 0; draw < values.length; draw += 1) total += values[Math.floor(random() * values.length)];
        bootstrapMeans.push(total / values.length);
      }
      intervals.push({
        ruleId,
        observableId,
        estimate: mean(values),
        lower: quantile(bootstrapMeans, alpha),
        upper: quantile(bootstrapMeans, 1 - alpha),
        confidence,
        bootstrapReplicates: replicates,
      });
    }
  }
  return intervals;
}

function averageRanks(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array(values.length).fill(0);
  let cursor = 0;
  while (cursor < indexed.length) {
    let end = cursor + 1;
    while (end < indexed.length && indexed[end].value === indexed[cursor].value) end += 1;
    const averageRank = (cursor + 1 + end) / 2;
    for (let index = cursor; index < end; index += 1) ranks[indexed[index].index] = averageRank;
    cursor = end;
  }
  return ranks;
}

function pearson(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) return Number.NaN;
  const meanA = mean(a);
  const meanB = mean(b);
  let numerator = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    numerator += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  const denominator = Math.sqrt(varianceA * varianceB);
  return denominator ? numerator / denominator : Number.NaN;
}

export function spearman(a: number[], b: number[]): number {
  return pearson(averageRanks(a), averageRanks(b));
}

function profileMap(report: EcaRulialCampaignReport): Map<string, RulialProfileArtifact> {
  return new Map(report.profiles.map(profile => [profile.rule.ruleId, profile]));
}

function pairKey(a: string, b: string): string {
  return Number(a) < Number(b) ? `${a}:${b}` : `${b}:${a}`;
}

function allPairDistances(calibration: EcaRulialCampaignReport, holdout: EcaRulialCampaignReport) {
  const left = profileMap(calibration);
  const right = profileMap(holdout);
  const ids = [...left.keys()].filter(id => right.has(id)).sort((a, b) => Number(a) - Number(b));
  const pairs: Array<{ a: string; b: string; calibration: number; holdout: number; joint: number }> = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i];
      const b = ids[j];
      const calibrationDistance = scaledObservableDistance(left.get(a)!, left.get(b)!);
      const holdoutDistance = scaledObservableDistance(right.get(a)!, right.get(b)!);
      pairs.push({ a, b, calibration: calibrationDistance, holdout: holdoutDistance, joint: Math.max(calibrationDistance, holdoutDistance) });
    }
  }
  return pairs;
}

function percentileRank(value: number, values: number[]): number {
  if (!values.length) return Number.NaN;
  let lessOrEqual = 0;
  for (const candidate of values) if (candidate <= value) lessOrEqual += 1;
  return lessOrEqual / values.length;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const union = new Set([...left, ...right]);
  if (!union.size) return 1;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / union.size;
}

function completeLinkClusters(
  ids: string[],
  jointDistances: Map<string, number>,
  epsilon: number,
): CandidateEquivalenceClass[] {
  let clusters: string[][] = ids.map(id => [id]);
  const between = (left: string[], right: string[]) => {
    let maximum = 0;
    for (const a of left) for (const b of right) maximum = Math.max(maximum, jointDistances.get(pairKey(a, b)) ?? Number.POSITIVE_INFINITY);
    return maximum;
  };
  while (true) {
    let bestI = -1;
    let bestJ = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        const distance = between(clusters[i], clusters[j]);
        if (distance <= epsilon && distance < bestDistance) {
          bestDistance = distance;
          bestI = i;
          bestJ = j;
        }
      }
    }
    if (bestI < 0) break;
    const merged = [...clusters[bestI], ...clusters[bestJ]].sort((a, b) => Number(a) - Number(b));
    clusters = clusters.filter((_, index) => index !== bestI && index !== bestJ);
    clusters.push(merged);
  }
  return clusters
    .map((members, index) => {
      let maximumJointDistance = 0;
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) maximumJointDistance = Math.max(maximumJointDistance, jointDistances.get(pairKey(members[i], members[j])) ?? 0);
      }
      return { id: `EQ-${String(index + 1).padStart(3, "0")}`, memberRuleIds: members, size: members.length, maximumJointDistance };
    })
    .sort((a, b) => b.size - a.size || Number(a.memberRuleIds[0]) - Number(b.memberRuleIds[0]));
}

function coassignedPairs(classes: CandidateEquivalenceClass[]): Set<string> {
  const pairs = new Set<string>();
  for (const cluster of classes) {
    for (let i = 0; i < cluster.memberRuleIds.length; i += 1) {
      for (let j = i + 1; j < cluster.memberRuleIds.length; j += 1) pairs.add(pairKey(cluster.memberRuleIds[i], cluster.memberRuleIds[j]));
    }
  }
  return pairs;
}

function classSummary(classes: CandidateEquivalenceClass[]) {
  return {
    classCount: classes.length,
    nonSingletonClassCount: classes.filter(item => item.size > 1).length,
    largestClassSize: Math.max(...classes.map(item => item.size), 0),
  };
}

export function validateEcaRulialAtlas(
  calibration: EcaRulialCampaignReport,
  options: { holdoutSeeds?: number[]; bootstrapReplicates?: number; confidence?: number; createdAt?: string } = {},
): { report: RulialValidationReport; holdoutReport: EcaRulialCampaignReport; bootstrapIntervals: BootstrapInterval[] } {
  const holdoutSeeds = [...(options.holdoutSeeds ?? DEFAULT_ECA_HOLDOUT_SEEDS)];
  const overlap = holdoutSeeds.filter(seed => calibration.configuration.seeds.includes(seed));
  if (overlap.length) throw new Error(`Holdout seeds overlap calibration seeds: ${overlap.join(", ")}`);
  const holdoutReport = runEcaRulialCampaign({
    ruleIds: calibration.profiles.map(profile => Number(profile.rule.ruleId)),
    seeds: holdoutSeeds,
    width: calibration.configuration.width,
    steps: calibration.configuration.steps,
    density: calibration.configuration.density,
    perturbationIndex: calibration.configuration.perturbationIndex,
    observerId: calibration.observerId,
    sourceRevision: calibration.profiles[0]?.provenance.sourceRevision ?? "working-tree",
    observableRegistryVersion: calibration.profiles[0]?.provenance.observableRegistryVersion ?? "0.3",
    createdAt: options.createdAt ?? new Date().toISOString(),
  });
  const bootstrapReplicates = options.bootstrapReplicates ?? DEFAULT_BOOTSTRAP_REPLICATES;
  const confidence = options.confidence ?? 0.95;
  const bootstrapIntervals = bootstrapProfileIntervals(calibration, bootstrapReplicates, confidence);
  const calibrationProfiles = profileMap(calibration);
  const holdoutProfiles = profileMap(holdoutReport);
  const ids = [...calibrationProfiles.keys()].filter(id => holdoutProfiles.has(id)).sort((a, b) => Number(a) - Number(b));
  const ruleSelfDistances = ids.map(ruleId => ({
    ruleId,
    calibrationHoldoutDistance: scaledObservableDistance(calibrationProfiles.get(ruleId)!, holdoutProfiles.get(ruleId)!),
  }));
  const selfDistances = ruleSelfDistances.map(item => item.calibrationHoldoutDistance);
  const selfDistanceQuantiles = {
    q25: quantile(selfDistances, 0.25),
    q50: quantile(selfDistances, 0.50),
    q75: quantile(selfDistances, 0.75),
    q95: quantile(selfDistances, 0.95),
  };

  const pairs = allPairDistances(calibration, holdoutReport);
  const allPairDistanceSpearman = spearman(pairs.map(item => item.calibration), pairs.map(item => item.holdout));
  const pairDistanceByKey = new Map(pairs.map(item => [pairKey(item.a, item.b), item]));
  const holdoutEdgeMap = new Map(holdoutReport.transitions.map(edge => [pairKey(edge.fromRuleId, edge.toRuleId), edge.observableDistance]));
  const calibrationEdgeDistances = calibration.transitions.map(edge => edge.observableDistance);
  const holdoutEdgeDistances = calibration.transitions.map(edge => holdoutEdgeMap.get(pairKey(edge.fromRuleId, edge.toRuleId)) ?? Number.NaN);
  const finiteEdgePairs = calibration.transitions.map((edge, index) => ({ edge, calibration: calibrationEdgeDistances[index], holdout: holdoutEdgeDistances[index] })).filter(item => Number.isFinite(item.holdout));
  const oneBitEdgeDistanceSpearman = spearman(finiteEdgePairs.map(item => item.calibration), finiteEdgePairs.map(item => item.holdout));
  const calibrationThresholdP95 = quantile(finiteEdgePairs.map(item => item.calibration), 0.95);
  const holdoutThresholdP95 = quantile(finiteEdgePairs.map(item => item.holdout), 0.95);
  const calibrationTop = new Set(finiteEdgePairs.filter(item => item.calibration >= calibrationThresholdP95).map(item => pairKey(item.edge.fromRuleId, item.edge.toRuleId)));
  const holdoutTop = new Set(finiteEdgePairs.filter(item => item.holdout >= holdoutThresholdP95).map(item => pairKey(item.edge.fromRuleId, item.edge.toRuleId)));
  const transitions: RobustTransition[] = finiteEdgePairs.map(item => ({
    fromRuleId: item.edge.fromRuleId,
    toRuleId: item.edge.toRuleId,
    calibrationDistance: item.calibration,
    holdoutDistance: item.holdout,
    calibrationPercentile: percentileRank(item.calibration, finiteEdgePairs.map(value => value.calibration)),
    holdoutPercentile: percentileRank(item.holdout, finiteEdgePairs.map(value => value.holdout)),
    robustTopTail: item.calibration >= calibrationThresholdP95 && item.holdout >= holdoutThresholdP95,
  })).sort((a, b) => Math.min(b.calibrationPercentile, b.holdoutPercentile) - Math.min(a.calibrationPercentile, a.holdoutPercentile));

  const jointDistances = new Map(pairs.map(item => [pairKey(item.a, item.b), item.joint]));
  const calibrationDistances = new Map(pairs.map(item => [pairKey(item.a, item.b), item.calibration]));
  const holdoutDistances = new Map(pairs.map(item => [pairKey(item.a, item.b), item.holdout]));
  const epsilon = selfDistanceQuantiles.q50;
  const classes = completeLinkClusters(ids, jointDistances, epsilon);
  const calibrationClasses = completeLinkClusters(ids, calibrationDistances, epsilon);
  const holdoutClasses = completeLinkClusters(ids, holdoutDistances, epsilon);
  const calibrationClassSummary = classSummary(calibrationClasses);
  const holdoutClassSummary = classSummary(holdoutClasses);
  const sensitivity = (["q25", "q50", "q75"] as const).map(quantileKey => {
    const candidateClasses = completeLinkClusters(ids, jointDistances, selfDistanceQuantiles[quantileKey]);
    return { quantile: quantileKey, epsilon: selfDistanceQuantiles[quantileKey], ...classSummary(candidateClasses) };
  });
  const summary = classSummary(classes);

  const report: RulialValidationReport = {
    schemaVersion: RULIAL_VALIDATION_SCHEMA_VERSION,
    validationId: "RUL-002-003-ECA-VALIDATION-001",
    createdAt: holdoutReport.createdAt,
    calibrationCampaignId: calibration.campaignId,
    ruleSpaceId: calibration.ruleSpaceId,
    observerId: calibration.observerId,
    holdout: {
      seeds: holdoutSeeds,
      runCount: holdoutReport.summary.runCount,
      profileCount: holdoutReport.summary.profileCount,
      policy: "Holdout seeds are disjoint from the frozen RUL-001 calibration seeds and are never used to construct the original atlas profiles.",
    },
    bootstrap: {
      replicates: bootstrapReplicates,
      confidence,
      intervalCount: bootstrapIntervals.length,
      note: "Percentile intervals resample the four frozen calibration initial conditions with replacement. With n=4 seeds these intervals are diagnostic, not high-precision uncertainty estimates.",
    },
    stability: {
      ruleSelfDistances,
      selfDistanceQuantiles,
      allPairDistanceSpearman,
      oneBitEdgeDistanceSpearman,
      topFivePercentEdgeJaccard: jaccard(calibrationTop, holdoutTop),
      robustTopTailEdgeCount: transitions.filter(item => item.robustTopTail).length,
      clustering: {
        calibrationClassCount: calibrationClassSummary.classCount,
        holdoutClassCount: holdoutClassSummary.classCount,
        calibrationNonSingletonClassCount: calibrationClassSummary.nonSingletonClassCount,
        holdoutNonSingletonClassCount: holdoutClassSummary.nonSingletonClassCount,
        coassignmentJaccard: jaccard(coassignedPairs(calibrationClasses), coassignedPairs(holdoutClasses)),
      },
    },
    neighborhoodSensitivity: {
      calibrationThresholdP95,
      holdoutThresholdP95,
      transitions,
    },
    equivalence: {
      criterion: "Complete-link clustering on joint distance max(d_calibration, d_holdout); every pair within a candidate class must remain inside epsilon in both independent initial-condition ensembles.",
      epsilon,
      epsilonSource: "Median (q50) same-rule calibration-to-holdout EBID distance. q25/q50/q75 alternatives are reported as a threshold-sensitivity analysis.",
      ...summary,
      classes,
      sensitivity,
    },
    externalClassification: {
      status: "not-run",
      reason: "No external CA class labels are bundled because whole-population Wolfram-class assignments are not uniquely canonical. Post-hoc comparison requires a provenance-bearing frozen label table.",
      requiredInput: "CSV or JSON with rule_id, class_label, source, and classification_version after RUL-002/003 metrics and thresholds are frozen.",
    },
    notes: [
      "No external cellular-automaton class labels participate in profile construction, threshold calibration, sensitivity ranking, or clustering.",
      "Robust high-sensitivity edges must fall in the top 5% of one-bit observable distances in both calibration and holdout ensembles.",
      "Candidate equivalence is observer-dependent and finite-horizon; it is not identity of generative rules.",
      "The complete-link criterion prevents chaining: every pair in a non-singleton class must satisfy the joint epsilon threshold.",
      "Pairwise and edge Spearman correlations quantify ranking stability across independent initial-condition ensembles.",
      "Cluster coassignment Jaccard compares calibration-only and holdout-only complete-link partitions at the same frozen epsilon; the reported candidate classes themselves use the stricter joint-distance criterion.",
    ],
  };
  return { report, holdoutReport, bootstrapIntervals };
}

export function bootstrapIntervalsToCsv(intervals: BootstrapInterval[]): string {
  const header = "rule_id,observable_id,estimate,lower,upper,confidence,bootstrap_replicates";
  return [header, ...intervals.map(item => [item.ruleId, item.observableId, item.estimate, item.lower, item.upper, item.confidence, item.bootstrapReplicates].join(","))].join("\n") + "\n";
}

export function selfDistancesToCsv(items: RuleSelfDistance[]): string {
  return ["rule_id,calibration_holdout_distance", ...items.map(item => `${item.ruleId},${item.calibrationHoldoutDistance}`)].join("\n") + "\n";
}

export function robustTransitionsToCsv(items: RobustTransition[]): string {
  return [
    "from_rule,to_rule,calibration_distance,holdout_distance,calibration_percentile,holdout_percentile,robust_top_tail",
    ...items.map(item => [item.fromRuleId, item.toRuleId, item.calibrationDistance, item.holdoutDistance, item.calibrationPercentile, item.holdoutPercentile, item.robustTopTail].join(",")),
  ].join("\n") + "\n";
}

export function equivalenceClassesToCsv(items: CandidateEquivalenceClass[]): string {
  return [
    "class_id,size,maximum_joint_distance,member_rule_ids",
    ...items.map(item => [item.id, item.size, item.maximumJointDistance, `\"${item.memberRuleIds.join(" ")}\"`].join(",")),
  ].join("\n") + "\n";
}
