import { observers } from "../data/ruleSpaces.ts";
import type { RulialProfileArtifact, EcaRulialCampaignReport } from "./rulialCampaignRunner.ts";
import { reprofileEcaCampaign, runEcaRulialCampaign } from "./rulialCampaignRunner.ts";
import { scaledObservableDistance } from "./rulialAnalysis.ts";
import { spearman } from "./rulialValidation.ts";

export const RULIAL_OBSERVER_DEPENDENCE_SCHEMA_VERSION = "entropy-rulial-observer-dependence/1.0.0" as const;
export const DEFAULT_EXPANDED_ECA_SEEDS = [223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307] as const;
export const DEFAULT_ECA_OBSERVERS = [
  "OBSERVER-EBID-CORE",
  "OBSERVER-ECA-ENTROPY-STRUCTURE",
  "OBSERVER-ECA-PERTURBATION",
  "OBSERVER-ECA-MEMORY-COMPLEXITY",
] as const;

export interface ObserverQuotientClass {
  id: string;
  memberRuleIds: string[];
  size: number;
  maximumJointDistance: number;
}

export interface ObserverQuotientSummary {
  observerId: string;
  observableIds: string[];
  epsilon: number;
  epsilonSource: string;
  splitSelfDistanceQ25: number;
  splitSelfDistanceQ50: number;
  splitSelfDistanceQ75: number;
  splitGeometrySpearman: number;
  splitCoassignmentJaccard: number;
  classCount: number;
  nonSingletonClassCount: number;
  largestClassSize: number;
  equivalentPairCount: number;
  classes: ObserverQuotientClass[];
}

export interface CrossObserverComparison {
  leftObserverId: string;
  rightObserverId: string;
  geometrySpearman: number;
  coassignmentJaccard: number;
  sharedEquivalentPairCount: number;
  unionEquivalentPairCount: number;
}

export interface RulialObserverDependenceReport {
  schemaVersion: typeof RULIAL_OBSERVER_DEPENDENCE_SCHEMA_VERSION;
  experimentId: "RUL-004-ECA-OBSERVER-DEPENDENCE-001";
  createdAt: string;
  ruleSpaceId: "RSPACE-ECA-256";
  simulation: {
    policy: string;
    seeds: number[];
    splitASeeds: number[];
    splitBSeeds: number[];
    runCount: number;
    ruleCount: number;
    width: number;
    steps: number;
  };
  observers: ObserverQuotientSummary[];
  crossObserver: CrossObserverComparison[];
  pairConsensus: {
    allObserverEquivalentPairs: number;
    anyObserverEquivalentPairs: number;
    observerSensitivePairs: number;
    totalRulePairs: number;
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

function pairKey(a: string, b: string): string {
  return Number(a) < Number(b) ? `${a}:${b}` : `${b}:${a}`;
}

function profileMap(report: EcaRulialCampaignReport): Map<string, RulialProfileArtifact> {
  return new Map(report.profiles.map(profile => [profile.rule.ruleId, profile]));
}

function allPairDistanceMap(report: EcaRulialCampaignReport): Map<string, number> {
  const profiles = [...report.profiles].sort((a, b) => Number(a.rule.ruleId) - Number(b.rule.ruleId));
  const distances = new Map<string, number>();
  for (let i = 0; i < profiles.length; i += 1) {
    for (let j = i + 1; j < profiles.length; j += 1) {
      distances.set(pairKey(profiles[i].rule.ruleId, profiles[j].rule.ruleId), scaledObservableDistance(profiles[i], profiles[j]));
    }
  }
  return distances;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const union = new Set([...left, ...right]);
  if (!union.size) return 1;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / union.size;
}

function completeLinkClusters(ids: string[], distances: Map<string, number>, epsilon: number): ObserverQuotientClass[] {
  const clusters = new Map<number, string[]>();
  const pairDistances = new Map<string, number>();
  let nextClusterId = ids.length;
  for (let index = 0; index < ids.length; index += 1) clusters.set(index, [ids[index]]);
  const clusterKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) pairDistances.set(clusterKey(i, j), distances.get(pairKey(ids[i], ids[j])) ?? Number.POSITIVE_INFINITY);
  }
  while (true) {
    const clusterIds = [...clusters.keys()].sort((a, b) => a - b);
    let bestA = -1;
    let bestB = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < clusterIds.length; i += 1) {
      for (let j = i + 1; j < clusterIds.length; j += 1) {
        const distance = pairDistances.get(clusterKey(clusterIds[i], clusterIds[j])) ?? Number.POSITIVE_INFINITY;
        if (distance <= epsilon && distance < bestDistance) {
          bestA = clusterIds[i];
          bestB = clusterIds[j];
          bestDistance = distance;
        }
      }
    }
    if (bestA < 0) break;
    const mergedId = nextClusterId++;
    const mergedMembers = [...clusters.get(bestA)!, ...clusters.get(bestB)!].sort((a, b) => Number(a) - Number(b));
    for (const otherId of clusterIds) {
      if (otherId === bestA || otherId === bestB) continue;
      const leftDistance = pairDistances.get(clusterKey(bestA, otherId)) ?? Number.POSITIVE_INFINITY;
      const rightDistance = pairDistances.get(clusterKey(bestB, otherId)) ?? Number.POSITIVE_INFINITY;
      pairDistances.set(clusterKey(mergedId, otherId), Math.max(leftDistance, rightDistance));
    }
    clusters.delete(bestA);
    clusters.delete(bestB);
    clusters.set(mergedId, mergedMembers);
  }
  return [...clusters.values()].map((members, index) => {
    let maximumJointDistance = 0;
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) maximumJointDistance = Math.max(maximumJointDistance, distances.get(pairKey(members[i], members[j])) ?? 0);
    }
    return {
      id: `OQ-${String(index + 1).padStart(3, "0")}`,
      memberRuleIds: members,
      size: members.length,
      maximumJointDistance,
    };
  }).sort((a, b) => b.size - a.size || Number(a.memberRuleIds[0]) - Number(b.memberRuleIds[0]));
}

