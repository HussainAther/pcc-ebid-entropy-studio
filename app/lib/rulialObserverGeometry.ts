import type { ObserverDefinition } from "../models/ruliology.ts";
import type { EcaRulialCampaignReport, RulialProfileArtifact } from "./rulialCampaignRunner.ts";
import { reprofileEcaCampaignWithObserver } from "./rulialCampaignRunner.ts";
import { scaledObservableDistance } from "./rulialAnalysis.ts";
import { spearman } from "./rulialValidation.ts";

export const RULIAL_OBSERVER_GEOMETRY_SCHEMA_VERSION = "entropy-rulial-observer-geometry/1.0.0" as const;
export const ECA_OBSERVER_BASIS = [
  "OBS-SHANNON",
  "OBS-HAMMING",
  "OBS-PERTURB-GROWTH",
  "OBS-AUTOCORR-TIME",
  "OBS-COMPRESSION",
] as const;

export interface ObserverLatticeNode {
  observerId: string;
  observableIds: string[];
  bitMask: number;
  dimension: number;
  epsilon: number;
  splitGeometrySpearman: number;
  equivalentPairCount: number;
  componentCount: number;
  largestComponentSize: number;
}

export interface ObserverLatticePair {
  leftObserverId: string;
  rightObserverId: string;
  structuralDistance: number;
  featureSymmetricDifference: number;
  quotientDistance: number;
  geometryDistance: number;
  coassignmentJaccard: number;
  geometrySpearman: number;
  oneFeatureNeighbor: boolean;
}

export interface DistanceLevelSummary {
  structuralDistance: number;
  pairCount: number;
  meanQuotientDistance: number;
  medianQuotientDistance: number;
  meanGeometryDistance: number;
}

export interface RulialObserverGeometryReport {
  schemaVersion: typeof RULIAL_OBSERVER_GEOMETRY_SCHEMA_VERSION;
  experimentId: "RUL-005-ECA-OBSERVER-GEOMETRY-001";
  createdAt: string;
  ruleSpaceId: "RSPACE-ECA-256";
  observerSpace: {
    basisObservableIds: string[];
    representation: string;
    nodeCount: number;
    pairCount: number;
    oneFeatureEdgeCount: number;
  };
  sourceSimulation: {
    campaignId: string;
    runCount: number;
    ruleCount: number;
    seeds: number[];
    policy: string;
  };
  nodes: ObserverLatticeNode[];
  pairs: ObserverLatticePair[];
  distanceLevels: DistanceLevelSummary[];
  summary: {
    structuralVsQuotientSpearman: number;
    structuralVsGeometrySpearman: number;
    quotientVsGeometrySpearman: number;
    meanOneFeatureQuotientDistance: number;
    medianOneFeatureQuotientDistance: number;
    maxOneFeatureQuotientDistance: number;
    maxOneFeaturePair: [string, string];
    permutationReplicates: number;
    structuralVsQuotientPermutationP: number;
    structuralVsGeometryPermutationP: number;
  };
  notes: string[];
}

