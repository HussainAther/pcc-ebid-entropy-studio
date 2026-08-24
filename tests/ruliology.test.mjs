import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const model = readFileSync(new URL("../app/models/ruliology.ts", import.meta.url), "utf8");
const spaces = readFileSync(new URL("../app/data/ruleSpaces.ts", import.meta.url), "utf8");
const ca = readFileSync(new URL("../app/lib/elementaryCA.ts", import.meta.url), "utf8");
const studio = readFileSync(new URL("../app/studio.tsx", import.meta.url), "utf8");

test("ruliology has first-class rule spaces and observers", () => {
  assert.match(model, /interface RuleSpaceDefinition/);
  assert.match(model, /interface ObserverDefinition/);
  assert.match(spaces, /RSPACE-ECA-256/);
  assert.match(spaces, /OBSERVER-EBID-CORE/);
});

test("ECA benchmark is fully enumerable and perturbation-aware", () => {
  assert.match(spaces, /size: 256/);
  assert.match(ca, /runElementaryCA/);
  assert.match(ca, /singleCellPerturbation/);
  assert.match(ca, /ecaInstabilitySignature/);
});

test("Rulial Atlas is exposed in the studio", () => {
  assert.match(studio, /function RulialAtlas/);
  assert.match(studio, /RUL-001 frozen benchmark/);
  assert.match(studio, /ruliology:<RulialAtlas\/>/);
});

test("dedicated ECA campaign runner is deterministic and uses one-bit rule geometry", async () => {
  const { runEcaRulialCampaign, seededBinaryInitialCondition } = await import("../app/lib/rulialCampaignRunner.ts");
  assert.deepEqual(seededBinaryInitialCondition(11, 17), seededBinaryInitialCondition(11, 17));
  const report = runEcaRulialCampaign({ ruleIds: [0, 1], seeds: [11, 29], width: 33, steps: 32, createdAt: "2026-08-24T00:00:00.000Z" });
  assert.equal(report.summary.ruleCount, 2);
  assert.equal(report.summary.runCount, 4);
  assert.equal(report.summary.profileCount, 2);
  assert.equal(report.summary.transitionCount, 1);
  assert.equal(report.transitions[0].syntacticDistance, 1 / 8);
  assert.ok(report.profiles.every(profile => profile.features.some(feature => feature.observableId === "OBS-COMPRESSION")));
});

test("committed RUL-001 atlas is a complete 256-rule population", () => {
  const atlas = JSON.parse(readFileSync(new URL("../data/ruliology/eca-atlas/atlas.json", import.meta.url), "utf8"));
  assert.equal(atlas.summary.ruleCount, 256);
  assert.equal(atlas.summary.runCount, 1024);
  assert.equal(atlas.summary.profileCount, 256);
  assert.equal(atlas.summary.transitionCount, 1024);
});

test("RUL-002/003 validation uses disjoint holdouts and deterministic uncertainty", async () => {
  const { runEcaRulialCampaign } = await import("../app/lib/rulialCampaignRunner.ts");
  const { bootstrapProfileIntervals, validateEcaRulialAtlas } = await import("../app/lib/rulialValidation.ts");
  const calibration = runEcaRulialCampaign({ ruleIds: [0, 1, 30, 31], seeds: [11, 29, 47, 83], width: 65, steps: 64, createdAt: "2026-08-24T00:00:00.000Z" });
  const first = bootstrapProfileIntervals(calibration, 100, 0.95);
  const second = bootstrapProfileIntervals(calibration, 100, 0.95);
  assert.deepEqual(first, second);
  assert.equal(first.length, 20);
  const result = validateEcaRulialAtlas(calibration, { holdoutSeeds: [101, 131, 173, 211], bootstrapReplicates: 100, createdAt: "2026-08-24T01:00:00.000Z" });
  assert.equal(result.holdoutReport.summary.ruleCount, 4);
  assert.equal(result.holdoutReport.summary.runCount, 16);
  assert.deepEqual(result.report.holdout.seeds, [101, 131, 173, 211]);
  assert.ok(Number.isFinite(result.report.stability.allPairDistanceSpearman));
  assert.ok(result.report.equivalence.classCount >= 1);
  assert.equal(result.report.externalClassification.status, "not-run");
});

