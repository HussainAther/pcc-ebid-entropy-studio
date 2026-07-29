import type { ExperimentRun } from "../models/research";

export interface EntropyRunArtifact {
  schemaVersion: "entropy-run/1.0.0";
  run: {
    id: string;
    experimentId: string;
    hypothesisId: string;
    engineId: string;
    seed: number;
    parameters: Record<string, string | number | boolean>;
    startedAt: string;
    completedAt: string;
    status: "completed" | "failed";
  };
  provenance: {
    repository: string;
    repositoryId: string;
    revision: string;
    engineVersion: string;
    observableRegistryVersion: string;
    deterministic: boolean;
  };
  measurements: ExperimentRun["measurements"];
  observableResults: ExperimentRun["observableResults"];
  artifacts: Array<{ id: string; kind: "figure" | "table" | "trajectory" | "log" | "configuration"; path: string; mediaType?: string; sha256?: string }>;
  conclusion: { status: ExperimentRun["conclusion"]; hypothesisId: string; rationale: string };
  notes?: string[];
}

export interface ArtifactValidationResult { valid: boolean; errors: string[]; artifact?: EntropyRunArtifact }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateRunArtifact(input: unknown): ArtifactValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { valid: false, errors: ["Artifact must be a JSON object."] };
  if (input.schemaVersion !== "entropy-run/1.0.0") errors.push("Unsupported schemaVersion; expected entropy-run/1.0.0.");
  const run = input.run;
  if (!isRecord(run)) errors.push("Missing run object.");
  else {
    for (const field of ["id", "experimentId", "hypothesisId", "engineId", "startedAt", "completedAt", "status"]) {
      if (typeof run[field] !== "string" || !run[field]) errors.push(`run.${field} must be a non-empty string.`);
    }
    if (!Number.isInteger(run.seed)) errors.push("run.seed must be an integer.");
    if (!isRecord(run.parameters)) errors.push("run.parameters must be an object.");
  }
  const provenance = input.provenance;
  if (!isRecord(provenance)) errors.push("Missing provenance object.");
  else {
    for (const field of ["repository", "repositoryId", "revision", "engineVersion", "observableRegistryVersion"]) {
      if (typeof provenance[field] !== "string" || !provenance[field]) errors.push(`provenance.${field} must be a non-empty string.`);
    }
    if (typeof provenance.deterministic !== "boolean") errors.push("provenance.deterministic must be boolean.");
  }
  if (!Array.isArray(input.measurements)) errors.push("measurements must be an array.");
  if (!Array.isArray(input.observableResults)) errors.push("observableResults must be an array.");
  if (!Array.isArray(input.artifacts)) errors.push("artifacts must be an array.");
  const conclusion = input.conclusion;
  if (!isRecord(conclusion)) errors.push("Missing conclusion object.");
  else if (!["supports", "challenges", "inconclusive"].includes(String(conclusion.status))) errors.push("conclusion.status is invalid.");
  return errors.length ? { valid: false, errors } : { valid: true, errors: [], artifact: input as unknown as EntropyRunArtifact };
}

export function importRunArtifact(input: unknown, projectId: string): ExperimentRun {
  const result = validateRunArtifact(input);
  if (!result.valid || !result.artifact) throw new Error(result.errors.join(" "));
  const artifact = result.artifact;
  return {
    id: artifact.run.id,
    experimentId: artifact.run.experimentId,
    hypothesisId: artifact.run.hypothesisId,
    status: artifact.run.status,
    startedAt: artifact.run.startedAt,
    completedAt: artifact.run.completedAt,
    parameters: artifact.run.parameters,
    randomSeed: artifact.run.seed,
    measurements: artifact.measurements,
    observableResults: artifact.observableResults,
    conclusion: artifact.conclusion.status,
    conclusionRationale: artifact.conclusion.rationale,
    notes: artifact.notes ?? [],
    provenance: {
      engineId: artifact.run.engineId,
      repositoryId: artifact.provenance.repositoryId,
      engineVersion: artifact.provenance.engineVersion,
      observableRegistryVersion: artifact.provenance.observableRegistryVersion,
      sourceRevision: artifact.provenance.revision,
      createdAt: artifact.run.completedAt,
      deterministic: artifact.provenance.deterministic,
    },
    projectId,
  };
}
