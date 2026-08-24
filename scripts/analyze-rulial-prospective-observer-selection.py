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

# RUL-014 is prospective relative to RUL-013. The selection rule, new rule-space
# design, seed pools, and success margins are frozen here before RUL-014 outcomes
# are interpreted.
SELECTION_RELIABILITY_MIN = 0.80
DESIGN_POINT_COUNT = 48
DESIGN_SEED = 2026082414
POOL_A = [97001, 97013, 97031, 97049]
POOL_B = [98003, 98017, 98029, 98051]
LOCAL_K = 4
PRIMARY_GEOMETRY_MARGIN = 0.05
PRIMARY_LOCAL_MARGIN = 0.05
SECONDARY_JACCARD_MARGIN = 0.10


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline='') as f:
        return list(csv.DictReader(f))


def selected_features_from_rul013() -> tuple[list[str], list[str], list[dict[str, Any]]]:
    rows = read_csv(ROOT / 'data/ruliology/observer-information/feature-information.csv')
    boids = [r for r in rows if r['substrate'] == 'Boids']
    ranked = sorted(
        ({
            'featureId': r['featureId'],
            'iccLikeReliability': float(r['iccLikeReliability']),
            'signalToUncertainty': float(r['signalToUncertainty']),
            'degeneracyIndex': float(r['degeneracyIndex']),
        } for r in boids),
        key=lambda r: (-r['iccLikeReliability'], r['featureId']),
    )
    selected = [r['featureId'] for r in ranked if r['iccLikeReliability'] >= SELECTION_RELIABILITY_MIN]
    rejected = [r['featureId'] for r in ranked if r['iccLikeReliability'] < SELECTION_RELIABILITY_MIN]
    if not selected or len(selected) == len(FEATURE_IDS):
        raise RuntimeError('frozen RUL-013 selection rule must produce a nontrivial observer subset')
    return selected, rejected, ranked


def subset_distance(a: dict[str, float], b: dict[str, float], scales: dict[str, float], features: list[str]) -> float:
    z = [(a[f] - b[f]) / scales[f] for f in features]
    return float(np.sqrt(np.mean(np.square(z))))


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
            'features': {feature: float(np.mean([run['features'][feature] for run in rr])) for feature in FEATURE_IDS},
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


def observer_metrics(pa: list[dict[str, Any]], pb: list[dict[str, Any]], scales: dict[str, float], features: list[str], pairs: list[tuple[int, int, float]]) -> dict[str, Any]:
    all_a, all_b = [], []
    for i in range(len(pa)):
        for j in range(i + 1, len(pa)):
            all_a.append(subset_distance(pa[i]['features'], pa[j]['features'], scales, features))
            all_b.append(subset_distance(pb[i]['features'], pb[j]['features'], scales, features))
    local_a, local_b = [], []
    for i, j, _dr in pairs:
        local_a.append(subset_distance(pa[i]['features'], pa[j]['features'], scales, features))
        local_b.append(subset_distance(pb[i]['features'], pb[j]['features'], scales, features))
    n_top = max(1, int(math.ceil(0.10 * len(pairs))))
    top_a = set(np.argsort(local_a)[-n_top:].tolist())
    top_b = set(np.argsort(local_b)[-n_top:].tolist())
    return {
        'featureCount': len(features),
        'features': features,
        'geometryStabilitySpearman': spearman(all_a, all_b),
        'localEdgeStabilitySpearman': spearman(local_a, local_b),
        'top10LocalEdgeJaccard': float(len(top_a & top_b) / max(1, len(top_a | top_b))),
    }