test("committed RUL-002/003 validation covers the complete ECA population", () => {
  const validation = JSON.parse(readFileSync(new URL("../data/ruliology/eca-validation/validation-report.json", import.meta.url), "utf8"));
  assert.equal(validation.holdout.runCount, 1024);
  assert.equal(validation.holdout.profileCount, 256);
  assert.equal(validation.bootstrap.intervalCount, 1280);
  assert.equal(validation.neighborhoodSensitivity.transitions.length, 1024);
  assert.ok(validation.stability.allPairDistanceSpearman > 0.9);
  assert.ok(validation.stability.oneBitEdgeDistanceSpearman > 0.9);
});

test("RUL-004 reprojects fixed trajectories through distinct observers", async () => {
  const { runEcaRulialCampaign, reprofileEcaCampaign } = await import("../app/lib/rulialCampaignRunner.ts");
  const source = runEcaRulialCampaign({ ruleIds: [0, 1, 30, 31], seeds: [223, 227, 229, 233, 239, 241, 251, 257], width: 33, steps: 32, createdAt: "2026-08-24T02:00:00.000Z" });
  const entropy = reprofileEcaCampaign(source, "OBSERVER-ECA-ENTROPY-STRUCTURE");
  const perturbation = reprofileEcaCampaign(source, "OBSERVER-ECA-PERTURBATION");
  assert.deepEqual(entropy.runs, source.runs);
  assert.deepEqual(perturbation.runs, source.runs);
  assert.deepEqual(entropy.profiles[0].features.map(feature => feature.observableId), ["OBS-SHANNON", "OBS-AUTOCORR-TIME", "OBS-COMPRESSION"]);
  assert.deepEqual(perturbation.profiles[0].features.map(feature => feature.observableId), ["OBS-HAMMING", "OBS-PERTURB-GROWTH"]);
});

test("RUL-004 observer dependence creates observer-specific quotient candidates", async () => {
  const { analyzeEcaObserverDependence } = await import("../app/lib/rulialObserverDependence.ts");
  const result = analyzeEcaObserverDependence({
    ruleIds: [0, 1, 30, 31],
    seeds: [223, 227, 229, 233, 239, 241, 251, 257],
    observerIds: ["OBSERVER-EBID-CORE", "OBSERVER-ECA-PERTURBATION"],
    width: 33,
    steps: 32,
    createdAt: "2026-08-24T02:00:00.000Z",
  });
  assert.equal(result.report.simulation.runCount, 32);
  assert.equal(result.report.observers.length, 2);
  assert.equal(result.report.crossObserver.length, 1);
  assert.ok(result.report.observers.every(observer => Number.isFinite(observer.splitGeometrySpearman)));
  assert.equal(result.report.pairConsensus.totalRulePairs, 6);
});


test("committed RUL-004 holds 4,096 runs fixed across four observers", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/eca-observer-dependence/observer-dependence-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.simulation.runCount, 4096);
  assert.equal(summary.simulation.ruleCount, 256);
  assert.equal(summary.simulation.seeds.length, 16);
  assert.equal(summary.observers.length, 4);
  assert.equal(summary.crossObserver.length, 6);
  assert.ok(summary.pairConsensus.observerSensitivePairs > 0);
  assert.ok(summary.observers.every(observer => observer.splitGeometrySpearman > 0.8));
});


test("RUL-005 enumerates the complete finite observer lattice", async () => {
  const { enumerateEcaSubsetObservers } = await import("../app/lib/rulialObserverGeometry.ts");
  const observers = enumerateEcaSubsetObservers();
  assert.equal(observers.length, 31);
  assert.equal(new Set(observers.map(observer => observer.id)).size, 31);
  assert.deepEqual(observers[0].observableIds, ["OBS-SHANNON"]);
  assert.equal(observers.at(-1).observableIds.length, 5);
});

