import type {
  EvidenceGraph,
  EvidenceNode,
  EvidenceRelation,
  ResearchWorkspace,
} from "../models/research";

type GraphInputs = Pick<
  ResearchWorkspace,
  "project" | "sources" | "claims" | "hypotheses" | "experiments" | "observables" | "methods"
>;

const columns = {
  source: 8,
  method: 25,
  observable: 42,
  claim: 60,
  hypothesis: 77,
  experiment: 93,
  run: 96,
  result: 99,
} as const;

function distribute(index: number, count: number): number {
  if (count <= 1) return 50;
  return 12 + (index * 76) / (count - 1);
}

export function createEvidenceGraph(input: GraphInputs): EvidenceGraph {
  const { project, sources, claims, hypotheses, experiments, observables, methods } = input;
  const nodes: EvidenceNode[] = [];
  const relations: EvidenceRelation[] = [];

  const pushNodes = <T extends { id: string }>(
    items: T[],
    kind: EvidenceNode["kind"],
    label: (item: T) => string,
    summary: (item: T) => string,
    evidence?: (item: T) => EvidenceNode["evidence"],
    status?: (item: T) => string | undefined,
  ) => {
    items.forEach((item, index) => nodes.push({
      id: `EVN-${item.id}`,
      entityId: item.id,
      kind,
      label: label(item),
      summary: summary(item),
      evidence: evidence?.(item),
      status: status?.(item),
      x: columns[kind],
      y: distribute(index, items.length),
      projectId: project.id,
    }));
  };

  pushNodes(sources, "source", item => item.name, item => `${item.type} · ${item.provenance}`, undefined, item => item.status);
  pushNodes(methods, "method", item => item.name, item => "Computational or analytical method", undefined, item => item.status);
  pushNodes(observables, "observable", item => item.name, item => item.interpretation, undefined, item => item.implementationStatus);
  pushNodes(claims, "claim", item => item.id, item => item.text, item => item.evidence);
  pushNodes(hypotheses, "hypothesis", item => item.title, item => item.statement, item => item.evidence);
  pushNodes(experiments, "experiment", item => item.title, item => `${item.model} · ${item.primaryMetric}`, undefined, item => item.status);

  const add = (
    id: string,
    sourceEntityId: string,
    targetEntityId: string,
    type: EvidenceRelation["type"],
    label: string,
    rationale: string,
    evidence: EvidenceRelation["evidence"],
  ) => relations.push({
    id,
    sourceId: `EVN-${sourceEntityId}`,
    targetId: `EVN-${targetEntityId}`,
    type,
    label,
    rationale,
    evidence,
    projectId: project.id,
  });

  claims.forEach(claim => claim.sourceIds.forEach((sourceId, index) => add(
    `EVR-SOURCE-${claim.id}-${index + 1}`,
    sourceId,
    claim.id,
    "documents",
    "documents",
    "The claim explicitly cites this source in the workspace ledger.",
    claim.evidence,
  )));

  hypotheses.forEach(hypothesis => hypothesis.derivedFromIds.forEach((entityId, index) => {
    if (nodes.some(node => node.entityId === entityId)) add(
      `EVR-DERIVED-${hypothesis.id}-${index + 1}`,
      entityId,
      hypothesis.id,
      "derived-from",
      "informs",
      "The hypothesis records this entity as part of its derivation or motivation.",
      hypothesis.evidence,
    );
  }));

  experiments.forEach(experiment => {
    add(
      `EVR-TEST-${experiment.id}`,
      experiment.hypothesisId,
      experiment.id,
      "tested-by",
      "tested by",
      "The experiment is explicitly designed to test this hypothesis.",
      "hypothesis",
    );
    experiment.observableIds.forEach((observableId, index) => add(
      `EVR-MEASURE-${experiment.id}-${index + 1}`,
      experiment.id,
      observableId,
      "measured-by",
      "measures with",
      "The experiment manifest names this observable as an output or analysis instrument.",
      "supported",
    ));
  });

  observables.forEach(observable => {
    observable.relatedClaimIds.forEach((claimId, index) => add(
      `EVR-OBS-CLAIM-${observable.id}-${index + 1}`,
      observable.id,
      claimId,
      "grounds",
      "grounds",
      "The observable definition explicitly identifies this claim as related.",
      claims.find(claim => claim.id === claimId)?.evidence ?? "hypothesis",
    ));
    observable.relatedHypothesisIds.forEach((hypothesisId, index) => add(
      `EVR-OBS-HYP-${observable.id}-${index + 1}`,
      observable.id,
      hypothesisId,
      "uses",
      "used by",
      "The hypothesis depends on or evaluates this registered observable.",
      hypotheses.find(hypothesis => hypothesis.id === hypothesisId)?.evidence ?? "hypothesis",
    ));
    observable.sourceIds.forEach((sourceId, index) => add(
      `EVR-OBS-SOURCE-${observable.id}-${index + 1}`,
      sourceId,
      observable.id,
      "documents",
      "defines",
      "The observable registry cites this source for its definition or implementation.",
      "supported",
    ));
  });

  const modelMethod = methods.find(method => method.name.toLowerCase().includes("replicator"));
  experiments.forEach(experiment => {
    if (modelMethod && experiment.model.includes("replicator")) add(
      `EVR-IMPLEMENT-${experiment.id}`,
      modelMethod.id,
      experiment.id,
      "implemented-by",
      "implements",
      "The experiment model maps to the registered cyclic replicator method.",
      "supported",
    );
  });

  return { nodes, relations };
}

export function validateEvidenceGraph(graph: EvidenceGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map(node => node.id));
  const duplicateNodeIds = graph.nodes.filter((node, index) => graph.nodes.findIndex(other => other.id === node.id) !== index);
  const duplicateRelationIds = graph.relations.filter((relation, index) => graph.relations.findIndex(other => other.id === relation.id) !== index);
  duplicateNodeIds.forEach(node => errors.push(`Duplicate evidence node: ${node.id}`));
  duplicateRelationIds.forEach(relation => errors.push(`Duplicate evidence relation: ${relation.id}`));
  graph.relations.forEach(relation => {
    if (!nodeIds.has(relation.sourceId)) errors.push(`${relation.id} has missing source ${relation.sourceId}`);
    if (!nodeIds.has(relation.targetId)) errors.push(`${relation.id} has missing target ${relation.targetId}`);
  });
  return errors;
}
