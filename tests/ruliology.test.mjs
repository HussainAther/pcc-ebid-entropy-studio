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

test("RUL-008 registers a topology-blocked stochastic network substrate", () => {
  const engines = readFileSync(new URL("../app/data/engines.ts", import.meta.url), "utf8");
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  assert.match(spaces, /RSPACE-NETWORK-001/);
  assert.match(spaces, /OBSERVER-NETWORK-RULIAL-CORE/);
  assert.match(spaces, /DIM-NET-THRESHOLD/);
  assert.match(engines, /ENGINE-LOCAL-NETWORK/);
  assert.match(research, /H-RUL-008/);
  assert.match(research, /RUL-008/);
  assert.match(studio, /RUL-008 network substrate/);
});

test("committed RUL-008 repeats the complete topology-blocked design on disjoint seeds", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/network-rulial/network-rulial-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-008");
  assert.equal(summary.sampling.pointCount, 24);
  assert.deepEqual(summary.sampling.discoverySeeds, [71011, 71023, 71039]);
  assert.deepEqual(summary.sampling.validationSeeds, [72019, 72031]);
  assert.deepEqual(summary.sampling.topologies, ["ring", "small_world", "erdos_renyi"]);
  assert.equal(summary.simulation.discoveryRunCount, 216);
  assert.equal(summary.simulation.holdoutRunCount, 144);
  assert.equal(summary.simulation.totalRunCount, 360);
  assert.ok(summary.validation.geometryStabilitySpearman >= 0.70);
  assert.ok(summary.validation.localEdgeStabilitySpearman >= 0.70);
  assert.ok(summary.discovery.localSensitivityQ95OverMedian >= 1.5);
  assert.ok(summary.validation.top10LocalEdgeJaccard >= 0.50);
  assert.equal(summary.topologyBlocks.discovery.length, 3);
  assert.equal(summary.topologyBlocks.crossTopologyDiscovery.length, 3);
});

test("RUL-009 reuses the frozen RUL-007 contract for three substrates", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-three-substrate.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-009/);
  assert.match(research, /RUL-009/);
  assert.match(script, /RUL-007 frozen contract/);
  assert.match(script, /newSimulationRunCount/);
  assert.match(studio, /RUL-009 frozen three-substrate challenge/);
});

test("committed RUL-009 preserves the mixed three-substrate result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/three-substrate/three-substrate-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-009");
  assert.equal(summary.newSimulationRunCount, 0);
  assert.equal(summary.substrates.length, 3);
  assert.equal(summary.challenge.criterionCount, 5);
  assert.equal(summary.challenge.substrateCount, 3);
  assert.equal(summary.challenge.substratePassCounts.ECA, 5);
  assert.equal(summary.challenge.substratePassCounts.Boids, 2);
  assert.equal(summary.challenge.substratePassCounts.Network, 5);
  assert.equal(summary.challenge.allSubstratePassCount, 2);
  assert.deepEqual(new Set(summary.pattern.allThree), new Set(["positiveGlobalRuleObservableAssociation", "localSensitivityTail"]));
  assert.equal(summary.pattern.ecaAndNetworkOnly.length, 3);
});


test("RUL-010 diagnoses Boids resolution without rewriting RUL-009", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-boids-resolution.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-010/);
  assert.match(research, /RUL-010/);
  assert.match(script, /POOL_A/);
  assert.match(script, /stochastic_noise_scale/);
  assert.match(studio, /RUL-010 Boids diagnostic/);
});

test("committed RUL-010 uses disjoint seed pools and exposes observer instability", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/boids-resolution/boids-resolution-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-010");
  assert.equal(summary.rulePointCount, 32);
  assert.equal(summary.simulation.totalNewRunCount, 320);
  assert.equal(new Set(summary.seedPools.A.concat(summary.seedPools.B)).size, summary.seedPools.A.length + summary.seedPools.B.length);
  assert.deepEqual(summary.seedResolutionLadder.filter(row => row.noiseScale === 1).map(row => row.seedsPerHalf), [1,2,4]);
  const full = summary.observerDecomposition.find(row => row.observerId === "full_core");
  const state = summary.observerDecomposition.find(row => row.observerId === "state_structure");
  const regime = summary.observerDecomposition.find(row => row.observerId === "regime_dynamics");
  assert.ok(state.geometryStabilitySpearman > full.geometryStabilitySpearman);
  assert.ok(regime.geometryStabilitySpearman < state.geometryStabilitySpearman);
});