test("committed RUL-005 observer geometry uses the fixed 4,096-run RUL-004 source", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/eca-observer-geometry/observer-geometry-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.sourceSimulation.runCount, 4096);
  assert.equal(summary.sourceSimulation.ruleCount, 256);
  assert.equal(summary.observerSpace.nodeCount, 31);
  assert.equal(summary.observerSpace.pairCount, 465);
  assert.equal(summary.observerSpace.oneFeatureEdgeCount, 75);
  assert.ok(summary.summary.structuralVsQuotientSpearman > 0);
  assert.ok(summary.summary.structuralVsGeometrySpearman > 0);
  assert.ok(summary.summary.quotientVsGeometrySpearman > 0.7);
  assert.equal(summary.summary.permutationReplicates, 1000);
  assert.ok(summary.summary.structuralVsQuotientPermutationP <= 0.05);
  assert.ok(summary.summary.structuralVsGeometryPermutationP <= 0.05);
});

test("RUL-006 registers a continuous Boids rule space and frozen observer", () => {
  assert.match(spaces, /RSPACE-BOIDS-001/);
  assert.match(spaces, /OBSERVER-BOIDS-RULIAL-CORE/);
  assert.match(spaces, /OBS-SPEED-VARIANCE/);
  assert.match(studio, /RUL-006 cross-substrate stress test/);
});

test("committed RUL-006 uses held-out seeds and independently simulated boundary probes", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/boids-rulial/boids-rulial-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-006");
  assert.equal(summary.sampling.discoveryPointCount, 32);
  assert.deepEqual(summary.sampling.discoverySeeds, [12345, 22345, 32345]);
  assert.deepEqual(summary.sampling.validationSeeds, [42345, 52345]);
  assert.equal(summary.sampling.boundaryProbeCount, 8);
  assert.equal(summary.simulation.discoveryRunCount, 96);
  assert.ok(summary.simulation.validationEndpointRunCount > 0);
  assert.equal(summary.simulation.boundaryProbeRunCount, 16);
  assert.equal(summary.validation.candidateCount, 8);
  assert.ok(Number.isFinite(summary.discovery.pairwiseRuleVsObservableSpearman));
  assert.ok(Number.isFinite(summary.validation.candidateSensitivitySpearman));
  assert.ok(summary.validation.retentionFraction >= 0 && summary.validation.retentionFraction <= 1);
});

test("RUL-007 freezes a common ECA-Boids structural comparison contract", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-cross-substrate.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-007/);
  assert.match(research, /RUL-007/);
  assert.match(script, /top10LocalEdgeJaccard/);
  assert.match(script, /q95OverMedian/);
  assert.match(script, /failed criterion is retained/i);
});

test("committed RUL-007 adds complete Boids holdout coverage and preserves failed criteria", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/cross-substrate/cross-substrate-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-007");
  assert.equal(summary.newSimulation.rulePointCount, 32);
  assert.equal(summary.newSimulation.runCount, 64);
  assert.deepEqual(summary.newSimulation.seeds, [42345, 52345]);
  assert.equal(summary.substrates.length, 2);
  assert.equal(summary.challenge.criterionCount, 5);
  assert.ok(summary.challenge.crossSubstratePassCount >= 1);
  assert.ok(summary.challenge.crossSubstratePassCount < summary.challenge.criterionCount);
  const eca = summary.substrates.find(item => item.substrate === "ECA");
  const boids = summary.substrates.find(item => item.substrate === "Boids");
  assert.equal(eca.localEdgeCount, 1024);
  assert.equal(boids.localEdgeCount, 80);
  assert.ok(eca.localSensitivity.q95OverMedian > 1);
  assert.ok(boids.localSensitivity.q95OverMedian > 1);
});
