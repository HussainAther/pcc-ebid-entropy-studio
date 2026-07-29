import type { AnalysisDefinition, ExperimentRun, FigureDefinition, ResearchPaper } from "../models/research";
import type { AnalysisResult } from "./analysisEngine";

export function buildManuscript(paper: ResearchPaper, runs: ExperimentRun[], figures: FigureDefinition[], analyses: AnalysisDefinition[], results: AnalysisResult[]): string {
  const paperRuns = runs.filter(run => paper.experimentIds.includes(run.experimentId));
  const resultById = new Map(results.map(result => [result.analysisId, result]));
  const body = paper.sections.map(section => {
    const linkedRuns = paperRuns.filter(run => section.sourceIds.includes(run.experimentId) || section.title === "Results");
    const linkedAnalyses = analyses.filter(item => paper.analysisIds.includes(item.id) && section.sourceIds.includes(item.id));
    const resultLines = linkedRuns.map(run => `- **${run.id}** — ${run.conclusion}: ${run.conclusionRationale}`);
    const analysisLines = linkedAnalyses.map(item => {
      const result = resultById.get(item.id);
      return result ? `- **${item.name} (${item.id})** — ${result.status}; estimates: \`${JSON.stringify(result.estimates)}\`` : `- **${item.name} (${item.id})** — not executed in this session.`;
    });
    const generated = section.title === "Results" && (resultLines.length || analysisLines.length) ? [...resultLines, ...analysisLines].join("\n") : "[Author-reviewed prose pending.]";
    return `## ${section.title}\n\n**Purpose:** ${section.purpose}\n\n**Evidence links:** ${section.sourceIds.join(", ")}\n\n${generated}`;
  }).join("\n\n");
  return `# ${paper.title}\n\n**Status:** ${paper.status}\n**Target venue:** ${paper.targetVenue ?? "Not selected"}\n**Generated from:** ${paperRuns.length} completed/imported run(s)\n\n> Machine-generated statements below are traceable summaries, not author-approved scientific prose.\n\n${body}\n\n## Figure ledger\n\n${figures.filter(item => paper.figureIds.includes(item.id)).map(item => `- Figure ${item.number}: ${item.title} (${item.id})`).join("\n") || "No figures linked."}\n\n## Reproducibility statement\n\nExperiments: ${paper.experimentIds.join(", ")}  \nFigures: ${paper.figureIds.join(", ")}  \nAnalyses: ${paper.analysisIds.join(", ")}  \nRun IDs: ${paperRuns.map(run => run.id).join(", ") || "none"}\n`;
}
