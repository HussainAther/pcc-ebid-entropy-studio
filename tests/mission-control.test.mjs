import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studio = readFileSync(new URL("../app/studio.tsx", import.meta.url), "utf8");
const model = readFileSync(new URL("../app/lib/missionControl.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("Mission Control is the default overview experience", () => {
  assert.match(studio, /mission-dashboard/);
  assert.match(studio, /Needs attention/);
  assert.match(studio, /Publication pipeline/);
});

test("dashboard values are derived through a typed view model", () => {
  assert.match(model, /interface MissionControlViewModel/);
  assert.match(model, /campaignExpectedRuns/);
  assert.match(model, /buildMissionControlViewModel/);
  assert.match(model, /run\.conclusion/);
});

test("responsive dashboard breakpoints exist", () => {
  assert.match(css, /@media\(max-width:1120px\)/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /@media\(max-width:520px\)/);
});
