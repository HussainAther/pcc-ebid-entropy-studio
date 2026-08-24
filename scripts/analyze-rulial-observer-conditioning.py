#!/usr/bin/env python3
from __future__ import annotations

import argparse, csv, hashlib, json
from pathlib import Path
from typing import Any
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PRIMARY_RHO_MAX = -0.50
PERMUTATIONS = 5000
PERMUTATION_SEED = 2026082412

FEATURES = {
    'ECA': ['OBS-AUTOCORR-TIME','OBS-COMPRESSION','OBS-HAMMING','OBS-PERTURB-GROWTH','OBS-SHANNON'],
    'Boids': ['OBS-POLARIZATION','OBS-HEADING-ENTROPY','OBS-SPATIAL','OBS-SPEED-VARIANCE','OBS-TRANSITION-RATE','OBS-METASTABLE-DWELL'],
    'Network': ['OBS-NETWORK-ACTIVITY','OBS-SHANNON','OBS-NETWORK-ORDER','OBS-SWITCH-RATE','OBS-TRANSITION-RATE','OBS-METASTABLE-DWELL'],
}

def rankdata(v):
    a=np.asarray(v,float); order=np.argsort(a,kind='mergesort'); ranks=np.empty(len(a),float); i=0
    while i<len(a):
        j=i+1
        while j<len(a) and a[order[j]]==a[order[i]]: j+=1
        ranks[order[i:j]]=(i+j-1)/2+1; i=j
    return ranks

def spearman(x,y):
    if len(x)<2:return 0.0
    rx,ry=rankdata(x),rankdata(y)
    if np.std(rx)==0 or np.std(ry)==0:return 0.0
    return float(np.corrcoef(rx,ry)[0,1])

def read_csv(path):
    with open(path,newline='') as f:return list(csv.DictReader(f))

def eca_profiles():
    a={r['rule_id']:{f:float(r[f]) for f in FEATURES['ECA']} for r in read_csv(ROOT/'data/ruliology/eca-atlas/profiles.csv')}
    d=json.loads((ROOT/'data/ruliology/eca-validation/holdout-report.json').read_text())
    b={}
    for p in d['profiles']:
        rid=str(p['rule']['ruleId'])
        fmap={item['observableId']: float(item['value']) for item in p['features']}
        b[rid]={f:fmap[f] for f in FEATURES['ECA']}
    return a,b

def csv_pair(substrate, pa, pb):
    arows=read_csv(pa); brows=read_csv(pb)
    feats=FEATURES[substrate]
    a={r['rule_id']:{f:float(r[f]) for f in feats} for r in arows}
    b={r['rule_id']:{f:float(r[f]) for f in feats} for r in brows}
    return a,b

def pair_abs(m):
    keys=sorted(m); out=[]
    for i in range(len(keys)):
        for j in range(i+1,len(keys)):out.append(abs(m[keys[i]]-m[keys[j]]))
    return out

def feature_rows(substrate,a,b):
    keys=sorted(set(a)&set(b)); rows=[]
    for f in FEATURES[substrate]:
        av=np.asarray([a[k][f] for k in keys],float); bv=np.asarray([b[k][f] for k in keys],float)
        lo,hi=np.quantile(av,[0.05,0.95]) if len(av)>=20 else (av.min(),av.max()); scale=max(float(hi-lo),1e-9)
        shifts=np.abs(av-bv)/scale
        amap={k:a[k][f] for k in keys}; bmap={k:b[k][f] for k in keys}
        rows.append({
            'substrate':substrate,'featureId':f,'ruleCount':len(keys),'discoveryScale':scale,
            'medianNormalizedSameRuleShift':float(np.median(shifts)),
            'meanNormalizedSameRuleShift':float(np.mean(shifts)),
            'q90NormalizedSameRuleShift':float(np.quantile(shifts,0.90)),
            'ruleProfileStabilitySpearman':spearman(av.tolist(),bv.tolist()),
            'singleFeatureGeometryStabilitySpearman':spearman(pair_abs(amap),pair_abs(bmap)),
        })
    return rows

def stratified_perm(rows, observed):
    rng=np.random.default_rng(PERMUTATION_SEED); x=np.asarray([r['medianNormalizedSameRuleShift'] for r in rows]); y=np.asarray([r['singleFeatureGeometryStabilitySpearman'] for r in rows]); s=np.asarray([r['substrate'] for r in rows],object); extreme=0
    for _ in range(PERMUTATIONS):
        yp=y.copy()
        for sub in sorted(set(s.tolist())):
            idx=np.flatnonzero(s==sub); yp[idx]=rng.permutation(yp[idx])
        if spearman(x.tolist(),yp.tolist())<=observed+1e-15:extreme+=1
    return float((extreme+1)/(PERMUTATIONS+1))