function mean(values: number[]): number { return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0; }
function quantile(values: number[], q: number): number {
  if (!values.length) return Number.NaN;
  const sorted=[...values].sort((a,b)=>a-b); const p=(sorted.length-1)*q; const lo=Math.floor(p); const hi=Math.ceil(p);
  if (lo===hi) return sorted[lo]; const w=p-lo; return sorted[lo]*(1-w)+sorted[hi]*w;
}
function pairKey(a:string,b:string):string { return Number(a)<Number(b)?`${a}:${b}`:`${b}:${a}`; }
function profileMap(report:EcaRulialCampaignReport):Map<string,RulialProfileArtifact>{ return new Map(report.profiles.map(p=>[p.rule.ruleId,p])); }
function allPairDistanceMap(report:EcaRulialCampaignReport):Map<string,number>{
  const ps=[...report.profiles].sort((a,b)=>Number(a.rule.ruleId)-Number(b.rule.ruleId)); const out=new Map<string,number>();
  for(let i=0;i<ps.length;i++) for(let j=i+1;j<ps.length;j++) out.set(pairKey(ps[i].rule.ruleId,ps[j].rule.ruleId),scaledObservableDistance(ps[i],ps[j]));
  return out;
}
function jaccard(left:Set<string>,right:Set<string>):number{ const u=new Set([...left,...right]); if(!u.size)return 1; let n=0; for(const x of left)if(right.has(x))n++; return n/u.size; }
function orderedVectors(left:Map<string,number>,right:Map<string,number>):[number[],number[]]{ const ks=[...left.keys()].filter(k=>right.has(k)).sort(); return [ks.map(k=>left.get(k)!),ks.map(k=>right.get(k)!)]; }
function epsilonPairs(distances:Map<string,number>, epsilon:number):Set<string>{ const out=new Set<string>(); for(const [k,v] of distances) if(v<=epsilon) out.add(k); return out; }
function thresholdComponents(ids:string[], pairs:Set<string>):string[][]{
  const parent=new Map(ids.map(id=>[id,id]));
  const find=(x:string):string=>{ const p=parent.get(x)!; if(p===x)return x; const r=find(p); parent.set(x,r); return r; };
  const union=(a:string,b:string)=>{ const ra=find(a),rb=find(b); if(ra!==rb)parent.set(rb,ra); };
  for(const key of pairs){ const [a,b]=key.split(":"); union(a,b); }
  const groups=new Map<string,string[]>(); for(const id of ids){ const r=find(id); groups.set(r,[...(groups.get(r)??[]),id]); }
  return [...groups.values()];
}
function makeRng(seed:number):()=>number{
  let state=seed>>>0;
  return ()=>{ state=(Math.imul(state,1664525)+1013904223)>>>0; return state/0x100000000; };
}
function shuffled<T>(values:T[], rng:()=>number):T[]{
  const out=[...values];
  for(let i=out.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
  return out;
}
function matrixPermutationP(observers:ObserverDefinition[], pairs:ObserverLatticePair[], metric:"quotientDistance"|"geometryDistance", observed:number, replicates=1000, seed=20260824):number{
  const ids=observers.map(observer=>observer.id);
  const structural=pairs.map(pair=>pair.structuralDistance);
  const lookup=new Map<string,number>();
  const key=(a:string,b:string)=>a<b?`${a}|${b}`:`${b}|${a}`;
  for(const pair of pairs) lookup.set(key(pair.leftObserverId,pair.rightObserverId),pair[metric]);
  const rng=makeRng(seed+(metric==="geometryDistance"?17:0));
  let exceed=0;
  for(let r=0;r<replicates;r++){
    const perm=shuffled(ids,rng); const mapping=new Map(ids.map((id,i)=>[id,perm[i]]));
    const permuted=pairs.map(pair=>lookup.get(key(mapping.get(pair.leftObserverId)!,mapping.get(pair.rightObserverId)!))!);
    if(spearman(structural,permuted)>=observed) exceed++;
  }
  return (exceed+1)/(replicates+1);
}
function observerFromMask(mask:number):ObserverDefinition{
  const observableIds=ECA_OBSERVER_BASIS.filter((_,i)=>Boolean(mask&(1<<i)));
  return { id:`OBSERVER-ECA-SUBSET-${mask.toString(2).padStart(ECA_OBSERVER_BASIS.length,"0")}`, name:`ECA subset observer ${mask}`, description:"Frozen subset observer generated from the five-feature ECA measurement basis for RUL-005 observer-space geometry.", observableIds:[...observableIds], coarseGraining:"Same ECA trajectory summaries as RUL-004; only the retained observable coordinates differ.", temporalResolution:"Inherited from each retained registered observable.", spatialResolution:"Whole-lattice summaries inherited from each retained registered observable.", projectId:"project-pcc-ebid" };
}
export function enumerateEcaSubsetObservers():ObserverDefinition[]{ return Array.from({length:(1<<ECA_OBSERVER_BASIS.length)-1},(_,i)=>observerFromMask(i+1)); }
function structuralDistance(a:ObserverDefinition,b:ObserverDefinition):number{ const A=new Set(a.observableIds),B=new Set(b.observableIds); let d=0; for(const x of ECA_OBSERVER_BASIS) if(A.has(x)!==B.has(x))d++; return d/ECA_OBSERVER_BASIS.length; }

export function analyzeEcaObserverGeometry(source:EcaRulialCampaignReport, createdAt=new Date().toISOString()):RulialObserverGeometryReport{
  if(source.summary.ruleCount!==256) throw new Error("RUL-005 requires the complete 256-rule ECA source campaign.");
  const seeds=[...source.configuration.seeds]; if(seeds.length<8||seeds.length%2!==0) throw new Error("RUL-005 requires an even source seed ensemble of at least 8 seeds.");
  const splitA=seeds.filter((_,i)=>i%2===0), splitB=seeds.filter((_,i)=>i%2===1);
  const observers=enumerateEcaSubsetObservers();
  const nodes:ObserverLatticeNode[]=[]; const fullDistances=new Map<string,Map<string,number>>(); const pairSets=new Map<string,Set<string>>();
  for(const observer of observers){
    const full=reprofileEcaCampaignWithObserver(source,observer,seeds), left=reprofileEcaCampaignWithObserver(source,observer,splitA), right=reprofileEcaCampaignWithObserver(source,observer,splitB);
    const lm=profileMap(left),rm=profileMap(right),ids=[...lm.keys()].sort((a,b)=>Number(a)-Number(b));
    const self=ids.map(id=>scaledObservableDistance(lm.get(id)!,rm.get(id)!)); const epsilon=quantile(self,.5);
    const ld=allPairDistanceMap(left),rd=allPairDistanceMap(right),fd=allPairDistanceMap(full); const joint=new Map<string,number>();
    for(const [k,v] of ld) if(rd.has(k))joint.set(k,Math.max(v,rd.get(k)!));
    const equivPairs=epsilonPairs(joint,epsilon); const components=thresholdComponents(ids,equivPairs); const [lv,rv]=orderedVectors(ld,rd);
    const mask=parseInt(observer.id.split("-").at(-1)!,2);
    nodes.push({observerId:observer.id,observableIds:[...observer.observableIds],bitMask:mask,dimension:observer.observableIds.length,epsilon,splitGeometrySpearman:spearman(lv,rv),equivalentPairCount:equivPairs.size,componentCount:components.length,largestComponentSize:Math.max(...components.map(c=>c.length))});
    fullDistances.set(observer.id,fd); pairSets.set(observer.id,equivPairs);
  }
  const pairs:ObserverLatticePair[]=[];
  for(let i=0;i<observers.length;i++)for(let j=i+1;j<observers.length;j++){
    const a=observers[i],b=observers[j],sd=structuralDistance(a,b); const [av,bv]=orderedVectors(fullDistances.get(a.id)!,fullDistances.get(b.id)!); const gs=spearman(av,bv); const cj=jaccard(pairSets.get(a.id)!,pairSets.get(b.id)!);
    pairs.push({leftObserverId:a.id,rightObserverId:b.id,structuralDistance:sd,featureSymmetricDifference:Math.round(sd*ECA_OBSERVER_BASIS.length),quotientDistance:1-cj,geometryDistance:(1-gs)/2,coassignmentJaccard:cj,geometrySpearman:gs,oneFeatureNeighbor:Math.abs(sd-1/ECA_OBSERVER_BASIS.length)<1e-12});
  }
  const levels=[1,2,3,4,5].map(k=>{
    const xs=pairs.filter(p=>p.featureSymmetricDifference===k); return {structuralDistance:k/ECA_OBSERVER_BASIS.length,pairCount:xs.length,meanQuotientDistance:mean(xs.map(x=>x.quotientDistance)),medianQuotientDistance:quantile(xs.map(x=>x.quotientDistance),.5),meanGeometryDistance:mean(xs.map(x=>x.geometryDistance))};
  });
  const sd=pairs.map(p=>p.structuralDistance),qd=pairs.map(p=>p.quotientDistance),gd=pairs.map(p=>p.geometryDistance),edges=pairs.filter(p=>p.oneFeatureNeighbor); const maxEdge=[...edges].sort((a,b)=>b.quotientDistance-a.quotientDistance)[0];
  const structuralVsQuotientSpearman=spearman(sd,qd), structuralVsGeometrySpearman=spearman(sd,gd);
  const permutationReplicates=1000;
  const structuralVsQuotientPermutationP=matrixPermutationP(observers,pairs,"quotientDistance",structuralVsQuotientSpearman,permutationReplicates);
  const structuralVsGeometryPermutationP=matrixPermutationP(observers,pairs,"geometryDistance",structuralVsGeometrySpearman,permutationReplicates);
  return {schemaVersion:RULIAL_OBSERVER_GEOMETRY_SCHEMA_VERSION,experimentId:"RUL-005-ECA-OBSERVER-GEOMETRY-001",createdAt,ruleSpaceId:"RSPACE-ECA-256",observerSpace:{basisObservableIds:[...ECA_OBSERVER_BASIS],representation:"Non-empty subsets of the five-feature ECA observer basis; structural distance is normalized Hamming distance between feature-inclusion bit vectors.",nodeCount:observers.length,pairCount:pairs.length,oneFeatureEdgeCount:edges.length},sourceSimulation:{campaignId:source.campaignId,runCount:source.summary.runCount,ruleCount:source.summary.ruleCount,seeds,policy:"Reuse the single frozen RUL-004 source simulation population. No trajectories are generated per subset observer."},nodes,pairs,distanceLevels:levels,summary:{structuralVsQuotientSpearman,structuralVsGeometrySpearman,quotientVsGeometrySpearman:spearman(qd,gd),meanOneFeatureQuotientDistance:mean(edges.map(e=>e.quotientDistance)),medianOneFeatureQuotientDistance:quantile(edges.map(e=>e.quotientDistance),.5),maxOneFeatureQuotientDistance:maxEdge?.quotientDistance??0,maxOneFeaturePair:[maxEdge?.leftObserverId??"",maxEdge?.rightObserverId??""],permutationReplicates,structuralVsQuotientPermutationP,structuralVsGeometryPermutationP},notes:["RUL-005 asks whether nearby observers induce nearby rulial quotients on one fixed ECA trajectory population.","Observer space is an explicitly finite Boolean feature lattice, not a claim that all scientifically possible observers reduce to feature subsets.","Quotient-proxy distance is one minus Jaccard overlap of pairwise observational-indistinguishability sets at each observer's epsilon; geometry distance is (1 - Spearman)/2 over all rule-pair distances. The pairwise relation is not assumed transitive.","Each subset observer calibrates epsilon independently from median same-rule split-half variability, so quotient differences reflect feature choice plus empirical observer resolution.","Association significance is assessed with a deterministic one-sided matrix-label permutation test over observer identities, avoiding a naive independent-pairs p-value for the 465 dependent observer-pair entries.","With 31 observers, there are 465 observer pairs and 75 one-feature lattice edges; these provide more than the six pairwise comparisons available in RUL-004."]};
}

export function observerGeometryPairsToCsv(report:RulialObserverGeometryReport):string{
  const rows:any[][]=[["left_observer","right_observer","structural_distance","feature_symmetric_difference","quotient_distance","geometry_distance","coassignment_jaccard","geometry_spearman","one_feature_neighbor"]];
  for(const p of report.pairs)rows.push([p.leftObserverId,p.rightObserverId,p.structuralDistance,p.featureSymmetricDifference,p.quotientDistance,p.geometryDistance,p.coassignmentJaccard,p.geometrySpearman,p.oneFeatureNeighbor]); return rows.map(r=>r.join(",")).join("\n")+"\n";
}
export function observerGeometryNodesToCsv(report:RulialObserverGeometryReport):string{
  const rows:any[][]=[["observer_id","bit_mask","dimension","epsilon","split_geometry_spearman","equivalent_pair_count","component_count","largest_component_size","observable_ids"]];
  for(const n of report.nodes)rows.push([n.observerId,n.bitMask,n.dimension,n.epsilon,n.splitGeometrySpearman,n.equivalentPairCount,n.componentCount,n.largestComponentSize,n.observableIds.join(";")]); return rows.map(r=>r.join(",")).join("\n")+"\n";
}
