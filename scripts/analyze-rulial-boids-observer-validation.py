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
from pcc_boids.rulial import (
    DIMENSIONS,
    FEATURE_IDS,
    build_profiles,
    feature_scale,
    latin_hypercube,
    rule_to_unit,
    spearman,
    unit_to_rule,
)

# RUL-011 is prospective relative to RUL-010. These observer definitions,
# rule-space design, seed pools, and validation margins are frozen here before
# any RUL-011 result is interpreted.
OBSERVER_FEATURES = {
    'full_core': FEATURE_IDS,
    'state_structure': [
        'OBS-POLARIZATION',
        'OBS-HEADING-ENTROPY',
        'OBS-SPATIAL',
        'OBS-SPEED-VARIANCE',
    ],
    'order_entropy': [
        'OBS-POLARIZATION',
        'OBS-HEADING-ENTROPY',
    ],
}

DESIGN_POINT_COUNT = 40
DESIGN_SEED = 2026082411
POOL_A = [93001, 93011, 93023, 93047]
POOL_B = [94007, 94019, 94031, 94049]
LOCAL_K = 4
PRIMARY_GEOMETRY_MARGIN = 0.05
PRIMARY_LOCAL_MARGIN = 0.05
SECONDARY_JACCARD_MARGIN = 0.10


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
            'features': {
                feature: float(np.mean([run['features'][feature] for run in rr]))
                for feature in FEATURE_IDS
            },
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


def q95_over_median(values: list[float]) -> float | None:
    a = np.asarray(values, dtype=float)
    median = float(np.median(a))
    if median <= 1e-9:
        return None
    ratio = float(np.quantile(a, 0.95) / median)
    return None if ratio > 1e6 else ratio


def observer_metrics(
    pa: list[dict[str, Any]],
    pb: list[dict[str, Any]],
    scales: dict[str, float],
    features: list[str],
    pairs: list[tuple[int, int, float]],
) -> dict[str, Any]:
    all_a: list[float] = []
    all_b: list[float] = []
    for i in range(len(pa)):
        for j in range(i + 1, len(pa)):
            all_a.append(subset_distance(pa[i]['features'], pa[j]['features'], scales, features))
            all_b.append(subset_distance(pb[i]['features'], pb[j]['features'], scales, features))

    local_a: list[float] = []
    local_b: list[float] = []
    sensitivity_a: list[float] = []
    sensitivity_b: list[float] = []
    for i, j, dr in pairs:
        da = subset_distance(pa[i]['features'], pa[j]['features'], scales, features)
        db = subset_distance(pb[i]['features'], pb[j]['features'], scales, features)
        local_a.append(da)
        local_b.append(db)
        sensitivity_a.append(da / max(dr, 1e-12))
        sensitivity_b.append(db / max(dr, 1e-12))

    n_top = max(1, int(math.ceil(0.10 * len(pairs))))
    top_a = set(np.argsort(local_a)[-n_top:].tolist())
    top_b = set(np.argsort(local_b)[-n_top:].tolist())
    jaccard = len(top_a & top_b) / max(1, len(top_a | top_b))

    return {
        'featureCount': len(features),
        'features': features,
        'geometryStabilitySpearman': spearman(all_a, all_b),
        'localEdgeStabilitySpearman': spearman(local_a, local_b),
        'top10LocalEdgeJaccard': float(jaccard),
        'localSensitivityQ95OverMedianA': q95_over_median(sensitivity_a),
        'localSensitivityQ95OverMedianB': q95_over_median(sensitivity_b),
    }


