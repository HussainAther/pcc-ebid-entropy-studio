export type EntityId = string;

export type ResearchView =
  | "overview"
  | "corpus"
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

export interface ExperimentDefinition {
  id: EntityId;
  title: string;
  hypothesisId: EntityId;
  model: string;
  observables: string[];
  controls: string[];
  primaryMetric: string;
  status: ResearchStatus;
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
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  hypotheses: Hypothesis[];
  experiments: ExperimentDefinition[];
  reviewConcerns: ReviewConcern[];
}