def write_csv(path,rows):
    with open(path,'w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0].keys()));w.writeheader();w.writerows(rows)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output-dir',type=Path,default=ROOT/'data/ruliology/observer-conditioning');args=ap.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
    eca_a,eca_b=eca_profiles()
    bo_a,bo_b=csv_pair('Boids',ROOT/'data/ruliology/boids-rulial/discovery-profiles.csv',ROOT/'data/ruliology/cross-substrate/boids-holdout-profiles.csv')
    ne_a,ne_b=csv_pair('Network',ROOT/'data/ruliology/network-rulial/discovery-profiles.csv',ROOT/'data/ruliology/network-rulial/holdout-profiles.csv')
    rows=feature_rows('ECA',eca_a,eca_b)+feature_rows('Boids',bo_a,bo_b)+feature_rows('Network',ne_a,ne_b)
    x=[r['medianNormalizedSameRuleShift'] for r in rows]; y=[r['singleFeatureGeometryStabilitySpearman'] for r in rows]
    rho=spearman(x,y); p=stratified_perm(rows,rho)
    subs=[]
    for sub in ['ECA','Boids','Network']:
        rr=[r for r in rows if r['substrate']==sub]
        subs.append({'substrate':sub,'featureCount':len(rr),'shiftVsGeometrySpearman':spearman([r['medianNormalizedSameRuleShift'] for r in rr],[r['singleFeatureGeometryStabilitySpearman'] for r in rr]),'medianSameRuleShift':float(np.median([r['medianNormalizedSameRuleShift'] for r in rr])),'medianGeometryStability':float(np.median([r['singleFeatureGeometryStabilitySpearman'] for r in rr]))})
    ordered=sorted(rows,key=lambda r:r['medianNormalizedSameRuleShift']); half=len(ordered)//2; low=ordered[:half]; high=ordered[-half:]
    primary={'frozenRhoThreshold':PRIMARY_RHO_MAX,'pooledShiftVsGeometrySpearman':rho,'substrateStratifiedPermutationCount':PERMUTATIONS,'substrateStratifiedPermutationP':p,'rhoCriterionPassed':rho<=PRIMARY_RHO_MAX,'permutationCriterionPassed':p<=0.05}
    primary['observerConditioningSupported']=bool(primary['rhoCriterionPassed'] and primary['permutationCriterionPassed'])
    secondary={'pooledShiftVsRuleProfileSpearman':spearman(x,[r['ruleProfileStabilitySpearman'] for r in rows]),'lowShiftHalfMedianGeometryStability':float(np.median([r['singleFeatureGeometryStabilitySpearman'] for r in low])),'highShiftHalfMedianGeometryStability':float(np.median([r['singleFeatureGeometryStabilitySpearman'] for r in high])),'lowMinusHighMedianGeometryStability':float(np.median([r['singleFeatureGeometryStabilitySpearman'] for r in low])-np.median([r['singleFeatureGeometryStabilitySpearman'] for r in high])),'substratesWithNegativeAssociation':sum(1 for r in subs if r['shiftVsGeometrySpearman']<0)}
    report={'schemaVersion':'entropy-rulial-observer-conditioning/1.0.0','experimentId':'RUL-012','title':'Cross-substrate observer conditioning from independent-pool same-rule shift','generatedAt':'2026-08-24T22:50:00.000Z','newSimulationRunCount':0,'design':{'substrates':['ECA','Boids','Network'],'featureCount':len(rows),'sourceExperiments':['RUL-001/RUL-003','RUL-006/RUL-007','RUL-008'],'principle':'Observable coordinates that move more for the same rule across independent condition/stochastic pools should induce less reproducible rule-space geometry.','primaryCriterionFrozenBeforeOutcome':f'pooled Spearman(median normalized same-rule shift, single-feature geometry stability) <= {PRIMARY_RHO_MAX} with substrate-stratified permutation p <= 0.05.'},'primaryTest':primary,'secondary':secondary,'substrates':subs,'features':rows,'interpretationBoundary':['RUL-012 adds zero simulations and does not modify RUL-009, RUL-010, or RUL-011.','Same-rule shift is a cross-substrate reliability diagnostic: for ECA it reflects independent initial-condition ensembles; for Boids stochastic realization; for Network stochastic realization plus the already-frozen topology block averaging.','The primary analysis uses individual observable coordinates, not observer subsets selected for good performance.','The permutation test shuffles geometry-stability labels only within substrate, reducing the chance that substrate identity alone explains the association.','A supported association motivates a future prospective observer-conditioning rule; it is not itself proof of a universal law.']}
    summary=report.copy()
    rp=args.output_dir/'observer-conditioning-report.json'; sp=args.output_dir/'observer-conditioning-summary.json';rp.write_text(json.dumps(report,indent=2)+'\n');sp.write_text(json.dumps(summary,indent=2)+'\n');write_csv(args.output_dir/'feature-conditioning.csv',rows);write_csv(args.output_dir/'substrate-conditioning.csv',subs);digest=hashlib.sha256(rp.read_bytes()).hexdigest();(args.output_dir/'sha256.txt').write_text(digest+'  observer-conditioning-report.json\n');print(json.dumps({'primaryTest':primary,'secondary':secondary,'substrates':subs,'sha256':digest},indent=2))
if __name__=='__main__':main()
