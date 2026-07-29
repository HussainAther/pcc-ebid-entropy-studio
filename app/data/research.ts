import type { ResearchWorkspace } from "../models/research";
import { createPccObservables } from "./observables";
import { createEvidenceGraph } from "./evidenceGraph";
import { repositories, researchEngines } from "./engines";

const projectId = "project-pcc-ebid";

const pccWorkspaceBase: Omit<ResearchWorkspace, "evidenceGraph"> = {
  id: "workspace-pcc",
  name: "Entropy Studio",
  tagline: "Evidence-aware computational research",
  project: {
    id: projectId,
    slug: "pcc-ebid",
    title: "Structured Instability",
    shortTitle: "PCC / EBID",
    summary: "A provenance-aware program connecting mathematical claims, computational experiments, and critical review.",
    primaryQuestion: "Under what local conditions does an entropy-derived observable recover the dominant instability rate of a dynamical system?",
    questionId: "Q-017",
    status: "active",
    revision: "0.3",
    epistemicStatus: "Exploratory research",
    disclaimer: "Not clinical · not authoritative · no fabricated results",
    tags: ["complex systems", "entropy", "dynamical systems", "simulation"],
    updatedAt: "2026-07-27",
  },
  stats: {
    sourceArtifacts: 3344,
    trackedClaims: 28,
    claimsNeedingEvidence: 4,
    experiments: 7,
    reproducibleExperiments: 3,
    openQuestions: 12,
  },
  navigation: [
    { id: "overview", index: "00", label: "Research map", note: "program state" },
    { id: "corpus", index: "01", label: "Literature corpus", note: "sources + methods" },
    { id: "observables", index: "02", label: "Observable registry", note: "definitions + estimators" },
    { id: "engines", index: "03", label: "Repository + engines", note: "execution ecosystem" },
    { id: "graph", index: "04", label: "Knowledge graph", note: "claims + relations" },
    { id: "hypotheses", index: "05", label: "Hypothesis ledger", note: "testable questions" },
    { id: "experiments", index: "06", label: "Experiment design", note: "controls + metrics" },
    { id: "simulation", index: "07", label: "Simulation bench", note: "execute + compare" },
    { id: "review", index: "08", label: "Critical review", note: "claims + limitations" },
  ],
  lifecycle: [
    { index: "01", title: "Corpus", description: "Extract methods, equations, assumptions", view: "corpus" },
    { index: "02", title: "Observables", description: "Define estimators and validity bounds", view: "observables" },
    { index: "03", title: "Claims", description: "Connect statements to evidence", view: "graph" },
    { index: "04", title: "Hypotheses", description: "Define falsifiable alternatives", view: "hypotheses" },
    { index: "05", title: "Experiments", description: "Specify controls and metrics", view: "experiments" },
    { index: "06", title: "Results", description: "Execute without inventing outcomes", view: "simulation" },
  ],
  claims: [
    { id: "C-012", text: "Cyclic non-transitive interactions can sustain oscillatory regimes.", evidence: "supported", sourceIds: ["SRC-REPLICATOR"], relation: "supports H-003", projectId },
    { id: "C-018", text: "Entropy deficit is locally quadratic near the simplex equilibrium.", evidence: "established", sourceIds: ["SRC-MANUSCRIPT"], relation: "grounds EBID observable", projectId },
    { id: "C-021", text: "Log entropy-deficit growth may recover twice the leading linear growth rate.", evidence: "hypothesis", sourceIds: ["SRC-EXPERIMENTS"], relation: "tested by E-007", projectId },
    { id: "C-027", text: "The same observable remains informative across domain mappings.", evidence: "speculation", sourceIds: ["SRC-NOTES"], relation: "requires independent validation", projectId },
  ],
  sources: [
    { id: "SRC-README", name: "PCC / EBID framework README", type: "Markdown", status: "indexed", provenance: "archive", projectId },
    { id: "SRC-MANUSCRIPT", name: "Cyclic dissipative replicator manuscript", type: "LaTeX", status: "equations extracted", provenance: "archive", projectId },
    { id: "SRC-REPLICATOR", name: "EBID model implementations", type: "Python", status: "executable", provenance: "archive", projectId },
    { id: "SRC-EXPERIMENTS", name: "Spatial sweep results", type: "NPZ", status: "provenance partial", provenance: "archive", projectId },
    { id: "SRC-NOTES", name: "Source limitations", type: "Markdown", status: "indexed", provenance: "archive", projectId },
    { id: "SRC-BOIDS", name: "PCC-Boids simulation framework", type: "Python", status: "adapter validated", provenance: "archive", projectId },
  ],
  methods: [
    { id: "M-001", name: "Cyclic replicator dynamics", status: "code-located", projectId },
    { id: "M-002", name: "Simplex entropy and KL divergence", status: "code-located", projectId },
    { id: "M-003", name: "Linear stability analysis", status: "code-located", projectId },
    { id: "M-004", name: "Spatial lattice sweeps", status: "code-located", projectId },
    { id: "M-005", name: "Pitchfork / Ginzburg–Landau system", status: "described-in-notes", projectId },
    { id: "M-006", name: "Log-growth regression", status: "described-in-notes", projectId },
    { id: "M-007", name: "Seeded PCC-Boids noise sweep", status: "code-located", projectId },
  ],
  observables: createPccObservables(projectId),
  repositories,
  engines: researchEngines,
  graph: {
    nodes: [
      { id: "pcc", label: "PCC", kind: "framework", x: 50, y: 50, projectId },
      { id: "pressure", label: "Pressure", kind: "variable", x: 20, y: 24, projectId },
      { id: "chaos", label: "Chaos", kind: "variable", x: 50, y: 16, projectId },
      { id: "control", label: "Control", kind: "variable", x: 80, y: 24, projectId },
      { id: "replicator", label: "Replicator", kind: "method", x: 25, y: 72, projectId },
      { id: "entropy-deficit", label: "Entropy deficit", kind: "observable", x: 55, y: 78, projectId },
      { id: "instability-rate", label: "Instability rate", kind: "quantity", x: 85, y: 67, projectId },
      { id: "ebid", label: "EBID", kind: "framework", x: 72, y: 48, projectId },
    ],
    edges: [
      { id: "EDGE-001", sourceId: "pcc", targetId: "replicator", relation: "modeled by", evidence: "supported", projectId },
      { id: "EDGE-002", sourceId: "replicator", targetId: "entropy-deficit", relation: "produces observable", evidence: "supported", projectId },
      { id: "EDGE-003", sourceId: "entropy-deficit", targetId: "instability-rate", relation: "estimates", evidence: "hypothesis", projectId },
      { id: "EDGE-004", sourceId: "ebid", targetId: "entropy-deficit", relation: "defines", evidence: "supported", projectId },
    ],
  },
  hypotheses: [
    {
      id: "H-003", title: "Local entropy-growth correspondence", statement: "Near an unstable equilibrium, the log-growth slope of a locally quadratic entropy deficit equals twice the dominant real eigenvalue.", disconfirmingOutcome: "Reject if the fitted slope differs from 2λ beyond preregistered tolerance across seeds and initial perturbations.", evidence: "hypothesis", equation: "d/dt log ΔS(t) ≈ 2 Re(λmax)", assumptions: ["Trajectory remains in a declared local neighborhood.", "Observable is smooth and locally quadratic.", "The leading unstable mode is excited by the initial condition.", "Fit window is selected before outcome inspection."], derivedFromIds: ["C-018", "C-021", "SRC-REPLICATOR"], projectId,
    },
    {
      id: "H-006", title: "Observable robustness", statement: "KL divergence and quadratic distance recover the same local growth exponent when both are smooth at the equilibrium.", disconfirmingOutcome: "Reject if their confidence intervals do not overlap in the declared linear window.", evidence: "hypothesis", assumptions: ["Both observables are smooth at equilibrium.", "The same fit window is used for both observables."], derivedFromIds: ["C-018", "SRC-EXPERIMENTS"], projectId,
    },
    {
      id: "H-BOIDS-001", title: "Entropy precedes polarization collapse", statement: "During a preregistered PCC-Boids chaos sweep, heading entropy crosses its declared rise threshold at or before global polarization crosses its collapse threshold.", disconfirmingOutcome: "Reject for this benchmark if the first declared entropy-rise threshold occurs at a higher chaos level than polarization collapse across the preregistered sweep and seed ensemble.", evidence: "hypothesis", assumptions: ["Sweep levels and thresholds are fixed before execution.", "Tail averaging is identical at every chaos level.", "The same model parameters are used except for chaos and derived seed."], derivedFromIds: ["SRC-BOIDS", "C-027"], projectId,
    },
    {
      id: "H-011", title: "Cross-domain invariance", statement: "The same correspondence persists across replicator, physical, and learning toy systems.", disconfirmingOutcome: "Currently underspecified: domain mapping and equivalence criteria require revision.", evidence: "speculation", assumptions: ["Domain mappings preserve the relevant local dynamics."], derivedFromIds: ["C-027"], projectId,
    },
  ],
  experiments: [
    { id: "E-007", engineId: "ENGINE-LOCAL-REPLICATOR", title: "Local entropy-growth recovery", hypothesisId: "H-003", model: "cyclic_dissipative_replicator", observableIds: ["OBS-DEFICIT", "OBS-KL", "OBS-QUADRATIC", "OBS-LOG-SLOPE"], controls: ["stable ε < 0", "neutral ε = 0", "bad observable |x₀|"], primaryMetric: "absolute slope error |β̂ − 2λ|max", status: "active", projectId },
    { id: "E-BOIDS-001", engineId: "ENGINE-PCC-BOIDS", title: "Boids order-disorder transition under chaos", hypothesisId: "H-BOIDS-001", model: "pcc_boids_noise_sweep", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-TRANSITION-LEAD"], controls: ["fixed Pressure and Control", "fixed domain and agent count", "seeded initial conditions", "preregistered thresholds"], primaryMetric: "entropy transition lead Kcollapse - Kentropy", status: "active", projectId },
  ],
  reviewConcerns: [
    { id: "R01", severity: "major", title: "Unsupported universality language", description: "“Domain-independent” is stronger than the current toy-model evidence.", evidence: "speculation", projectId },
    { id: "R02", severity: "major", title: "Fit-window researcher degrees of freedom", description: "Window selection must be preregistered or sensitivity-tested.", evidence: "hypothesis", projectId },
    { id: "R03", severity: "major", title: "Observable-selection bias", description: "Positive results across three related deficits do not establish robustness to arbitrary observables.", evidence: "hypothesis", projectId },
    { id: "R04", severity: "major", title: "Finite-size and saturation effects", description: "Local slope claims should be separated from nonlinear late-time regimes.", evidence: "hypothesis", projectId },
    { id: "R05", severity: "major", title: "Missing independent reproduction", description: "Most evidence currently originates inside the same research program.", evidence: "speculation", projectId },
  ],
};

export const pccWorkspace: ResearchWorkspace = {
  ...pccWorkspaceBase,
  evidenceGraph: createEvidenceGraph(pccWorkspaceBase),
};
