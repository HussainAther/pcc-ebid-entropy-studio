import type { RepositoryDefinition, ResearchEngine } from "../models/research";

const projectId = "project-pcc-ebid";

export const repositories: RepositoryDefinition[] = [
  {
    id: "REPO-PCC",
    name: "pcc",
    fullName: "HussainAther/pcc",
    role: "core",
    description: "Canonical EBID/PCC theory, reference observables, baseline numerical experiments, and paper-supporting analyses.",
    defaultBranch: "main",
    language: "Python",
    visibility: "public",
    status: "available",
    projectId,
  },
  {
    id: "REPO-PCC-BOIDS",
    name: "pcc-boids",
    fullName: "HussainAther/pcc-boids",
    role: "simulation",
    description: "Agent-based benchmark for flocking, spatial order, perturbation regimes, and emergent-transition diagnostics.",
    defaultBranch: "main",
    language: "Python",
    visibility: "public",
    status: "available",
    projectId,
  },
  {
    id: "REPO-PCC-EBID-ML",
    name: "pcc-ebid-ml",
    fullName: "HussainAther/pcc-ebid-ml",
    role: "analysis",
    description: "Machine-learning models for regime classification, transition prediction, representation learning, and uncertainty-aware inference.",
    defaultBranch: "main",
    language: "Python",
    visibility: "public",
    status: "available",
    projectId,
  },
  {
    id: "REPO-PCC-EBID-TRAINING",
    name: "pcc-ebid-training",
    fullName: "HussainAther/pcc-ebid-training",
    role: "training",
    description: "Dataset construction, training configurations, reproducible model fitting, evaluation, and checkpoint provenance.",
    defaultBranch: "main",
    language: "Python",
    visibility: "public",
    status: "available",
    projectId,
  },
];

