import type { ResearchWorkspace } from "../models/research";
import { createPccObservables } from "./observables";
import { createEvidenceGraph } from "./evidenceGraph";
import { repositories, researchEngines } from "./engines";
import { observers, ruleSpaces } from "./ruleSpaces";

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
    experiments: 13,
    reproducibleExperiments: 4,
    openQuestions: 12,
  },
  navigation: [
    { id: "overview", index: "00", label: "Research map", note: "program state" },
    { id: "corpus", index: "01", label: "Literature corpus", note: "sources + methods" },
    { id: "observables", index: "02", label: "Observable registry", note: "definitions + estimators" },
    { id: "engines", index: "03", label: "Repository + engines", note: "execution ecosystem" },
    { id: "ruliology", index: "04", label: "Rulial Atlas", note: "rule spaces + observers" },
    { id: "graph", index: "05", label: "Knowledge graph", note: "claims + relations" },
    { id: "hypotheses", index: "06", label: "Hypothesis ledger", note: "testable questions" },
    { id: "experiments", index: "07", label: "Experiment design", note: "controls + metrics" },
    { id: "simulation", index: "08", label: "Simulation bench", note: "execute + compare" },
    { id: "orchestrator", index: "09", label: "Experiment orchestrator", note: "campaign automation" },
    { id: "figures", index: "10", label: "Figure Studio", note: "reproducible graphics" },
    { id: "statistics", index: "11", label: "Statistics Studio", note: "registered analyses" },
    { id: "publications", index: "12", label: "Publication Studio", note: "papers + manuscript" },
    { id: "datasets", index: "13", label: "Dataset Builder", note: "release packages" },
    { id: "review", index: "14", label: "Critical review", note: "claims + limitations" },
  ],
  lifecycle: [
    { index: "01", title: "Corpus", description: "Extract methods, equations, assumptions", view: "corpus" },
    { index: "02", title: "Observables", description: "Define estimators and validity bounds", view: "observables" },
    { index: "03", title: "Claims", description: "Connect statements to evidence", view: "graph" },
    { index: "04", title: "Hypotheses", description: "Define falsifiable alternatives", view: "hypotheses" },
    { index: "05", title: "Experiments", description: "Specify controls and metrics", view: "experiments" },
    { index: "06", title: "Campaigns", description: "Execute registered sweeps and downstream outputs", view: "orchestrator" },
    { index: "07", title: "Results", description: "Inspect runs without inventing outcomes", view: "simulation" },
    { index: "08", title: "Publication", description: "Generate traceable figures, analyses, and manuscripts", view: "publications" },
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
  ruleSpaces,
  observers,
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
      id: "H-RUL-001", title: "Finite rule-space instability structure", statement: "Elementary cellular automata exhibit reproducible structure in registered EBID-style observable profiles across a frozen ensemble of initial conditions and single-cell perturbations.", disconfirmingOutcome: "Treat the benchmark as unsupported if apparent classes or neighborhoods are not stable to held-out initial conditions, estimator choices, and perturbation locations.", evidence: "hypothesis", assumptions: ["All 256 rules are enumerated.", "Initial-condition and perturbation ensembles are frozen before clustering.", "Observer definitions are fixed before comparing classes."], derivedFromIds: ["SRC-README"], projectId,
    },
    {
      id: "H-RUL-002", title: "Rulial neighborhood sensitivity", statement: "Small changes in a rule representation do not uniformly imply small changes in EBID observable profiles; high-sensitivity boundaries can be localized reproducibly.", disconfirmingOutcome: "Reject the strong form if observable distance is smooth and approximately monotone with the declared rule distance across the benchmark under sensitivity analyses.", evidence: "hypothesis", assumptions: ["Rule and observable distances are declared before analysis.", "Feature normalization is frozen."], derivedFromIds: ["SRC-README"], projectId,
    },
    {
      id: "H-RUL-003", title: "Observer-dependent rulial equivalence", statement: "Some rule pairs are observationally equivalent under one preregistered observer but distinguishable under another.", disconfirmingOutcome: "The benchmark does not support observer dependence if equivalence partitions remain invariant across meaningfully distinct frozen observers within declared tolerances.", evidence: "hypothesis", assumptions: ["Observers differ in declared measurements or coarse-graining rather than outcome-tuned thresholds."], derivedFromIds: ["SRC-README"], projectId,
    },
    {
      id: "H-RUL-005", title: "Observer-space continuity", statement: "Within a frozen finite observer lattice, greater structural distance between observers is associated with greater divergence in the rulial geometries and candidate quotients they induce on one fixed trajectory population.", disconfirmingOutcome: "Do not claim structured observer geometry if observer structural distance has no reproducible association with quotient or full-geometry distance, or if the association disappears under frozen alternative resolution rules.", evidence: "hypothesis", assumptions: ["All observers reuse identical stored trajectories.", "Observer structure is declared before outcome analysis.", "Each observer resolution is calibrated by the same split-half rule."], derivedFromIds: ["SRC-README"], projectId,
    },
    {
      id: "H-RUL-006", title: "Boids rulial phase structure", statement: "A multidimensional sweep over flocking-rule parameters contains reproducible regions and transition boundaries in registered EBID/PCC observables that survive held-out seeds and local resampling.", disconfirmingOutcome: "Do not claim a stable rulial landscape if apparent regions or boundaries disappear under held-out seeds, alternative preregistered sampling designs, or modest estimator changes.", evidence: "hypothesis", assumptions: ["Sampling design is fixed before boundary analysis.", "Feature scaling and transition criteria are preregistered.", "Validation points are held out from exploratory boundary discovery."], derivedFromIds: ["SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-007", title: "Cross-substrate rulial structure", statement: "At least some dimensionless structural properties of rule-space geometry recur across discrete ECA and continuous stochastic Boids under a frozen cross-substrate comparison contract.", disconfirmingOutcome: "Do not claim a cross-substrate regularity when the frozen criteria fail in either substrate; retain failures rather than retuning thresholds or metrics.", evidence: "hypothesis", assumptions: ["Rule distances are dimensionless and frozen within each substrate.", "Only structural summaries, not raw mixed-observer distances, are compared across substrates.", "Discovery and holdout ensembles are disjoint within each substrate.", "The RUL-007 contract is versioned before adding a third substrate."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-008", title: "Network rulial structure under topology blocking", statement: "A stochastic binary network substrate exhibits reproducible rule-space geometry and heterogeneous local sensitivity when the same local rules are evaluated across preregistered topology blocks.", disconfirmingOutcome: "Do not treat the network substrate as structurally reproducible if discovery/holdout geometry fails the frozen stability checks or if local sensitivity collapses under held-out seeds; retain topology dependence rather than averaging it away post hoc.", evidence: "hypothesis", assumptions: ["The four-dimensional local rule metric is frozen before outcome analysis.", "Ring, small-world, and Erdos-Renyi topologies are fixed experimental blocks rather than outcome-tuned rule coordinates.", "Discovery and validation seeds are disjoint.", "The RUL-007 five-criterion contract remains unchanged for any later three-substrate test."], derivedFromIds: ["SRC-README"], projectId,
    },
    {
      id: "H-RUL-009", title: "Three-substrate structural recurrence", statement: "At least some dimensionless rule-space structural criteria recur across ECA, stochastic Boids, and topology-blocked stochastic networks under the unchanged RUL-007 comparison contract.", disconfirmingOutcome: "Do not claim three-substrate recurrence for any criterion that fails in one substrate; preserve substrate-specific failures and do not retune RUL-007 thresholds after observing RUL-008.", evidence: "hypothesis", assumptions: ["RUL-007 thresholds and definitions are reused unchanged.", "RUL-009 performs no new simulations and reuses frozen RUL-007/RUL-008 artifacts.", "Raw observable distances remain substrate-specific; only the versioned dimensionless structural criteria are compared."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-010", title: "Boids resolution and stochasticity decomposition", statement: "The weaker RUL-009 Boids replication can be diagnostically decomposed into finite-realization noise and observer-coordinate instability without changing the frozen RUL-009 benchmark.", disconfirmingOutcome: "Do not attribute the RUL-009 Boids gap to finite stochastic resolution if stability does not improve with independent seed averaging, and do not attribute it to per-step forcing if suppressing that forcing materially repairs the geometry.", evidence: "hypothesis", assumptions: ["The 32 RUL-006 rule coordinates are reused unchanged.", "Two disjoint new seed pools are fixed before analysis.", "RUL-009 remains frozen regardless of RUL-010 outcome.", "Observer subsets are diagnostic projections, not replacements for the RUL-006 observer."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-011", title: "Prospective Boids observer replication", statement: "On a new Boids rule-space sample and new seed pools, the preregistered state-structure observer reproduces rule-space geometry more stably than the frozen six-feature full observer identified as unstable in RUL-010.", disconfirmingOutcome: "Do not treat the RUL-010 observer diagnosis as independently replicated unless the state-structure observer exceeds full-core split-half stability by at least 0.05 in both complete-geometry and local-edge Spearman on the new design.", evidence: "hypothesis", assumptions: ["The 40-point Latin-hypercube design is new relative to RUL-006/RUL-010.", "Both four-seed pools are new and disjoint from all prior Boids seed pools.", "Observer feature sets and the 0.05 primary margins are frozen before RUL-011 outcomes are interpreted.", "All observer views use exactly the same 320 newly simulated trajectories."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-012", title: "Cross-substrate observer conditioning", statement: "Across ECA, Boids, and Network, observable coordinates with larger independent-pool same-rule displacement induce less reproducible single-feature rule-space geometry.", disconfirmingOutcome: "Treat the simple observer-conditioning hypothesis as challenged if pooled same-rule displacement is not strongly negatively associated with geometry stability under the frozen substrate-stratified permutation test.", evidence: "hypothesis", assumptions: ["No new simulations are added; frozen discovery/holdout profile populations are reused.", "The primary unit is an individual registered observable coordinate, not a post-hoc observer subset.", "Same-rule displacement is normalized by a discovery-pool robust feature scale.", "Permutation labels are shuffled only within substrate."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-013", title: "Observer information conditioning", statement: "Across ECA, Boids, and Network, individual observable coordinates with greater between-rule discrimination relative to independent-pool uncertainty induce more reproducible single-feature rule-space geometry.", disconfirmingOutcome: "Treat the information-conditioning hypothesis as challenged if ICC-like reliability is not strongly positively associated with geometry stability under the frozen substrate-stratified permutation test.", evidence: "hypothesis", assumptions: ["No new simulations are added; the same frozen profile pairs used by RUL-012 are reused.", "The primary predictor is an explicit two-pool reliability decomposition, not a post-hoc observer subset.", "The primary Spearman threshold is +0.70 and the permutation test uses 5,000 within-substrate shuffles.", "Degeneracy and support metrics are secondary diagnostics and do not replace the frozen primary test."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-014", title: "Prospective information-conditioned observer selection", statement: "A Boids observer selected prospectively by a frozen RUL-013 ICC-like reliability threshold reproduces unseen rule-space geometry more stably than the full six-feature observer.", disconfirmingOutcome: "Treat the hard-threshold selection rule as challenged unless the selected observer exceeds full-core split-half stability by at least 0.05 in both complete and local rule-space geometry on the new design.", evidence: "hypothesis", assumptions: ["The selection rule is frozen at ICC-like reliability >= 0.80 using only RUL-013 data.", "The 48-point Latin-hypercube design and both four-seed pools are new relative to RUL-006 and RUL-011.", "All observer views reuse the same 384 newly simulated trajectories.", "The +0.05 complete-geometry and local-edge margins are frozen before RUL-014 outcomes are interpreted."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-015", title: "Prospective continuous information-conditioned observer weighting", statement: "A continuous Boids observer metric weighted only by frozen RUL-013 reliability, signal-to-uncertainty, and degeneracy information reproduces unseen rule-space geometry more stably than equal weighting.", disconfirmingOutcome: "Treat this specific weighting equation as challenged unless it exceeds equal full-core weighting by at least 0.03 in both complete and local split-half geometry stability on the new design.", evidence: "hypothesis", assumptions: ["The weighting equation is frozen as ICC * log(1 + signal-to-uncertainty) * (1 - degeneracy) using only RUL-013 information.", "The 56-point Latin-hypercube design and both four-seed pools are new relative to RUL-006, RUL-011, and RUL-014.", "All four metric variants reuse the same 448 newly simulated trajectories.", "The +0.03 complete-geometry and local-edge margins are frozen before RUL-015 outcomes are interpreted."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-016", title: "Observer ablation and interaction structure", statement: "The frozen six-coordinate Boids observer exhibits non-additive feature effects: exact subset ablation reveals that observer stability cannot be explained as a simple sum of independent coordinate contributions.", disconfirmingOutcome: "Treat strong feature interaction as unsupported if every exact pairwise geometry interaction has absolute magnitude below 0.05; preserve the exhaustive subset results regardless of whether the diagnostic threshold is crossed.", evidence: "hypothesis", assumptions: ["RUL-016 introduces zero new unique simulations and reuses the deterministic RUL-015 design and seed pools.", "All 63 non-empty subsets of the six-coordinate observer are evaluated exhaustively.", "Shapley and pair-interaction summaries are bookkeeping decompositions of a finite observer set function, not causal feature effects.", "The empty observer is assigned value zero only as an explicit decomposition baseline."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-017", title: "Prospective interaction-informed compact observer validation", statement: "The three-coordinate Boids observer identified diagnostically by RUL-016 reproduces unseen rule-space geometry more stably than the established four-coordinate RUL-013 hard-selection observer.", disconfirmingOutcome: "Treat the RUL-016 subset choice as not prospectively supported unless the frozen three-feature observer exceeds the four-feature comparison observer by at least 0.01 in both complete and local split-half geometry stability on the new design.", evidence: "hypothesis", assumptions: ["The three-feature observer is frozen before RUL-017 outcomes as polarization + spatial entropy + speed variance.", "The 40-point Latin-hypercube design and both four-seed pools are new relative to RUL-006, RUL-011, RUL-014, and RUL-015.", "All observer views reuse the same 320 newly simulated trajectories.", "The +0.01 complete-geometry and local-edge margins are frozen before RUL-017 outcomes are interpreted."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-018", title: "Objective-dependent observer geometry", statement: "Within the frozen six-coordinate Boids observer family, different scientific objectives select different optimal observer subsets rather than a single observer maximizing global geometry, local geometry, and extreme-boundary recovery simultaneously.", disconfirmingOutcome: "Treat objective dependence as unsupported on the frozen RUL-017 population if the same subset is co-optimal for all three objectives and objective rankings are nearly identical.", evidence: "hypothesis", assumptions: ["RUL-018 adds zero new unique simulations and reuses the frozen RUL-017 rule coordinates and seed pools.", "All 63 non-empty subsets of the six registered Boids coordinates are evaluated.", "The three objectives are fixed as complete-geometry stability, local-edge geometry stability, and top-10% local-boundary Jaccard.", "Tied boundary optima are preserved as co-optimal sets rather than broken post hoc."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-019", title: "Cross-substrate objective-dependent observer geometry", statement: "Objective-dependent observer geometry recurs across ECA, Boids, and Network substrates: global and local geometry objectives remain more closely aligned with each other than either is with extreme-boundary recovery, and no single observer subset is co-optimal across all three objectives within any frozen native feature family.", disconfirmingOutcome: "Treat cross-substrate objective dependence as unsupported if any substrate has a common all-objective optimum or if boundary-recovery rankings are at least as aligned with geometry rankings as global and local geometry are with each other.", evidence: "hypothesis", assumptions: ["RUL-019 adds zero new unique simulations and reuses frozen ECA, RUL-018 Boids, and RUL-008 Network discovery/holdout populations.", "Each substrate enumerates all non-empty subsets of its own native core observer feature basis.", "The three objectives are fixed as complete-geometry stability, local-edge geometry stability, and top-10% local-boundary Jaccard.", "Feature identities are not compared directly across unlike substrates; only objective-dependence structure is compared."], derivedFromIds: ["SRC-README", "SRC-BOIDS"], projectId,
    },
    {
      id: "H-RUL-020", title: "Mutable-rule ecological response", statement: "Under a frozen resource-scarcity intervention, a mutable ALife population exhibits reproducible population-level motion through its heritable rule space that exceeds both stable-environment drift and a matched no-mutation scarcity control while the population remains extant.", disconfirmingOutcome: "Treat the pilot as challenged if scarcity-mutable rule-centroid displacement does not exceed stable drift by 0.015 normalized rule distance, does not exceed scarcity-frozen displacement by 0.010, has mean pairwise post-shock direction cosine below 0.20, or produces extinction in more than 25% of frozen seeds.", evidence: "hypothesis", assumptions: ["RUL-020 is an engineered ALife pilot rather than a biological-evolution claim.", "Three conditions share matched seeds and environmental geometry: stable mutable, scarcity mutable, and scarcity frozen.", "Rule coordinates are normalized to their declared bounds before centroid displacement and directional reproducibility are computed.", "The scarcity-frozen control removes offspring mutation but retains selection on standing initial rule variation."], derivedFromIds: ["SRC-README"], projectId,
    },
    {
      id: "H-RUL-022", title: "Selection-shaped alignment with a local scarcity-performance gradient", statement: "Post-shock scarcity-induced motion through the mutable ALife rule space aligns positively with a locally estimated scarcity-performance gradient and exceeds the alignment produced by the matched rule-blind neutral bottleneck.", disconfirmingOutcome: "Treat selection-shaped directionality as challenged unless median scarcity-gradient cosine is at least 0.10, median paired scarcity-minus-neutral alignment is at least +0.10, at least two thirds of seeds have positive scarcity alignment, and a nonzero local gradient is identifiable in at least three quarters of seeds.", evidence: "hypothesis", assumptions: ["RUL-022 reuses RUL-021 motion trajectories and adds separate homogeneous no-mutation finite-difference probe simulations.", "The local performance target is 120-step time-averaged population persistence under immediate scarcity, not a universal evolutionary fitness measure.", "Finite differences use +/-0.06 normalized rule units in each of the four declared rule coordinates.", "Probe simulations reuse seed-matched environmental geometry but are distinct from the RUL-021 motion trajectories."], derivedFromIds: ["H-RUL-021", "SRC-README"], projectId,
    },
    {
      id: "H-RUL-021", title: "Selection-induced rule motion beyond neutral bottlenecking", statement: "After a fixed pre-intervention burn-in, resource-dependent scarcity produces greater and more directionally reproducible post-shock motion through the heritable ALife rule space than a matched rule-blind demographic bottleneck of the same depth with mutation retained.", disconfirmingOutcome: "Treat the selection-specific motion hypothesis as challenged unless scarcity exceeds the matched neutral bottleneck by at least 0.015 median paired post-shock rule distance, does so in at least two thirds of frozen seeds, and exceeds neutral directional reproducibility by at least 0.10 while bottleneck depth is matched within 0.06 median absolute fraction error.", evidence: "hypothesis", assumptions: ["RUL-021 is an engineered ALife control experiment, not a biological-evolution claim.", "All conditions use a 180-step burn-in before the intervention.", "The neutral control retains mutation and stable resources but receives one random rule-blind cull whose depth is derived from the matched scarcity run for the same seed.", "The neutral control matches bottleneck depth rather than the full scarcity demographic trajectory."], derivedFromIds: ["H-RUL-020", "SRC-README"], projectId,
    },
    {
      id: "H-RUL-023", title: "Scarcity-specific contrastive selection gradient", statement: "Post-shock scarcity-induced rule motion aligns with the local environmental contrast gradient grad(F_scarcity) - grad(F_stable) and exceeds the alignment produced by the matched rule-blind neutral bottleneck.", disconfirmingOutcome: "Treat scarcity-specific directional selection as challenged unless median scarcity/contrastive-gradient cosine is at least 0.10, median paired scarcity-minus-neutral contrastive alignment is at least +0.10, at least two thirds of seeds have positive scarcity alignment, and a nonzero contrastive gradient is identifiable in at least three quarters of seeds.", evidence: "hypothesis", assumptions: ["RUL-023 reuses RUL-021 motion and committed RUL-022 scarcity probes without rerunning them.", "Stable-resource probes use the same seed geometry, pre-shock rule centroid, +/-0.06 normalized finite-difference step, 120-step horizon, and no-mutation homogeneous population contract as RUL-022.", "The contrastive gradient is defined prospectively as grad(F_scarcity) - grad(F_stable).", "Population persistence remains an engineered short-horizon performance proxy rather than a universal evolutionary fitness measure."], derivedFromIds: ["H-RUL-022", "H-RUL-021", "SRC-README"], projectId,
    },

    {
      id: "H-RUL-024", title: "Frequency-dependent invasion gradient", statement: "Post-shock scarcity-induced rule motion aligns with a local invasion gradient measured by tagged-mutant frequency change in the actual mixed pre-shock resident population and exceeds alignment of the matched neutral bottleneck motion.", disconfirmingOutcome: "Treat this context-dependent invasion-gradient hypothesis as challenged unless median scarcity alignment is at least 0.10, median paired scarcity-minus-neutral alignment is at least +0.10, at least two thirds of seeds have positive scarcity alignment, and a nonzero invasion gradient is identifiable in at least three quarters of seeds.", evidence: "hypothesis", assumptions: ["RUL-024 reuses RUL-021 motion vectors without rerunning them.", "Each +/- probe replays the matched seed-specific burn-in and introduces a 10% tagged mutant into the actual mixed resident population at shock time.", "Mutant rule offsets are +/-0.06 normalized units and post-introduction mutation is disabled to preserve tag identity.", "Tagged-mutant frequency change is an engineered invasion proxy, not biological fitness."], derivedFromIds: ["H-RUL-023", "H-RUL-021", "SRC-README"], projectId,
    },
    {
      id: "H-RUL-025", title: "Lineage-resolved decomposition of rulial motion", statement: "The post-shock ALife population centroid hides heterogeneous founder-lineage motion and is driven primarily by between-lineage abundance reweighting rather than coherent within-lineage rule change; scarcity should exhibit more reweighting than the matched neutral bottleneck if resource-dependent pressure adds lineage sorting beyond demographic loss.", disconfirmingOutcome: "Treat the full lineage-specific hypothesis as challenged unless the centroid decomposition reconstructs exactly, scarcity median reweighting norm share is at least 0.60, scarcity exceeds neutral reweighting share by at least +0.10, lineage directions are heterogeneous with median pairwise cosine at most 0.50 and at least three moving survivor lineages in three quarters of seeds, and deterministic replays match RUL-021 exactly.", evidence: "hypothesis", assumptions: ["RUL-025 introduces no new seed/parameter conditions and deterministically replays only the frozen RUL-021 scarcity and neutral arms with non-invasive lineage logging.", "Founder identity is bookkeeping lineage identity, not a biological species concept.", "The symmetric two-time decomposition separates within-lineage centroid change from between-lineage abundance reweighting descriptively.", "Extinct lineages retain their pre-shock centroid in the decomposition so disappearance is assigned to reweighting."], derivedFromIds: ["H-RUL-024", "H-RUL-021", "SRC-README"], projectId,
    },
    {
      id: "H-RUL-026", title: "Time-resolved lineage transport through rule space", statement: "The endpoint lineage decomposition hides a temporally tortuous flow of population mass among founder lineages; scarcity should remain cumulatively reweighting-dominated, show sequential dominant-lineage changes, and exhibit more cumulative lineage turnover than the matched neutral bottleneck.", disconfirmingOutcome: "Treat the full time-resolved transport hypothesis as challenged unless every interval reconstructs exactly, scarcity median cumulative reweighting share is at least 0.60, median reweighting-path tortuosity is at least 1.50, at least half of scarcity seeds switch dominant lineage at least once, scarcity exceeds neutral cumulative lineage turnover by at least +0.10, and deterministic replays match RUL-021 exactly.", evidence: "hypothesis", assumptions: ["RUL-026 adds no new seed/parameter conditions and deterministically replays the frozen RUL-021 scarcity and neutral arms.", "Lineage snapshots are observational and consume no random numbers.", "Cumulative total-variation turnover and path tortuosity depend on the frozen five-step record cadence.", "Temporal lineage transport is descriptive and is not by itself evidence of adaptive selection."], derivedFromIds: ["H-RUL-025", "H-RUL-021", "SRC-README"], projectId,
    },
    {
      id: "H-RUL-027", title: "Coarse-grained rulial flux channels", statement: "The time-resolved lineage transport observed in RUL-026 should concentrate into recurring coarse rule-space channels with nonzero local directional persistence, and scarcity should allocate flux and lineage-turnover mass differently across rule space than the matched neutral bottleneck.", disconfirmingOutcome: "Treat the full coarse-flux pilot as challenged unless lineage segment vectors exactly reconstruct RUL-026 interval within-lineage vectors, scarcity top-flux cells recur across frozen seed halves, the top 20% of occupied scarcity cells carry at least half of advective flux, flux-weighted local directional persistence is at least 0.20, scarcity-vs-neutral cell-flux and abundance-turnover Jensen-Shannon divergences are each at least 0.05 bits, and deterministic replays match RUL-021.", evidence: "hypothesis", assumptions: ["Four equal-width bins per normalized rule coordinate are frozen before RUL-027 outcomes.", "RUL-027 adds no new seed/parameter conditions and replays RUL-021 deterministically.", "Flux channels are coarse descriptive summaries and are not physical currents or evidence of adaptation.", "All channel metrics depend on the declared five-step sampling cadence and four-bin spatial resolution."], derivedFromIds: ["H-RUL-026", "H-RUL-025", "SRC-README"], projectId,
    },
    {
      id: "H-RUL-028", title: "Multiscale robustness of rulial flux channels", statement: "The qualitative coarse-flux structure observed in RUL-027 should survive a prespecified family of rule-space resolutions rather than depend on the single four-bin grid.", disconfirmingOutcome: "Treat multiscale robustness as challenged unless the committed four-bin projection is reproduced exactly and each RUL-027 qualitative threshold for channel concentration, seed-half recurrence, directional persistence, cell-flux divergence, and abundance-turnover divergence passes at least three of four frozen resolutions b in {3,4,5,6}.", evidence: "hypothesis", assumptions: ["The resolution family b={3,4,5,6}, original RUL-027 thresholds, and >=3/4 robustness rule are frozen before RUL-028 outcomes.", "RUL-028 performs no new simulations and re-bins the exact committed RUL-027 lineage segments.", "Persistence across four nearby grid resolutions reduces but does not eliminate observer dependence.", "No grid-free continuum-current or adaptive-selection claim follows from this diagnostic."], derivedFromIds: ["H-RUL-027", "H-RUL-026", "SRC-README"], projectId,
    },
    {
      id: "H-RUL-029", title: "Temporal coarse-graining robustness of rulial flux channels", statement: "The qualitative RUL-027 flux-channel structure should survive a prespecified family of temporal sampling cadences rather than depend on the five-step lineage-record interval.", disconfirmingOutcome: "Treat temporal robustness as challenged unless the committed five-step projection is reproduced exactly and each frozen RUL-027 threshold for channel concentration, seed-half recurrence, directional persistence, cell-flux divergence, and abundance-turnover divergence passes at least three of four cadences dt in {5,10,20,40}.", evidence: "hypothesis", assumptions: ["The cadence family dt={5,10,20,40}, four-bin spatial observer, original RUL-027 thresholds, and >=3/4 robustness rule are frozen before RUL-029 outcomes.", "RUL-029 performs no new simulations and reconstructs lineage snapshots from the committed RUL-027 segments.", "The intervention boundary 179->180 and final endpoint are retained at every cadence.", "Passing does not imply continuum-time invariance or observer independence."], derivedFromIds: ["H-RUL-028", "H-RUL-027", "SRC-README"], projectId,
    },
    {
      id: "H-011", title: "Cross-domain invariance", statement: "The same correspondence persists across replicator, physical, and learning toy systems.", disconfirmingOutcome: "Currently underspecified: domain mapping and equivalence criteria require revision.", evidence: "speculation", assumptions: ["Domain mappings preserve the relevant local dynamics."], derivedFromIds: ["C-027"], projectId,
    },
  ],
  experiments: [
    { id: "RUL-023", engineId: "ENGINE-LOCAL-ALIFE", title: "Contrastive scarcity-versus-stable fitness-gradient alignment", hypothesisId: "H-RUL-023", model: "spatial_mutable_rule_ecology_contrastive_gradient", observableIds: ["OBS-CONTRASTIVE-FITNESS-GRADIENT-ALIGNMENT", "OBS-FITNESS-GRADIENT-ALIGNMENT", "OBS-POSTSHOCK-RULE-DISPLACEMENT"], controls: ["RUL-021 motion vectors frozen and reused", "RUL-022 scarcity probes frozen and reused", "12 matched seeds", "8 new stable-resource finite-difference probes per seed", "same +/-0.06 normalized-rule step and 120-step persistence target", "neutral bottleneck motion compared against the same contrastive gradient"], primaryMetric: "paired scarcity-versus-neutral cosine alignment with grad(F_scarcity)-grad(F_stable)", status: "active", projectId },
    { id: "RUL-024", engineId: "ENGINE-LOCAL-ALIFE", title: "Frequency-dependent invasion-gradient alignment", hypothesisId: "H-RUL-024", model: "spatial_mutable_rule_ecology_invasion_gradient", observableIds: ["OBS-INVASION-GRADIENT-ALIGNMENT", "OBS-POSTSHOCK-RULE-DISPLACEMENT", "OBS-LINEAGE-DIVERSITY"], controls: ["RUL-021 scarcity and neutral motion vectors frozen and reused", "12 matched seeds", "actual mixed resident population regenerated by identical seed-specific burn-in", "10% rule-blind tagged mutant introduction", "+/-0.06 normalized-rule finite differences", "post-introduction mutation disabled"], primaryMetric: "paired scarcity-versus-neutral cosine alignment with the local tagged-mutant invasion gradient", status: "active", projectId },
    { id: "RUL-026", engineId: "ENGINE-LOCAL-ALIFE", title: "Time-resolved lineage transport through rule space", hypothesisId: "H-RUL-026", model: "spatial_mutable_rule_ecology_lineage_transport", observableIds: ["OBS-CUMULATIVE-LINEAGE-TURNOVER", "OBS-REWEIGHTING-PATH-TORTUOSITY", "OBS-LINEAGE-REWEIGHTING-SHARE", "OBS-LINEAGE-DIVERSITY"], controls: ["RUL-021 scarcity and neutral seed/parameter conditions frozen", "24 deterministic non-invasive replay runs", "five-step lineage snapshot cadence frozen", "symmetric interval decomposition at every adjacent snapshot", "exact source-trajectory replay check"], primaryMetric: "cumulative lineage turnover, reweighting path tortuosity, and sequential dominance under scarcity versus neutral bottleneck", status: "active", projectId },
    { id: "RUL-028", engineId: "ENGINE-LOCAL-ALIFE", title: "Multiscale rulial flux robustness", hypothesisId: "H-RUL-028", model: "spatial_mutable_rule_ecology_multiscale_flux", observableIds: ["OBS-RULIAL-FLUX-RESOLUTION-ROBUSTNESS", "OBS-RULIAL-FLUX-CHANNEL-CONCENTRATION", "OBS-RULIAL-FLUX-DIRECTIONAL-PERSISTENCE", "OBS-RULIAL-FLUX-PROFILE-DIVERGENCE"], controls: ["zero new simulations", "exact committed RUL-027 segments reused", "frozen b={3,4,5,6} equal-width grid family", "original RUL-027 thresholds unchanged", ">=3/4 scales required for qualitative robustness", "exact four-bin reproduction check"], primaryMetric: "cross-resolution persistence of RUL-027 channel concentration, recurrence, directional persistence, and scarcity-neutral flux/turnover divergence", status: "active", projectId },
    { id: "RUL-029", engineId: "ENGINE-LOCAL-ALIFE", title: "Temporal rulial flux robustness", hypothesisId: "H-RUL-029", model: "spatial_mutable_rule_ecology_temporal_flux", observableIds: ["OBS-RULIAL-FLUX-TEMPORAL-ROBUSTNESS", "OBS-RULIAL-FLUX-CHANNEL-CONCENTRATION", "OBS-RULIAL-FLUX-DIRECTIONAL-PERSISTENCE", "OBS-RULIAL-FLUX-PROFILE-DIVERGENCE"], controls: ["zero new simulations", "committed RUL-027 lineage states reconstructed", "fixed four-bin spatial observer", "frozen dt={5,10,20,40} cadence family", "original RUL-027 thresholds unchanged", ">=3/4 cadences required for qualitative robustness", "exact five-step reproduction check"], primaryMetric: "cross-cadence persistence of RUL-027 channel concentration, recurrence, directional persistence, and scarcity-neutral flux/turnover divergence", status: "active", projectId },
    { id: "RUL-027", engineId: "ENGINE-LOCAL-ALIFE", title: "Coarse-grained rulial flux network", hypothesisId: "H-RUL-027", model: "spatial_mutable_rule_ecology_flux_network", observableIds: ["OBS-RULIAL-FLUX-CHANNEL-CONCENTRATION", "OBS-RULIAL-FLUX-DIRECTIONAL-PERSISTENCE", "OBS-RULIAL-FLUX-PROFILE-DIVERGENCE", "OBS-CUMULATIVE-LINEAGE-TURNOVER"], controls: ["RUL-021 scarcity and neutral conditions frozen", "RUL-026 five-step lineage transport cadence frozen", "four bins per normalized rule coordinate frozen", "first-six versus last-six seed-half recurrence check", "exact interval-flux reconstruction against RUL-026", "exact deterministic source replay"], primaryMetric: "recurrence, concentration, directional persistence, and condition divergence of coarse lineage flux through rule space", status: "active", projectId },
    { id: "RUL-025", engineId: "ENGINE-LOCAL-ALIFE", title: "Lineage-resolved rule-motion decomposition", hypothesisId: "H-RUL-025", model: "spatial_mutable_rule_ecology_lineage_decomposition", observableIds: ["OBS-LINEAGE-REWEIGHTING-SHARE", "OBS-LINEAGE-DIRECTIONAL-COHERENCE", "OBS-LINEAGE-DIVERSITY", "OBS-POSTSHOCK-RULE-DISPLACEMENT"], controls: ["RUL-021 scarcity and neutral seed/parameter conditions frozen", "24 deterministic non-invasive replay runs", "founder-lineage identities preserved", "symmetric two-time within-lineage/reweighting decomposition", "exact source-trajectory replay check"], primaryMetric: "scarcity versus neutral lineage-reweighting share and within-lineage directional coherence", status: "active", projectId },
    { id: "RUL-022", engineId: "ENGINE-LOCAL-ALIFE", title: "Local fitness-gradient alignment of rulial motion", hypothesisId: "H-RUL-022", model: "spatial_mutable_rule_ecology_local_gradient", observableIds: ["OBS-FITNESS-GRADIENT-ALIGNMENT", "OBS-POSTSHOCK-RULE-DISPLACEMENT", "OBS-POPULATION-RECOVERY"], controls: ["RUL-021 motion vectors frozen and reused", "12 matched seeds", "8 finite-difference performance probes per seed", "homogeneous no-mutation immediate-scarcity probes", "+/-0.06 normalized-rule step", "neutral bottleneck motion compared against the same seed-specific gradient"], primaryMetric: "paired scarcity-versus-neutral cosine alignment with the local scarcity-performance gradient", status: "active", projectId },
    { id: "RUL-021", engineId: "ENGINE-LOCAL-ALIFE", title: "Selection versus matched neutral bottleneck", hypothesisId: "H-RUL-021", model: "spatial_mutable_rule_ecology_selection_control", observableIds: ["OBS-POSTSHOCK-RULE-DISPLACEMENT", "OBS-BOTTLENECK-DEPTH", "OBS-RULE-PATH-LENGTH", "OBS-RULE-DIVERSITY", "OBS-POPULATION-RECOVERY", "OBS-LINEAGE-DIVERSITY"], controls: ["12 new frozen matched seeds", "180-step burn-in", "stable mutable environment", "scarcity mutable environment", "depth-matched rule-blind neutral bottleneck with mutation retained", "normalized four-dimensional rule metric"], primaryMetric: "paired scarcity-minus-neutral post-shock rule-centroid displacement and directional reproducibility", status: "active", projectId },
    { id: "RUL-020", engineId: "ENGINE-LOCAL-ALIFE", title: "Mutable-rule ALife ecological response", hypothesisId: "H-RUL-020", model: "spatial_mutable_rule_ecology", observableIds: ["OBS-RULE-CENTROID-DISPLACEMENT", "OBS-RULE-DIVERSITY", "OBS-RULE-PATH-LENGTH", "OBS-POPULATION-RECOVERY", "OBS-LINEAGE-DIVERSITY"], controls: ["12 frozen matched seeds", "stable mutable environment", "scarcity mutable environment", "scarcity frozen no-mutation control", "fixed spatial resource/hazard geometry per seed", "normalized four-dimensional rule metric"], primaryMetric: "scarcity-induced rule-centroid displacement and directional reproducibility relative to stable and frozen controls", status: "active", projectId },
    { id: "RUL-019", engineId: "ENGINE-LOCAL-ECA", title: "Cross-substrate objective-dependent observer geometry", hypothesisId: "H-RUL-019", model: "cross_substrate_objective_observer_geometry", observableIds: ["OBS-RULE-SENSITIVITY"], controls: ["zero new unique simulations", "all non-empty native observer subsets per substrate", "three fixed objectives", "frozen local-neighbor graphs", "preserve tied optima", "no cross-substrate feature-identity matching"], primaryMetric: "cross-substrate recurrence of objective-specific optima and geometry-vs-boundary rank decoupling", status: "active", projectId },
    { id: "RUL-018", engineId: "ENGINE-PCC-BOIDS", title: "Objective-dependent observer geometry", hypothesisId: "H-RUL-018", model: "boids_objective_dependent_observer", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["reuse frozen RUL-017 population", "all 63 non-empty observer subsets", "three fixed objectives", "preserve tied optima", "zero new unique simulations"], primaryMetric: "objective-specific observer optima and cross-objective rank agreement", status: "active", projectId },
    { id: "RUL-017", engineId: "ENGINE-PCC-BOIDS", title: "Prospective interaction-informed compact observer validation", hypothesisId: "H-RUL-017", model: "boids_rul016_interaction3_validation", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["three-feature candidate frozen from RUL-016 before new outcomes", "new 40-point deterministic Latin hypercube", "two new disjoint four-seed pools", "full-core/four-feature/three-feature observers on identical trajectories", "pool-A-only feature scaling", "primary +0.01 geometry and local margins fixed before outcome"], primaryMetric: "prospective interaction-informed three-feature minus four-feature split-half geometry and local-edge stability", status: "active", projectId },
    { id: "RUL-016", engineId: "ENGINE-PCC-BOIDS", title: "Exact observer subset ablation and interaction decomposition", hypothesisId: "H-RUL-016", model: "boids_observer_boolean_lattice", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["reuse frozen RUL-015 56-point design", "reuse frozen RUL-015 disjoint seed pools", "all 63 non-empty observer subsets", "exact leave-one-out, Shapley, and pair-interaction decomposition", "no post-hoc subset presented as prospective"], primaryMetric: "exact non-additivity of split-half geometry stability over the six-feature observer Boolean lattice", status: "active", projectId },
    { id: "E-007", engineId: "ENGINE-LOCAL-REPLICATOR", title: "Local entropy-growth recovery", hypothesisId: "H-003", model: "cyclic_dissipative_replicator", observableIds: ["OBS-DEFICIT", "OBS-KL", "OBS-QUADRATIC", "OBS-LOG-SLOPE"], controls: ["stable ε < 0", "neutral ε = 0", "bad observable |x₀|"], primaryMetric: "absolute slope error |β̂ − 2λ|max", status: "active", projectId },
    { id: "E-BOIDS-001", engineId: "ENGINE-PCC-BOIDS", title: "Boids order-disorder transition under chaos", hypothesisId: "H-BOIDS-001", model: "pcc_boids_noise_sweep", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-TRANSITION-LEAD"], controls: ["fixed Pressure and Control", "fixed domain and agent count", "seeded initial conditions", "preregistered thresholds"], primaryMetric: "entropy transition lead Kcollapse - Kentropy", status: "active", projectId },
    { id: "RUL-001", engineId: "ENGINE-LOCAL-ECA", title: "Elementary CA instability atlas", hypothesisId: "H-RUL-001", model: "elementary_cellular_automata_256", observableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-PERTURB-GROWTH", "OBS-COMPRESSION", "OBS-AUTOCORR-TIME"], controls: ["complete enumeration of rules 0-255", "frozen initial-condition ensemble", "matched single-cell perturbations", "periodic boundaries", "held-out validation initial conditions"], primaryMetric: "stability of EBID profile structure under held-out conditions", status: "active", projectId },
    { id: "RUL-002", engineId: "ENGINE-LOCAL-ECA", title: "Rulial neighborhood sensitivity", hypothesisId: "H-RUL-002", model: "eca_rule_neighbor_comparison", observableIds: ["OBS-RULE-SENSITIVITY", "OBS-HAMMING", "OBS-PERTURB-GROWTH"], controls: ["frozen rule metric", "frozen feature scaling", "same initial-condition ensemble per rule"], primaryMetric: "observable-distance / rule-distance sensitivity", status: "active", projectId },
    { id: "RUL-003", engineId: "ENGINE-LOCAL-ECA", title: "Observer-dependent EBID equivalence classes", hypothesisId: "H-RUL-003", model: "eca_observer_equivalence", observableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-MUTUAL-INFO", "OBS-AUTOCORR-TIME"], controls: ["observers frozen before clustering", "epsilon sensitivity analysis", "post-hoc comparison to external CA classes only"], primaryMetric: "partition stability and cross-observer disagreement", status: "active", projectId },
    { id: "RUL-004", engineId: "ENGINE-LOCAL-ECA", title: "Observer-induced rulial quotient structure", hypothesisId: "H-RUL-003", model: "eca_fixed_trajectory_observer_projection", observableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-PERTURB-GROWTH", "OBS-COMPRESSION", "OBS-AUTOCORR-TIME"], controls: ["same stored trajectories for every observer", "16-seed expanded ensemble", "disjoint eight-seed split halves", "observer-specific epsilon from same-rule split-half variability", "complete-link candidate classes"], primaryMetric: "cross-observer geometry and equivalence-partition disagreement", status: "active", projectId },
    { id: "RUL-005", engineId: "ENGINE-LOCAL-ECA", title: "Observer-space geometry on a fixed ECA population", hypothesisId: "H-RUL-005", model: "eca_observer_subset_lattice", observableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-PERTURB-GROWTH", "OBS-COMPRESSION", "OBS-AUTOCORR-TIME"], controls: ["same 4,096 stored trajectories for all 31 observers", "all non-empty subsets of a frozen five-feature basis", "normalized Hamming observer distance", "observer-specific epsilon from median split-half self-distance", "no external CA labels"], primaryMetric: "Spearman association between observer structural distance and induced quotient/geometry distance", status: "active", projectId },
    { id: "RUL-006", engineId: "ENGINE-PCC-BOIDS", title: "Boids multidimensional rulial landscape", hypothesisId: "H-RUL-006", model: "pcc_boids_rule_space", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-METASTABLE-DWELL", "OBS-TRANSITION-RATE"], controls: ["32-point deterministic Latin hypercube discovery design", "held-out validation seeds", "fixed 40-agent periodic domain", "frozen robust-range feature scaling", "adaptive boundary probes simulated only after discovery"], primaryMetric: "held-out rank stability of local rule sensitivity plus boundary-candidate retention", status: "active", projectId },
    { id: "RUL-007", engineId: "ENGINE-PCC-BOIDS", title: "ECA-Boids cross-substrate rulial structure challenge", hypothesisId: "H-RUL-007", model: "cross_substrate_rule_geometry", observableIds: ["OBS-RULE-SENSITIVITY"], controls: ["frozen substrate-specific dimensionless rule metrics", "frozen observer feature scaling", "complete held-out Boids coverage at the same 32 coordinates", "disjoint discovery/holdout ensembles", "five versioned cross-substrate challenge criteria", "failed criteria retained without threshold tuning"], primaryMetric: "number of frozen structural criteria satisfied by both ECA and Boids", status: "active", projectId },
    { id: "RUL-008", engineId: "ENGINE-LOCAL-NETWORK", title: "Topology-blocked network rulial landscape", hypothesisId: "H-RUL-008", model: "stochastic_binary_network_rule_space", observableIds: ["OBS-NETWORK-ACTIVITY", "OBS-SHANNON", "OBS-NETWORK-ORDER", "OBS-SWITCH-RATE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["24-point deterministic Latin hypercube in four local-rule coordinates", "three fixed topology blocks with matched mean degree", "three discovery and two disjoint validation seeds", "frozen discovery feature scaling", "topology excluded from the local-rule metric"], primaryMetric: "discovery-to-holdout stability of complete and local rule-space geometry", status: "active", projectId },
    { id: "RUL-009", engineId: "ENGINE-LOCAL-NETWORK", title: "Frozen three-substrate rulial structure challenge", hypothesisId: "H-RUL-009", model: "three_substrate_rule_geometry", observableIds: ["OBS-RULE-SENSITIVITY"], controls: ["RUL-007 five-criterion contract reused verbatim", "no new simulations", "RUL-007 ECA and Boids metrics reused without recomputation", "RUL-008 Network metrics projected into frozen thresholds", "failed criteria retained without retuning"], primaryMetric: "number of frozen structural criteria satisfied by ECA, Boids, and Network", status: "active", projectId },
    { id: "RUL-010", engineId: "ENGINE-PCC-BOIDS", title: "Boids stochasticity and resolution decomposition", hypothesisId: "H-RUL-010", model: "boids_fixed_rule_resolution_diagnostic", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["same 32 RUL-006 rule coordinates", "two disjoint new four-seed pools", "nested 1/2/4-seed averaging ladder", "per-step Gaussian forcing suppression diagnostic", "observer-subset projections on identical runs", "RUL-009 result frozen"], primaryMetric: "discovery-half to independent-half geometry stability as seed averaging and observer coordinates change", status: "active", projectId },
    { id: "RUL-011", engineId: "ENGINE-PCC-BOIDS", title: "Prospective Boids observer validation", hypothesisId: "H-RUL-011", model: "boids_unseen_rule_observer_validation", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["new 40-point deterministic Latin hypercube", "two new disjoint four-seed pools", "full-core/state-structure/order-entropy observers frozen prospectively", "feature scales calibrated from pool A only", "state-structure primary margins fixed at +0.05 geometry and +0.05 local stability", "RUL-009 and RUL-010 retained unchanged"], primaryMetric: "prospective state-structure minus full-core split-half geometry and local-edge stability", status: "active", projectId },
    { id: "RUL-012", engineId: "ENGINE-LOCAL-ECA", title: "Cross-substrate observer conditioning diagnostic", hypothesisId: "H-RUL-012", model: "profile_shift_vs_geometry_stability", observableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-POLARIZATION", "OBS-NETWORK-ACTIVITY", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["zero new simulations", "frozen ECA/Boids/Network profile pairs", "individual-coordinate analysis", "robust discovery-pool scaling", "substrate-stratified 5000-permutation test", "primary rho threshold -0.50 fixed before outcome"], primaryMetric: "Spearman association between normalized same-rule profile shift and single-feature geometry stability", status: "active", projectId },
    { id: "RUL-013", engineId: "ENGINE-LOCAL-ECA", title: "Cross-substrate observer information and degeneracy analysis", hypothesisId: "H-RUL-013", model: "two_pool_information_conditioning", observableIds: ["OBS-SHANNON", "OBS-HAMMING", "OBS-POLARIZATION", "OBS-NETWORK-ACTIVITY", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["zero new simulations", "same frozen RUL-012 profile pairs", "17 individual observable coordinates", "two-pool variance decomposition", "explicit degeneracy tolerance", "substrate-stratified 5000-permutation test", "primary reliability rho threshold +0.70 fixed before outcome"], primaryMetric: "Spearman association between ICC-like coordinate reliability and single-feature geometry stability", status: "active", projectId },
    { id: "RUL-014", engineId: "ENGINE-PCC-BOIDS", title: "Prospective information-conditioned observer selection", hypothesisId: "H-RUL-014", model: "boids_rul013_selected_observer_validation", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["selection threshold ICC-like reliability >= 0.80 frozen from RUL-013", "new 48-point deterministic Latin hypercube", "two new disjoint four-seed pools", "full-core/selected/rejected-control observers on identical trajectories", "pool-A-only feature scaling", "primary +0.05 geometry and local margins fixed before outcome"], primaryMetric: "prospective RUL-013-selected minus full-core split-half geometry and local-edge stability", status: "active", projectId },
    { id: "RUL-015", engineId: "ENGINE-PCC-BOIDS", title: "Prospective continuous information-conditioned observer weighting", hypothesisId: "H-RUL-015", model: "boids_rul013_information_weighted_metric", observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"], controls: ["weight equation frozen from RUL-013 only", "new 56-point deterministic Latin hypercube", "two new disjoint four-seed pools", "equal/hard/reliability/information-weighted metrics on identical trajectories", "pool-A-only feature scaling", "primary +0.03 geometry and local margins fixed before outcome"], primaryMetric: "prospective information-weighted minus equal full-core split-half geometry and local-edge stability", status: "active", projectId },
  ],
  campaigns: [
    {
      id: "CAMPAIGN-RUL-OBSERVER-CONDITIONING-001",
      title: "Cross-substrate observer conditioning diagnostic",
      description: "Project frozen ECA, Boids, and Network discovery/holdout profiles into coordinate-wise same-rule displacement and geometry-stability diagnostics without new simulation.",
      experimentId: "RUL-012", seeds: [], parameterAxes: [],
      fixedParameters: { newSimulationRuns: 0, substrates: 3, observableCoordinates: 17, permutationCount: 5000, primaryRhoThreshold: -0.50 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R12STEP-01", kind: "import", label: "Reuse frozen profile pairs", dependsOn: [], description: "Load independent-pool profiles from RUL-001/RUL-003, RUL-006/RUL-007, and RUL-008 without adding simulations." },
        { id: "R12STEP-02", kind: "analyze", label: "Measure coordinate conditioning", dependsOn: ["R12STEP-01"], description: "For each observable coordinate, measure normalized same-rule profile displacement and induced single-feature geometry stability." },
        { id: "R12STEP-03", kind: "analyze", label: "Apply stratified permutation test", dependsOn: ["R12STEP-02"], description: "Test the frozen negative-association hypothesis while permuting geometry-stability labels only within substrate." },
        { id: "R12STEP-04", kind: "package", label: "Freeze challenged result", dependsOn: ["R12STEP-03"], description: "Export the challenged primary result unchanged; do not retrofit prior observers or RUL-009." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-OBSERVER-INFORMATION-001",
      title: "Cross-substrate observer information analysis",
      description: "Decompose frozen ECA, Boids, and Network coordinate profiles into between-rule information, independent-pool uncertainty, degeneracy, and geometry-stability diagnostics without new simulation.",
      experimentId: "RUL-013", seeds: [], parameterAxes: [],
      fixedParameters: { newSimulationRuns: 0, substrates: 3, observableCoordinates: 17, permutationCount: 5000, primaryReliabilityRhoThreshold: 0.70 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R13STEP-01", kind: "import", label: "Reuse frozen profile pairs", dependsOn: [], description: "Load the same independent-pool profiles used by RUL-012 without adding or rerunning simulations." },
        { id: "R13STEP-02", kind: "analyze", label: "Decompose signal and uncertainty", dependsOn: ["R13STEP-01"], description: "Estimate between-rule variance, per-pool error variance, ICC-like reliability, robust signal-to-uncertainty, and support degeneracy for each coordinate." },
        { id: "R13STEP-03", kind: "analyze", label: "Test geometry conditioning", dependsOn: ["R13STEP-02"], description: "Apply the frozen positive-association test with 5,000 within-substrate permutations." },
        { id: "R13STEP-04", kind: "package", label: "Freeze RUL-013 artifact", dependsOn: ["R13STEP-03"], description: "Export the result with explicit aggregate-ICC and degeneracy interpretation boundaries." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-PROSPECTIVE-OBSERVER-SELECTION-001",
      title: "Prospective information-conditioned Boids observer selection",
      description: "Use the frozen RUL-013 coordinate reliability threshold to select a Boids observer before generating a new rule-space sample, then compare it with full-core and rejected-coordinate controls on identical trajectories.",
      experimentId: "RUL-014", seeds: [97001, 97013, 97031, 97049, 98003, 98017, 98029, 98051], parameterAxes: [],
      fixedParameters: { rulePoints: 48, designSeed: 2026082414, selectionReliabilityThreshold: 0.80, geometryMargin: 0.05, localMargin: 0.05, newSimulationRuns: 384 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R14STEP-01", kind: "analyze", label: "Freeze RUL-013 selector", dependsOn: [], description: "Select Boids coordinates with ICC-like reliability >= 0.80 from the committed RUL-013 artifact before RUL-014 outcomes are generated." },
        { id: "R14STEP-02", kind: "execute", label: "Simulate unseen rule design", dependsOn: ["R14STEP-01"], description: "Run 48 new Latin-hypercube rules under two disjoint four-seed pools for 384 trajectories." },
        { id: "R14STEP-03", kind: "analyze", label: "Compare frozen observers", dependsOn: ["R14STEP-02"], description: "Project full-core, RUL-013-selected, and rejected-control observers from the same runs and apply frozen effect-size margins." },
        { id: "R14STEP-04", kind: "package", label: "Freeze prospective result", dependsOn: ["R14STEP-03"], description: "Preserve the challenged primary criterion and secondary improvements without changing the selector or margins." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-INFORMATION-WEIGHTED-OBSERVER-001",
      title: "Prospective continuous information-conditioned Boids observer weighting",
      description: "Use frozen RUL-013 coordinate conditioning statistics to define a continuous Boids metric before generating a new rule-space sample, then compare it with equal, hard-selection, and reliability-only metrics on identical trajectories.",
      experimentId: "RUL-015", seeds: [101003, 101019, 101041, 101063, 102001, 102023, 102047, 102071], parameterAxes: [],
      fixedParameters: { rulePoints: 56, designSeed: 2026082415, geometryMargin: 0.03, localMargin: 0.03, newSimulationRuns: 448 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R15STEP-01", kind: "analyze", label: "Freeze continuous weights", dependsOn: [], description: "Compute weights from committed RUL-013 reliability, signal-to-uncertainty, and degeneracy using the fixed equation before any RUL-015 outcome is read." },
        { id: "R15STEP-02", kind: "execute", label: "Simulate unseen rule design", dependsOn: ["R15STEP-01"], description: "Run 56 new Latin-hypercube rules under two disjoint four-seed pools for 448 trajectories." },
        { id: "R15STEP-03", kind: "analyze", label: "Compare metric variants", dependsOn: ["R15STEP-02"], description: "Project equal, hard-selection, reliability-weighted, and information-weighted distances from identical runs and apply frozen margins." },
        { id: "R15STEP-04", kind: "package", label: "Freeze prospective result", dependsOn: ["R15STEP-03"], description: "Preserve the challenged continuous-weighting result without tuning the weight equation after outcome inspection." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-OBSERVER-ABLATION-001",
      title: "RUL-016 exact observer subset ablation",
      experimentId: "RUL-016", seeds: [101003, 101019, 101041, 101063, 102001, 102023, 102047, 102071], parameterAxes: [],
      status: "completed",
      steps: [
        { id: "R16STEP-01", kind: "analyze", label: "Replay frozen RUL-015 population", dependsOn: [], description: "Deterministically reconstruct the already frozen RUL-015 trajectories without introducing new rule coordinates or seeds." },
        { id: "R16STEP-02", kind: "analyze", label: "Enumerate observer Boolean lattice", dependsOn: ["R16STEP-01"], description: "Evaluate all 63 non-empty subsets of the six registered Boids coordinates on identical pool-A/pool-B profiles." },
        { id: "R16STEP-03", kind: "analyze", label: "Decompose feature effects", dependsOn: ["R16STEP-02"], description: "Compute leave-one-out effects, exact Shapley contributions, and exact pairwise interaction indices for geometry, local geometry, and top-boundary overlap." },
      ],
    },
    {
      id: "CAMPAIGN-RUL-INTERACTION-OBSERVER-VALIDATION-001",
      title: "RUL-017 prospective interaction-informed observer validation",
      experimentId: "RUL-017", seeds: [111001, 111017, 111043, 111071, 112003, 112027, 112051, 112079], parameterAxes: [],
      fixedParameters: { rulePoints: 40, designSeed: 2026082417, geometryMargin: 0.01, localMargin: 0.01, newSimulationRuns: 320 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R17STEP-01", kind: "analyze", label: "Freeze RUL-016 candidate", dependsOn: [], description: "Freeze polarization + spatial entropy + speed variance as the interaction-informed candidate before reading any RUL-017 outcome." },
        { id: "R17STEP-02", kind: "execute", label: "Simulate unseen rule design", dependsOn: ["R17STEP-01"], description: "Run 40 new Latin-hypercube rules under two disjoint four-seed pools for 320 trajectories." },
        { id: "R17STEP-03", kind: "analyze", label: "Compare prospective observers", dependsOn: ["R17STEP-02"], description: "Project full-core, established four-feature, and frozen interaction-informed three-feature observers on identical trajectories using pool-A scaling." },
        { id: "R17STEP-04", kind: "package", label: "Freeze RUL-017 result", dependsOn: ["R17STEP-03"], description: "Apply the preregistered +0.01 geometry/local margins and preserve secondary top-boundary results without subset reselection." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-OBJECTIVE-OBSERVER-001",
      title: "RUL-018 objective-dependent observer geometry",
      experimentId: "RUL-018", seeds: [111001, 111017, 111043, 111071, 112003, 112027, 112051, 112079], parameterAxes: [],
      fixedParameters: { rulePoints: 40, observerSubsets: 63, objectives: 3, newUniqueSimulationRuns: 0 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R18STEP-01", kind: "import", label: "Reuse frozen RUL-017 population", dependsOn: [], description: "Reconstruct the frozen 40-rule, eight-seed RUL-017 population without introducing new rule coordinates or seeds." },
        { id: "R18STEP-02", kind: "analyze", label: "Enumerate observer subsets", dependsOn: ["R18STEP-01"], description: "Evaluate all 63 non-empty observer subsets under global geometry, local geometry, and top-10% boundary recovery objectives." },
        { id: "R18STEP-03", kind: "analyze", label: "Compare objective rankings", dependsOn: ["R18STEP-02"], description: "Identify co-optimal sets, objective rank associations, and the multi-objective Pareto frontier." },
        { id: "R18STEP-04", kind: "package", label: "Freeze diagnostic result", dependsOn: ["R18STEP-03"], description: "Preserve objective-specific optima and ties without declaring a universally optimal observer." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-CROSS-SUBSTRATE-OBJECTIVES-001",
      title: "RUL-019 cross-substrate objective-dependent observer geometry",
      description: "Reuse frozen ECA, Boids, and Network populations to test whether observer objective dependence recurs across substrates without matching feature identities or adding simulations.",
      experimentId: "RUL-019", seeds: [], parameterAxes: [],
      fixedParameters: { substrates: 3, objectives: 3, ecaObserverSubsets: 31, boidsObserverSubsets: 63, networkObserverSubsets: 63, newUniqueSimulationRuns: 0 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R19STEP-01", kind: "import", label: "Reuse frozen substrate populations", dependsOn: [], description: "Load the existing ECA calibration/holdout, RUL-018 Boids, and RUL-008 Network populations without adding simulations." },
        { id: "R19STEP-02", kind: "analyze", label: "Enumerate native observer lattices", dependsOn: ["R19STEP-01"], description: "Evaluate every non-empty native feature subset for ECA and Network and reuse the frozen complete Boids subset lattice from RUL-018." },
        { id: "R19STEP-03", kind: "analyze", label: "Compare objective dependence", dependsOn: ["R19STEP-02"], description: "Compare objective-specific optima, Pareto fronts, and rank coupling among global geometry, local geometry, and boundary recovery across all three substrates." },
        { id: "R19STEP-04", kind: "package", label: "Freeze cross-substrate result", dependsOn: ["R19STEP-03"], description: "Preserve ties and substrate-specific feature bases while exporting the recurring objective-dependence structure." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-INVASION-GRADIENT-001",
      title: "RUL-024 frequency-dependent invasion gradient",
      description: "Reuse frozen RUL-021 rule-motion vectors and estimate a local context-dependent invasion gradient with tagged mutants introduced into the actual mixed resident population after matched burn-in.",
      experimentId: "RUL-024", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newMotionSimulations: 0, invasionFraction: 0.10, finiteDifferenceStepUnit: 0.06, probesPerSeed: 8, newProbeRuns: 96 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R24STEP-01", kind: "execute", label: "Replay mixed resident burn-ins", dependsOn: [], description: "For each frozen seed and probe direction, reproduce the exact pre-shock mixed resident population from the RUL-021 burn-in." },
        { id: "R24STEP-02", kind: "execute", label: "Introduce tagged mutants", dependsOn: ["R24STEP-01"], description: "Replace a rule-blind 10% resident sample with a tagged mutant at +/-0.06 along each normalized rule coordinate and follow tagged frequency under scarcity." },
        { id: "R24STEP-03", kind: "analyze", label: "Estimate invasion gradients", dependsOn: ["R24STEP-02"], description: "Estimate central finite-difference gradients from tagged-mutant frequency change and compare their direction with frozen scarcity and neutral rule-motion vectors." },
        { id: "R24STEP-04", kind: "package", label: "Freeze context-dependent result", dependsOn: ["R24STEP-03"], description: "Preserve all preregistered criteria, including non-identifiable gradients and challenged outcomes." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-TEMPORAL-FLUX-001",
      title: "RUL-029 temporal rulial flux robustness",
      description: "Reconstruct the committed RUL-027 lineage snapshots and temporally subsample them at four frozen cadences while holding the four-bin spatial observer fixed.",
      experimentId: "RUL-029", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newSimulationRuns: 0, cadenceFamilySteps: [5, 10, 20, 40], binsPerDimension: 4, minimumPassingCadences: 3, sourceExperiment: "RUL-027" },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R29STEP-01", kind: "analyze", label: "Reconstruct lineage snapshots", dependsOn: [], description: "Recover per-lineage endpoint states from committed RUL-027 segments without rerunning the ALife engine." },
        { id: "R29STEP-02", kind: "analyze", label: "Subsample temporal cadence", dependsOn: ["R29STEP-01"], description: "Preserve the intervention boundary and endpoint while rebuilding flux segments at dt=5,10,20,40." },
        { id: "R29STEP-03", kind: "analyze", label: "Apply frozen robustness rule", dependsOn: ["R29STEP-02"], description: "Require each original qualitative threshold to pass at least three of four cadences and reproduce the committed five-step values exactly." },
        { id: "R29STEP-04", kind: "package", label: "Freeze temporal result", dependsOn: ["R29STEP-03"], description: "Preserve the cadence table, temporal segments, criteria, and interpretation boundary." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-MULTISCALE-FLUX-001",
      title: "RUL-028 multiscale rulial flux robustness",
      description: "Re-bin the exact committed RUL-027 lineage transport segments at four frozen equal-width rule-space resolutions and test whether the original qualitative flux findings persist without tuning thresholds.",
      experimentId: "RUL-028", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newSimulationRuns: 0, binsPerDimensionFamily: [3, 4, 5, 6], topCellFraction: 0.20, minimumPassingResolutions: 3, sourceExperiment: "RUL-027" },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R28STEP-01", kind: "analyze", label: "Re-bin committed flux segments", dependsOn: [], description: "Project the same RUL-027 lineage segment coordinates onto b=3,4,5,6 equal-width grids without rerunning the ALife engine." },
        { id: "R28STEP-02", kind: "analyze", label: "Recompute flux diagnostics", dependsOn: ["R28STEP-01"], description: "Recompute channel concentration, seed-half recurrence, directional persistence, scarcity-neutral cell-flux divergence, turnover divergence, and directed-edge divergence at every scale." },
        { id: "R28STEP-03", kind: "analyze", label: "Apply frozen robustness rule", dependsOn: ["R28STEP-02"], description: "Require each original qualitative threshold to pass at least three of four resolutions and reproduce the committed b=4 values exactly." },
        { id: "R28STEP-04", kind: "package", label: "Freeze multiscale result", dependsOn: ["R28STEP-03"], description: "Preserve the full resolution table, profiles, criteria, and observer-dependence interpretation boundary." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-FLUX-NETWORK-001",
      title: "RUL-027 coarse-grained rulial flux network",
      description: "Replay the frozen RUL-021 scarcity and neutral conditions, project founder-lineage transport segments onto a fixed 4D rule-space grid, and compare recurring channels, local directional persistence, and condition-specific flux/turnover profiles.",
      experimentId: "RUL-027", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newUniqueSimulationConditions: 0, deterministicReplayRuns: 24, binsPerDimension: 4, maximumPossibleCells: 256, recordEvery: 5, seedHalves: 2 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R27STEP-01", kind: "execute", label: "Replay lineage transport", dependsOn: [], description: "Replay the exact frozen RUL-021 scarcity and neutral trajectories with observational lineage snapshots." },
        { id: "R27STEP-02", kind: "analyze", label: "Construct coarse flux network", dependsOn: ["R27STEP-01"], description: "Convert lineage rule-centroid segments into fixed midpoint cells and directed source-to-target cell edges, while preserving exact interval vector accounting." },
        { id: "R27STEP-03", kind: "analyze", label: "Test channel recurrence and divergence", dependsOn: ["R27STEP-02"], description: "Measure high-flux-cell recurrence across frozen seed halves, channel concentration, local directional persistence, and scarcity-versus-neutral Jensen-Shannon divergences." },
        { id: "R27STEP-04", kind: "package", label: "Freeze flux-network result", dependsOn: ["R27STEP-03"], description: "Preserve the fixed grid, seven preregistered pilot criteria, exact replay checks, and non-adaptive interpretation boundary." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-LINEAGE-TRANSPORT-001",
      title: "RUL-026 time-resolved lineage transport",
      description: "Replay the frozen RUL-021 scarcity and neutral conditions with lineage snapshots and resolve the population rule-centroid path into interval-level within-lineage motion, abundance reweighting, total-variation lineage turnover, and sequential dominance.",
      experimentId: "RUL-026", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newUniqueSimulationConditions: 0, deterministicReplayRuns: 24, burnInSteps: 180, postShockSteps: 160, recordEvery: 5, founderIdentityFrozen: true },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R26STEP-01", kind: "execute", label: "Replay time-resolved lineages", dependsOn: [], description: "Replay all frozen scarcity and neutral conditions with non-invasive lineage snapshots at the existing five-step cadence." },
        { id: "R26STEP-02", kind: "analyze", label: "Decompose every transport interval", dependsOn: ["R26STEP-01"], description: "Apply the symmetric lineage decomposition to each adjacent post-shock snapshot pair and verify exact centroid-increment reconstruction." },
        { id: "R26STEP-03", kind: "analyze", label: "Measure temporal mass flow", dependsOn: ["R26STEP-02"], description: "Measure cumulative lineage total-variation turnover, reweighting path tortuosity, dominant-lineage switches, reversals, and scarcity-versus-neutral differences." },
        { id: "R26STEP-04", kind: "package", label: "Freeze transport result", dependsOn: ["R26STEP-03"], description: "Preserve all frozen criteria and the distinction between temporal lineage flow and adaptive-selection claims." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-LINEAGE-MOTION-001",
      title: "RUL-025 lineage-resolved rule-motion decomposition",
      description: "Deterministically replay the frozen RUL-021 scarcity and neutral conditions with founder-lineage logging, then decompose population-centroid motion into within-lineage rule change and between-lineage abundance reweighting.",
      experimentId: "RUL-025", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newUniqueSimulationConditions: 0, deterministicReplayRuns: 24, burnInSteps: 180, decompositionEndpoints: 2, founderIdentityFrozen: true },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R25STEP-01", kind: "execute", label: "Replay frozen RUL-021 arms", dependsOn: [], description: "Replay the 12 scarcity and 12 matched neutral seed conditions while enabling observational founder-lineage snapshots that consume no random numbers." },
        { id: "R25STEP-02", kind: "analyze", label: "Decompose centroid motion", dependsOn: ["R25STEP-01"], description: "Apply the symmetric two-time decomposition into within-lineage rule change and between-lineage abundance reweighting and verify exact vector reconstruction." },
        { id: "R25STEP-03", kind: "analyze", label: "Measure lineage heterogeneity", dependsOn: ["R25STEP-02"], description: "Measure survivor-lineage directional coherence, final lineage concentration, and scarcity-versus-neutral reweighting differences." },
        { id: "R25STEP-04", kind: "package", label: "Freeze lineage result", dependsOn: ["R25STEP-03"], description: "Preserve the mixed result, including the failure of scarcity to exceed neutral reweighting by the preregistered margin." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-CONTRASTIVE-GRADIENT-001",
      title: "RUL-023 scarcity-specific contrastive performance gradient",
      description: "Subtract matched stable-resource local performance gradients from the committed RUL-022 scarcity gradients and test whether RUL-021 scarcity motion aligns with this environmental contrast more strongly than matched neutral bottleneck motion.",
      experimentId: "RUL-023", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newMotionRuns: 0, reusedScarcityProbeRuns: 96, newStableProbeRuns: 96, finiteDifferenceStepUnit: 0.06, probeSteps: 120, probeMutation: false, performanceTarget: "time-averaged population persistence" },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R23STEP-01", kind: "import", label: "Reuse frozen motion and scarcity gradients", dependsOn: [], description: "Load RUL-021 scarcity/neutral motion vectors and committed RUL-022 scarcity finite-difference probes without rerunning either source experiment." },
        { id: "R23STEP-02", kind: "execute", label: "Estimate matched stable gradients", dependsOn: ["R23STEP-01"], description: "Run matched stable-resource homogeneous no-mutation plus/minus probes at the same seed-specific pre-shock centroids and finite-difference step." },
        { id: "R23STEP-03", kind: "analyze", label: "Construct environmental contrast", dependsOn: ["R23STEP-02"], description: "Compute grad(F_scarcity)-grad(F_stable), then compare scarcity and neutral motion cosine alignment against the frozen four-criterion contract." },
        { id: "R23STEP-04", kind: "package", label: "Freeze contrastive result", dependsOn: ["R23STEP-03"], description: "Preserve supported and challenged criteria without changing gradient definition, performance target, or thresholds after outcome inspection." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-FITNESS-GRADIENT-001",
      title: "RUL-022 local scarcity-performance gradient alignment",
      description: "Estimate a seed-specific local ecological performance gradient around each frozen RUL-021 pre-shock centroid and test whether scarcity motion aligns with that gradient more strongly than the matched neutral bottleneck motion.",
      experimentId: "RUL-022", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { newMotionRuns: 0, fitnessProbeRuns: 96, finiteDifferenceStepUnit: 0.06, probeSteps: 120, probeMutation: false, performanceTarget: "time-averaged population persistence" },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R22STEP-01", kind: "import", label: "Reuse frozen RUL-021 motion", dependsOn: [], description: "Load the scarcity and neutral post-shock rule-motion vectors and pre-shock centroids without rerunning RUL-021." },
        { id: "R22STEP-02", kind: "execute", label: "Estimate local performance gradients", dependsOn: ["R22STEP-01"], description: "Run plus/minus finite-difference homogeneous-rule probes along all four normalized rule dimensions under immediate scarcity." },
        { id: "R22STEP-03", kind: "analyze", label: "Compare directional alignment", dependsOn: ["R22STEP-02"], description: "Compute scarcity and neutral cosine alignment with the same seed-specific local performance gradient and apply all frozen criteria." },
        { id: "R22STEP-04", kind: "package", label: "Freeze directional-selection diagnostic", dependsOn: ["R22STEP-03"], description: "Preserve supported and challenged criteria without redefining the performance target or finite-difference step after observing outcomes." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-SELECTION-CONTROL-001",
      title: "RUL-021 selection versus neutral bottleneck control",
      description: "After a longer burn-in, compare resource-selective scarcity with a stable-resource rule-blind bottleneck matched per seed to scarcity bottleneck depth while retaining mutation in both arms.",
      experimentId: "RUL-021", seeds: [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173], parameterAxes: [],
      fixedParameters: { conditions: 3, steps: 340, shockStep: 180, initialPopulation: 72, populationCap: 150, totalRuns: 36 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R21STEP-01", kind: "execute", label: "Burn in and run scarcity arm", dependsOn: [], description: "Run each seed through a 180-step pre-shock ecology, then impose resource scarcity with mutation retained and measure the realized bottleneck depth." },
        { id: "R21STEP-02", kind: "execute", label: "Run matched neutral bottleneck", dependsOn: ["R21STEP-01"], description: "Run the matched stable-resource seed with mutation retained and impose one rule-blind random cull at shock depth derived from the paired scarcity run." },
        { id: "R21STEP-03", kind: "analyze", label: "Compare post-shock rule motion", dependsOn: ["R21STEP-02"], description: "Compare paired post-shock centroid displacement, directional reproducibility, bottleneck-depth matching, extinction, and trajectory diagnostics." },
        { id: "R21STEP-04", kind: "package", label: "Freeze challenged or supported control result", dependsOn: ["R21STEP-03"], description: "Preserve all frozen criteria whether supported or challenged and retain the neutral-control limitation that only bottleneck depth, not full demographic history, is matched." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-ALIFE-RULE-MOTION-001",
      title: "RUL-020 mutable-rule ALife ecological response",
      description: "Introduce the first Entropy Studio substrate in which heritable rule vectors change within a run, then compare stable drift, scarcity-driven mutation plus selection, and scarcity with mutation disabled under matched environments.",
      experimentId: "RUL-020", seeds: [13001, 13007, 13019, 13033, 13049, 13063, 13079, 13099, 13121, 13139, 13159, 13177], parameterAxes: [],
      fixedParameters: { conditions: 3, steps: 260, shockStep: 130, initialPopulation: 72, populationCap: 150, totalRuns: 36 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R20STEP-01", kind: "execute", label: "Run matched ecological conditions", dependsOn: [], description: "Execute stable-mutable, scarcity-mutable, and scarcity-frozen conditions for every frozen seed using identical environment geometry within each seed." },
        { id: "R20STEP-02", kind: "analyze", label: "Measure motion through rule space", dependsOn: ["R20STEP-01"], description: "Track normalized population rule centroids, path length, diversity, demographic recovery, and founder-lineage diversity through time." },
        { id: "R20STEP-03", kind: "analyze", label: "Compare mutation and selection controls", dependsOn: ["R20STEP-02"], description: "Compare scarcity-mutable displacement against stable drift and scarcity-frozen standing-variation selection, and calculate directional reproducibility across seeds." },
        { id: "R20STEP-04", kind: "package", label: "Freeze mutable-rule pilot", dependsOn: ["R20STEP-03"], description: "Preserve all four preregistered pilot criteria and export the complete rule-trajectory artifact without biological or PCC overclaiming." }
      ],
    },
    {
      id: "CAMPAIGN-REPLICATOR-EPSILON-001",
      title: "Replicator epsilon sensitivity campaign",
      description: "Execute a preregistered seeded epsilon sweep, then compute registered analyses, regenerate figures, update evidence summaries, refresh the linked manuscript, and assemble the reproducibility package.",
      experimentId: "E-007",
      seeds: [11, 29, 47],
      parameterAxes: [{ name: "epsilon", values: [-0.05, 0.0, 0.025, 0.05, 0.1] }],
      fixedParameters: { fitWindowEnd: 8, steps: 240, dt: 0.05 },
      analysisIds: ["AN-001", "AN-002"],
      figureIds: ["FIG-001", "FIG-002"],
      paperIds: ["PAPER-001"],
      datasetIds: ["DATASET-001"],
      status: "ready",
      projectId,
      steps: [
        { id: "STEP-01", kind: "execute", label: "Execute parameter sweep", dependsOn: [], description: "Run every seed × epsilon combination through the validated local engine." },
        { id: "STEP-02", kind: "analyze", label: "Execute registered statistics", dependsOn: ["STEP-01"], description: "Run preregistered analyses against completed campaign artifacts." },
        { id: "STEP-03", kind: "figure", label: "Regenerate figures", dependsOn: ["STEP-01"], description: "Generate run-derived figure products with contributing run IDs." },
        { id: "STEP-04", kind: "evidence", label: "Update evidence summary", dependsOn: ["STEP-01", "STEP-02"], description: "Summarize support, challenge, and inconclusive counts without changing authored claims." },
        { id: "STEP-05", kind: "manuscript", label: "Refresh manuscript", dependsOn: ["STEP-02", "STEP-03"], description: "Rebuild the evidence-linked manuscript scaffold from campaign outputs." },
        { id: "STEP-06", kind: "package", label: "Assemble release package", dependsOn: ["STEP-02", "STEP-03", "STEP-05"], description: "Build the versioned reproducibility payload and SHA-256 integrity record." },
      ],
    },
    {
      id: "CAMPAIGN-RUL-ECA-001",
      title: "Elementary CA rulial atlas campaign",
      description: "Enumerate the complete ECA rule space over frozen seeds/initial conditions, compute registered instability profiles, test neighborhood sensitivity, and export the first reproducible rulial benchmark.",
      experimentId: "RUL-001",
      seeds: [11, 29, 47, 83],
      parameterAxes: [{ name: "rule", values: Array.from({ length: 256 }, (_, index) => index) }],
      fixedParameters: { width: 257, steps: 256, boundary: "periodic", perturbation: "single-center-cell" },
      analysisIds: [],
      figureIds: [],
      paperIds: [],
      datasetIds: [],
      status: "specified",
      projectId,
      steps: [
        { id: "RSTEP-01", kind: "execute", label: "Enumerate ECA rules", dependsOn: [], description: "Execute all 256 rules against the frozen initial-condition and perturbation ensemble." },
        { id: "RSTEP-02", kind: "analyze", label: "Build rulial profiles", dependsOn: ["RSTEP-01"], description: "Compute registered EBID feature vectors without external class labels." },
        { id: "RSTEP-03", kind: "analyze", label: "Test neighborhood sensitivity", dependsOn: ["RSTEP-02"], description: "Compare declared rule distance to observable-profile distance and run metric sensitivity checks." },
        { id: "RSTEP-04", kind: "package", label: "Freeze benchmark package", dependsOn: ["RSTEP-02", "RSTEP-03"], description: "Export rule-space definition, observer definitions, runs, profiles, preregistration metadata, and checksums." },
      ],
    },
    {
      id: "CAMPAIGN-RUL-BOIDS-001",
      title: "Boids multidimensional rulial landscape",
      description: "A structured pilot design that varies separation, alignment, cohesion, chaos, and neighborhood radius, then reserves independent points for boundary validation instead of treating a single noise axis as the full rule space.",
      experimentId: "RUL-006",
      seeds: [12345, 22345, 32345],
      parameterAxes: [],
      fixedParameters: { discoveryPoints: 32, samplingDesign: "deterministic-LHS-seed-20260824", separationRange: "0.4..1.8", alignmentRange: "0.2..1.8", cohesionRange: "0.2..1.4", chaosRange: "0.0..0.6", neighborhoodRadiusRange: "8.0..20.0", pressure: 0.35, nAgents: 40, steps: 200, tailFraction: 0.25, validationSeeds: "42345,52345", adaptiveBoundaryProbes: 8 },
      analysisIds: [],
      figureIds: [],
      paperIds: [],
      datasetIds: [],
      status: "completed",
      projectId,
      steps: [
        { id: "BRSTEP-01", kind: "import", label: "Generate/import pilot rule-space runs", dependsOn: [], description: "Execute the frozen 32-point Latin hypercube through the PCC-Boids adapter using three discovery seeds." },
        { id: "BRSTEP-02", kind: "analyze", label: "Discover candidate regimes", dependsOn: ["BRSTEP-01"], description: "Build six-feature collective-dynamics profiles, compute normalized rule/observable distances, and rank local sensitivity edges." },
        { id: "BRSTEP-03", kind: "analyze", label: "Validate candidate boundaries", dependsOn: ["BRSTEP-02"], description: "Re-run selected edge endpoints with two held-out seeds and simulate adaptive transverse midpoint probes near the candidate boundaries." },
        { id: "BRSTEP-04", kind: "package", label: "Freeze boids rulial package", dependsOn: ["BRSTEP-03"], description: "Export sampling design, rule coordinates, observer definitions, run artifacts, profiles, and validation outcomes." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-NETWORK-001",
      title: "Topology-blocked network rulial landscape",
      description: "Sample a four-dimensional stochastic local update-rule space and evaluate every coordinate across three fixed graph topology blocks with disjoint discovery and validation seeds.",
      experimentId: "RUL-008",
      seeds: [71011, 71023, 71039],
      parameterAxes: [],
      fixedParameters: { discoveryPoints: 24, samplingDesign: "deterministic-LHS-seed-20260824", thresholdRange: "0.25..0.75", couplingRange: "0.5..2.5", memoryRange: "0.0..1.5", temperatureRange: "0.08..0.5", topologies: "ring,small_world,erdos_renyi", nNodes: 72, meanDegree: 6, steps: 220, tailFraction: 0.25, validationSeeds: "72019,72031" },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "NRSTEP-01", kind: "execute", label: "Run topology-blocked discovery design", dependsOn: [], description: "Execute every frozen local-rule coordinate on all three topology blocks with three discovery seeds." },
        { id: "NRSTEP-02", kind: "analyze", label: "Build aggregate and topology-specific profiles", dependsOn: ["NRSTEP-01"], description: "Construct six-feature profiles using discovery-frozen scaling while retaining topology-specific measurements." },
        { id: "NRSTEP-03", kind: "analyze", label: "Validate network rulial geometry", dependsOn: ["NRSTEP-02"], description: "Re-run the complete 24-point design with two disjoint validation seeds and project the frozen local neighbor graph." },
        { id: "NRSTEP-04", kind: "package", label: "Freeze RUL-008 package", dependsOn: ["NRSTEP-03"], description: "Export rule coordinates, topology blocks, profiles, local-edge validation, and checksums." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-THREE-SUBSTRATE-001",
      title: "Frozen three-substrate rulial challenge",
      description: "Project ECA, Boids, and Network benchmark summaries into the unchanged RUL-007 five-criterion contract without new simulation or threshold tuning.",
      experimentId: "RUL-009",
      seeds: [],
      parameterAxes: [],
      fixedParameters: { sourceExperiments: "RUL-007,RUL-008", criterionCount: 5, newSimulationRunCount: 0, contractVersion: "RUL-007" },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "TRSTEP-01", kind: "import", label: "Load frozen substrate summaries", dependsOn: [], description: "Reuse RUL-007 ECA/Boids metrics and RUL-008 Network validation metrics without resimulation." },
        { id: "TRSTEP-02", kind: "analyze", label: "Apply frozen five-criterion contract", dependsOn: ["TRSTEP-01"], description: "Evaluate all three substrates against the exact RUL-007 thresholds and preserve failures." },
        { id: "TRSTEP-03", kind: "package", label: "Freeze RUL-009 matrix", dependsOn: ["TRSTEP-02"], description: "Export substrate metrics, criterion matrix, interpretation boundary, and checksum." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-BOIDS-RESOLUTION-001",
      title: "Boids stochasticity and observer-resolution diagnostic",
      description: "Reuse the frozen 32-point RUL-006 design with two new disjoint seed pools, nested averaging, a per-step forcing suppression arm, and observer-subset projections while preserving RUL-009 unchanged.",
      experimentId: "RUL-010",
      seeds: [81001, 81013, 81023, 81041, 82003, 82007, 82009, 82021],
      parameterAxes: [],
      fixedParameters: { sourceRuleSpace: "RUL-006-32-point-LHS", seedLadder: "1,2,4 per half", fullStochasticRuns: 256, forcingSuppressedRuns: 64, totalNewRuns: 320, observerViews: 4 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R10STEP-01", kind: "execute", label: "Run independent seed pools", dependsOn: [], description: "Execute the unchanged 32 rule coordinates under two disjoint four-seed pools." },
        { id: "R10STEP-02", kind: "analyze", label: "Estimate seed-resolution ladder", dependsOn: ["R10STEP-01"], description: "Compare independent half-geometries at nested 1, 2, and 4 seed averages." },
        { id: "R10STEP-03", kind: "analyze", label: "Decompose forcing and observer effects", dependsOn: ["R10STEP-01"], description: "Suppress only per-step Gaussian forcing in a diagnostic arm and reproject the full runs through frozen observer subsets." },
        { id: "R10STEP-04", kind: "package", label: "Freeze RUL-010 diagnosis", dependsOn: ["R10STEP-02", "R10STEP-03"], description: "Export the diagnostic ladder, observer decomposition, variance decomposition, and checksum without modifying RUL-009." }
      ],
    },
    {
      id: "CAMPAIGN-RUL-BOIDS-OBSERVER-VALIDATION-001",
      title: "Prospective Boids observer validation",
      description: "Test the RUL-010 observer diagnosis on a new 40-point rule-space design and two new disjoint four-seed pools with preregistered full-core, state-structure, and order-entropy observers.",
      experimentId: "RUL-011",
      seeds: [93001, 93011, 93023, 93047, 94007, 94019, 94031, 94049],
      parameterAxes: [],
      fixedParameters: { discoveryPoints: 40, samplingDesign: "deterministic-LHS-seed-2026082411", poolARuns: 160, poolBRuns: 160, totalNewRuns: 320, observerViews: 3, primaryGeometryMargin: 0.05, primaryLocalMargin: 0.05 },
      analysisIds: [], figureIds: [], paperIds: [], datasetIds: [], status: "completed", projectId,
      steps: [
        { id: "R11STEP-01", kind: "execute", label: "Run unseen Boids rule design", dependsOn: [], description: "Execute 40 new Latin-hypercube rule coordinates under two new disjoint four-seed pools." },
        { id: "R11STEP-02", kind: "analyze", label: "Project preregistered observers", dependsOn: ["R11STEP-01"], description: "Project the identical 320 trajectories through full-core, state-structure, and order-entropy observers using pool-A feature scaling." },
        { id: "R11STEP-03", kind: "analyze", label: "Apply prospective margins", dependsOn: ["R11STEP-02"], description: "Require state-structure to exceed full-core by at least 0.05 in both complete-geometry and local-edge split-half Spearman stability." },
        { id: "R11STEP-04", kind: "package", label: "Freeze RUL-011 validation", dependsOn: ["R11STEP-03"], description: "Export observer comparison, rule points, interpretation boundary, and checksum without modifying earlier benchmarks." }
      ],
    },
    {
      id: "CAMPAIGN-BOIDS-NOISE-001",
      title: "PCC-Boids noise transition campaign",
      description: "Track the external PCC-Boids sweep through artifact import, analysis, figure generation, evidence summary, and publication refresh.",
      experimentId: "E-BOIDS-001",
      seeds: [12345, 22345, 32345],
      parameterAxes: [{ name: "chaos", values: [0, 0.05, 0.1, 0.2, 0.35, 0.5] }],
      fixedParameters: { pressure: 0.4, control: 1.0, steps: 400 },
      analysisIds: ["AN-003"],
      figureIds: ["FIG-003"],
      paperIds: ["PAPER-002"],
      datasetIds: ["DATASET-002"],
      status: "blocked",
      projectId,
      steps: [
        { id: "BSTEP-01", kind: "import", label: "Import engine artifacts", dependsOn: [], description: "Await entropy-run/1.0.0 artifacts generated by the external Python engine." },
        { id: "BSTEP-02", kind: "analyze", label: "Execute transition analysis", dependsOn: ["BSTEP-01"], description: "Compare entropy-rise and polarization-collapse thresholds." },
        { id: "BSTEP-03", kind: "figure", label: "Regenerate transition figure", dependsOn: ["BSTEP-01"], description: "Create the registered run-derived transition graphic." },
        { id: "BSTEP-04", kind: "manuscript", label: "Refresh boids manuscript", dependsOn: ["BSTEP-02", "BSTEP-03"], description: "Update the linked manuscript only after imported evidence exists." },
      ],
    },
  ],
  figures: [
    { id: "FIG-001", number: 1, title: "Entropy deficit through time", caption: "Entropy deficit trajectories for preregistered replicator conditions. Generated only from completed E-007 runs.", experimentIds: ["E-007"], observableIds: ["OBS-DEFICIT"], generator: "timeseries-line", outputFormats: ["svg", "png", "pdf"], status: "ready", projectId },
    { id: "FIG-002", number: 2, title: "Observed versus predicted growth", caption: "Estimated log-deficit slope compared with the preregistered instability prediction.", experimentIds: ["E-007"], observableIds: ["OBS-LOG-SLOPE"], generator: "estimate-comparison", outputFormats: ["svg", "png", "pdf"], status: "ready", projectId },
    { id: "FIG-003", number: 3, title: "Boids order-disorder transition", caption: "Polarization and normalized heading entropy across the fixed Chaos sweep.", experimentIds: ["E-BOIDS-001"], observableIds: ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY"], generator: "dual-axis-sweep", outputFormats: ["svg", "png", "pdf"], status: "specified", projectId },
  ],
  analyses: [
    { id: "AN-001", name: "Log-growth regression", kind: "regression", experimentId: "E-007", observableIds: ["OBS-LOG-SLOPE"], method: "Ordinary least squares over the preregistered fit window; report slope, absolute error, and R².", preregistered: true, status: "ready", projectId },
    { id: "AN-002", name: "Seed bootstrap interval", kind: "bootstrap", experimentId: "E-007", observableIds: ["OBS-LOG-SLOPE"], method: "Percentile bootstrap over independent seeded runs with 2,000 resamples.", preregistered: true, status: "specified", projectId },
    { id: "AN-003", name: "Transition lead comparison", kind: "change-point", experimentId: "E-BOIDS-001", observableIds: ["OBS-TRANSITION-LEAD"], method: "Compare first preregistered entropy-rise and polarization-collapse thresholds across seeds.", preregistered: true, status: "ready", projectId },
  ],
  papers: [
    { id: "PAPER-001", title: "Local Entropy-Growth Correspondence in a Minimal Cyclic Replicator", shortTitle: "Minimal Replicator", status: "draft", hypothesisIds: ["H-003", "H-006"], experimentIds: ["E-007"], figureIds: ["FIG-001", "FIG-002"], analysisIds: ["AN-001", "AN-002"], targetVenue: "Complex systems / nonlinear dynamics journal", projectId, sections: [
      { id: "SEC-001", title: "Abstract", purpose: "State the narrow tested claim and principal quantitative result.", sourceIds: ["H-003", "E-007", "AN-001"], status: "outline" },
      { id: "SEC-002", title: "Methods", purpose: "Document model, observables, controls, fit windows, and provenance.", sourceIds: ["E-007", "OBS-DEFICIT", "OBS-LOG-SLOPE"], status: "draft" },
      { id: "SEC-003", title: "Results", purpose: "Report completed runs without extrapolating beyond the benchmark.", sourceIds: ["FIG-001", "FIG-002", "AN-001"], status: "outline" },
      { id: "SEC-004", title: "Discussion", purpose: "Separate demonstrated local behavior from cross-domain speculation.", sourceIds: ["H-003", "H-011", "R01"], status: "outline" },
    ] },
    { id: "PAPER-002", title: "Entropy and Order Loss in PCC-Boids Noise Sweeps", shortTitle: "PCC-Boids", status: "draft", hypothesisIds: ["H-BOIDS-001"], experimentIds: ["E-BOIDS-001"], figureIds: ["FIG-003"], analysisIds: ["AN-003"], projectId, sections: [
      { id: "SEC-B01", title: "Methods", purpose: "Specify the seeded sweep and fixed parameters.", sourceIds: ["E-BOIDS-001", "SRC-BOIDS"], status: "draft" },
      { id: "SEC-B02", title: "Results", purpose: "Compare threshold order across generated artifacts.", sourceIds: ["FIG-003", "AN-003"], status: "outline" },
    ] },
  ],
  datasets: [
    { id: "DATASET-001", title: "Minimal replicator reproducibility package", version: "0.1.0", experimentIds: ["E-007"], include: ["run artifacts", "observable tables", "analysis manifest", "figures", "README", "CITATION.cff", "checksums"], license: "CC BY 4.0 for data; code under repository license", status: "ready", projectId },
    { id: "DATASET-002", title: "PCC-Boids transition benchmark", version: "0.1.0", experimentIds: ["E-BOIDS-001"], include: ["seeded run artifacts", "sweep configuration", "summary CSV", "figure specifications", "provenance manifest"], license: "CC BY 4.0 for data; code under MIT", status: "specified", projectId },
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