test("RUL-011 prospectively freezes new Boids observers and margins", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-boids-observer-validation.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-011/);
  assert.match(research, /RUL-011/);
  assert.match(spaces, /OBSERVER-BOIDS-STRUCTURE-PROSPECTIVE/);
  assert.match(spaces, /OBSERVER-BOIDS-ORDER-ENTROPY-PROSPECTIVE/);
  assert.match(script, /PRIMARY_GEOMETRY_MARGIN = 0\.05/);
  assert.match(script, /PRIMARY_LOCAL_MARGIN = 0\.05/);
  assert.match(studio, /RUL-011 prospective observer validation/);
});

test("committed RUL-011 validates the state-structure observer on unseen rule coordinates", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/boids-observer-validation/boids-observer-validation-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-011");
  assert.equal(summary.design.rulePointCount, 40);
  assert.equal(summary.simulation.totalNewRunCount, 320);
  assert.equal(new Set(summary.design.seedPools.A.concat(summary.design.seedPools.B)).size, 8);
  assert.ok(summary.design.newRuleCoordinateCheckAgainstRUL006.minimum > 0);
  assert.equal(summary.observers.length, 3);
  const full = summary.observers.find(row => row.observerId === "full_core");
  const structure = summary.observers.find(row => row.observerId === "state_structure");
  assert.ok(structure.geometryStabilitySpearman - full.geometryStabilitySpearman >= 0.05);
  assert.ok(structure.localEdgeStabilitySpearman - full.localEdgeStabilitySpearman >= 0.05);
  assert.equal(summary.primaryProspectiveTest.prospectiveReplicationPassed, true);
});

test("RUL-012 freezes a zero-simulation cross-substrate observer-conditioning diagnostic", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-observer-conditioning.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-012/);
  assert.match(research, /RUL-012/);
  assert.match(script, /PRIMARY_RHO_MAX = -0\.50/);
  assert.match(script, /PERMUTATIONS = 5000/);
  assert.match(script, /within substrate/i);
  assert.match(studio, /RUL-012 observer conditioning diagnostic/);
});

test("committed RUL-012 preserves the challenged primary conditioning result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/observer-conditioning/observer-conditioning-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-012");
  assert.equal(summary.newSimulationRunCount, 0);
  assert.equal(summary.design.substrates.length, 3);
  assert.equal(summary.design.featureCount, 17);
  assert.equal(summary.features.length, 17);
  assert.equal(summary.primaryTest.observerConditioningSupported, false);
  assert.ok(summary.primaryTest.pooledShiftVsGeometrySpearman > -0.50);
  assert.ok(summary.primaryTest.substrateStratifiedPermutationP > 0.05);
});

test("RUL-013 freezes a zero-simulation information-conditioning analysis", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-observer-information.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-013/);
  assert.match(research, /RUL-013/);
  assert.match(script, /PRIMARY_RELIABILITY_RHO_MIN = 0\.70/);
  assert.match(script, /PERMUTATIONS = 5000/);
  assert.match(script, /pool_error_variance/);
  assert.match(studio, /RUL-013 observer information analysis/);
});

test("committed RUL-013 supports discrimination-to-uncertainty conditioning", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/observer-information/observer-information-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-013");
  assert.equal(summary.newSimulationRunCount, 0);
  assert.equal(summary.design.substrates.length, 3);
  assert.equal(summary.design.featureCount, 17);
  assert.equal(summary.features.length, 17);
  assert.equal(summary.primaryTest.informationConditioningSupported, true);
  assert.ok(summary.primaryTest.reliabilityVsGeometrySpearman >= 0.70);
  assert.ok(summary.primaryTest.substrateStratifiedPermutationP <= 0.05);
  assert.ok(summary.secondary.signalToUncertaintyVsGeometrySpearman >= 0.60);
  assert.ok(summary.secondary.signalToUncertaintyPermutationP <= 0.05);
});

