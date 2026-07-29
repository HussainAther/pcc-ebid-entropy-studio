export type EntityId = string;

export type ResearchView =
  | "overview"
  | "corpus"
  | "observables"
  | "engines"
  | "graph"
  | "hypotheses"
  | "experiments"
  | "simulation"
  | "orchestrator"
  | "figures"
  | "statistics"
  | "publications"
  | "datasets"
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
  engineId: EntityId;
  title: string;
  hypothesisId: EntityId;
  model: string;
  observableIds: EntityId[];
  controls: string[];
  primaryMetric: string;
  status: ResearchStatus;
  projectId: EntityId;
}


export type RepositoryRole = "core" | "simulation" | "analysis" | "training";
export type EngineStatus = "planned" | "available" | "validated";

export interface RepositoryDefinition {
  id: EntityId;
  name: string;
  fullName: string;
  role: RepositoryRole;
  description: string;
  defaultBranch: string;
  language: string;
  visibility: "public" | "private";
  status: EngineStatus;
  projectId: EntityId;
}

export interface EngineEntrypoint {
  id: EntityId;
  label: string;
  command: string;
  protocol: "local" | "cli" | "python-module" | "artifact-import";
  description: string;
}

export interface ResearchEngine {
  id: EntityId;
  name: string;
  repositoryId: EntityId;
  role: RepositoryRole;
  description: string;
  version: string;
  status: EngineStatus;
  deterministic: boolean;
  entrypoints: EngineEntrypoint[];
  supportedObservableIds: EntityId[];
  supportedExperimentIds: EntityId[];
  artifactSchemaVersion: string;
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
  engineId: EntityId;
  repositoryId: EntityId;
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


export type CampaignStatus = "specified" | "ready" | "running" | "completed" | "blocked";
export type CampaignStepKind = "execute" | "import" | "analyze" | "figure" | "evidence" | "manuscript" | "package";

export interface CampaignParameterAxis {
  name: string;
  values: number[];
}

export interface CampaignStepDefinition {
  id: EntityId;
  kind: CampaignStepKind;
  label: string;
  dependsOn: EntityId[];
  description: string;
}

export interface ResearchCampaign {
  id: EntityId;
  title: string;
  description: string;
  experimentId: EntityId;
  seeds: number[];
  parameterAxes: CampaignParameterAxis[];
  fixedParameters: Record<string, string | number | boolean>;
  analysisIds: EntityId[];
  figureIds: EntityId[];
  paperIds: EntityId[];
  datasetIds: EntityId[];
  steps: CampaignStepDefinition[];
  status: CampaignStatus;
  projectId: EntityId;
}

export type PublicationStatus = "draft" | "review" | "submitted" | "published";
export type AnalysisKind = "descriptive" | "regression" | "bootstrap" | "permutation" | "change-point";

export interface FigureDefinition {
  id: EntityId;
  number: number;
  title: string;
  caption: string;
  experimentIds: EntityId[];
  observableIds: EntityId[];
  generator: string;
  outputFormats: ("svg" | "png" | "pdf")[];
  status: "specified" | "ready" | "generated";
  projectId: EntityId;
}

export interface AnalysisDefinition {
  id: EntityId;
  name: string;
  kind: AnalysisKind;
  experimentId: EntityId;
  observableIds: EntityId[];
  method: string;
  preregistered: boolean;
  status: "specified" | "ready" | "completed";
  projectId: EntityId;
}

export interface ManuscriptSection { id: EntityId; title: string; purpose: string; sourceIds: EntityId[]; status: "outline" | "draft" | "reviewed"; }
export interface ResearchPaper {
  id: EntityId; title: string; shortTitle: string; status: PublicationStatus;
  hypothesisIds: EntityId[]; experimentIds: EntityId[]; figureIds: EntityId[]; analysisIds: EntityId[];
  sections: ManuscriptSection[]; targetVenue?: string; projectId: EntityId;
}
export interface DatasetDefinition {
  id: EntityId; title: string; version: string; experimentIds: EntityId[];
  include: string[]; license: string; status: "specified" | "ready" | "exported"; projectId: EntityId;
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
  repositories: RepositoryDefinition[];
  engines: ResearchEngine[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  evidenceGraph: EvidenceGraph;
  hypotheses: Hypothesis[];
  experiments: ExperimentDefinition[];
  campaigns: ResearchCampaign[];
  figures: FigureDefinition[];
  analyses: AnalysisDefinition[];
  papers: ResearchPaper[];
  datasets: DatasetDefinition[];
  reviewConcerns: ReviewConcern[];
}
