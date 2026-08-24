#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'adapters' / 'pcc-boids'))
from pcc_boids.rulial import DIMENSIONS, FEATURE_IDS, build_profiles, feature_scale, latin_hypercube, rule_to_unit, spearman, unit_to_rule

# RUL-015 is prospective relative to RUL-013/RUL-014. The weighting equation,
# design, seeds, and margins are frozen here before the new outcomes are read.
DESIGN_POINT_COUNT = 56
DESIGN_SEED = 2026082415
POOL_A = [101003, 101019, 101041, 101063]
POOL_B = [102001, 102023, 102047, 102071]
LOCAL_K = 4
HARD_SELECTION_RELIABILITY_MIN = 0.80
PRIMARY_GEOMETRY_MARGIN = 0.03
PRIMARY_LOCAL_MARGIN = 0.03
SECONDARY_JACCARD_MARGIN = 0.10


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline='') as f:
        return list(csv.DictReader(f))


def frozen_boids_conditioning() -> list[dict[str, Any]]:
    rows = read_csv(ROOT / 'data/ruliology/observer-information/feature-information.csv')
    out = []
    for r in rows:
        if r['substrate'] != 'Boids':
            continue
        out.append({
            'featureId': r['featureId'],
            'iccLikeReliability': float(r['iccLikeReliability']),
            'signalToUncertainty': float(r['signalToUncertainty']),
            'degeneracyIndex': float(r['degeneracyIndex']),
        })
    if {r['featureId'] for r in out} != set(FEATURE_IDS):
        raise RuntimeError('RUL-013 Boids conditioning rows must cover the frozen six-feature observer exactly')
    return sorted(out, key=lambda r: FEATURE_IDS.index(r['featureId']))


