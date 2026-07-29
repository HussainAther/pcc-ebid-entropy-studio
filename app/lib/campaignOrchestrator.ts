import type {
  AnalysisDefinition,
  DatasetDefinition,
  ExperimentRun,
  FigureDefinition,
  ObservableDefinition,
  ResearchCampaign,
  ResearchEngine,
  ResearchPaper,
  ExperimentDefinition,
} from "../models/research";
import { executeExperimentRun } from "./experimentRunner";
import { executeAnalysis, type AnalysisResult } from "./analysisEngine";
import { generateFigure, type FigureProduct } from "./figureEngine";
import { buildManuscript } from "./publicationEngine";
import { buildReproducibilityPackage } from "./packageEngine";

export interface CampaignStepResult {
  stepId: string;
  kind: ResearchCampaign["steps"][number]["kind"];
  status: "completed" | "blocked" | "skipped";
  message: string;
  outputCount: number;
}

export interface CampaignEvidenceSummary {
  supports: number;
  challenges: number;
  inconclusive: number;
  total: number;
  statement: string;
}

export interface CampaignReport {
  schemaVersion: "entropy-campaign-report/1.0.0";
  campaignId: string;
  status: "completed" | "blocked";
  startedAt: string;
  completedAt: string;
  runIds: string[];
  runs: ExperimentRun[];
  analyses: AnalysisResult[];
  figures: Array<Omit<FigureProduct, "svg"> & { svg?: string }>;
  manuscripts: Array<{ paperId: string; markdown: string }>;
  packages: Array<{ datasetId: string; payload: unknown }>;
  evidence: CampaignEvidenceSummary;
  steps: CampaignStepResult[];
  warnings: string[];
}

export interface CampaignExecutionContext {
  campaign: ResearchCampaign;
  experiment?: ExperimentDefinition;
  engine?: ResearchEngine;
  observables: ObservableDefinition[];
  analyses: AnalysisDefinition[];
  figures: FigureDefinition[];
  papers: ResearchPaper[];
  datasets: DatasetDefinition[];
  existingRuns: ExperimentRun[];
  projectRevision: string;
  projectId: string;
}

function cartesianAxes(axes: ResearchCampaign["parameterAxes"]): Array<Record<string, number>> {
  return axes.reduce<Array<Record<string, number>>>((rows, axis) =>
    rows.flatMap(row => axis.values.map(value => ({ ...row, [axis.name]: value }))), [{}]);
}

function evidenceSummary(runs: ExperimentRun[]): CampaignEvidenceSummary {
  const supports = runs.filter(run => run.conclusion === "supports").length;
  const challenges = runs.filter(run => run.conclusion === "challenges").length;
  const inconclusive = runs.filter(run => run.conclusion === "inconclusive").length;
  const total = runs.length;
  return {
    supports,
    challenges,
    inconclusive,
    total,
    statement: total
      ? `${supports}/${total} runs support the preregistered criterion, ${challenges}/${total} challenge it, and ${inconclusive}/${total} are inconclusive.`
      : "No campaign runs were available; the evidence state was not changed.",
  };
}

export function campaignRunCount(campaign: ResearchCampaign): number {
  return campaign.seeds.length * cartesianAxes(campaign.parameterAxes).length;
}