test("RUL-014 freezes an algorithmic RUL-013 observer selector before new simulations", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-prospective-observer-selection.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-014/);
  assert.match(research, /RUL-014/);
  assert.match(spaces, /OBSERVER-BOIDS-RUL013-SELECTED-PROSPECTIVE/);
  assert.match(script, /SELECTION_RELIABILITY_MIN = 0\.80/);
  assert.match(script, /DESIGN_POINT_COUNT = 48/);
  assert.match(script, /PRIMARY_GEOMETRY_MARGIN = 0\.05/);
  assert.match(script, /PRIMARY_LOCAL_MARGIN = 0\.05/);
  assert.match(studio, /RUL-014 prospective observer selection/);
});

test("committed RUL-014 preserves the challenged prospective effect-size criterion", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/prospective-observer-selection/prospective-observer-selection-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-014");
  assert.equal(summary.design.rulePointCount, 48);
  assert.equal(summary.simulation.totalNewRunCount, 384);
  assert.equal(new Set(summary.design.seedPools.A.concat(summary.design.seedPools.B)).size, 8);
  assert.ok(summary.design.newRuleCoordinateCheckAgainstRUL006AndRUL011.minimum > 0);
  assert.deepEqual(new Set(summary.selectedFeatures), new Set(["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE"]));
  assert.deepEqual(new Set(summary.rejectedFeatures), new Set(["OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"]));
  const full = summary.observers.find(row => row.observerId === "full_core");
  const selected = summary.observers.find(row => row.observerId === "rul013_selected");
  const rejected = summary.observers.find(row => row.observerId === "rul013_rejected_control");
  assert.ok(selected.geometryStabilitySpearman > full.geometryStabilitySpearman);
  assert.ok(selected.localEdgeStabilitySpearman > full.localEdgeStabilitySpearman);
  assert.ok(selected.geometryStabilitySpearman > rejected.geometryStabilitySpearman);
  assert.equal(summary.primaryProspectiveTest.prospectiveSelectionSupported, false);
  assert.equal(summary.secondaryChecks.jaccardCriterionPassed, true);
});


test("RUL-015 freezes continuous information weights before new simulations", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-information-weighted-observer.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-015/);
  assert.match(research, /RUL-015/);
  assert.match(spaces, /OBSERVER-BOIDS-RUL013-INFORMATION-WEIGHTED/);
  assert.match(script, /DESIGN_POINT_COUNT = 56/);
  assert.match(script, /PRIMARY_GEOMETRY_MARGIN = 0\.03/);
  assert.match(script, /math\.log1p/);
  assert.match(studio, /RUL-015 continuous observer weighting/);
});

test("committed RUL-015 preserves the challenged continuous-weighting result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/information-weighted-observer/information-weighted-observer-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-015");
  assert.equal(summary.design.rulePointCount, 56);
  assert.equal(summary.simulation.totalNewRunCount, 448);
  assert.equal(new Set(summary.design.seedPools.A.concat(summary.design.seedPools.B)).size, 8);
  assert.ok(summary.design.newRuleCoordinateCheckAgainstRUL006RUL011RUL014.minimum > 0);
  assert.equal(summary.observers.length, 4);
  const equal = summary.observers.find(row => row.observerId === "equal_full");
  const weighted = summary.observers.find(row => row.observerId === "information_weighted");
  const hard = summary.observers.find(row => row.observerId === "rul013_hard_selection");
  assert.ok(weighted.geometryStabilitySpearman > equal.geometryStabilitySpearman);
  assert.ok(hard.geometryStabilitySpearman > weighted.geometryStabilitySpearman);
  assert.equal(summary.primaryProspectiveTest.continuousWeightingSupported, false);
  assert.equal(summary.secondaryChecks.jaccardCriterionPassed, false);
});


test("RUL-016 exhaustively freezes the six-feature observer Boolean lattice", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-observer-ablation.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-016/);
  assert.match(research, /RUL-016/);
  assert.match(script, /nonEmptyObserverSubsetCount/);
  assert.match(script, /shapley/);
  assert.match(script, /interaction/);
  assert.match(studio, /RUL-016 observer ablation/);
});

