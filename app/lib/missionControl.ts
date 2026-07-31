import type { ExperimentRun, ResearchWorkspace, ResearchView } from "../models/research";

export type DashboardTone = "healthy" | "attention" | "critical" | "neutral";

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  detail: string;
  tone: DashboardTone;
  view: ResearchView;
}

export interface CampaignSummary {
  id: string;
  title: string;
  engine: string;
  completedRuns: number;
  totalRuns: number;
  progress: number;
  stage: string;
  status: string;
  view: ResearchView;
}

export interface DashboardAttentionItem {
  id: string;
  title: string;
  description: string;
  action: string;
  tone: "attention" | "critical";
  view: ResearchView;
}

export interface ActivityEvent {
  id: string;
  kind: "campaign" | "run" | "figure" | "analysis" | "paper" | "dataset";
  action: string;
  object: string;
  time: string;
  view: ResearchView;
}

export interface MissionControlViewModel {
  greeting: string;
  workspaceStatus: { tone: DashboardTone; message: string; attentionCount: number };
  metrics: DashboardMetric[];
  campaigns: CampaignSummary[];
  attentionItems: DashboardAttentionItem[];
  activity: ActivityEvent[];
  evidence: { supported: number; challenged: number; inconclusive: number };
  publication: { label: string; value: string; state: "complete" | "active" | "pending" }[];
}

export function campaignExpectedRuns(campaign: ResearchWorkspace["campaigns"][number]): number {
  return campaign.seeds.length * campaign.parameterAxes.reduce((total, axis) => total * axis.values.length, 1);
}