export const researchEngines: ResearchEngine[] = [
  {
    id: "ENGINE-PCC-CORE",
    name: "PCC Core Reference Engine",
    repositoryId: "REPO-PCC",
    role: "core",
    description: "Reference engine for cyclic replicator experiments and canonical EBID observable implementations.",
    version: "0.1.0",
    status: "available",
    deterministic: true,
    entrypoints: [{ id: "EP-PCC-IMPORT", label: "Import reference artifacts", command: "python -m pcc.experiments", protocol: "python-module", description: "Planned normalized entrypoint for reference experiment execution and artifact export." }],
    supportedObservableIds: ["OBS-SHANNON", "OBS-DEFICIT", "OBS-KL", "OBS-QUADRATIC", "OBS-LOG-SLOPE", "OBS-DHDT"],
    supportedExperimentIds: ["E-007"],
    artifactSchemaVersion: "entropy-run/0.1",
    projectId,
  },
  {
    id: "ENGINE-PCC-BOIDS",
    name: "PCC Boids Simulation Engine",
    repositoryId: "REPO-PCC-BOIDS",
    role: "simulation",
    description: "Agent-based execution engine for noise sweeps, flock transitions, spatial entropy, polarization, and fragmentation benchmarks.",
    version: "0.2.0",
    status: "validated",
    deterministic: true,
    entrypoints: [
      { id: "EP-BOIDS-SWEEP", label: "Noise sweep", command: "python -m pcc_boids.run --experiment noise-sweep --seed 12345 --config configs/noise-sweep.json --output run.json", protocol: "python-module", description: "Validated deterministic PCC-Boids noise sweep that emits an Entropy Studio run artifact." },
      { id: "EP-BOIDS-IMPORT", label: "Import run artifact", command: "Import run.json in Simulation Bench", protocol: "artifact-import", description: "Schema-validated browser import for entropy-run/1.0.0 artifacts." }
    ],
    supportedObservableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-TRANSITION-LEAD"],
    supportedExperimentIds: ["E-BOIDS-001"],
    artifactSchemaVersion: "entropy-run/1.0.0",
    projectId,
  },
  {
    id: "ENGINE-EBID-ML",
    name: "EBID ML Analysis Engine",
    repositoryId: "REPO-PCC-EBID-ML",
    role: "analysis",
    description: "Consumes standardized trajectories and observable results to classify regimes, predict transitions, and report calibrated uncertainty.",
    version: "0.1.0",
    status: "planned",
    deterministic: false,
    entrypoints: [{ id: "EP-ML-INFER", label: "Analyze run artifact", command: "python -m ebid_ml.infer --manifest run.json", protocol: "artifact-import", description: "Target interface for analysis of Entropy Studio run manifests." }],
    supportedObservableIds: ["OBS-DEFICIT", "OBS-KL", "OBS-QUADRATIC", "OBS-LOG-SLOPE", "OBS-HAMMING"],
    supportedExperimentIds: [],
    artifactSchemaVersion: "entropy-analysis/0.1",
    projectId,
  },
  {
    id: "ENGINE-EBID-TRAINING",
    name: "EBID Model Training Engine",
    repositoryId: "REPO-PCC-EBID-TRAINING",
    role: "training",
    description: "Builds versioned datasets and trains models with frozen splits, seeds, configurations, metrics, and checkpoint metadata.",
    version: "0.1.0",
    status: "planned",
    deterministic: false,
    entrypoints: [{ id: "EP-TRAIN", label: "Train configured model", command: "python -m training.run --config config.yaml", protocol: "python-module", description: "Target reproducible training entrypoint." }],
    supportedObservableIds: [],
    supportedExperimentIds: [],
    artifactSchemaVersion: "entropy-training/0.1",
    projectId,
  },
  {
    id: "ENGINE-LOCAL-ECA",
    name: "Entropy Studio Elementary CA Engine",
    repositoryId: "REPO-PCC",
    role: "simulation",
    description: "Browser-local deterministic elementary cellular-automaton engine for complete finite rule-space benchmarks and perturbation-divergence studies.",
    version: "0.2.0",
    status: "validated",
    deterministic: true,
    entrypoints: [{ id: "EP-LOCAL-ECA", label: "Enumerate ECA rules", command: "runElementaryCA / ecaInstabilitySignature", protocol: "local", description: "In-process TypeScript implementation of the complete 256-rule elementary cellular-automaton family." }],
    supportedObservableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-PERTURB-GROWTH", "OBS-AUTOCORR-TIME", "OBS-COMPRESSION"],
    supportedExperimentIds: ["RUL-001", "RUL-002", "RUL-003"],
    artifactSchemaVersion: "entropy-rulial-campaign/1.0.0",
    projectId,
  },
  {
    id: "ENGINE-LOCAL-REPLICATOR",
    name: "Entropy Studio Local Replicator",
    repositoryId: "REPO-PCC",
    role: "simulation",
    description: "Browser-local deterministic reference runner used while external repository adapters are being standardized.",
    version: "0.1.0",
    status: "validated",
    deterministic: true,
    entrypoints: [{ id: "EP-LOCAL-E007", label: "Run E-007 locally", command: "executeExperimentRun", protocol: "local", description: "In-process TypeScript runner for the current cyclic-replicator protocol." }],
    supportedObservableIds: ["OBS-DEFICIT", "OBS-KL", "OBS-QUADRATIC", "OBS-LOG-SLOPE"],
    supportedExperimentIds: ["E-007"],
    artifactSchemaVersion: "entropy-run/0.1",
    projectId,
  },
];

export function validateEngineRegistry() {
  const repositoryIds = new Set(repositories.map(item => item.id));
  const engineIds = new Set<string>();
  const errors: string[] = [];
  for (const engine of researchEngines) {
    if (engineIds.has(engine.id)) errors.push(`Duplicate engine ID: ${engine.id}`);
    engineIds.add(engine.id);
    if (!repositoryIds.has(engine.repositoryId)) errors.push(`Missing repository ${engine.repositoryId} for ${engine.id}`);
  }
  return errors;
}