function coassignedPairs(classes: ObserverQuotientClass[]): Set<string> {
  const pairs = new Set<string>();
  for (const group of classes) {
    for (let i = 0; i < group.memberRuleIds.length; i += 1) {
      for (let j = i + 1; j < group.memberRuleIds.length; j += 1) pairs.add(pairKey(group.memberRuleIds[i], group.memberRuleIds[j]));
    }
  }
  return pairs;
}

function orderedDistanceVectors(left: Map<string, number>, right: Map<string, number>): [number[], number[]] {
  const keys = [...left.keys()].filter(key => right.has(key)).sort();
  return [keys.map(key => left.get(key)!), keys.map(key => right.get(key)!)];
}

function jointDistanceMap(left: Map<string, number>, right: Map<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  for (const [key, value] of left) {
    const other = right.get(key);
    if (other !== undefined) result.set(key, Math.max(value, other));
  }
  return result;
}

export function analyzeEcaObserverDependence(options: {
  seeds?: number[];
  ruleIds?: number[];
  observerIds?: string[];
  width?: number;
  steps?: number;
  density?: number;
  perturbationIndex?: number;
  createdAt?: string;
} = {}): { report: RulialObserverDependenceReport; sourceCampaign: EcaRulialCampaignReport; observerReports: Record<string, EcaRulialCampaignReport> } {
  const seeds = [...(options.seeds ?? DEFAULT_EXPANDED_ECA_SEEDS)];
  if (seeds.length < 8 || seeds.length % 2 !== 0) throw new Error("Observer-dependence analysis requires an even seed ensemble of at least 8 seeds.");
  if (new Set(seeds).size !== seeds.length) throw new Error("Observer-dependence seeds must be unique.");
  const observerIds = [...(options.observerIds ?? DEFAULT_ECA_OBSERVERS)];
  if (observerIds.length < 2) throw new Error("Observer-dependence analysis requires at least two observers.");
  for (const observerId of observerIds) {
    const observer = observers.find(item => item.id === observerId);
    if (!observer) throw new Error(`Unknown observer ${observerId}.`);
    const implemented = observer.observableIds.filter(id => ["OBS-SHANNON", "OBS-HAMMING", "OBS-PERTURB-GROWTH", "OBS-AUTOCORR-TIME", "OBS-COMPRESSION"].includes(id));
    if (!implemented.length) throw new Error(`Observer ${observerId} has no implemented ECA features.`);
  }

  const splitASeeds = seeds.filter((_, index) => index % 2 === 0);
  const splitBSeeds = seeds.filter((_, index) => index % 2 === 1);
  const createdAt = options.createdAt ?? new Date().toISOString();
  const sourceCampaign = runEcaRulialCampaign({
    ruleIds: options.ruleIds,
    seeds,
    width: options.width,
    steps: options.steps,
    density: options.density,
    perturbationIndex: options.perturbationIndex,
    observerId: "OBSERVER-EBID-CORE",
    createdAt,
  });

  const observerReports: Record<string, EcaRulialCampaignReport> = {};
  const observerSummaries: ObserverQuotientSummary[] = [];
  const equivalentPairsByObserver = new Map<string, Set<string>>();
  const fullDistancesByObserver = new Map<string, Map<string, number>>();

  for (const observerId of observerIds) {
    const observer = observers.find(item => item.id === observerId)!;
    const full = reprofileEcaCampaign(sourceCampaign, observerId, seeds);
    const splitA = reprofileEcaCampaign(sourceCampaign, observerId, splitASeeds);
    const splitB = reprofileEcaCampaign(sourceCampaign, observerId, splitBSeeds);
    observerReports[observerId] = full;

    const left = profileMap(splitA);
    const right = profileMap(splitB);
    const ids = [...left.keys()].filter(id => right.has(id)).sort((a, b) => Number(a) - Number(b));
    const selfDistances = ids.map(id => scaledObservableDistance(left.get(id)!, right.get(id)!));
    const q25 = quantile(selfDistances, 0.25);
    const epsilon = quantile(selfDistances, 0.50);
    const q75 = quantile(selfDistances, 0.75);
    const leftDistances = allPairDistanceMap(splitA);
    const rightDistances = allPairDistanceMap(splitB);
    const jointDistances = jointDistanceMap(leftDistances, rightDistances);
    const classes = completeLinkClusters(ids, jointDistances, epsilon);
    const leftClasses = completeLinkClusters(ids, leftDistances, epsilon);
    const rightClasses = completeLinkClusters(ids, rightDistances, epsilon);
    const [leftVector, rightVector] = orderedDistanceVectors(leftDistances, rightDistances);
    const equivalentPairs = coassignedPairs(classes);
    equivalentPairsByObserver.set(observerId, equivalentPairs);
    fullDistancesByObserver.set(observerId, allPairDistanceMap(full));
    observerSummaries.push({
      observerId,
      observableIds: observer.observableIds.filter(id => full.profiles[0]?.features.some(feature => feature.observableId === id)),
      epsilon,
      epsilonSource: "Median same-rule distance between two disjoint 8-seed split halves under this observer.",
      splitSelfDistanceQ25: q25,
      splitSelfDistanceQ50: epsilon,
      splitSelfDistanceQ75: q75,
      splitGeometrySpearman: spearman(leftVector, rightVector),
      splitCoassignmentJaccard: jaccard(coassignedPairs(leftClasses), coassignedPairs(rightClasses)),
      classCount: classes.length,
      nonSingletonClassCount: classes.filter(group => group.size > 1).length,
      largestClassSize: Math.max(...classes.map(group => group.size), 0),
      equivalentPairCount: equivalentPairs.size,
      classes,
    });
  }

  const crossObserver: CrossObserverComparison[] = [];
  for (let i = 0; i < observerIds.length; i += 1) {
    for (let j = i + 1; j < observerIds.length; j += 1) {
      const leftId = observerIds[i];
      const rightId = observerIds[j];
      const [leftVector, rightVector] = orderedDistanceVectors(fullDistancesByObserver.get(leftId)!, fullDistancesByObserver.get(rightId)!);
      const leftPairs = equivalentPairsByObserver.get(leftId)!;
      const rightPairs = equivalentPairsByObserver.get(rightId)!;
      const union = new Set([...leftPairs, ...rightPairs]);
      let shared = 0;
      for (const pair of leftPairs) if (rightPairs.has(pair)) shared += 1;
      crossObserver.push({
        leftObserverId: leftId,
        rightObserverId: rightId,
        geometrySpearman: spearman(leftVector, rightVector),
        coassignmentJaccard: jaccard(leftPairs, rightPairs),
        sharedEquivalentPairCount: shared,
        unionEquivalentPairCount: union.size,
      });
    }
  }

  const pairCounts = new Map<string, number>();
  for (const pairs of equivalentPairsByObserver.values()) {
    for (const pair of pairs) pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
  }
  const allObserverEquivalentPairs = [...pairCounts.values()].filter(count => count === observerIds.length).length;
  const anyObserverEquivalentPairs = pairCounts.size;
  const observerSensitivePairs = [...pairCounts.values()].filter(count => count > 0 && count < observerIds.length).length;
  const ruleCount = sourceCampaign.summary.ruleCount;

  return {
    sourceCampaign,
    observerReports,
    report: {
      schemaVersion: RULIAL_OBSERVER_DEPENDENCE_SCHEMA_VERSION,
      experimentId: "RUL-004-ECA-OBSERVER-DEPENDENCE-001",
      createdAt,
      ruleSpaceId: "RSPACE-ECA-256",
      simulation: {
        policy: "Simulate each rule-seed trajectory pair exactly once, then reproject the same stored run summaries through each declared observer. Split-half validation uses alternating seeds and never re-simulates per observer.",
        seeds,
        splitASeeds,
        splitBSeeds,
        runCount: sourceCampaign.summary.runCount,
        ruleCount,
        width: sourceCampaign.configuration.width,
        steps: sourceCampaign.configuration.steps,
      },
      observers: observerSummaries,
      crossObserver,
      pairConsensus: {
        allObserverEquivalentPairs,
        anyObserverEquivalentPairs,
        observerSensitivePairs,
        totalRulePairs: ruleCount * (ruleCount - 1) / 2,
      },
      notes: [
        "RUL-004 tests observer dependence operationally: the underlying simulated runs are held fixed while the observable projection changes.",
        "Each observer receives its own epsilon from split-half same-rule variability; quotient classes therefore reflect both feature choice and that observer's empirical resolution.",
        "Complete-link classes are candidate observational equivalence classes, not claims of exact dynamical identity.",
        "The fixed RLE statistic remains a codec-dependent complexity proxy and is not Kolmogorov complexity.",
      ],
    },
  };
}

export function observerClassesToCsv(report: RulialObserverDependenceReport): string {
  const rows: Array<Array<string | number>> = [["observer_id", "class_id", "size", "maximum_joint_distance", "members"]];
  for (const observer of report.observers) {
    for (const group of observer.classes) rows.push([observer.observerId, group.id, group.size, group.maximumJointDistance, group.memberRuleIds.join(";")]);
  }
  return rows.map(row => row.map(value => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(",")).join("\n") + "\n";
}

export function crossObserverToCsv(report: RulialObserverDependenceReport): string {
  const rows: Array<Array<string | number>> = [["left_observer", "right_observer", "geometry_spearman", "coassignment_jaccard", "shared_equivalent_pairs", "union_equivalent_pairs"]];
  for (const item of report.crossObserver) rows.push([item.leftObserverId, item.rightObserverId, item.geometrySpearman, item.coassignmentJaccard, item.sharedEquivalentPairCount, item.unionEquivalentPairCount]);
  return rows.map(row => row.join(",")).join("\n") + "\n";
}