def nearest_prior_design_distance(points: list[dict[str, Any]]) -> dict[str, float]:
    prior_designs = [latin_hypercube(32, len(DIMENSIONS), 20260824), latin_hypercube(40, len(DIMENSIONS), 2026082411)]
    prior_units = np.vstack([np.asarray(x, dtype=float) for x in prior_designs])
    new_units = np.array([rule_to_unit(p['rule']) for p in points])
    minima = [float(np.min(np.linalg.norm(prior_units - u, axis=1) / math.sqrt(len(DIMENSIONS)))) for u in new_units]
    return {'minimum': float(np.min(minima)), 'median': float(np.median(minima)), 'maximum': float(np.max(minima))}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data/ruliology/prospective-observer-selection')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    selected, rejected, ranking = selected_features_from_rul013()
    observer_features = {
        'full_core': list(FEATURE_IDS),
        'rul013_selected': selected,
        'rul013_rejected_control': rejected,
    }

    lhs = latin_hypercube(DESIGN_POINT_COUNT, len(DIMENSIONS), DESIGN_SEED)
    points = [{'id': f'BOIDS-R14-{i:03d}', 'rule': unit_to_rule(lhs[i])} for i in range(DESIGN_POINT_COUNT)]
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

    observers = [{'observerId': oid, **observer_metrics(pa, pb, scales, feats, pairs)} for oid, feats in observer_features.items()]
    by_id = {r['observerId']: r for r in observers}
    full = by_id['full_core']
    chosen = by_id['rul013_selected']
    rejected_control = by_id['rul013_rejected_control']

    primary = {
        'geometryMargin': PRIMARY_GEOMETRY_MARGIN,
        'localMargin': PRIMARY_LOCAL_MARGIN,
        'selectedMinusFullGeometry': chosen['geometryStabilitySpearman'] - full['geometryStabilitySpearman'],
        'selectedMinusFullLocal': chosen['localEdgeStabilitySpearman'] - full['localEdgeStabilitySpearman'],
    }
    primary['geometryCriterionPassed'] = primary['selectedMinusFullGeometry'] >= PRIMARY_GEOMETRY_MARGIN
    primary['localCriterionPassed'] = primary['selectedMinusFullLocal'] >= PRIMARY_LOCAL_MARGIN
    primary['prospectiveSelectionSupported'] = bool(primary['geometryCriterionPassed'] and primary['localCriterionPassed'])
    secondary = {
        'jaccardMargin': SECONDARY_JACCARD_MARGIN,
        'selectedMinusFullTop10Jaccard': chosen['top10LocalEdgeJaccard'] - full['top10LocalEdgeJaccard'],
        'jaccardCriterionPassed': chosen['top10LocalEdgeJaccard'] - full['top10LocalEdgeJaccard'] >= SECONDARY_JACCARD_MARGIN,
        'selectedMinusRejectedGeometry': chosen['geometryStabilitySpearman'] - rejected_control['geometryStabilitySpearman'],
        'selectedMinusRejectedLocal': chosen['localEdgeStabilitySpearman'] - rejected_control['localEdgeStabilitySpearman'],
    }

    source_report = ROOT / 'data/ruliology/observer-information/observer-information-report.json'
    report = {
        'schemaVersion': 'entropy-rulial-prospective-observer-selection/1.0.0',
        'experimentId': 'RUL-014',
        'title': 'Prospective observer selection from frozen RUL-013 information conditioning',
        'generatedAt': '2026-08-24T22:35:00.000Z',
        'selectionSource': {
            'experimentId': 'RUL-013',
            'reportSha256': hashlib.sha256(source_report.read_bytes()).hexdigest(),
            'criterion': f'Boids coordinates with ICC-like reliability >= {SELECTION_RELIABILITY_MIN:.2f}',
            'featureRanking': ranking,
            'selectedFeatures': selected,
            'rejectedFeatures': rejected,
        },
        'design': {
            'rulePointCount': DESIGN_POINT_COUNT,
            'latinHypercubeSeed': DESIGN_SEED,
            'localNeighborK': LOCAL_K,
            'seedPools': {'A': POOL_A, 'B': POOL_B},
            'newRuleCoordinateCheckAgainstRUL006AndRUL011': nearest_prior_design_distance(points),
            'config': config,
        },
        'simulation': {'poolARunCount': len(runs_a), 'poolBRunCount': len(runs_b), 'totalNewRunCount': len(all_runs)},
        'observerDefinitions': observer_features,
        'featureScalesFromPoolA': scales,
        'localEdgeCount': len(pairs),
        'observers': observers,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
        'interpretationBoundary': [
            'RUL-014 is prospective relative to RUL-013: the reliability threshold, new LHS design seed, seed pools, and margins are fixed in code before RUL-014 outcomes are interpreted.',
            'The observer is selected algorithmically from frozen RUL-013 coordinate reliabilities rather than hand-picked from RUL-014 outcomes.',
            'All observers are projected from the same newly simulated Boids trajectories; no observer receives a custom simulation population.',
            'A pass supports this particular observer-selection rule on unseen Boids rule coordinates; it does not establish a universal optimal-observer theorem.',
        ],
    }

    summary = {
        'experimentId': 'RUL-014',
        'selectionRule': report['selectionSource']['criterion'],
        'selectedFeatures': selected,
        'rejectedFeatures': rejected,
        'design': report['design'],
        'simulation': report['simulation'],
        'observers': observers,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
    }

    (args.output_dir / 'prospective-observer-selection-report.json').write_text(json.dumps(report, indent=2) + '\n')
    (args.output_dir / 'prospective-observer-selection-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    with (args.output_dir / 'observer-comparison.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['observerId','featureCount','features','geometryStabilitySpearman','localEdgeStabilitySpearman','top10LocalEdgeJaccard'])
        writer.writeheader()
        for row in observers:
            writer.writerow({**row, 'features': '|'.join(row['features'])})
    with (args.output_dir / 'feature-selection.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['featureId','iccLikeReliability','signalToUncertainty','degeneracyIndex','selected'])
        writer.writeheader()
        for row in ranking:
            writer.writerow({**row, 'selected': row['featureId'] in selected})
    with (args.output_dir / 'rule-points.csv').open('w', newline='') as f:
        fields = ['rule_id'] + [d[0] for d in DIMENSIONS]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for p in points:
            writer.writerow({'rule_id': p['id'], **p['rule']})

    digest = hashlib.sha256((args.output_dir / 'prospective-observer-selection-report.json').read_bytes()).hexdigest()
    (args.output_dir / 'sha256.txt').write_text(f'{digest}  prospective-observer-selection-report.json\n')
    print(json.dumps(summary, indent=2))

if __name__ == '__main__':
    main()