test("committed RUL-016 preserves exact non-additive observer effects", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/observer-ablation/observer-ablation-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-016");
  assert.equal(summary.source.newUniqueSimulationRunCount, 0);
  assert.equal(summary.design.featureCount, 6);
  assert.equal(summary.design.nonEmptyObserverSubsetCount, 63);
  assert.equal(summary.design.pairInteractionCount, 15);
  assert.equal(summary.featureEffects.length, 6);
  assert.equal(summary.pairInteractions.length, 15);
  assert.equal(summary.diagnostic.nonAdditiveGeometryInteractionPresent, true);
  assert.equal(summary.diagnostic.bothRegimeRemovalsImproveGeometry, true);
  assert.equal(summary.diagnostic.bothRegimeRemovalsImproveLocal, true);
});

test("RUL-017 freezes the interaction-informed three-feature candidate before new simulations", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-interaction-informed-observer-validation.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-017/);
  assert.match(research, /RUL-017/);
  assert.match(spaces, /OBSERVER-BOIDS-RUL016-INTERACTION3-PROSPECTIVE/);
  assert.match(script, /DESIGN_POINT_COUNT = 40/);
  assert.match(script, /PRIMARY_GEOMETRY_MARGIN = 0\.01/);
  assert.match(script, /PRIMARY_LOCAL_MARGIN = 0\.01/);
  assert.match(studio, /RUL-017 prospective interaction observer/);
});

test("committed RUL-017 prospectively validates the compact geometry observer", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/interaction-informed-observer-validation/interaction-informed-observer-validation-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-017");
  assert.equal(summary.design.rulePointCount, 40);
  assert.equal(summary.simulation.totalNewRunCount, 320);
  assert.equal(new Set(summary.design.seedPools.A.concat(summary.design.seedPools.B)).size, 8);
  assert.ok(summary.design.newRuleCoordinateCheckAgainstRUL006RUL011RUL014RUL015.minimum > 0);
  const full = summary.observers.find(row => row.observerId === "full_core");
  const hard4 = summary.observers.find(row => row.observerId === "rul013_hard4");
  const interaction3 = summary.observers.find(row => row.observerId === "rul016_interaction3");
  assert.ok(interaction3.geometryStabilitySpearman > hard4.geometryStabilitySpearman);
  assert.ok(interaction3.localEdgeStabilitySpearman > hard4.localEdgeStabilitySpearman);
  assert.ok(interaction3.geometryStabilitySpearman > full.geometryStabilitySpearman);
  assert.equal(summary.primaryProspectiveTest.interactionInformedObserverSupported, true);
  assert.equal(summary.secondaryChecks.jaccardCriterionPassed, false);
});

test("RUL-018 registers objective-dependent observer geometry without new unique simulations", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-objective-dependent-observer.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-018/);
  assert.match(research, /RUL-018/);
  assert.match(script, /OBJECTIVES =/);
  assert.match(script, /newUniqueSimulationRunCount': 0/);
  assert.match(studio, /RUL-018 objective-dependent observer geometry/);
});

test("committed RUL-018 separates global, local, and boundary observer objectives", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/objective-dependent-observer/objective-dependent-observer-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-018");
  assert.equal(summary.source.newUniqueSimulationRunCount, 0);
  assert.equal(summary.design.nonEmptyObserverSubsetCount, 63);
  assert.equal(summary.design.objectives.length, 3);
  assert.equal(summary.objectiveDependence.objectiveDependenceDetected, true);
  assert.equal(summary.objectiveDependence.allObjectivesShareAtLeastOneOptimum, false);
  assert.equal(summary.objectiveDependence.globalAndLocalOptimaDiffer, true);
  assert.equal(summary.objectiveOptima.find(x => x.objective === "global_geometry").representativeObserverId, "OBSSET-001100");
  assert.equal(summary.objectiveOptima.find(x => x.objective === "local_geometry").representativeObserverId, "OBSSET-000110");
  assert.ok(summary.objectiveOptima.find(x => x.objective === "boundary_recovery").coOptimalObserverCount > 1);
});


test("RUL-019 extends objective-dependent observer geometry across three frozen substrates", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-cross-substrate-objectives.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-019/);
  assert.match(research, /RUL-019/);
  assert.match(script, /newUniqueSimulationRunCount':0/);
  assert.match(script, /load_eca/);
  assert.match(script, /load_network/);
  assert.match(studio, /RUL-019 cross-substrate observer objectives/);
});

