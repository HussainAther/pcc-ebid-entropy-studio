#!/usr/bin/env python3
from __future__ import annotations

import argparse, csv, hashlib, json, math, sys
from pathlib import Path
from typing import Any
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'adapters' / 'pcc-boids'))
from pcc_boids.rulial import (DIMENSIONS, FEATURE_IDS, build_profiles, feature_distance, feature_scale,
                              latin_hypercube, rule_to_unit, spearman, unit_to_rule)

POOL_A = [81001,81013,81023,81041]
POOL_B = [82003,82007,82009,82021]
RESOLUTION = [1,2,4]
NOISE_RESOLUTION = [1]
OBSERVERS = {
    'full_core': FEATURE_IDS,
    'state_structure': ['OBS-POLARIZATION','OBS-HEADING-ENTROPY','OBS-SPATIAL','OBS-SPEED-VARIANCE'],
    'regime_dynamics': ['OBS-TRANSITION-RATE','OBS-METASTABLE-DWELL'],
    'order_entropy': ['OBS-POLARIZATION','OBS-HEADING-ENTROPY'],
}

def rankdata(values):
    order=np.argsort(values,kind='mergesort'); ranks=np.empty(len(values),float); i=0
    while i<len(values):
        j=i+1
        while j<len(values) and values[order[j]]==values[order[i]]: j+=1
        ranks[order[i:j]]=(i+j-1)/2+1; i=j
    return ranks

def q95median(vals):
    a=np.asarray(vals,float); med=float(np.median(a))
    if med <= 1e-9:
        return None
    ratio=float(np.quantile(a,.95)/med)
    return None if ratio > 1e6 else ratio

def subset_distance(a,b,scales,features):
    z=[(a[f]-b[f])/scales[f] for f in features]
    return float(np.sqrt(np.mean(np.square(z))))

def fixed_local_pairs(points,k=4):
    units=np.array([rule_to_unit(p['rule']) for p in points]); seen=set(); pairs=[]
    for i in range(len(points)):
        ds=np.linalg.norm(units-units[i],axis=1)/math.sqrt(len(DIMENSIONS))
        for j in np.argsort(ds)[1:k+1]:
            a,b=sorted((i,int(j)))
            if (a,b) in seen: continue
            seen.add((a,b)); pairs.append((a,b,float(ds[j])))
    return pairs

def metrics(pa,pb,scales,features,pairs):
    all_a=[]; all_b=[]
    for i in range(len(pa)):
        for j in range(i+1,len(pa)):
            all_a.append(subset_distance(pa[i]['features'],pa[j]['features'],scales,features))
            all_b.append(subset_distance(pb[i]['features'],pb[j]['features'],scales,features))
    la=[]; lb=[]; sa=[]; sb=[]
    for i,j,dr in pairs:
        da=subset_distance(pa[i]['features'],pa[j]['features'],scales,features)
        db=subset_distance(pb[i]['features'],pb[j]['features'],scales,features)
        la.append(da); lb.append(db); sa.append(da/max(dr,1e-12)); sb.append(db/max(dr,1e-12))
    n=max(1,int(math.ceil(.10*len(pairs))))
    topa=set(np.argsort(la)[-n:].tolist()); topb=set(np.argsort(lb)[-n:].tolist())
    jac=len(topa&topb)/max(1,len(topa|topb))
    return {'geometryStabilitySpearman':spearman(all_a,all_b),'localEdgeStabilitySpearman':spearman(la,lb),
            'top10LocalEdgeJaccard':jac,'localSensitivityQ95OverMedianA':q95median(sa),'localSensitivityQ95OverMedianB':q95median(sb)}

def subset_profiles(runs,points,seeds):
    by={p['id']:[] for p in points}
    allowed=set(seeds)
    for r in runs:
        if r['seed'] in allowed: by[r['ruleId']].append(r)
    out=[]
    for p in points:
        rr=by[p['id']]
        out.append({'ruleId':p['id'],'rule':p['rule'],'features':{f:float(np.mean([r['features'][f] for r in rr])) for f in FEATURE_IDS}})
    return out

