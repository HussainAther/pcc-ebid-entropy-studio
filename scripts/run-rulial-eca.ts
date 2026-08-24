import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { profilesToCsv, runEcaRulialCampaign } from "../app/lib/rulialCampaignRunner.ts";

function parseNumbers(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  return value.split(",").map(item => Number(item.trim())).filter(Number.isFinite);
}

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index];
  if (!token.startsWith("--")) continue;
  const [key, inline] = token.slice(2).split("=", 2);
  if (inline !== undefined) args.set(key, inline);
  else if (process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) args.set(key, process.argv[++index]);
  else args.set(key, "true");
}

const outputDir = resolve(args.get("out") ?? "data/ruliology/eca-atlas");
const quick = args.get("quick") === "true";
const report = runEcaRulialCampaign({
  ruleIds: quick ? [0, 30, 54, 90, 110, 184, 255] : parseNumbers(args.get("rules")),
  seeds: parseNumbers(args.get("seeds")),
  width: args.has("width") ? Number(args.get("width")) : undefined,
  steps: args.has("steps") ? Number(args.get("steps")) : undefined,
  density: args.has("density") ? Number(args.get("density")) : undefined,
  sourceRevision: args.get("revision") ?? process.env.GIT_COMMIT ?? "working-tree",
});

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "campaign-report.json"), JSON.stringify(report, null, 2) + "\n");
await writeFile(resolve(outputDir, "profiles.csv"), profilesToCsv(report.profiles));
const atlas = {
  schemaVersion: "entropy-rulial-atlas/1.0.0",
  generatedAt: report.createdAt,
  campaignId: report.campaignId,
  configuration: report.configuration,
  summary: report.summary,
  profiles: report.profiles,
  highSensitivityTransitions: [...report.transitions]
    .sort((a, b) => b.observableDistance - a.observableDistance)
    .slice(0, 32),
};
await writeFile(resolve(outputDir, "atlas.json"), JSON.stringify(atlas, null, 2) + "\n");
await writeFile(resolve(outputDir, "transitions.csv"), [
  "from_rule,to_rule,syntactic_distance,observable_distance,observer_id",
  ...report.transitions.map(item => [item.fromRuleId, item.toRuleId, item.syntacticDistance, item.observableDistance, item.observerId].join(",")),
].join("\n") + "\n");

console.log(JSON.stringify({ outputDir, ...report.summary }, null, 2));