test("committed RUL-019 finds recurring objective dependence without universal feature identity", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/cross-substrate-objectives/cross-substrate-objectives-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-019");
  assert.equal(summary.source.newUniqueSimulationRunCount, 0);
  assert.equal(summary.substrates.length, 3);
  assert.deepEqual(new Set(summary.substrates.map(item => item.substrate)), new Set(["ECA", "Boids", "Network"]));
  assert.equal(summary.crossSubstrate.objectiveDependenceAcrossAllSubstrates, true);
  assert.equal(summary.crossSubstrate.noSingleAllObjectiveOptimumAcrossAllSubstrates, true);
  assert.equal(summary.crossSubstrate.boundaryRankDecouplingAcrossAllSubstrates, true);
  for (const substrate of summary.substrates) {
    assert.equal(substrate.objectiveDependence.objectiveDependenceDetected, true);
    assert.equal(substrate.objectiveDependence.allObjectivesShareAtLeastOneOptimum, false);
    assert.ok(substrate.objectiveDependence.geometryRankAssociation > substrate.objectiveDependence.globalBoundaryRankAssociation);
    assert.ok(substrate.objectiveDependence.geometryRankAssociation > substrate.objectiveDependence.localBoundaryRankAssociation);
  }
});

test("RUL-020 registers a mutable-rule ALife substrate and matched controls", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const engines = readFileSync(new URL("../app/data/engines.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-020/);
  assert.match(research, /RUL-020/);
  assert.match(spaces, /RSPACE-ALIFE-001/);
  assert.match(spaces, /OBSERVER-ALIFE-RULE-MOTION/);
  assert.match(engines, /ENGINE-LOCAL-ALIFE/);
  assert.match(script, /stable_mutable/);
  assert.match(script, /scarcity_mutable/);
  assert.match(script, /scarcity_frozen/);
  assert.match(studio, /RUL-020 mutable-rule ALife/);
});

test("committed RUL-020 demonstrates rule-space motion under the frozen pilot contract", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-rule-motion/alife-rule-motion-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-020");
  assert.equal(summary.design.seedCount, 12);
  assert.equal(summary.simulation.runCount, 36);
  assert.deepEqual(new Set(summary.design.conditions), new Set(["stable_mutable", "scarcity_mutable", "scarcity_frozen"]));
  assert.ok(summary.conditions.scarcity_mutable.medianRuleDisplacement > summary.conditions.stable_mutable.medianRuleDisplacement);
  assert.ok(summary.conditions.scarcity_mutable.medianRuleDisplacement > summary.conditions.scarcity_frozen.medianRuleDisplacement);
  assert.ok(summary.conditions.scarcity_mutable.directionalReproducibility >= 0.20);
  assert.equal(summary.primaryTest.criteriaPassed, 4);
  assert.equal(summary.primaryTest.criteriaTotal, 4);
  assert.equal(summary.primaryTest.pilotSupported, true);
});

test("RUL-021 registers the ALife selection versus neutral bottleneck control", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const engines = readFileSync(new URL("../app/data/engines.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife-selection-control.py", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  assert.match(research, /H-RUL-021/);
  assert.match(research, /RUL-021/);
  assert.match(spaces, /OBSERVER-ALIFE-SELECTION-CONTROL/);
  assert.match(engines, /RUL-021/);
  assert.match(observables, /OBS-POSTSHOCK-RULE-DISPLACEMENT/);
  assert.match(observables, /OBS-BOTTLENECK-DEPTH/);
  assert.match(script, /neutral_bottleneck_mutable/);
  assert.match(script, /burnInSteps/);
  assert.match(studio, /RUL-021 selection vs neutral bottleneck/);
});

test("committed RUL-021 preserves the challenged matched-bottleneck result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-selection-control/alife-selection-control-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-021");
  assert.equal(summary.design.seedCount, 12);
  assert.equal(summary.design.burnInSteps, 180);
  assert.equal(summary.simulation.runCount, 36);
  assert.deepEqual(new Set(summary.design.conditions), new Set(["stable_mutable", "scarcity_mutable", "neutral_bottleneck_mutable"]));
  assert.equal(summary.primaryTest.criteriaPassed, 3);
  assert.equal(summary.primaryTest.criteriaTotal, 5);
  assert.equal(summary.primaryTest.pilotSupported, false);
  assert.ok(summary.pairedComparison.medianSelectiveMinusNeutralPostShockDisplacement < 0);
  assert.equal(summary.pairedComparison.positiveSeedCount, 5);
  assert.ok(summary.conditions.scarcity_mutable.directionalReproducibility > summary.conditions.neutral_bottleneck_mutable.directionalReproducibility);
  assert.ok(summary.pairedComparison.medianNeutralBottleneckMatchError <= 0.06);
});

