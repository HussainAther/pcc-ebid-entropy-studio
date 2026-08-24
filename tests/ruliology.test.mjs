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