export function buildMissionControlViewModel(workspace: ResearchWorkspace, runs: ExperimentRun[], now = new Date()): MissionControlViewModel {
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const evidence = runs.reduce((summary, run) => {
    if (run.conclusion === "supports") summary.supported += 1;
    else if (run.conclusion === "challenges") summary.challenged += 1;
    else summary.inconclusive += 1;
    return summary;
  }, { supported: 0, challenged: 0, inconclusive: 0 });

  const campaigns = workspace.campaigns.map(campaign => {
    const experiment = workspace.experiments.find(item => item.id === campaign.experimentId);
    const engine = workspace.engines.find(item => item.id === experiment?.engineId);
    const completedRuns = runs.filter(run => run.experimentId === campaign.experimentId).length;
    const totalRuns = campaignExpectedRuns(campaign);
    const progress = totalRuns ? Math.min(100, Math.round((completedRuns / totalRuns) * 100)) : 0;
    const stage = campaign.status === "blocked" ? "Awaiting artifact import" : progress === 0 ? "Ready to execute" : progress < 100 ? "Run execution" : "Ready for analysis";
    return { id: campaign.id, title: campaign.title, engine: engine?.name ?? experiment?.engineId ?? "Unassigned engine", completedRuns, totalRuns, progress, stage, status: campaign.status, view: "orchestrator" as ResearchView };
  });

  const attentionItems: DashboardAttentionItem[] = [];
  const blockedCampaigns = campaigns.filter(item => item.status === "blocked");
  if (blockedCampaigns.length) attentionItems.push({ id: "blocked-campaigns", title: `${blockedCampaigns.length} campaign awaiting evidence`, description: "External engine artifacts must be imported before analysis and publication can continue.", action: "Open campaign", tone: "attention", view: "orchestrator" });
  const specifiedFigures = workspace.figures.filter(item => item.status === "specified");
  if (specifiedFigures.length) attentionItems.push({ id: "figures", title: `${specifiedFigures.length} figure not yet generated`, description: "The registered specification exists, but no run-derived product is available.", action: "Review figures", tone: "attention", view: "figures" });
  const incompleteResults = workspace.papers.flatMap(paper => paper.sections.filter(section => section.title.toLowerCase().includes("results") && section.status !== "reviewed"));
  if (incompleteResults.length) attentionItems.push({ id: "results", title: `${incompleteResults.length} Results section${incompleteResults.length === 1 ? "" : "s"} incomplete`, description: "Complete or import validated runs before promoting generated text to findings.", action: "Continue draft", tone: "attention", view: "publications" });
  if (runs.some(run => run.conclusion === "challenges")) attentionItems.unshift({ id: "challenged-runs", title: `${evidence.challenged} run${evidence.challenged === 1 ? "" : "s"} challenge a hypothesis`, description: "Review the run provenance and declared decision rule before publication.", action: "Inspect evidence", tone: "critical", view: "graph" });

  const activity: ActivityEvent[] = runs.slice(-3).reverse().map((run, index) => ({ id: `run-${run.id}`, kind: "run", action: "Run completed", object: run.id, time: index === 0 ? "Just now" : `${index + 1} events ago`, view: "simulation" }));
  if (!activity.length) activity.push(
    { id: "campaign-ready", kind: "campaign", action: "Campaign registered", object: workspace.campaigns[0]?.title ?? "Research campaign", time: "Ready now", view: "orchestrator" },
    { id: "figure-ready", kind: "figure", action: "Figure specification validated", object: workspace.figures[0]?.title ?? "Figure workspace", time: "Registry state", view: "figures" },
    { id: "paper-draft", kind: "paper", action: "Manuscript draft available", object: workspace.papers[0]?.shortTitle ?? "Publication workspace", time: "Registry state", view: "publications" },
  );

  const readyFigures = workspace.figures.filter(item => item.status === "ready").length;
  const readyAnalyses = workspace.analyses.filter(item => item.status === "ready").length;
  const attentionCount = attentionItems.length;
  return {
    greeting,
    workspaceStatus: { tone: attentionCount ? "attention" : "healthy", attentionCount, message: attentionCount ? `Your research workspace is stable. ${attentionCount} actionable item${attentionCount === 1 ? "" : "s"} need attention.` : "Your research workspace is healthy and ready for the next run." },
    metrics: [
      { id: "hypotheses", label: "Hypotheses", value: workspace.hypotheses.length, detail: `${workspace.hypotheses.filter(item => item.evidence === "hypothesis").length} testable`, tone: "neutral", view: "hypotheses" },
      { id: "experiments", label: "Experiments", value: workspace.experiments.length, detail: `${workspace.experiments.filter(item => item.status === "active").length} active`, tone: "healthy", view: "experiments" },
      { id: "runs", label: "Loaded runs", value: runs.length, detail: runs.length ? `${evidence.supported} supporting` : "none loaded", tone: runs.length ? "healthy" : "attention", view: "simulation" },
      { id: "figures", label: "Figures", value: workspace.figures.length, detail: `${readyFigures} generator-ready`, tone: readyFigures === workspace.figures.length ? "healthy" : "attention", view: "figures" },
      { id: "papers", label: "Papers", value: workspace.papers.length, detail: `${workspace.papers.filter(item => item.status === "draft").length} active drafts`, tone: "neutral", view: "publications" },
    ],
    campaigns,
    attentionItems,
    activity,
    evidence,
    publication: [
      { label: "Experiments", value: `${workspace.experiments.length} registered`, state: "complete" },
      { label: "Statistics", value: `${readyAnalyses}/${workspace.analyses.length} ready`, state: readyAnalyses === workspace.analyses.length ? "complete" : "active" },
      { label: "Figures", value: `${readyFigures}/${workspace.figures.length} ready`, state: readyFigures === workspace.figures.length ? "complete" : "active" },
      { label: "Manuscript", value: `${workspace.papers.filter(item => item.status === "draft").length} draft`, state: "active" },
      { label: "Dataset", value: `${workspace.datasets.filter(item => item.status === "ready").length} ready`, state: "complete" },
      { label: "Review", value: `${workspace.reviewConcerns.length} concerns`, state: "pending" },
    ],
  };
}