test("RUL-022 registers local fitness-gradient alignment without rerunning RUL-021 motion", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife-fitness-gradient.py", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  assert.match(research, /H-RUL-022/);
  assert.match(research, /RUL-022/);
  assert.match(spaces, /OBSERVER-ALIFE-FITNESS-GRADIENT/);
  assert.match(observables, /OBS-FITNESS-GRADIENT-ALIGNMENT/);
  assert.match(script, /newMotionSimulations/);
  assert.match(script, /finiteDifferenceStepUnit/);
  assert.match(studio, /RUL-022 local fitness-gradient alignment/);
});

test("committed RUL-022 preserves positive scarcity alignment but challenged selection-specific advantage", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-fitness-gradient/alife-fitness-gradient-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-022");
  assert.equal(summary.source.newMotionSimulations, 0);
  assert.equal(summary.source.newFitnessProbeSimulations, 96);
  assert.equal(summary.design.seedCount, 12);
  assert.equal(summary.design.probesPerSeed, 8);
  assert.equal(summary.primaryTest.criteriaPassed, 3);
  assert.equal(summary.primaryTest.criteriaTotal, 4);
  assert.equal(summary.primaryTest.pilotSupported, false);
  assert.ok(summary.results.medianScarcityAlignment > 0.10);
  assert.equal(summary.results.positiveScarcityAlignmentCount, 9);
  assert.ok(summary.results.medianScarcityMinusNeutralAlignment < 0);
  assert.equal(summary.results.identifiableGradientCount, 12);
});

test("RUL-023 registers a contrastive scarcity-versus-stable local gradient", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife-contrastive-gradient.py", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  assert.match(research, /H-RUL-023/);
  assert.match(research, /RUL-023/);
  assert.match(spaces, /OBSERVER-ALIFE-CONTRASTIVE-GRADIENT/);
  assert.match(observables, /OBS-CONTRASTIVE-FITNESS-GRADIENT-ALIGNMENT/);
  assert.match(script, /grad\(F_scarcity\) - grad\(F_stable\)/);
  assert.match(script, /reusedScarcityProbeSimulations/);
  assert.match(studio, /RUL-023 contrastive environmental gradient/);
});

test("committed RUL-023 preserves the challenged contrastive-gradient result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-contrastive-gradient/alife-contrastive-gradient-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-023");
  assert.equal(summary.source.newMotionSimulations, 0);
  assert.equal(summary.source.reusedScarcityProbeSimulations, 96);
  assert.equal(summary.source.newStableProbeSimulations, 96);
  assert.equal(summary.design.seedCount, 12);
  assert.equal(summary.design.stableProbesPerSeed, 8);
  assert.equal(summary.primaryTest.criteriaPassed, 1);
  assert.equal(summary.primaryTest.criteriaTotal, 4);
  assert.equal(summary.primaryTest.pilotSupported, false);
  assert.equal(summary.results.identifiableContrastiveGradientCount, 12);
  assert.equal(summary.results.positiveScarcityAlignmentCount, 6);
  assert.ok(summary.results.medianScarcityContrastiveAlignment < 0.10);
  assert.ok(summary.results.medianScarcityMinusNeutralContrastiveAlignment < 0);
});

test("RUL-024 registers frequency-dependent tagged-mutant invasion gradients", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife-invasion-gradient.py", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  assert.match(research, /H-RUL-024/);
  assert.match(research, /RUL-024/);
  assert.match(spaces, /OBSERVER-ALIFE-INVASION-GRADIENT/);
  assert.match(observables, /OBS-INVASION-GRADIENT-ALIGNMENT/);
  assert.match(script, /invasion_mutant_rule_unit/);
  assert.match(script, /newInvasionProbeSimulations/);
  assert.match(studio, /RUL-024 frequency-dependent invasion gradient/);
});