def variance_decomposition(runs,points,seeds):
    out={}
    for f in FEATURE_IDS:
        per=[]; means=[]
        for p in points:
            vals=np.array([r['features'][f] for r in runs if r['ruleId']==p['id'] and r['seed'] in seeds],float)
            per.append(float(np.var(vals,ddof=1)) if len(vals)>1 else 0.0); means.append(float(np.mean(vals)))
        within=float(np.mean(per)); between=float(np.var(means,ddof=1)); out[f]={'withinRuleVariance':within,'betweenRuleMeanVariance':between,'noiseFraction':within/max(within+between,1e-15)}
    return out

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--output-dir',type=Path,default=ROOT/'data/ruliology/boids-resolution'); args=ap.parse_args(); args.output_dir.mkdir(parents=True,exist_ok=True)
    lhs=latin_hypercube(32,len(DIMENSIONS),20260824); points=[{'id':f'BOIDS-D-{i:03d}','rule':unit_to_rule(lhs[i])} for i in range(32)]
    config={'n_agents':40,'steps':200,'dt':.2,'width':100.,'height':100.,'separation_radius':3.,'max_speed':2.5,'pressure':.35,'tail_fraction':.25,'stochastic_noise_scale':1.0}
    runs_a,_=build_profiles(points,POOL_A,config); runs_b,_=build_profiles(points,POOL_B,config); full_runs=runs_a+runs_b
    full_a8=subset_profiles(full_runs,points,POOL_A); scales=feature_scale(full_a8); pairs=fixed_local_pairs(points)
    ladder=[]
    for n in RESOLUTION:
        pa=subset_profiles(full_runs,points,POOL_A[:n]); pb=subset_profiles(full_runs,points,POOL_B[:n])
        row={'noiseScale':1.0,'seedsPerHalf':n,'observerId':'full_core',**metrics(pa,pb,scales,OBSERVERS['full_core'],pairs)}; ladder.append(row)
    observers=[]
    pa=subset_profiles(full_runs,points,POOL_A); pb=subset_profiles(full_runs,points,POOL_B)
    for oid,features in OBSERVERS.items(): observers.append({'observerId':oid,'features':features,**metrics(pa,pb,scales,features,pairs)})

    config0={**config,'stochastic_noise_scale':0.0}
    nruns_a,_=build_profiles(points,POOL_A[:1],config0); nruns_b,_=build_profiles(points,POOL_B[:1],config0); nruns=nruns_a+nruns_b
    for n in NOISE_RESOLUTION:
        pa0=subset_profiles(nruns,points,POOL_A[:n]); pb0=subset_profiles(nruns,points,POOL_B[:n])
        ladder.append({'noiseScale':0.0,'seedsPerHalf':n,'observerId':'full_core',**metrics(pa0,pb0,scales,OBSERVERS['full_core'],pairs)})

    decomp={'fullStochastic':variance_decomposition(full_runs,points,POOL_A+POOL_B),'dynamicNoiseSuppressed':variance_decomposition(nruns,points,POOL_A[:1]+POOL_B[:1])}
    f1=next(x for x in ladder if x['noiseScale']==1.0 and x['seedsPerHalf']==1); z1=next(x for x in ladder if x['noiseScale']==0.0 and x['seedsPerHalf']==1)
    f4=next(x for x in ladder if x['noiseScale']==1.0 and x['seedsPerHalf']==4)
    diagnosis={
      'seedAveragingEffect': {'geometryGain1to4': f4['geometryStabilitySpearman']-f1['geometryStabilitySpearman'], 'localGain1to4': f4['localEdgeStabilitySpearman']-f1['localEdgeStabilitySpearman']},
      'dynamicNoiseEffectAtOneSeed': {'geometryDeltaSuppressedMinusFull': z1['geometryStabilitySpearman']-f1['geometryStabilitySpearman'], 'localDeltaSuppressedMinusFull': z1['localEdgeStabilitySpearman']-f1['localEdgeStabilitySpearman'], 'top10JaccardDeltaSuppressedMinusFull': z1['top10LocalEdgeJaccard']-f1['top10LocalEdgeJaccard']},
      'fourSeedFullCore': f4,
    }
    report={'schemaVersion':'entropy-rulial-boids-resolution/1.0.0','experimentId':'RUL-010','title':'Boids stochasticity and resolution decomposition','generatedAt':'2026-08-24T21:45:00.000Z','sourceExperiment':'RUL-006','rulePointCount':32,'localEdgeCount':len(pairs),'seedPools':{'A':POOL_A,'B':POOL_B},'simulation':{'fullStochasticRunCount':len(full_runs),'dynamicNoiseSuppressedRunCount':len(nruns),'totalNewRunCount':len(full_runs)+len(nruns),'config':config},'seedResolutionLadder':ladder,'observerDecomposition':observers,'varianceDecomposition':decomp,'diagnosis':diagnosis,'interpretationBoundary':['RUL-010 does not alter or repair the frozen RUL-009 result.','The same 32 RUL-006 rule coordinates are reused to isolate stochastic realization and observer effects.','Dynamic-noise suppression removes per-step Gaussian forcing only; random initial positions and headings remain, so it is not a fully deterministic Boids model.','Seed ladders use nested prefixes of two disjoint preregistered pools; improved stability with averaging diagnoses finite-realization noise but does not prove convergence.','Observer subsets are diagnostic projections of the same runs and are not post-hoc replacements for the frozen RUL-006 observer.']}
    summary={k:report[k] for k in ['schemaVersion','experimentId','generatedAt','rulePointCount','localEdgeCount','seedPools','simulation','seedResolutionLadder','observerDecomposition','diagnosis','interpretationBoundary']}
    rp=args.output_dir/'boids-resolution-report.json'; rp.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n'); (args.output_dir/'boids-resolution-summary.json').write_text(json.dumps(summary,indent=2,sort_keys=True)+'\n')
    with (args.output_dir/'seed-resolution.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(ladder[0].keys())); w.writeheader(); w.writerows(ladder)
    with (args.output_dir/'observer-decomposition.csv').open('w',newline='') as f:
        fields=['observerId','features','geometryStabilitySpearman','localEdgeStabilitySpearman','top10LocalEdgeJaccard','localSensitivityQ95OverMedianA','localSensitivityQ95OverMedianB']; w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows([{**r,'features':';'.join(r['features'])} for r in observers])
    digest=hashlib.sha256(rp.read_bytes()).hexdigest(); (args.output_dir/'sha256.txt').write_text(f'{digest}  boids-resolution-report.json\n')
    print(json.dumps({'experimentId':'RUL-010','totalNewRuns':report['simulation']['totalNewRunCount'],'fourSeedFullCore':f4,'dynamicNoiseEffectAtOneSeed':diagnosis['dynamicNoiseEffectAtOneSeed']},indent=2))
if __name__=='__main__': main()
