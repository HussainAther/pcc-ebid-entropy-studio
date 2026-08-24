import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EcaRulialCampaignReport } from "../app/lib/rulialCampaignRunner.ts";
import {
  bootstrapIntervalsToCsv,
  equivalenceClassesToCsv,
  robustTransitionsToCsv,
  selfDistancesToCsv,
  validateEcaRulialAtlas,
} from "../app/lib/rulialValidation.ts";

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index];
  if (!token.startsWith("--")) continue;
  const [key, inline] = token.slice(2).split("=", 2);
  if (inline !== undefined) args.set(key, inline);
  else if (process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) args.set(key, process.argv[++index]);
  else args.set(key, "true");
}

function parseNumbers(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  return value.split(",").map(item => Number(item.trim())).filter(Number.isFinite);
}

const calibrationPath = resolve(args.get("calibration") ?? "data/ruliology/eca-atlas/campaign-report.json");
const outputDir = resolve(args.get("out") ?? "data/ruliology/eca-validation");
const calibration = JSON.parse(await readFile(calibrationPath, "utf8")) as EcaRulialCampaignReport;
const result = validateEcaRulialAtlas(calibration, {
  holdoutSeeds: parseNumbers(args.get("holdout-seeds")),
  bootstrapReplicates: args.has("bootstrap") ? Number(args.get("bootstrap")) : undefined,
  confidence: args.has("confidence") ? Number(args.get("confidence")) : undefined,
});

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "validation-report.json"), JSON.stringify(result.report, null, 2) + "\n");
await writeFile(resolve(outputDir, "holdout-report.json"), JSON.stringify(result.holdoutReport, null, 2) + "\n");
await writeFile(resolve(outputDir, "bootstrap-intervals.csv"), bootstrapIntervalsToCsv(result.bootstrapIntervals));
await writeFile(resolve(outputDir, "self-distances.csv"), selfDistancesToCsv(result.report.stability.ruleSelfDistances));
await writeFile(resolve(outputDir, "robust-transitions.csv"), robustTransitionsToCsv(result.report.neighborhoodSensitivity.transitions));
await writeFile(resolve(outputDir, "equivalence-classes.csv"), equivalenceClassesToCsv(result.report.equivalence.classes));

const compact = {
  schemaVersion: "entropy-rulial-validation-summary/1.0.0",
  generatedAt: result.report.createdAt,
  validationId: result.report.validationId,
  holdout: result.report.holdout,
  bootstrap: result.report.bootstrap,
  stability: {
    selfDistanceQuantiles: result.report.stability.selfDistanceQuantiles,
    allPairDistanceSpearman: result.report.stability.allPairDistanceSpearman,
    oneBitEdgeDistanceSpearman: result.report.stability.oneBitEdgeDistanceSpearman,
    topFivePercentEdgeJaccard: result.report.stability.topFivePercentEdgeJaccard,
    robustTopTailEdgeCount: result.report.stability.robustTopTailEdgeCount,
    clustering: result.report.stability.clustering,
  },
  neighborhoodSensitivity: {
    calibrationThresholdP95: result.report.neighborhoodSensitivity.calibrationThresholdP95,
    holdoutThresholdP95: result.report.neighborhoodSensitivity.holdoutThresholdP95,
    robustTransitions: result.report.neighborhoodSensitivity.transitions.filter(item => item.robustTopTail).slice(0, 32),
  },
  equivalence: {
    criterion: result.report.equivalence.criterion,
    epsilon: result.report.equivalence.epsilon,
    epsilonSource: result.report.equivalence.epsilonSource,
    classCount: result.report.equivalence.classCount,
    nonSingletonClassCount: result.report.equivalence.nonSingletonClassCount,
    largestClassSize: result.report.equivalence.largestClassSize,
    sensitivity: result.report.equivalence.sensitivity,
    nonSingletonClasses: result.report.equivalence.classes.filter(item => item.size > 1).slice(0, 24),
  },
  externalClassification: result.report.externalClassification,
};
await writeFile(resolve(outputDir, "validation-summary.json"), JSON.stringify(compact, null, 2) + "\n");

console.log(JSON.stringify({
  outputDir,
  holdoutRuns: result.report.holdout.runCount,
  bootstrapIntervals: result.report.bootstrap.intervalCount,
  allPairDistanceSpearman: result.report.stability.allPairDistanceSpearman,
  oneBitEdgeDistanceSpearman: result.report.stability.oneBitEdgeDistanceSpearman,
  robustTopTailEdges: result.report.stability.robustTopTailEdgeCount,
  clusterCoassignmentJaccard: result.report.stability.clustering.coassignmentJaccard,
  candidateNonSingletonClasses: result.report.equivalence.nonSingletonClassCount,
  largestClassSize: result.report.equivalence.largestClassSize,
}, null, 2));
