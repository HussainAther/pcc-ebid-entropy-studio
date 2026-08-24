import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { EcaRulialCampaignReport } from "../app/lib/rulialCampaignRunner.ts";
import { analyzeEcaObserverGeometry, observerGeometryNodesToCsv, observerGeometryPairsToCsv } from "../app/lib/rulialObserverGeometry.ts";

const sourcePath=resolve("data/ruliology/eca-observer-dependence/source-campaign.json");
const outputDir=resolve("data/ruliology/eca-observer-geometry");
const source=JSON.parse(readFileSync(sourcePath,"utf8")) as EcaRulialCampaignReport;
const report=analyzeEcaObserverGeometry(source);
mkdirSync(outputDir,{recursive:true});
writeFileSync(resolve(outputDir,"observer-geometry-report.json"),JSON.stringify(report,null,2)+"\n");
writeFileSync(resolve(outputDir,"observer-geometry-summary.json"),JSON.stringify({schemaVersion:report.schemaVersion,experimentId:report.experimentId,createdAt:report.createdAt,observerSpace:report.observerSpace,sourceSimulation:report.sourceSimulation,summary:report.summary,distanceLevels:report.distanceLevels,topOneFeatureEdges:report.pairs.filter(p=>p.oneFeatureNeighbor).sort((a,b)=>b.quotientDistance-a.quotientDistance).slice(0,12),notes:report.notes},null,2)+"\n");
writeFileSync(resolve(outputDir,"observer-nodes.csv"),observerGeometryNodesToCsv(report));
writeFileSync(resolve(outputDir,"observer-pairs.csv"),observerGeometryPairsToCsv(report));
console.log(JSON.stringify({outputDir,observerCount:report.observerSpace.nodeCount,pairCount:report.observerSpace.pairCount,oneFeatureEdges:report.observerSpace.oneFeatureEdgeCount,...report.summary},null,2));