def nearest_old_design_distance(points: list[dict[str, Any]]) -> dict[str, float]:
    old_lhs = latin_hypercube(32, len(DIMENSIONS), 20260824)
    old_units = np.asarray(old_lhs, dtype=float)
    new_units = np.array([rule_to_unit(p['rule']) for p in points])
    minima = []
    for u in new_units:
        minima.append(float(np.min(np.linalg.norm(old_units - u, axis=1) / math.sqrt(len(DIMENSIONS)))))
    return {
        'minimum': float(np.min(minima)),
        'median': float(np.median(minima)),
        'maximum': float(np.max(minima)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data/ruliology/boids-observer-validation')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    lhs = latin_hypercube(DESIGN_POINT_COUNT, len(DIMENSIONS), DESIGN_SEED)
    points = [
        {'id': f'BOIDS-P-{i:03d}', 'rule': unit_to_rule(lhs[i])}
        for i in range(DESIGN_POINT_COUNT)
    ]

    config = {
        'n_agents': 40,
        'steps': 200,
        'dt': 0.2,
        'width': 100.0,
        'height': 100.0,
        'separation_radius': 3.0,
        'max_speed': 2.5,
        'pressure': 0.35,
        'tail_fraction': 0.25,
        'stochastic_noise_scale': 1.0,
    }

    runs_a, _ = build_profiles(points, POOL_A, config)
    runs_b, _ = build_profiles(points, POOL_B, config)
    all_runs = runs_a + runs_b
    profiles_a = subset_profiles(all_runs, points, POOL_A)
    profiles_b = subset_profiles(all_runs, points, POOL_B)

    # Scales are frozen from pool A only so pool B remains an independent
    # validation ensemble rather than contributing to observer calibration.
    scales = feature_scale(profiles_a)
    pairs = fixed_local_pairs(points, LOCAL_K)

    observer_rows = []
    for observer_id, features in OBSERVER_FEATURES.items():
        observer_rows.append({
            'observerId': observer_id,
            **observer_metrics(profiles_a, profiles_b, scales, features, pairs),
        })

    by_id = {row['observerId']: row for row in observer_rows}
    full = by_id['full_core']
    structure = by_id['state_structure']
    order_entropy = by_id['order_entropy']

    primary = {
        'geometryMargin': PRIMARY_GEOMETRY_MARGIN,
        'localMargin': PRIMARY_LOCAL_MARGIN,
        'structureMinusFullGeometry': structure['geometryStabilitySpearman'] - full['geometryStabilitySpearman'],
        'structureMinusFullLocal': structure['localEdgeStabilitySpearman'] - full['localEdgeStabilitySpearman'],
    }
    primary['geometryCriterionPassed'] = primary['structureMinusFullGeometry'] >= PRIMARY_GEOMETRY_MARGIN
    primary['localCriterionPassed'] = primary['structureMinusFullLocal'] >= PRIMARY_LOCAL_MARGIN
    primary['prospectiveReplicationPassed'] = bool(primary['geometryCriterionPassed'] and primary['localCriterionPassed'])

    secondary = {
        'jaccardMargin': SECONDARY_JACCARD_MARGIN,
        'structureMinusFullTop10Jaccard': structure['top10LocalEdgeJaccard'] - full['top10LocalEdgeJaccard'],
        'structureJaccardCriterionPassed': structure['top10LocalEdgeJaccard'] - full['top10LocalEdgeJaccard'] >= SECONDARY_JACCARD_MARGIN,
        'orderEntropyMinusFullGeometry': order_entropy['geometryStabilitySpearman'] - full['geometryStabilitySpearman'],
        'orderEntropyMinusFullLocal': order_entropy['localEdgeStabilitySpearman'] - full['localEdgeStabilitySpearman'],
        'orderEntropyMinusFullTop10Jaccard': order_entropy['top10LocalEdgeJaccard'] - full['top10LocalEdgeJaccard'],
    }

    report = {
        'schemaVersion': 'entropy-rulial-boids-observer-validation/1.0.0',
        'experimentId': 'RUL-011',
        'title': 'Prospective Boids observer validation on unseen rule coordinates',
        'generatedAt': '2026-08-24T22:10:00.000Z',
        'sourceDiagnostic': 'RUL-010',
        'design': {
            'rulePointCount': DESIGN_POINT_COUNT,
            'latinHypercubeSeed': DESIGN_SEED,
            'localNeighborK': LOCAL_K,
            'seedPools': {'A': POOL_A, 'B': POOL_B},
            'newRuleCoordinateCheckAgainstRUL006': nearest_old_design_distance(points),
            'config': config,
        },
        'simulation': {
            'poolARunCount': len(runs_a),
            'poolBRunCount': len(runs_b),
            'totalNewRunCount': len(all_runs),
        },
        'observerDefinitions': OBSERVER_FEATURES,
        'featureScalesFromPoolA': scales,
        'localEdgeCount': len(pairs),
        'observers': observer_rows,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
        'interpretationBoundary': [
            'RUL-011 is prospective relative to the RUL-010 observer diagnostic: observer definitions, rule-space design seed, seed pools, and validation margins are fixed in code before RUL-011 outcomes are interpreted.',
            'All three observers are projected from exactly the same 320 newly simulated trajectories; no observer receives a custom simulation population.',
            'The 40 rule coordinates come from a new Latin-hypercube design and are not the 32 RUL-006/RUL-010 coordinates.',
            'The primary claim is narrow: state_structure must exceed full_core by at least 0.05 in both complete-geometry and local-edge split-half Spearman stability.',
            'Top-10% boundary Jaccard and order_entropy comparisons are secondary checks and do not redefine the primary criterion.',
            'A failed prospective criterion is retained as a failed result; RUL-009 and RUL-010 remain unchanged.',
        ],
    }

    summary_keys = [
        'schemaVersion', 'experimentId', 'generatedAt', 'sourceDiagnostic', 'design',
        'simulation', 'localEdgeCount', 'observers', 'primaryProspectiveTest',
        'secondaryChecks', 'interpretationBoundary',
    ]
    summary = {key: report[key] for key in summary_keys}

    report_path = args.output_dir / 'boids-observer-validation-report.json'
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n')
    (args.output_dir / 'boids-observer-validation-summary.json').write_text(json.dumps(summary, indent=2, sort_keys=True) + '\n')

    with (args.output_dir / 'observer-comparison.csv').open('w', newline='') as f:
        fieldnames = [
            'observerId', 'featureCount', 'features', 'geometryStabilitySpearman',
            'localEdgeStabilitySpearman', 'top10LocalEdgeJaccard',
            'localSensitivityQ95OverMedianA', 'localSensitivityQ95OverMedianB',
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in observer_rows:
            writer.writerow({**row, 'features': ';'.join(row['features'])})

    with (args.output_dir / 'rule-points.csv').open('w', newline='') as f:
        fieldnames = ['ruleId'] + [name for name, _, _ in DIMENSIONS]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for point in points:
            writer.writerow({'ruleId': point['id'], **point['rule']})

    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (args.output_dir / 'sha256.txt').write_text(f'{digest}  boids-observer-validation-report.json\n')

    print(json.dumps({
        'experimentId': 'RUL-011',
        'totalNewRuns': len(all_runs),
        'localEdgeCount': len(pairs),
        'observers': observer_rows,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
    }, indent=2))


if __name__ == '__main__':
    main()