export async function executeCampaign(context: CampaignExecutionContext): Promise<CampaignReport> {
  const { campaign, experiment, engine } = context;
  const startedAt = new Date().toISOString();
  const steps: CampaignStepResult[] = [];
  const warnings: string[] = [];

  if (!experiment || !engine) {
    const message = !experiment ? `Unknown experiment ${campaign.experimentId}.` : `Unknown engine ${experiment.engineId}.`;
    return {
      schemaVersion: "entropy-campaign-report/1.0.0", campaignId: campaign.id, status: "blocked",
      startedAt, completedAt: new Date().toISOString(), runIds: [], runs: [], analyses: [], figures: [], manuscripts: [], packages: [],
      evidence: evidenceSummary([]), steps: [{ stepId: campaign.steps[0]?.id ?? "preflight", kind: campaign.steps[0]?.kind ?? "execute", status: "blocked", message, outputCount: 0 }], warnings: [message],
    };
  }

  if (engine.status !== "validated" || !engine.entrypoints.some(entry => entry.protocol === "local")) {
    const message = `${engine.name} is not a validated browser-local engine. Generate and import schema-valid artifacts before downstream campaign steps can execute.`;
    steps.push({ stepId: campaign.steps[0]?.id ?? "preflight", kind: campaign.steps[0]?.kind ?? "import", status: "blocked", message, outputCount: 0 });
    return {
      schemaVersion: "entropy-campaign-report/1.0.0", campaignId: campaign.id, status: "blocked",
      startedAt, completedAt: new Date().toISOString(), runIds: [], runs: [], analyses: [], figures: [], manuscripts: [], packages: [],
      evidence: evidenceSummary([]), steps, warnings: [message],
    };
  }

  const combinations = cartesianAxes(campaign.parameterAxes);
  const runs: ExperimentRun[] = [];
  for (const seed of campaign.seeds) {
    for (const parameters of combinations) {
      const epsilon = Number(parameters.epsilon ?? campaign.fixedParameters.epsilon ?? 0.05);
      const fitWindowEnd = Number(campaign.fixedParameters.fitWindowEnd ?? 8);
      const stepsCount = Number(campaign.fixedParameters.steps ?? 240);
      const dt = Number(campaign.fixedParameters.dt ?? 0.05);
      const run = executeExperimentRun({
        experiment,
        observables: context.observables,
        seed,
        epsilon,
        fitWindowEnd,
        steps: stepsCount,
        dt,
        projectRevision: context.projectRevision,
        projectId: context.projectId,
      });
      const axisLabel = Object.entries(parameters).map(([key, value]) => `${key}-${value}`).join("-");
      runs.push({ ...run, id: `RUN-${campaign.id}-${seed}-${axisLabel || "fixed"}`, parameters: { ...run.parameters, ...parameters, campaignId: campaign.id } });
    }
  }
  steps.push({ stepId: campaign.steps.find(step => step.kind === "execute")?.id ?? "execute", kind: "execute", status: "completed", message: `Executed ${runs.length} deterministic run(s).`, outputCount: runs.length });

  const allRuns = [...context.existingRuns, ...runs];
  const analysisDefinitions = context.analyses.filter(item => campaign.analysisIds.includes(item.id));
  const analyses = analysisDefinitions.map(item => executeAnalysis(item, allRuns));
  steps.push({ stepId: campaign.steps.find(step => step.kind === "analyze")?.id ?? "analyze", kind: "analyze", status: "completed", message: `Executed ${analyses.length} registered analysis definition(s).`, outputCount: analyses.length });

  const figureDefinitions = context.figures.filter(item => campaign.figureIds.includes(item.id));
  const figures = figureDefinitions.map(item => generateFigure(item, allRuns));
  steps.push({ stepId: campaign.steps.find(step => step.kind === "figure")?.id ?? "figure", kind: "figure", status: "completed", message: `Generated ${figures.filter(item => item.status === "generated").length}/${figures.length} registered figure(s).`, outputCount: figures.length });

  const evidence = evidenceSummary(runs);
  steps.push({ stepId: campaign.steps.find(step => step.kind === "evidence")?.id ?? "evidence", kind: "evidence", status: "completed", message: evidence.statement, outputCount: evidence.total });

  const paperDefinitions = context.papers.filter(item => campaign.paperIds.includes(item.id));
  const manuscripts = paperDefinitions.map(paper => ({ paperId: paper.id, markdown: buildManuscript(paper, allRuns, context.figures, context.analyses, analyses) }));
  steps.push({ stepId: campaign.steps.find(step => step.kind === "manuscript")?.id ?? "manuscript", kind: "manuscript", status: "completed", message: `Refreshed ${manuscripts.length} evidence-linked manuscript scaffold(s).`, outputCount: manuscripts.length });

  const datasetDefinitions = context.datasets.filter(item => campaign.datasetIds.includes(item.id));
  const packages = [] as Array<{ datasetId: string; payload: unknown }>;
  for (const dataset of datasetDefinitions) {
    packages.push({ datasetId: dataset.id, payload: await buildReproducibilityPackage(dataset, allRuns, context.figures, context.analyses, analyses) });
  }
  steps.push({ stepId: campaign.steps.find(step => step.kind === "package")?.id ?? "package", kind: "package", status: "completed", message: `Assembled ${packages.length} integrity-checked reproducibility package(s).`, outputCount: packages.length });

  if (figures.some(item => item.status !== "generated")) warnings.push("One or more figures lacked compatible numeric measurement series.");
  if (analyses.some(item => item.status !== "completed")) warnings.push("One or more analyses returned insufficient data.");

  return {
    schemaVersion: "entropy-campaign-report/1.0.0",
    campaignId: campaign.id,
    status: "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    runIds: runs.map(run => run.id),
    runs,
    analyses,
    figures,
    manuscripts,
    packages,
    evidence,
    steps,
    warnings,
  };
}
