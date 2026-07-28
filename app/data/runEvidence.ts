import type { EvidenceGraph, EvidenceNode, EvidenceRelation, ExperimentRun } from "../models/research";

export function extendEvidenceGraphWithRuns(base: EvidenceGraph, runs: ExperimentRun[]): EvidenceGraph {
  const nodes: EvidenceNode[] = [...base.nodes];
  const relations: EvidenceRelation[] = [...base.relations];

  runs.forEach((run, runIndex) => {
    const runNodeId = `EVN-${run.id}`;
    nodes.push({
      id: runNodeId,
      entityId: run.id,
      kind: "run",
      label: run.id,
      summary: run.conclusionRationale,
      evidence: run.conclusion === "inconclusive" ? "hypothesis" : "supported",
      status: run.status,
      x: 96,
      y: 12 + runIndex * 12,
      projectId: run.projectId,
    });
    relations.push({
      id: `EVR-RUN-${run.id}`,
      sourceId: `EVN-${run.experimentId}`,
      targetId: runNodeId,
      type: "produces",
      label: "produces run",
      rationale: "This recorded execution instantiates the experiment definition with frozen parameters and provenance.",
      evidence: "supported",
      projectId: run.projectId,
    });

    run.observableResults.forEach((result, index) => {
      const resultNodeId = `EVN-${result.id}`;
      nodes.push({
        id: resultNodeId,
        entityId: result.id,
        kind: "result",
        label: `${result.observableId} result`,
        summary: `Computed value ${Number.isFinite(result.value) ? result.value.toPrecision(5) : "non-finite"}`,
        evidence: "supported",
        status: "computed",
        x: 99,
        y: 38 + runIndex * 14 + index * 5,
        projectId: run.projectId,
      });
      relations.push({
        id: `EVR-RESULT-${result.id}`,
        sourceId: runNodeId,
        targetId: resultNodeId,
        type: "produces",
        label: "produces result",
        rationale: "The result was computed from measurements recorded by this run.",
        evidence: "supported",
        projectId: run.projectId,
      });
      relations.push({
        id: `EVR-COMPUTED-${result.id}`,
        sourceId: resultNodeId,
        targetId: `EVN-${result.observableId}`,
        type: "computed-with",
        label: "computed with",
        rationale: "The result references the registered observable definition and its estimator contract.",
        evidence: "supported",
        projectId: run.projectId,
      });
    });

    relations.push({
      id: `EVR-CONCLUSION-${run.id}`,
      sourceId: runNodeId,
      targetId: `EVN-${run.hypothesisId}`,
      type: run.conclusion === "challenges" ? "challenges-with-result" : run.conclusion === "supports" ? "supports-with-result" : "reports",
      label: run.conclusion === "challenges" ? "challenges with result" : run.conclusion === "supports" ? "supports with result" : "returns inconclusive result",
      rationale: run.conclusionRationale,
      evidence: run.conclusion === "inconclusive" ? "hypothesis" : "supported",
      projectId: run.projectId,
    });
  });

  return { nodes, relations };
}
