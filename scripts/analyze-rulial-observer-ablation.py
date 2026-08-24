#!/usr/bin/env python3
from __future__ import annotations
import argparse,csv,hashlib,importlib.util,itertools,json,math
from pathlib import Path
from typing import Any
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('r15',ROOT/'scripts/analyze-rulial-information-weighted-observer.py')
r15=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(r15)
FEATURES=list(r15.FEATURE_IDS); N=len(FEATURES); INTERACTION_MAGNITUDE=0.05
REGIME={'OBS-TRANSITION-RATE','OBS-METASTABLE-DWELL'}

def subset_key(fs): return '|'.join(f for f in FEATURES if f in fs) if fs else 'EMPTY'
def weights_for(fs): return {f:(1.0 if f in fs else 0.0) for f in FEATURES}
def all_subsets():
    for mask in range(1,1<<N): yield frozenset(FEATURES[i] for i in range(N) if mask&(1<<i))
def shapley(values,feature):
    others=[f for f in FEATURES if f!=feature]; total=0.0
    for k in range(len(others)+1):
        c=math.factorial(k)*math.factorial(N-k-1)/math.factorial(N)
        for comb in itertools.combinations(others,k):
            s=frozenset(comb); total+=c*(values[s|{feature}]-values[s])
    return float(total)
def interaction(values,a,b):
    others=[f for f in FEATURES if f not in (a,b)]; total=0.0
    for k in range(len(others)+1):
        c=math.factorial(k)*math.factorial(N-k-2)/math.factorial(N-1)
        for comb in itertools.combinations(others,k):
            s=frozenset(comb); total+=c*(values[s|{a,b}]-values[s|{a}]-values[s|{b}]+values[s])
    return float(total)
def write_csv(path,rows):
    if not rows:return
    with path.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0].keys()));w.writeheader();w.writerows(rows)
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output-dir',type=Path,default=ROOT/'data/ruliology/observer-ablation');args=ap.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
    lhs=r15.latin_hypercube(r15.DESIGN_POINT_COUNT,len(r15.DIMENSIONS),r15.DESIGN_SEED)
    points=[{'id':f'BOIDS-R15-{i:03d}','rule':r15.unit_to_rule(lhs[i])} for i in range(r15.DESIGN_POINT_COUNT)]
    config={'n_agents':40,'steps':200,'dt':0.2,'width':100.0,'height':100.0,'separation_radius':3.0,'max_speed':2.5,'pressure':0.35,'tail_fraction':0.25,'stochastic_noise_scale':1.0}
    runs_a,_=r15.build_profiles(points,r15.POOL_A,config);runs_b,_=r15.build_profiles(points,r15.POOL_B,config);all_runs=runs_a+runs_b
    pa=r15.subset_profiles(all_runs,points,r15.POOL_A);pb=r15.subset_profiles(all_runs,points,r15.POOL_B);scales=r15.feature_scale(pa);pairs=r15.fixed_local_pairs(points)
    subset_rows=[]; vg={frozenset():0.0};vl={frozenset():0.0};vj={frozenset():0.0}
    for fs in all_subsets():
        m=r15.observer_metrics(pa,pb,scales,weights_for(fs),pairs);vg[fs]=m['geometryStabilitySpearman'];vl[fs]=m['localEdgeStabilitySpearman'];vj[fs]=m['top10LocalEdgeJaccard'];subset_rows.append({'subset':subset_key(fs),'featureCount':len(fs),**m})
    full=frozenset(FEATURES); feature_rows=[]
    for f in FEATURES:
        loo=full-{f};feature_rows.append({'featureId':f,'geometryShapley':shapley(vg,f),'localShapley':shapley(vl,f),'jaccardShapley':shapley(vj,f),'removeFromFullGeometryDelta':vg[loo]-vg[full],'removeFromFullLocalDelta':vl[loo]-vl[full],'removeFromFullJaccardDelta':vj[loo]-vj[full],'isRegimeCoordinate':f in REGIME})
    pair_rows=[]
    for a,b in itertools.combinations(FEATURES,2): pair_rows.append({'featureA':a,'featureB':b,'geometryInteraction':interaction(vg,a,b),'localInteraction':interaction(vl,a,b),'jaccardInteraction':interaction(vj,a,b),'containsRegimeCoordinate':a in REGIME or b in REGIME})
    strongest=max(pair_rows,key=lambda r:abs(r['geometryInteraction'])); rr=[r for r in feature_rows if r['isRegimeCoordinate']]
    diag={'nonAdditiveGeometryInteractionPresent':abs(strongest['geometryInteraction'])>=INTERACTION_MAGNITUDE,'strongestGeometryInteraction':strongest,'bothRegimeRemovalsImproveGeometry':all(r['removeFromFullGeometryDelta']>0 for r in rr),'bothRegimeRemovalsImproveLocal':all(r['removeFromFullLocalDelta']>0 for r in rr)}
    report={'schemaVersion':'entropy-rulial-observer-ablation/1.0.0','experimentId':'RUL-016','title':'Exact Boids observer subset ablation and interaction decomposition','generatedAt':'2026-08-24T23:30:00.000Z','source':{'experimentId':'RUL-015','designPointCount':r15.DESIGN_POINT_COUNT,'seedPools':{'A':r15.POOL_A,'B':r15.POOL_B},'newUniqueSimulationRunCount':0,'replayedDeterministicRunCount':len(all_runs)},'design':{'featureCount':N,'nonEmptyObserverSubsetCount':(1<<N)-1,'pairInteractionCount':math.comb(N,2),'localNeighborK':r15.LOCAL_K,'interactionMagnitudeDiagnostic':INTERACTION_MAGNITUDE},'fullObserver':{'features':FEATURES,'geometryStabilitySpearman':vg[full],'localEdgeStabilitySpearman':vl[full],'top10LocalEdgeJaccard':vj[full]},'featureEffects':feature_rows,'pairInteractions':pair_rows,'diagnostic':diag,'interpretationBoundary':['RUL-016 is a diagnostic decomposition of the frozen RUL-015 population and introduces zero new unique rule coordinates or seeds.','All 63 non-empty subsets are evaluated exhaustively; no subset is selected after looking at outcomes and then presented as prospective.','Shapley values use v(empty)=0 as an explicit bookkeeping baseline and are exact contributions for this finite observer-set function, not causal effects.','Pair interactions quantify non-additivity of split-half stability under this metric and dataset; they do not prove mechanistic coupling between physical observables.']}
    rp=args.output_dir/'observer-ablation-report.json';rp.write_text(json.dumps(report,indent=2)+'\n');summary={'experimentId':'RUL-016','source':report['source'],'design':report['design'],'fullObserver':report['fullObserver'],'featureEffects':feature_rows,'pairInteractions':pair_rows,'diagnostic':diag};(args.output_dir/'observer-ablation-summary.json').write_text(json.dumps(summary,indent=2)+'\n');write_csv(args.output_dir/'observer-subsets.csv',subset_rows);write_csv(args.output_dir/'feature-effects.csv',feature_rows);write_csv(args.output_dir/'pair-interactions.csv',pair_rows);digest=hashlib.sha256(rp.read_bytes()).hexdigest();(args.output_dir/'sha256.txt').write_text(f'{digest}  observer-ablation-report.json\n');print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