test("committed RUL-024 preserves the challenged context-dependent invasion-gradient result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-invasion-gradient/alife-invasion-gradient-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-024");
  assert.equal(summary.source.newMotionSimulations, 0);
  assert.equal(summary.source.newInvasionProbeSimulations, 96);
  assert.equal(summary.design.seedCount, 12);
  assert.equal(summary.design.invasionFraction, 0.10);
  assert.equal(summary.primaryTest.criteriaPassed, 0);
  assert.equal(summary.primaryTest.criteriaTotal, 4);
  assert.equal(summary.primaryTest.pilotSupported, false);
  assert.equal(summary.results.positiveScarcityAlignmentCount, 4);
  assert.equal(summary.results.identifiableInvasionGradientCount, 7);
  assert.ok(Math.abs(summary.results.medianScarcityAlignment) < 1e-12);
  assert.ok(Math.abs(summary.results.medianScarcityMinusNeutralAlignment) < 1e-12);
});


test("RUL-025 registers lineage-resolved ALife motion decomposition", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife-lineage-motion.py", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  assert.match(research, /H-RUL-025/);
  assert.match(research, /RUL-025/);
  assert.match(spaces, /OBSERVER-ALIFE-LINEAGE-MOTION/);
  assert.match(observables, /OBS-LINEAGE-REWEIGHTING-SHARE/);
  assert.match(observables, /OBS-LINEAGE-DIRECTIONAL-COHERENCE/);
  assert.match(script, /deterministicReplayRuns/);
  assert.match(script, /reweightingNormShare/);
  assert.match(studio, /RUL-025 lineage-resolved rule motion/);
});

test("committed RUL-025 preserves the mixed lineage-reweighting result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-lineage-motion/alife-lineage-motion-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-025");
  assert.equal(summary.source.newUniqueSimulationConditions, 0);
  assert.equal(summary.source.deterministicReplayRuns, 24);
  assert.equal(summary.design.seedCount, 12);
  assert.equal(summary.primaryTest.criteriaPassed, 4);
  assert.equal(summary.primaryTest.criteriaTotal, 5);
  assert.equal(summary.primaryTest.pilotSupported, false);
  assert.ok(summary.results.scarcity.medianReweightingNormShare >= 0.60);
  assert.ok(summary.results.scarcity.medianLineageDirectionalCoherence <= 0.50);
  assert.ok(summary.results.medianScarcityMinusNeutralReweightingShare < 0.10);
  assert.equal(summary.results.scarcityRunsWithAtLeastThreeMovingSurvivorLineages, 12);
  assert.equal(summary.results.maxReplayPostShockDeltaAbsError, 0);
  assert.equal(summary.results.allReplayFinalPopulationsMatch, true);
  assert.ok(summary.results.scarcity.maxDecompositionError <= 1e-12);
});

test("RUL-026 registers time-resolved ALife lineage transport", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const spaces = readFileSync(new URL("../app/data/ruleSpaces.ts", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../app/studio.tsx", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife-lineage-transport.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-026/);
  assert.match(research, /RUL-026/);
  assert.match(spaces, /OBSERVER-ALIFE-LINEAGE-TRANSPORT/);
  assert.match(observables, /OBS-CUMULATIVE-LINEAGE-TURNOVER/);
  assert.match(observables, /OBS-REWEIGHTING-PATH-TORTUOSITY/);
  assert.match(script, /interval_decomposition/);
  assert.match(studio, /RUL-026 time-resolved lineage transport/);
});

test("committed RUL-026 preserves the supported temporal-transport result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-lineage-transport/alife-lineage-transport-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-026");
  assert.equal(summary.primaryTest.criteriaPassed, 6);
  assert.equal(summary.primaryTest.criteriaTotal, 6);
  assert.equal(summary.primaryTest.pilotSupported, true);
  assert.ok(summary.results.scarcity.medianCumulativeReweightingShare >= 0.60);
  assert.ok(summary.results.scarcity.medianReweightingPathTortuosity >= 1.50);
  assert.ok(summary.results.scarcity.runsWithDominantLineageSwitch >= 6);
  assert.ok(summary.results.medianScarcityMinusNeutralCumulativeTurnover >= 0.10);
  assert.equal(summary.results.maxReplayPostShockDeltaAbsError, 0);
});


