export type EntityId = string;

export type ResearchView =
  | "overview"
  | "corpus"
  | "observables"
  | "graph"
  | "hypotheses"
  | "experiments"
  | "simulation"
  | "review";

export type EvidenceLevel =
  | "established"
  | "supported"
  | "hypothesis"
  | "speculation";

export type ResearchStatus =
  | "draft"
  | "active"
  | "blocked"
  | "completed"
  | "archived";

export interface NavigationItem {
  id: ResearchView;
  index: string;
  label: string;
  note: string;
}

export interface ResearchProject {
  id: EntityId;
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  primaryQuestion: string;
  questionId: string;
  status: ResearchStatus;
  revision: string;
  epistemicStatus: string;
  disclaimer: string;
  tags: string[];
  updatedAt: string;
}

export interface WorkspaceStats {
  sourceArtifacts: number;
  trackedClaims: number;
  claimsNeedingEvidence: number;
  experiments: number;
  reproducibleExperiments: number;
  openQuestions: number;
}

export interface ResearchClaim {
  id: EntityId;
  text: string;
  evidence: EvidenceLevel;
  sourceIds: EntityId[];
  relation: string;
  projectId: EntityId;
}

export interface ResearchSource {
  id: EntityId;
  name: string;
  type: string;
  status: string;
  provenance: "archive" | "local-session";
  projectId: EntityId;
}

export interface LifecycleStage {
  index: string;
  title: string;
  description: string;
  view: ResearchView;
}

export interface ResearchMethod {
  id: EntityId;
  name: string;
  status: "code-located" | "described-in-notes";
  projectId: EntityId;
}

export interface GraphNode {
  id: EntityId;
  label: string;
  kind: "framework" | "variable" | "method" | "observable" | "quantity";
  x: number;
  y: number;
  projectId: EntityId;
}

export interface GraphEdge {
  id: EntityId;
  sourceId: EntityId;
  targetId: EntityId;
  relation: string;
  evidence: EvidenceLevel;
  projectId: EntityId;
}


export type EvidenceNodeKind =
  | "source"
  | "claim"
  | "hypothesis"
  | "experiment"
  | "run"
  | "result"
  | "observable"
  | "method";

export type EvidenceRelationType =
  | "documents"
  | "supports"
  | "challenges"
  | "grounds"
  | "derived-from"
  | "tested-by"
  | "measured-by"
  | "implemented-by"
  | "uses"
  | "produces"
  | "computed-with"
  | "supports-with-result"
  | "challenges-with-result"
  | "reports";

export interface EvidenceNode {
  id: EntityId;
  entityId: EntityId;
  kind: EvidenceNodeKind;
  label: string;
  summary: string;
  evidence?: EvidenceLevel;
  status?: string;
  x: number;
  y: number;
  projectId: EntityId;
}

export interface EvidenceRelation {
  id: EntityId;
  sourceId: EntityId;
  targetId: EntityId;
  type: EvidenceRelationType;
  label: string;
  rationale: string;
  evidence: EvidenceLevel;
  projectId: EntityId;
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  relations: EvidenceRelation[];
}

export interface Hypothesis {
  id: EntityId;
  title: string;
  statement: string;
  disconfirmingOutcome: string;
  evidence: EvidenceLevel;
  assumptions: string[];
  derivedFromIds: EntityId[];
  equation?: string;
  projectId: EntityId;
}

export type ObservableCategory =
  | "entropy"
  | "divergence"
  | "distance"
  | "rate"
  | "stability"
  | "spatial"
  | "benchmark";

export type ObservableImplementationStatus =
  | "implemented"
  | "specified"
  | "planned"
  | "reference-only";

export interface ObservableDefinition {
  id: EntityId;
  slug: string;
  name: string;
  symbol: string;
  category: ObservableCategory;
  description: string;
  formula: string;
  interpretation: string;
  requiredInputs: string[];
  output: string;
  estimator: string;
  validWhen: string[];
  failureModes: string[];
  implementationStatus: ObservableImplementationStatus;
  implementationPath?: string;
  sourceIds: EntityId[];
  relatedClaimIds: EntityId[];
  relatedHypothesisIds: EntityId[];
  tags: string[];
  projectId: EntityId;
}

export interface ExperimentDefinition {
  id: EntityId;
  title: string;
  hypothesisId: EntityId;
  model: string;
  observableIds: EntityId[];
  controls: string[];
  primaryMetric: string;
  status: ResearchStatus;
  projectId: EntityId;
}


export type ExperimentRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface MeasurementSeries {
  id: EntityId;
  name: string;
  unit?: string;
  values: number[];
  timestamps?: number[];
  description?: string;
}

export interface ObservableResult {
  id: EntityId;
  observableId: EntityId;
  value: number;
  unit?: string;
  confidence?: number;
  computationTimeMs: number;
  metadata: Record<string, string | number | boolean>;
}

export interface RunProvenance {
  engine: string;
  engineVersion: string;
  observableRegistryVersion: string;
  sourceRevision: string;
  createdAt: string;
  deterministic: boolean;
}

export interface ExperimentRun {
  id: EntityId;
  experimentId: EntityId;
  hypothesisId: EntityId;
  status: ExperimentRunStatus;
  startedAt: string;
  completedAt?: string;
  parameters: Record<string, string | number | boolean>;
  randomSeed: number;
  measurements: MeasurementSeries[];
  observableResults: ObservableResult[];
  conclusion: "supports" | "challenges" | "inconclusive";
  conclusionRationale: string;
  notes: string[];
  provenance: RunProvenance;
  projectId: EntityId;
}

export interface ReviewConcern {
  id: EntityId;
  severity: "major" | "minor";
  title: string;
  description: string;
  evidence: EvidenceLevel;
  projectId: EntityId;
}

export interface ResearchWorkspace {
  id: EntityId;
  name: string;
  tagline: string;
  project: ResearchProject;
  stats: WorkspaceStats;
  navigation: NavigationItem[];
  lifecycle: LifecycleStage[];
  claims: ResearchClaim[];
  sources: ResearchSource[];
  methods: ResearchMethod[];
  observables: ObservableDefinition[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  evidenceGraph: EvidenceGraph;
  hypotheses: Hypothesis[];
  experiments: ExperimentDefinition[];
  reviewConcerns: ReviewConcern[];
}
