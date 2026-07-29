import type { AnalysisDefinition, ExperimentRun } from "../models/research";

export interface NumericSummary {
  n: number;
  mean?: number;
  standardDeviation?: number;
  minimum?: number;
  maximum?: number;
}

export interface AnalysisResult {
  analysisId: string;
  kind: AnalysisDefinition["kind"];
  status: "completed" | "insufficient-data";
  runIds: string[];
  summary: NumericSummary;
  estimates: Record<string, number | string | boolean>;
  limitations: string[];
  generatedAt: string;
}

function finite(values: number[]): number[] {
  return values.filter(Number.isFinite);
}

export function summarize(values: number[]): NumericSummary {
  const xs = finite(values);
  if (!xs.length) return { n: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.length > 1 ? xs.reduce((total, value) => total + (value - mean) ** 2, 0) / (xs.length - 1) : 0;
  return { n: xs.length, mean, standardDeviation: Math.sqrt(variance), minimum: Math.min(...xs), maximum: Math.max(...xs) };
}

function regression(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return undefined;
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((s, value) => s + (value - mx) ** 2, 0);
  if (sxx === 0) return undefined;
  const slope = xs.reduce((s, value, index) => s + (value - mx) * (ys[index] - my), 0) / sxx;
  const intercept = my - slope * mx;
  const predictions = xs.map(value => intercept + slope * value);
  const sse = ys.reduce((s, value, index) => s + (value - predictions[index]) ** 2, 0);
  const sst = ys.reduce((s, value) => s + (value - my) ** 2, 0);
  return { slope, intercept, rSquared: sst === 0 ? 1 : 1 - sse / sst, n };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrapMean(values: number[], resamples = 2000, seed = 1729) {
  if (values.length < 2) return undefined;
  const random = mulberry32(seed);
  const estimates: number[] = [];
  for (let r = 0; r < resamples; r += 1) {
    let total = 0;
    for (let i = 0; i < values.length; i += 1) total += values[Math.floor(random() * values.length)];
    estimates.push(total / values.length);
  }
  estimates.sort((a, b) => a - b);
  const at = (p: number) => estimates[Math.min(estimates.length - 1, Math.max(0, Math.floor(p * estimates.length)))];
  return { lower95: at(0.025), upper95: at(0.975), resamples, seed };
}

function observableValues(runs: ExperimentRun[], observableIds: string[]): number[] {
  return runs.flatMap(run => run.observableResults.filter(result => observableIds.includes(result.observableId)).map(result => result.value));
}

function measurementPair(run: ExperimentRun) {
  const series = run.measurements.filter(item => item.values.length > 1);
  if (!series.length) return undefined;
  const y = series.find(item => /deficit|entropy|polarization|alignment/i.test(item.name)) ?? series[0];
  const x = y.timestamps ?? run.measurements.find(item => item.values.length === y.values.length && item.id !== y.id)?.values ?? y.values.map((_, index) => index);
  return { x, y: y.values, seriesName: y.name };
}

export function executeAnalysis(definition: AnalysisDefinition, runs: ExperimentRun[]): AnalysisResult {
  const compatible = runs.filter(run => run.status === "completed" && run.experimentId === definition.experimentId);
  const values = observableValues(compatible, definition.observableIds);
  const summary = summarize(values);
  const base = { analysisId: definition.id, kind: definition.kind, runIds: compatible.map(run => run.id), summary, generatedAt: new Date().toISOString() };
  if (!compatible.length) return { ...base, status: "insufficient-data", estimates: {}, limitations: ["No completed compatible run artifacts are loaded."] };

  if (definition.kind === "regression") {
    const pairs = compatible.map(measurementPair).filter(Boolean) as Array<NonNullable<ReturnType<typeof measurementPair>>>;
    const estimates = pairs.map(pair => regression(pair.x, pair.y)).filter(Boolean) as Array<NonNullable<ReturnType<typeof regression>>>;
    if (!estimates.length) return { ...base, status: "insufficient-data", estimates: {}, limitations: ["No measurement series contained enough varying x-values for regression."] };
    const slopes = estimates.map(item => item.slope);
    return { ...base, status: "completed", estimates: { meanSlope: summarize(slopes).mean ?? 0, meanRSquared: summarize(estimates.map(item => item.rSquared)).mean ?? 0, fittedRuns: estimates.length }, limitations: ["The generic executor selects the first compatible measurement series; author review must confirm the preregistered fit window."] };
  }

  if (definition.kind === "bootstrap") {
    const interval = bootstrapMean(values);
    if (!interval) return { ...base, status: "insufficient-data", estimates: {}, limitations: ["At least two independent observable values are required for a bootstrap interval."] };
    return { ...base, status: "completed", estimates: interval, limitations: ["The interval treats loaded runs as exchangeable independent replicates."] };
  }

  if (definition.kind === "change-point") {
    const transitionValues = compatible.flatMap(run => run.observableResults.filter(result => definition.observableIds.includes(result.observableId)).map(result => result.value));
    if (!transitionValues.length) return { ...base, status: "insufficient-data", estimates: {}, limitations: ["No registered transition observable was present."] };
    const positive = transitionValues.filter(value => value > 0).length;
    const negative = transitionValues.filter(value => value < 0).length;
    return { ...base, status: "completed", estimates: { meanLead: summarize(transitionValues).mean ?? 0, entropyLeads: positive, orderLeads: negative, ties: transitionValues.length - positive - negative }, limitations: ["Threshold locations are inherited from engine artifacts and are not re-estimated in the browser."] };
  }

  return { ...base, status: summary.n ? "completed" : "insufficient-data", estimates: summary.mean === undefined ? {} : { mean: summary.mean }, limitations: ["Only registered numeric observable outputs are summarized."] };
}
