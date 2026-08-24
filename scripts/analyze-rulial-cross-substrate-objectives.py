#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import itertools
import json
import math
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OBJECTIVES = [
    ('global_geometry', 'geometryStabilitySpearman'),
    ('local_geometry', 'localEdgeStabilitySpearman'),
    ('boundary_recovery', 'top10LocalEdgeJaccard'),
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline='') as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    fields: list[str] = []
    for row in rows:
        for key in row:
            if key not in fields:
                fields.append(key)
    with path.open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader(); w.writerows(rows)


def rankdata(values: list[float]) -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    order = np.argsort(arr, kind='mergesort')
    ranks = np.empty(len(arr), dtype=float)
    i = 0
    while i < len(arr):
        j = i + 1
        while j < len(arr) and arr[order[j]] == arr[order[i]]:
            j += 1
        ranks[order[i:j]] = (i + j - 1) / 2.0 + 1.0
        i = j
    return ranks


def spearman(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or len(a) < 2:
        return 0.0
    ra, rb = rankdata(a), rankdata(b)
    if np.std(ra) <= 1e-15 or np.std(rb) <= 1e-15:
        return 0.0
    return float(np.corrcoef(ra, rb)[0, 1])


def feature_scale(rows: list[dict[str, Any]], features: list[str]) -> dict[str, float]:
    out = {}
    for f in features:
        vals = np.asarray([float(r['features'][f]) for r in rows], dtype=float)
        span = float(np.max(vals) - np.min(vals))
        out[f] = span if span > 1e-12 else 1.0
    return out


def distance(a: dict[str, float], b: dict[str, float], scales: dict[str, float], active: tuple[str, ...]) -> float:
    z = [((float(a[f]) - float(b[f])) / scales[f]) ** 2 for f in active]
    return float(math.sqrt(sum(z) / len(z)))


def observer_metrics(pa: list[dict[str, Any]], pb: list[dict[str, Any]], scales: dict[str, float], active: tuple[str, ...], local_pairs: list[tuple[int, int]]) -> dict[str, float]:
    all_a, all_b = [], []
    for i in range(len(pa)):
        for j in range(i + 1, len(pa)):
            all_a.append(distance(pa[i]['features'], pa[j]['features'], scales, active))
            all_b.append(distance(pb[i]['features'], pb[j]['features'], scales, active))
    local_a = [distance(pa[i]['features'], pa[j]['features'], scales, active) for i, j in local_pairs]
    local_b = [distance(pb[i]['features'], pb[j]['features'], scales, active) for i, j in local_pairs]
    n_top = max(1, int(math.ceil(0.10 * len(local_pairs))))
    top_a = set(np.argsort(np.asarray(local_a))[-n_top:].tolist())
    top_b = set(np.argsort(np.asarray(local_b))[-n_top:].tolist())
    return {
        'geometryStabilitySpearman': spearman(all_a, all_b),
        'localEdgeStabilitySpearman': spearman(local_a, local_b),
        'top10LocalEdgeJaccard': float(len(top_a & top_b) / max(1, len(top_a | top_b))),
    }


def rank_desc(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    ordered = sorted(rows, key=lambda r: (-float(r[key]), r['observerId']))
    return {row['observerId']: i + 1 for i, row in enumerate(ordered)}


def pareto_front(rows: list[dict[str, Any]]) -> list[str]:
    keys = [k for _, k in OBJECTIVES]
    front = []
    for a in rows:
        dominated = False
        for b in rows:
            if a is b:
                continue
            if all(float(b[k]) >= float(a[k]) for k in keys) and any(float(b[k]) > float(a[k]) for k in keys):
                dominated = True; break
        if not dominated:
            front.append(a['observerId'])
    return sorted(front)


def summarize_substrate(name: str, features: list[str], pa: list[dict[str, Any]], pb: list[dict[str, Any]], local_pairs: list[tuple[int, int]]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    scales = feature_scale(pa, features)
    rows = []
    for size in range(1, len(features) + 1):
        for combo in itertools.combinations(features, size):
            bits = ''.join('1' if f in combo else '0' for f in features)
            metrics = observer_metrics(pa, pb, scales, combo, local_pairs)
            rows.append({'substrate': name, 'observerId': f'{name.upper()}-OBSSET-{bits}', 'featureCount': size, 'features': list(combo), **metrics})
    ranks = {n: rank_desc(rows, k) for n, k in OBJECTIVES}
    for row in rows:
        for n, _ in OBJECTIVES:
            row[f'{n}Rank'] = ranks[n][row['observerId']]
    optima = []
    optimal_sets: dict[str, set[str]] = {}
    for n, k in OBJECTIVES:
        best = max(float(r[k]) for r in rows)
        co = [r for r in rows if abs(float(r[k]) - best) <= 1e-12]
        rep = min(co, key=lambda r: (r['featureCount'], r['observerId']))
        optimal_sets[n] = {r['observerId'] for r in co}
        optima.append({'objective': n, 'metric': k, 'score': best, 'representativeObserverId': rep['observerId'], 'representativeFeatures': rep['features'], 'representativeFeatureCount': rep['featureCount'], 'coOptimalObserverCount': len(co), 'coOptimalObserverIds': sorted(r['observerId'] for r in co)})
    assocs = []
    for (na, _), (nb, _) in itertools.combinations(OBJECTIVES, 2):
        assocs.append({'objectiveA': na, 'objectiveB': nb, 'spearman': spearman([ranks[na][r['observerId']] for r in rows], [ranks[nb][r['observerId']] for r in rows])})
    common = set.intersection(*(optimal_sets[n] for n, _ in OBJECTIVES))
    gl = next(x['spearman'] for x in assocs if {x['objectiveA'], x['objectiveB']} == {'global_geometry','local_geometry'})
    gb = next(x['spearman'] for x in assocs if {x['objectiveA'], x['objectiveB']} == {'global_geometry','boundary_recovery'})
    lb = next(x['spearman'] for x in assocs if {x['objectiveA'], x['objectiveB']} == {'local_geometry','boundary_recovery'})
    summary = {
        'substrate': name,
        'featureCount': len(features),
        'observerSubsetCount': len(rows),
        'ruleCount': len(pa),
        'localEdgeCount': len(local_pairs),
        'objectiveOptima': optima,
        'objectiveRankAssociations': assocs,
        'paretoFrontObserverIds': pareto_front(rows),
        'objectiveDependence': {
            'allObjectivesShareAtLeastOneOptimum': bool(common),
            'commonOptimalObserverIds': sorted(common),
            'globalAndLocalOptimaDiffer': optimal_sets['global_geometry'] != optimal_sets['local_geometry'],
            'objectiveDependenceDetected': bool(not common and optimal_sets['global_geometry'] != optimal_sets['local_geometry']),
            'geometryRankAssociation': gl,
            'globalBoundaryRankAssociation': gb,
            'localBoundaryRankAssociation': lb,
            'boundaryMoreDecoupledThanGlobalLocal': gl > max(gb, lb),
        },
    }
    return summary, rows


def load_eca() -> tuple[list[str], list[dict[str, Any]], list[dict[str, Any]], list[tuple[int, int]]]:
    cal = json.loads((ROOT / 'data/ruliology/eca-atlas/campaign-report.json').read_text())
    hold = json.loads((ROOT / 'data/ruliology/eca-validation/holdout-report.json').read_text())
    features = ['OBS-SHANNON','OBS-HAMMING','OBS-PERTURB-GROWTH','OBS-AUTOCORR-TIME','OBS-COMPRESSION']
    def convert(report):
        out=[]
        for p in report['profiles']:
            fmap={x['observableId']: float(x['value']) for x in p['features']}
            out.append({'ruleId': p['rule']['ruleId'], 'features': fmap})
        return sorted(out, key=lambda r:int(r['ruleId']))
    pa, pb = convert(cal), convert(hold)
    index={r['ruleId']:i for i,r in enumerate(pa)}
    local=[]
    for t in cal['transitions']:
        a,b=index[t['fromRuleId']],index[t['toRuleId']]
        local.append((a,b))
    return features, pa, pb, local


def load_network() -> tuple[list[str], list[dict[str, Any]], list[dict[str, Any]], list[tuple[int, int]]]:
    a=read_csv(ROOT/'data/ruliology/network-rulial/discovery-profiles.csv')
    b=read_csv(ROOT/'data/ruliology/network-rulial/holdout-profiles.csv')
    dims=['threshold','coupling','memory','temperature']
    features=['OBS-NETWORK-ACTIVITY','OBS-SHANNON','OBS-NETWORK-ORDER','OBS-SWITCH-RATE','OBS-TRANSITION-RATE','OBS-METASTABLE-DWELL']
    def conv(rows):
        return [{'ruleId':r['rule_id'], 'rule':{d:float(r[d]) for d in dims}, 'features':{f:float(r[f]) for f in features}} for r in rows]
    pa,pb=conv(a),conv(b)
    mins={d:min(r['rule'][d] for r in pa) for d in dims}; maxs={d:max(r['rule'][d] for r in pa) for d in dims}
    units=np.array([[ (r['rule'][d]-mins[d])/max(maxs[d]-mins[d],1e-12) for d in dims] for r in pa])
    seen=set(); local=[]; k=4
    for i in range(len(pa)):
        ds=np.linalg.norm(units-units[i],axis=1)/math.sqrt(len(dims))
        for j_raw in np.argsort(ds)[1:k+1]:
            j=int(j_raw); pair=tuple(sorted((i,j)))
            if pair not in seen: seen.add(pair); local.append(pair)
    return features,pa,pb,local


def load_boids_rul018() -> dict[str, Any]:
    return json.loads((ROOT/'data/ruliology/objective-dependent-observer/objective-dependent-observer-summary.json').read_text())


def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument('--output-dir',type=Path,default=ROOT/'data/ruliology/cross-substrate-objectives')
    args=parser.parse_args(); args.output_dir.mkdir(parents=True,exist_ok=True)

    eca_summary, eca_rows = summarize_substrate('ECA', *load_eca())
    net_summary, net_rows = summarize_substrate('Network', *load_network())
    boids_old=load_boids_rul018()
    boids_summary={
        'substrate':'Boids','featureCount':boids_old['design']['featureCount'],'observerSubsetCount':boids_old['design']['nonEmptyObserverSubsetCount'],'ruleCount':boids_old['design']['rulePointCount'],'localEdgeCount':None,
        'objectiveOptima':boids_old['objectiveOptima'],'objectiveRankAssociations':boids_old['objectiveRankAssociations'],'paretoFrontObserverIds':boids_old['paretoFrontObserverIds'],'objectiveDependence':boids_old['objectiveDependence'],
    }
    # Harmonize derived rank-decoupling fields for the committed Boids summary.
    ass=boids_summary['objectiveRankAssociations']
    def assoc(a,b): return next(float(x['spearman']) for x in ass if {x['objectiveA'],x['objectiveB']}=={a,b})
    gl,gb,lb=assoc('global_geometry','local_geometry'),assoc('global_geometry','boundary_recovery'),assoc('local_geometry','boundary_recovery')
    boids_summary['objectiveDependence']={**boids_summary['objectiveDependence'],'geometryRankAssociation':gl,'globalBoundaryRankAssociation':gb,'localBoundaryRankAssociation':lb,'boundaryMoreDecoupledThanGlobalLocal':gl>max(gb,lb)}

    substrates=[eca_summary,boids_summary,net_summary]
    all_dep=sum(1 for s in substrates if s['objectiveDependence']['objectiveDependenceDetected'])
    all_boundary_decoupled=sum(1 for s in substrates if s['objectiveDependence']['boundaryMoreDecoupledThanGlobalLocal'])
    no_universal=sum(1 for s in substrates if not s['objectiveDependence']['allObjectivesShareAtLeastOneOptimum'])
    cross={
        'substrateCount':3,
        'objectiveDependenceDetectedCount':all_dep,
        'noUniversalOptimumCount':no_universal,
        'boundaryDecouplingCount':all_boundary_decoupled,
        'objectiveDependenceAcrossAllSubstrates':all_dep==3,
        'noSingleAllObjectiveOptimumAcrossAllSubstrates':no_universal==3,
        'boundaryRankDecouplingAcrossAllSubstrates':all_boundary_decoupled==3,
    }
    source_files=[
        ROOT/'data/ruliology/eca-atlas/campaign-report.json', ROOT/'data/ruliology/eca-validation/holdout-report.json',
        ROOT/'data/ruliology/objective-dependent-observer/objective-dependent-observer-report.json',
        ROOT/'data/ruliology/network-rulial/network-rulial-report.json']
    report={
        'schemaVersion':'entropy-rulial-cross-substrate-objectives/1.0.0','experimentId':'RUL-019','title':'Cross-substrate objective-dependent observer geometry','generatedAt':'2026-08-24T22:50:00.000Z',
        'source':{'newUniqueSimulationRunCount':0,'sourceSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in source_files}},
        'design':{'substrates':['ECA','Boids','Network'],'objectives':[{'id':n,'metric':k} for n,k in OBJECTIVES],'observerEnumeration':'all non-empty subsets of each substrate native core observer feature basis','featureScaling':'discovery-pool per-coordinate range within substrate; reused for holdout distances','boundaryDefinition':'top 10% of a frozen local rule-neighbor graph per substrate'},
        'substrates':substrates,'crossSubstrate':cross,
        'interpretationBoundary':[
            'RUL-019 adds zero unique simulations and does not alter any RUL-018 Boids result; it extends the same objective-separation analysis to ECA and Network using their frozen discovery/holdout populations.',
            'Observer subsets are only comparable structurally within a substrate because feature bases differ across ECA, Boids, and Network.',
            'Objective-dependent optima are descriptive of each frozen finite observer family; they do not establish a theorem over all possible observers.',
            'Boundary recovery is discrete and may contain co-optimal ties, especially in finite local-edge graphs.',
            'Cross-substrate recurrence is interpreted at the level of objective dependence and rank-decoupling patterns, not equality of optimum feature identities across unlike substrates.',
        ],
    }
    report_path=args.output_dir/'cross-substrate-objectives-report.json'; report_path.write_text(json.dumps(report,indent=2)+'\n')
    summary={k:report[k] for k in ['schemaVersion','experimentId','source','design','substrates','crossSubstrate','interpretationBoundary']}
    (args.output_dir/'cross-substrate-objectives-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    flat=[]
    for s in substrates:
        d=s['objectiveDependence']
        flat.append({'substrate':s['substrate'],'featureCount':s['featureCount'],'observerSubsetCount':s['observerSubsetCount'],'ruleCount':s['ruleCount'],'objectiveDependenceDetected':d['objectiveDependenceDetected'],'allObjectivesShareAtLeastOneOptimum':d['allObjectivesShareAtLeastOneOptimum'],'globalLocalRankSpearman':d['geometryRankAssociation'],'globalBoundaryRankSpearman':d['globalBoundaryRankAssociation'],'localBoundaryRankSpearman':d['localBoundaryRankAssociation'],'boundaryMoreDecoupledThanGlobalLocal':d['boundaryMoreDecoupledThanGlobalLocal'],'paretoFrontSize':len(s['paretoFrontObserverIds'])})
    write_csv(args.output_dir/'substrate-objective-summary.csv',flat)
    opt=[]
    for s in substrates:
        for o in s['objectiveOptima']:
            opt.append({'substrate':s['substrate'],'objective':o['objective'],'score':o['score'],'representativeObserverId':o['representativeObserverId'],'representativeFeatures':'|'.join(o['representativeFeatures']),'representativeFeatureCount':o['representativeFeatureCount'],'coOptimalObserverCount':o['coOptimalObserverCount']})
    write_csv(args.output_dir/'objective-optima.csv',opt)
    # Preserve newly enumerated ECA/network subset tables for audit; Boids remains sourced verbatim from RUL-018.
    for rows,name in [(eca_rows,'eca-observer-objectives.csv'),(net_rows,'network-observer-objectives.csv')]:
        rr=[]
        for r in rows:
            x=dict(r); x['features']='|'.join(r['features']); rr.append(x)
        write_csv(args.output_dir/name,rr)
    digest=hashlib.sha256(report_path.read_bytes()).hexdigest(); (args.output_dir/'sha256.txt').write_text(f'{digest}  cross-substrate-objectives-report.json\n')
    print(json.dumps({'experimentId':'RUL-019','crossSubstrate':cross,'substrates':flat},indent=2))

if __name__=='__main__': main()