test("RUL-027 registers a coarse-grained ALife rulial flux network", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const spaces = readFileSync(new URL("../app/data/ruleSpaces.ts", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../app/studio.tsx", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/run-rulial-alife-flux-network.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-027/);
  assert.match(research, /RUL-027/);
  assert.match(spaces, /OBSERVER-ALIFE-RULIAL-FLUX-NETWORK/);
  assert.match(observables, /OBS-RULIAL-FLUX-CHANNEL-CONCENTRATION/);
  assert.match(observables, /OBS-RULIAL-FLUX-DIRECTIONAL-PERSISTENCE/);
  assert.match(observables, /OBS-RULIAL-FLUX-PROFILE-DIVERGENCE/);
  assert.match(script, /BINS_PER_DIM = 4/);
  assert.match(studio, /RUL-027 coarse-grained rulial flux network/);
});

test("committed RUL-027 preserves the supported coarse-flux result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-flux-network/alife-flux-network-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-027");
  assert.equal(summary.source.newUniqueSimulationConditions, 0);
  assert.equal(summary.source.deterministicReplayRuns, 24);
  assert.equal(summary.design.binsPerDimension, 4);
  assert.equal(summary.design.maximumPossibleCells, 256);
  assert.equal(summary.primaryTest.criteriaPassed, 7);
  assert.equal(summary.primaryTest.criteriaTotal, 7);
  assert.equal(summary.primaryTest.pilotSupported, true);
  assert.ok(summary.results.scarcity.top20PercentCellFluxConcentration >= 0.50);
  assert.ok(summary.results.scarcity.top20PercentCellHalfSplitJaccard >= 0.25);
  assert.ok(summary.results.scarcity.fluxWeightedDirectionalPersistence >= 0.20);
  assert.ok(summary.results.scarcityVsNeutralCellFluxJensenShannon >= 0.05);
  assert.ok(summary.results.scarcityVsNeutralAbundanceTurnoverJensenShannon >= 0.05);
  assert.equal(summary.results.maxIntervalFluxVectorReconstructionErrorVsRUL026, 0);
  assert.equal(summary.results.maxReplayPostShockDeltaAbsError, 0);
});

test("RUL-028 registers multiscale ALife rulial flux robustness", () => {
  const research = readFileSync(new URL("../app/data/research.ts", import.meta.url), "utf8");
  const spaces = readFileSync(new URL("../app/data/ruleSpaces.ts", import.meta.url), "utf8");
  const observables = readFileSync(new URL("../app/data/observables.ts", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../app/studio.tsx", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/analyze-rulial-alife-multiscale-flux.py", import.meta.url), "utf8");
  assert.match(research, /H-RUL-028/);
  assert.match(research, /RUL-028/);
  assert.match(spaces, /OBSERVER-ALIFE-MULTISCALE-FLUX/);
  assert.match(observables, /OBS-RULIAL-FLUX-RESOLUTION-ROBUSTNESS/);
  assert.match(script, /BINS_FAMILY = \[3, 4, 5, 6\]/);
  assert.match(script, /minimumPassingResolutions/);
  assert.match(studio, /RUL-028 multiscale rulial flux robustness/);
});

test("committed RUL-028 preserves the supported multiscale-flux result", () => {
  const summary = JSON.parse(readFileSync(new URL("../data/ruliology/alife-multiscale-flux/alife-multiscale-flux-summary.json", import.meta.url), "utf8"));
  assert.equal(summary.experimentId, "RUL-028");
  assert.equal(summary.source.newSimulationRuns, 0);
  assert.deepEqual(summary.design.binsPerDimensionFamily, [3, 4, 5, 6]);
  assert.equal(summary.primaryTest.criteriaPassed, 6);
  assert.equal(summary.primaryTest.criteriaTotal, 6);
  assert.equal(summary.primaryTest.pilotSupported, true);
  assert.equal(summary.results.passesByMetric.channelConcentration, 4);
  assert.equal(summary.results.passesByMetric.channelRecurrence, 4);
  assert.equal(summary.results.passesByMetric.directionalPersistence, 4);
  assert.equal(summary.results.passesByMetric.cellFluxDivergence, 4);
  assert.equal(summary.results.passesByMetric.turnoverDivergence, 3);
  assert.equal(Math.max(...Object.values(summary.results.rul027FourBinReproductionErrors)), 0);
});
