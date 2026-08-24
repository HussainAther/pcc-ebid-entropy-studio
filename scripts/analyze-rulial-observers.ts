import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzeEcaObserverDependence, crossObserverToCsv, observerClassesToCsv } from "../app/lib/rulialObserverDependence.ts";

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

const outputDir = resolve(args.get("out") ?? "data/ruliology/eca-observer-dependence");
const result = analyzeEcaObserverDependence({
  seeds: parseNumbers(args.get("seeds")),
  width: args.has("width") ? Number(args.get("width")) : undefined,
  steps: args.has("steps") ? Number(args.get("steps")) : undefined,
  createdAt: args.get("created-at"),
});

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "observer-dependence-report.json"), JSON.stringify(result.report, null, 2) + "\n");
await writeFile(resolve(outputDir, "source-campaign.json"), JSON.stringify(result.sourceCampaign, null, 2) + "\n");
await writeFile(resolve(outputDir, "observer-classes.csv"), observerClassesToCsv(result.report));
await writeFile(resolve(outputDir, "cross-observer.csv"), crossObserverToCsv(result.report));

const compact = {
  schemaVersion: "entropy-rulial-observer-dependence-summary/1.0.0",
  generatedAt: result.report.createdAt,
  experimentId: result.report.experimentId,
  simulation: result.report.simulation,
  observers: result.report.observers.map(observer => ({
    observerId: observer.observerId,
    observableIds: observer.observableIds,
    epsilon: observer.epsilon,
    splitGeometrySpearman: observer.splitGeometrySpearman,
    splitCoassignmentJaccard: observer.splitCoassignmentJaccard,
    classCount: observer.classCount,
    nonSingletonClassCount: observer.nonSingletonClassCount,
    largestClassSize: observer.largestClassSize,
    equivalentPairCount: observer.equivalentPairCount,
    largestClasses: observer.classes.filter(group => group.size > 1).slice(0, 8),
  })),
  crossObserver: result.report.crossObserver,
  pairConsensus: result.report.pairConsensus,
};
await writeFile(resolve(outputDir, "observer-dependence-summary.json"), JSON.stringify(compact, null, 2) + "\n");

console.log(JSON.stringify({
  outputDir,
  runCount: result.report.simulation.runCount,
  seedCount: result.report.simulation.seeds.length,
  observers: result.report.observers.map(observer => ({
    id: observer.observerId,
    classes: observer.classCount,
    nonSingletons: observer.nonSingletonClassCount,
    splitGeometrySpearman: observer.splitGeometrySpearman,
  })),
  pairConsensus: result.report.pairConsensus,
}, null, 2));
