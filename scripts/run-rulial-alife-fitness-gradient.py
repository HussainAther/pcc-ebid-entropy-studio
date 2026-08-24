from __future__ import annotations
import argparse, csv, hashlib, json, math, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'adapters' / 'rulial-alife'))
from alife_rulial.run import RULE_DIMENSIONS, simulate_condition
SOURCE = ROOT / 'data' / 'ruliology' / 'alife-selection-control' / 'alife-selection-control-report.json'
STEP = 0.06
PROBE_CONFIG = {'steps':120,'shock_step':0,'initial_population':72,'population_cap':150,'max_age':260,'initial_rule_sd':0.0,'mutation_sd':0.0,'record_every':5}

def canonical_json(obj): return json.dumps(obj, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()
def cosine(a,b):
    na=float(np.linalg.norm(a)); nb=float(np.linalg.norm(b))
    return 0.0 if na < 1e-12 or nb < 1e-12 else float(np.dot(a,b)/(na*nb))
def unit_to_physical(u):
    lo=np.array([x[1] for x in RULE_DIMENSIONS],float); hi=np.array([x[2] for x in RULE_DIMENSIONS],float)
    return lo + np.clip(u,0,1)*(hi-lo)
def performance(run):
    hist=run['history']
    return 0.0 if not hist else float(np.mean([row['population'] for row in hist]) / PROBE_CONFIG['initial_population'])
def gradient_for(seed, center_unit):
    grad=np.zeros(len(RULE_DIMENSIONS)); probes=[]
    for i,(name,_,_) in enumerate(RULE_DIMENSIONS):
        minus=center_unit.copy(); plus=center_unit.copy()
        minus[i]=max(0.0,minus[i]-STEP); plus[i]=min(1.0,plus[i]+STEP); denom=plus[i]-minus[i]
        vals=[]
        for side,u in [('minus',minus),('plus',plus)]:
            cfg={**PROBE_CONFIG,'initial_rule_center':unit_to_physical(u).tolist()}
            run=simulate_condition(seed,'scarcity_frozen',cfg); score=performance(run); vals.append(score)
            probes.append({'seed':seed,'dimension':name,'side':side,'performance':score,'finalPopulation':run['finalPopulation'],'probeUnit':u.tolist()})
        grad[i]=(vals[1]-vals[0])/denom if denom > 1e-12 else 0.0
    return grad,probes

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--output-dir',default='data/ruliology/alife-fitness-gradient'); args=ap.parse_args()
    out=ROOT/args.output_dir; out.mkdir(parents=True,exist_ok=True)
    src=json.loads(SOURCE.read_text()); runs=src['runs']; by={(int(r['seed']),r['condition']):r for r in runs}; seeds=list(src['design']['seeds'])
    rows=[]; probe_rows=[]
    for seed in seeds:
        s=by[(seed,'scarcity_mutable')]; n=by[(seed,'neutral_bottleneck_mutable')]; center=np.asarray(s['preShockCentroid'],float)
        grad,probes=gradient_for(seed,center); probe_rows.extend(probes)
        sd=np.asarray(s['postShockDelta'],float); nd=np.asarray(n['postShockDelta'],float)
        sa=cosine(sd,grad); na=cosine(nd,grad)
        rows.append({'seed':seed,'gradient':grad.tolist(),'gradientNorm':float(np.linalg.norm(grad)),'scarcityAlignment':sa,'neutralAlignment':na,'alignmentDifference':sa-na,'scarcityDisplacement':float(np.linalg.norm(sd)),'neutralDisplacement':float(np.linalg.norm(nd))})
    s_align=np.array([r['scarcityAlignment'] for r in rows]); n_align=np.array([r['neutralAlignment'] for r in rows]); diff=s_align-n_align; gnorm=np.array([r['gradientNorm'] for r in rows])
    criteria={'scarcityMedianAlignmentPositive':float(np.median(s_align))>=0.10,'scarcityAlignmentExceedsNeutral':float(np.median(diff))>=0.10,'scarcityPositiveInMajority':int(np.sum(s_align>0))>=math.ceil(2*len(seeds)/3),'gradientIdentifiable':int(np.sum(gnorm>1e-6))>=math.ceil(3*len(seeds)/4)}
    summary={'schemaVersion':'entropy-rulial-alife-fitness-gradient/1.0.0','experimentId':'RUL-022','ruleSpaceId':'RSPACE-ALIFE-001','observerId':'OBSERVER-ALIFE-FITNESS-GRADIENT','source':{'motionExperiment':'RUL-021','sourceReport':str(SOURCE.relative_to(ROOT)),'newMotionSimulations':0,'newFitnessProbeSimulations':len(probe_rows)},'design':{'seedCount':len(seeds),'seeds':seeds,'ruleDimensions':[x[0] for x in RULE_DIMENSIONS],'finiteDifferenceStepUnit':STEP,'probesPerSeed':2*len(RULE_DIMENSIONS),'probeCondition':'homogeneous scarcity_frozen populations initialized at +/- finite differences around the RUL-021 pre-shock centroid','performanceTarget':'time-averaged population persistence divided by initial population over a 120-step immediate-scarcity probe','primaryCriteria':{'scarcityMedianAlignmentPositive':'>= 0.10 median cosine with local performance gradient','scarcityAlignmentExceedsNeutral':'>= +0.10 median paired cosine advantage over neutral bottleneck motion','scarcityPositiveInMajority':'>= 2/3 of seeds have positive scarcity-gradient cosine','gradientIdentifiable':'>= 3/4 of seeds have nonzero finite-difference gradient norm'}},'results':{'medianScarcityAlignment':float(np.median(s_align)),'meanScarcityAlignment':float(np.mean(s_align)),'medianNeutralAlignment':float(np.median(n_align)),'meanNeutralAlignment':float(np.mean(n_align)),'medianScarcityMinusNeutralAlignment':float(np.median(diff)),'positiveScarcityAlignmentCount':int(np.sum(s_align>0)),'positiveAlignmentAdvantageCount':int(np.sum(diff>0)),'identifiableGradientCount':int(np.sum(gnorm>1e-6)),'medianGradientNorm':float(np.median(gnorm))},'primaryTest':{**criteria,'criteriaPassed':int(sum(criteria.values())),'criteriaTotal':len(criteria),'pilotSupported':all(criteria.values())},'interpretationBoundary':['RUL-022 is an engineered ALife directional-selection diagnostic, not evidence about natural biological evolution.','The finite-difference gradient is a local performance proxy around each pre-shock centroid, estimated with homogeneous no-mutation probe populations under immediate scarcity.','The performance target is population persistence, not an inclusive or long-run evolutionary fitness measure.','The gradient probes reuse matched seed-specific environmental geometry but are separate simulations from the RUL-021 motion trajectories.','Positive alignment would support selection-shaped directionality in this model; failure would challenge that interpretation without erasing the observed rule-space motion.']}
    report={**summary,'seedResults':rows,'probeRuns':probe_rows}
    rp=out/'alife-fitness-gradient-report.json'; sp=out/'alife-fitness-gradient-summary.json'; rp.write_bytes(canonical_json(report)+b'\n'); sp.write_bytes(canonical_json(summary)+b'\n')
    with (out/'seed-alignment.csv').open('w',newline='') as f:
        fields=['seed','gradientNorm','scarcityAlignment','neutralAlignment','alignmentDifference','scarcityDisplacement','neutralDisplacement']; w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); [w.writerow({k:r[k] for k in fields}) for r in rows]
    with (out/'fitness-probes.csv').open('w',newline='') as f:
        fields=['seed','dimension','side','performance','finalPopulation']; w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); [w.writerow({k:r[k] for k in fields}) for r in probe_rows]
    digest=hashlib.sha256(rp.read_bytes()).hexdigest(); (out/'sha256.txt').write_text(f'{digest}  {rp.name}\n'); print(json.dumps(summary,indent=2))
if __name__=='__main__': main()
