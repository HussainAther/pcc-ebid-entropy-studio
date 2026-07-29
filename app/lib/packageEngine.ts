import type { AnalysisDefinition, DatasetDefinition, ExperimentRun, FigureDefinition } from "../models/research";
import type { AnalysisResult } from "./analysisEngine";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildReproducibilityPackage(dataset: DatasetDefinition, runs: ExperimentRun[], figures: FigureDefinition[], analyses: AnalysisDefinition[], analysisResults: AnalysisResult[]) {
  const includedRuns = runs.filter(run => dataset.experimentIds.includes(run.experimentId));
  const payload = {
    schemaVersion: "entropy-dataset-package/1.0.0",
    dataset,
    generatedAt: new Date().toISOString(),
    citation: { title: dataset.title, version: dataset.version, type: "dataset", authors: ["Syed Hussain Ather"] },
    runs: includedRuns,
    figures: figures.filter(figure => figure.experimentIds.some(id => dataset.experimentIds.includes(id))),
    analyses: analyses.filter(analysis => dataset.experimentIds.includes(analysis.experimentId)),
    analysisResults: analysisResults.filter(result => analyses.some(analysis => analysis.id === result.analysisId && dataset.experimentIds.includes(analysis.experimentId))),
  };
  const content = canonical(payload);
  return { ...payload, integrity: { algorithm: "SHA-256", canonicalPayloadSha256: await sha256(content), runCount: includedRuns.length } };
}