def weight_definitions(conditioning: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    by_feature = {r['featureId']: r for r in conditioning}
    equal = {f: 1.0 for f in FEATURE_IDS}
    hard = {f: (1.0 if by_feature[f]['iccLikeReliability'] >= HARD_SELECTION_RELIABILITY_MIN else 0.0) for f in FEATURE_IDS}
    reliability = {f: by_feature[f]['iccLikeReliability'] for f in FEATURE_IDS}
    # Frozen information-conditioned weight: reliability x robust signal term x non-degeneracy.
    # log1p tempers the large signal-to-uncertainty scale without fitting any RUL-015 outcome.
    information = {
        f: by_feature[f]['iccLikeReliability']
        * math.log1p(by_feature[f]['signalToUncertainty'])
        * max(0.0, 1.0 - by_feature[f]['degeneracyIndex'])
        for f in FEATURE_IDS
    }
    # Normalize positive weights to mean 1 so exported weights are interpretable; weighted RMS is scale-invariant.
    for weights in (reliability, information):
        positive = [v for v in weights.values() if v > 0]
        mean = float(np.mean(positive))
        for f in weights:
            weights[f] /= mean
    return {
        'equal_full': equal,
        'rul013_hard_selection': hard,
        'reliability_weighted': reliability,
        'information_weighted': information,
    }


def weighted_distance(a: dict[str, float], b: dict[str, float], scales: dict[str, float], weights: dict[str, float]) -> float:
    active = [(weights[f], (a[f] - b[f]) / scales[f]) for f in FEATURE_IDS if weights[f] > 0]
    denom = sum(w for w, _ in active)
    if denom <= 0:
        raise RuntimeError('observer must retain positive total weight')
    return float(math.sqrt(sum(w * z * z for w, z in active) / denom))


def subset_profiles(runs: list[dict[str, Any]], points: list[dict[str, Any]], seeds: list[int]) -> list[dict[str, Any]]:
    allowed = set(seeds)
    by_rule = {p['id']: [] for p in points}
    for run in runs:
        if run['seed'] in allowed:
            by_rule[run['ruleId']].append(run)
    profiles = []
    for point in points:
        rr = by_rule[point['id']]
        if len(rr) != len(seeds):
            raise RuntimeError(f"missing runs for {point['id']}: expected {len(seeds)}, found {len(rr)}")
        profiles.append({
            'ruleId': point['id'],
            'rule': point['rule'],
            'features': {f: float(np.mean([run['features'][f] for run in rr])) for f in FEATURE_IDS},
            'seedCount': len(seeds),
        })
    return profiles


def fixed_local_pairs(points: list[dict[str, Any]], k: int = LOCAL_K) -> list[tuple[int, int, float]]:
    units = np.array([rule_to_unit(p['rule']) for p in points])
    seen: set[tuple[int, int]] = set()
    pairs: list[tuple[int, int, float]] = []
    for i in range(len(points)):
        ds = np.linalg.norm(units - units[i], axis=1) / math.sqrt(len(DIMENSIONS))
        for j_raw in np.argsort(ds)[1:k + 1]:
            j = int(j_raw)
            a, b = sorted((i, j))
            if (a, b) in seen:
                continue
            seen.add((a, b))
            pairs.append((a, b, float(ds[j])))
    return pairs


def observer_metrics(pa: list[dict[str, Any]], pb: list[dict[str, Any]], scales: dict[str, float], weights: dict[str, float], pairs: list[tuple[int, int, float]]) -> dict[str, Any]:
    all_a, all_b = [], []
    for i in range(len(pa)):
        for j in range(i + 1, len(pa)):
            all_a.append(weighted_distance(pa[i]['features'], pa[j]['features'], scales, weights))
            all_b.append(weighted_distance(pb[i]['features'], pb[j]['features'], scales, weights))
    local_a, local_b = [], []
    for i, j, _dr in pairs:
        local_a.append(weighted_distance(pa[i]['features'], pa[j]['features'], scales, weights))
        local_b.append(weighted_distance(pb[i]['features'], pb[j]['features'], scales, weights))
    n_top = max(1, int(math.ceil(0.10 * len(pairs))))
    top_a = set(np.argsort(local_a)[-n_top:].tolist())
    top_b = set(np.argsort(local_b)[-n_top:].tolist())
    return {
        'activeFeatureCount': sum(1 for v in weights.values() if v > 0),
        'geometryStabilitySpearman': spearman(all_a, all_b),
        'localEdgeStabilitySpearman': spearman(local_a, local_b),
        'top10LocalEdgeJaccard': float(len(top_a & top_b) / max(1, len(top_a | top_b))),
    }


def nearest_prior_design_distance(points: list[dict[str, Any]]) -> dict[str, float]:
    prior_designs = [
        latin_hypercube(32, len(DIMENSIONS), 20260824),
        latin_hypercube(40, len(DIMENSIONS), 2026082411),
        latin_hypercube(48, len(DIMENSIONS), 2026082414),
    ]
    prior_units = np.vstack([np.asarray(x, dtype=float) for x in prior_designs])
    new_units = np.array([rule_to_unit(p['rule']) for p in points])
    minima = [float(np.min(np.linalg.norm(prior_units - u, axis=1) / math.sqrt(len(DIMENSIONS)))) for u in new_units]
    return {'minimum': float(np.min(minima)), 'median': float(np.median(minima)), 'maximum': float(np.max(minima))}


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data/ruliology/information-weighted-observer')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    conditioning = frozen_boids_conditioning()
    weights_by_observer = weight_definitions(conditioning)

    lhs = latin_hypercube(DESIGN_POINT_COUNT, len(DIMENSIONS), DESIGN_SEED)
    points = [{'id': f'BOIDS-R15-{i:03d}', 'rule': unit_to_rule(lhs[i])} for i in range(DESIGN_POINT_COUNT)]
    config = {
        'n_agents': 40, 'steps': 200, 'dt': 0.2, 'width': 100.0, 'height': 100.0,
        'separation_radius': 3.0, 'max_speed': 2.5, 'pressure': 0.35,
        'tail_fraction': 0.25, 'stochastic_noise_scale': 1.0,
    }
    runs_a, _ = build_profiles(points, POOL_A, config)
    runs_b, _ = build_profiles(points, POOL_B, config)
    all_runs = runs_a + runs_b
    pa = subset_profiles(all_runs, points, POOL_A)
    pb = subset_profiles(all_runs, points, POOL_B)
    scales = feature_scale(pa)
    pairs = fixed_local_pairs(points)

    observers = []
    for oid, weights in weights_by_observer.items():
        observers.append({'observerId': oid, 'weights': weights, **observer_metrics(pa, pb, scales, weights, pairs)})
    by_id = {r['observerId']: r for r in observers}
    equal = by_id['equal_full']
    hard = by_id['rul013_hard_selection']
    weighted = by_id['information_weighted']

    primary = {
        'geometryMargin': PRIMARY_GEOMETRY_MARGIN,
        'localMargin': PRIMARY_LOCAL_MARGIN,
        'weightedMinusEqualGeometry': weighted['geometryStabilitySpearman'] - equal['geometryStabilitySpearman'],
        'weightedMinusEqualLocal': weighted['localEdgeStabilitySpearman'] - equal['localEdgeStabilitySpearman'],
    }
    primary['geometryCriterionPassed'] = primary['weightedMinusEqualGeometry'] >= PRIMARY_GEOMETRY_MARGIN
    primary['localCriterionPassed'] = primary['weightedMinusEqualLocal'] >= PRIMARY_LOCAL_MARGIN
    primary['continuousWeightingSupported'] = bool(primary['geometryCriterionPassed'] and primary['localCriterionPassed'])
    secondary = {
        'jaccardMargin': SECONDARY_JACCARD_MARGIN,
        'weightedMinusEqualTop10Jaccard': weighted['top10LocalEdgeJaccard'] - equal['top10LocalEdgeJaccard'],
        'jaccardCriterionPassed': weighted['top10LocalEdgeJaccard'] - equal['top10LocalEdgeJaccard'] >= SECONDARY_JACCARD_MARGIN,
        'weightedMinusHardGeometry': weighted['geometryStabilitySpearman'] - hard['geometryStabilitySpearman'],
        'weightedMinusHardLocal': weighted['localEdgeStabilitySpearman'] - hard['localEdgeStabilitySpearman'],
        'weightedMinusHardTop10Jaccard': weighted['top10LocalEdgeJaccard'] - hard['top10LocalEdgeJaccard'],
    }

    source = ROOT / 'data/ruliology/observer-information/observer-information-report.json'
    report = {
        'schemaVersion': 'entropy-rulial-information-weighted-observer/1.0.0',
        'experimentId': 'RUL-015',
        'title': 'Prospective continuous information-conditioned observer weighting',
        'generatedAt': '2026-08-24T23:00:00.000Z',
        'weightingSource': {
            'experimentId': 'RUL-013',
            'reportSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'conditioning': conditioning,
            'equation': 'w_i proportional to ICC_i * log(1 + signalToUncertainty_i) * (1 - degeneracy_i)',
            'hardSelectionThreshold': HARD_SELECTION_RELIABILITY_MIN,
        },
        'design': {
            'rulePointCount': DESIGN_POINT_COUNT,
            'latinHypercubeSeed': DESIGN_SEED,
            'localNeighborK': LOCAL_K,
            'seedPools': {'A': POOL_A, 'B': POOL_B},
            'newRuleCoordinateCheckAgainstRUL006RUL011RUL014': nearest_prior_design_distance(points),
            'config': config,
        },
        'simulation': {'poolARunCount': len(runs_a), 'poolBRunCount': len(runs_b), 'totalNewRunCount': len(all_runs)},
        'featureScalesFromPoolA': scales,
        'localEdgeCount': len(pairs),
        'observers': observers,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
        'interpretationBoundary': [
            'RUL-015 is prospective relative to RUL-013/RUL-014: its continuous weighting equation, new LHS design, seed pools, and effect-size margins are frozen in code before RUL-015 outcomes are interpreted.',
            'All observer variants reuse the same newly generated Boids trajectories; only the metric weights change.',
            'Feature scaling is estimated from pool A only and then held fixed for pool B.',
            'The information-conditioned equation is a proposed metric-conditioning rule, not a learned optimum; no RUL-015 outcome is used to tune its exponents or constants.',
            'Failure to exceed the frozen +0.03 margins challenges this specific continuous weighting rule without erasing RUL-013 or RUL-014.',
        ],
    }
    report_path = args.output_dir / 'information-weighted-observer-report.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    summary = {
        'experimentId': 'RUL-015',
        'design': report['design'],
        'simulation': report['simulation'],
        'observers': observers,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
        'weightingEquation': report['weightingSource']['equation'],
    }
    (args.output_dir / 'information-weighted-observer-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    write_csv(args.output_dir / 'observer-comparison.csv', [{k: v for k, v in row.items() if k != 'weights'} for row in observers])
    weight_rows = []
    for f in FEATURE_IDS:
        base = next(r for r in conditioning if r['featureId'] == f)
        row = {'featureId': f, **{k: base[k] for k in ('iccLikeReliability', 'signalToUncertainty', 'degeneracyIndex')}}
        for oid, weights in weights_by_observer.items(): row[oid] = weights[f]
        weight_rows.append(row)
    write_csv(args.output_dir / 'feature-weights.csv', weight_rows)
    write_csv(args.output_dir / 'rule-points.csv', [{'ruleId': p['id'], **p['rule']} for p in points])
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (args.output_dir / 'sha256.txt').write_text(f'{digest}  information-weighted-observer-report.json\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
