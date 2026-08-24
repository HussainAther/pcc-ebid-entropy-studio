import type { ObserverDefinition, RuleSpaceDefinition } from "../models/ruliology";

const projectId = "project-pcc-ebid";

export const ruleSpaces: RuleSpaceDefinition[] = [
  {
    id: "RSPACE-ECA-256",
    name: "Elementary Cellular Automata",
    engineId: "ENGINE-LOCAL-ECA",
    representation: "finite",
    description: "The complete 256-rule radius-1 binary cellular-automaton family used as a calibration benchmark for rule-space analysis.",
    dimensions: [
      { id: "DIM-ECA-RULE", name: "Wolfram rule number", symbol: "r", kind: "discrete", description: "Eight-bit local transition table encoded as an integer from 0 through 255.", min: 0, max: 255, step: 1 },
    ],
    enumerable: true,
    size: 256,
    stateSpace: "Binary one-dimensional lattice with periodic boundary conditions.",
    transitionDescription: "Each cell updates synchronously from its left-center-right neighborhood according to the selected 8-bit lookup table.",
    observableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-COMPRESSION", "OBS-PERTURB-GROWTH", "OBS-AUTOCORR-TIME"],
    canonicalization: "Canonical rule ID is the decimal integer representation of the 8-bit local transition table.",
    tags: ["cellular automata", "finite", "enumerable", "benchmark"],
    projectId,
  },
  {
    id: "RSPACE-BOIDS-001",
    name: "Boids Interaction Rule Space",
    engineId: "ENGINE-PCC-BOIDS",
    representation: "parameterized",
    description: "Continuous flocking-rule family spanning separation, alignment, cohesion, noise, and neighborhood radius.",
    dimensions: [
      { id: "DIM-BOIDS-SEP", name: "Separation weight", symbol: "w_s", kind: "continuous", description: "Strength of short-range repulsion.", min: 0, max: 2 },
      { id: "DIM-BOIDS-ALIGN", name: "Alignment weight", symbol: "w_a", kind: "continuous", description: "Strength of heading alignment.", min: 0, max: 2 },
      { id: "DIM-BOIDS-COHERE", name: "Cohesion weight", symbol: "w_c", kind: "continuous", description: "Strength of attraction toward neighbors.", min: 0, max: 2 },
      { id: "DIM-BOIDS-NOISE", name: "Chaos / angular noise", symbol: "eta", kind: "continuous", description: "Stochastic heading perturbation amplitude.", min: 0, max: 1 },
      { id: "DIM-BOIDS-RADIUS", name: "Neighborhood radius", symbol: "r_n", kind: "continuous", description: "Interaction radius used to select local neighbors.", min: 0.01, max: 1 },
    ],
    enumerable: false,
    stateSpace: "Agent positions and velocities in a bounded spatial domain.",
    transitionDescription: "Agents update velocity from weighted separation, alignment, cohesion, and stochastic perturbation terms.",
    observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-TRANSITION-LEAD", "OBS-METASTABLE-DWELL"],
    tags: ["boids", "collective behavior", "continuous parameters", "emergence"],
    projectId,
  },
  {
    id: "RSPACE-REPLICATOR-001",
    name: "Cyclic Replicator Instability Family",
    engineId: "ENGINE-LOCAL-REPLICATOR",
    representation: "parameterized",
    description: "Minimal cyclic replicator family used to connect local linear instability to entropy-derived observables.",
    dimensions: [
      { id: "DIM-REP-EPSILON", name: "Instability parameter", symbol: "epsilon", kind: "continuous", description: "Controls local stability of the symmetric equilibrium.", min: -0.1, max: 0.2 },
    ],
    enumerable: false,
    stateSpace: "Three-strategy probability simplex.",
    transitionDescription: "Continuous-time cyclic replicator dynamics integrated numerically at fixed step size.",
    observableIds: ["OBS-DEFICIT", "OBS-KL", "OBS-QUADRATIC", "OBS-LOG-SLOPE"],
    tags: ["replicator", "continuous dynamics", "EBID", "local instability"],
    projectId,
  },
];

export const observers: ObserverDefinition[] = [
  {
    id: "OBSERVER-EBID-CORE",
    name: "EBID core observer",
    description: "Information-dynamics observer using entropy, divergence, perturbation, and recovery observables without semantic regime labels.",
    observableIds: ["OBS-SHANNON", "OBS-DEFICIT", "OBS-KL", "OBS-HAMMING", "OBS-PERTURB-GROWTH", "OBS-RECOVERY-TIME"],
    coarseGraining: "System-specific state distributions mapped to registered scalar observables.",
    temporalResolution: "Native simulation step plus declared aggregation windows.",
    spatialResolution: "Native lattice or agent resolution unless a registered coarse-graining is declared.",
    projectId,
  },
  {
    id: "OBSERVER-PCC-MACRO",
    name: "PCC macro-regime observer",
    description: "Coarse-grained observer intended for preregistered Pressure, Chaos, and Control regime criteria.",
    observableIds: ["OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL", "OBS-RECOVERY-TIME", "OBS-TRANSITION-LEAD"],
    coarseGraining: "Maps registered observables into explicitly declared PCC regime criteria; no post-hoc relabeling.",
    temporalResolution: "Declared regime window and transition persistence threshold.",
    spatialResolution: "System-level macrostate.",
    projectId,
  },
];
