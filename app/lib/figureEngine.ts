import type { ExperimentRun, FigureDefinition } from "../models/research";

export interface FigureProduct {
  figureId: string;
  status: "generated" | "insufficient-data";
  svg?: string;
  runIds: string[];
  seriesCount: number;
  warnings: string[];
}

const esc = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character));

export function generateFigure(definition: FigureDefinition, runs: ExperimentRun[]): FigureProduct {
  const compatible = runs.filter(run => run.status === "completed" && definition.experimentIds.includes(run.experimentId));
  const series = compatible.flatMap(run => run.measurements.filter(item => item.values.length > 1 && (definition.observableIds.some(id => item.id.includes(id.replace("OBS-", ""))) || /entropy|deficit|polarization|alignment|noise|chaos/i.test(item.name))).map(item => ({ runId: run.id, name: item.name, values: item.values, x: item.timestamps ?? item.values.map((_, index) => index) })));
  if (!series.length) return { figureId: definition.id, status: "insufficient-data", runIds: compatible.map(run => run.id), seriesCount: 0, warnings: ["No compatible numeric measurement series were found."] };
  const width = 860, height = 460, left = 70, top = 48, right = 30, bottom = 68;
  const xs = series.flatMap(item => item.x).filter(Number.isFinite);
  const ys = series.flatMap(item => item.values).filter(Number.isFinite);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const sx = (x: number) => left + ((x - xMin) / (xMax - xMin || 1)) * (width - left - right);
  const sy = (y: number) => height - bottom - ((y - yMin) / (yMax - yMin || 1)) * (height - top - bottom);
  const paths = series.map((item, index) => `<path d="${item.values.map((value, i) => `${i ? "L" : "M"}${sx(item.x[i]).toFixed(2)},${sy(value).toFixed(2)}`).join(" ")}" fill="none" stroke="currentColor" stroke-width="${index === 0 ? 2.4 : 1.4}" opacity="${Math.max(0.35, 1 - index * 0.08)}"/>`).join("");
  const legend = series.slice(0, 8).map((item, index) => `<text x="${left + (index % 2) * 360}" y="${height - 38 + Math.floor(index / 2) * 14}" font-size="11">${esc(item.runId)} · ${esc(item.name)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(definition.title)}</title><desc id="desc">${esc(definition.caption)}</desc><rect width="100%" height="100%" fill="white"/><g color="#111827" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"><text x="${left}" y="27" font-size="18" font-weight="700">Figure ${definition.number}. ${esc(definition.title)}</text><line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" stroke="currentColor"/><line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" stroke="currentColor"/>${paths}<text x="${left}" y="${height-8}" font-size="10">x: ${xMin.toPrecision(4)} to ${xMax.toPrecision(4)} · y: ${yMin.toPrecision(4)} to ${yMax.toPrecision(4)}</text>${legend}</g></svg>`;
  return { figureId: definition.id, status: "generated", svg, runIds: compatible.map(run => run.id), seriesCount: series.length, warnings: series.length > 8 ? ["Legend is limited to the first eight series."] : [] };
}
