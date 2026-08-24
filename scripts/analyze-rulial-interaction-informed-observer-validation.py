#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import json
import math
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('r15', ROOT / 'scripts/analyze-rulial-information-weighted-observer.py')
r15 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(r15)

# RUL-017 is prospective relative to the diagnostic RUL-016 subset search.
# The candidate observer, design, seed pools, and margins are frozen here
# before any RUL-017 outcomes are interpreted.
DESIGN_POINT_COUNT = 40
DESIGN_SEED = 2026082417
POOL_A = [111001, 111017, 111043, 111071]
POOL_B = [112003, 112027, 112051, 112079]
LOCAL_K = 4
PRIMARY_GEOMETRY_MARGIN = 0.01
PRIMARY_LOCAL_MARGIN = 0.01
SECONDARY_JACCARD_MARGIN = 0.05

FULL_FEATURES = list(r15.FEATURE_IDS)
HARD4_FEATURES = [
    'OBS-POLARIZATION',
    'OBS-HEADING-ENTROPY',
    'OBS-SPATIAL',
    'OBS-SPEED-VARIANCE',
]
INTERACTION3_FEATURES = [
    'OBS-POLARIZATION',
    'OBS-SPATIAL',
    'OBS-SPEED-VARIANCE',
]


def weights_for(features: list[str]) -> dict[str, float]:
    chosen = set(features)
    return {f: (1.0 if f in chosen else 0.0) for f in FULL_FEATURES}


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def nearest_prior_design_distance(points: list[dict[str, Any]]) -> dict[str, float]:
    prior_designs = [
        r15.latin_hypercube(32, len(r15.DIMENSIONS), 20260824),
        r15.latin_hypercube(40, len(r15.DIMENSIONS), 2026082411),
        r15.latin_hypercube(48, len(r15.DIMENSIONS), 2026082414),
        r15.latin_hypercube(56, len(r15.DIMENSIONS), 2026082415),
    ]
    prior_units = np.vstack([np.asarray(x, dtype=float) for x in prior_designs])
    new_units = np.array([r15.rule_to_unit(p['rule']) for p in points])
    minima = [float(np.min(np.linalg.norm(prior_units - u, axis=1) / math.sqrt(len(r15.DIMENSIONS)))) for u in new_units]
    return {
        'minimum': float(np.min(minima)),
        'median': float(np.median(minima)),
        'maximum': float(np.max(minima)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data/ruliology/interaction-informed-observer-validation')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    lhs = r15.latin_hypercube(DESIGN_POINT_COUNT, len(r15.DIMENSIONS), DESIGN_SEED)
    points = [{'id': f'BOIDS-R17-{i:03d}', 'rule': r15.unit_to_rule(lhs[i])} for i in range(DESIGN_POINT_COUNT)]
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

    runs_a, _ = r15.build_profiles(points, POOL_A, config)
    runs_b, _ = r15.build_profiles(points, POOL_B, config)
    all_runs = runs_a + runs_b
    pa = r15.subset_profiles(all_runs, points, POOL_A)
    pb = r15.subset_profiles(all_runs, points, POOL_B)
    scales = r15.feature_scale(pa)
    pairs = r15.fixed_local_pairs(points, LOCAL_K)

    observer_defs = [
        ('full_core', FULL_FEATURES, 'Six-feature RUL-006 baseline observer.'),
        ('rul013_hard4', HARD4_FEATURES, 'Four-feature reliability-selected observer retained from RUL-013/RUL-014.'),
        ('rul016_interaction3', INTERACTION3_FEATURES, 'Three-feature interaction-informed candidate frozen from the best complete-geometry RUL-016 subset.'),
    ]
    observers = []
    for observer_id, features, description in observer_defs:
        metrics = r15.observer_metrics(pa, pb, scales, weights_for(features), pairs)
        observers.append({
            'observerId': observer_id,
            'features': features,
            'description': description,
            **metrics,
        })

    by_id = {row['observerId']: row for row in observers}
    full = by_id['full_core']
    hard4 = by_id['rul013_hard4']
    interaction3 = by_id['rul016_interaction3']

    primary = {
        'geometryMargin': PRIMARY_GEOMETRY_MARGIN,
        'localMargin': PRIMARY_LOCAL_MARGIN,
        'interaction3MinusHard4Geometry': interaction3['geometryStabilitySpearman'] - hard4['geometryStabilitySpearman'],
        'interaction3MinusHard4Local': interaction3['localEdgeStabilitySpearman'] - hard4['localEdgeStabilitySpearman'],
    }
    primary['geometryCriterionPassed'] = primary['interaction3MinusHard4Geometry'] >= PRIMARY_GEOMETRY_MARGIN
    primary['localCriterionPassed'] = primary['interaction3MinusHard4Local'] >= PRIMARY_LOCAL_MARGIN
    primary['interactionInformedObserverSupported'] = bool(primary['geometryCriterionPassed'] and primary['localCriterionPassed'])

    secondary = {
        'jaccardMargin': SECONDARY_JACCARD_MARGIN,
        'interaction3MinusHard4Top10Jaccard': interaction3['top10LocalEdgeJaccard'] - hard4['top10LocalEdgeJaccard'],
        'jaccardCriterionPassed': interaction3['top10LocalEdgeJaccard'] - hard4['top10LocalEdgeJaccard'] >= SECONDARY_JACCARD_MARGIN,
        'interaction3MinusFullGeometry': interaction3['geometryStabilitySpearman'] - full['geometryStabilitySpearman'],
        'interaction3MinusFullLocal': interaction3['localEdgeStabilitySpearman'] - full['localEdgeStabilitySpearman'],
        'interaction3MinusFullTop10Jaccard': interaction3['top10LocalEdgeJaccard'] - full['top10LocalEdgeJaccard'],
    }

    r16_path = ROOT / 'data/ruliology/observer-ablation/observer-ablation-report.json'
    report = {
        'schemaVersion': 'entropy-rulial-interaction-informed-observer-validation/1.0.0',
        'experimentId': 'RUL-017',
        'title': 'Prospective validation of an interaction-informed compact Boids observer',
        'generatedAt': '2026-08-24T23:55:00.000Z',
        'selectionSource': {
            'experimentId': 'RUL-016',
            'reportSha256': hashlib.sha256(r16_path.read_bytes()).hexdigest(),
            'candidateFeatures': INTERACTION3_FEATURES,
            'candidateSelectionRule': 'Freeze the RUL-016 non-empty subset with the highest complete-geometry split-half stability; do not search RUL-017 outcomes for another subset.',
            'comparisonObserverFeatures': HARD4_FEATURES,
        },
        'design': {
            'rulePointCount': DESIGN_POINT_COUNT,
            'latinHypercubeSeed': DESIGN_SEED,
            'localNeighborK': LOCAL_K,
            'seedPools': {'A': POOL_A, 'B': POOL_B},
            'newRuleCoordinateCheckAgainstRUL006RUL011RUL014RUL015': nearest_prior_design_distance(points),
            'config': config,
        },
        'simulation': {
            'poolARunCount': len(runs_a),
            'poolBRunCount': len(runs_b),
            'totalNewRunCount': len(all_runs),
        },
        'featureScalesFromPoolA': scales,
        'localEdgeCount': len(pairs),
        'observers': observers,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
        'interpretationBoundary': [
            'RUL-017 is prospective relative to RUL-016: the three-feature candidate, comparison observers, 40-point LHS design, seed pools, and effect-size margins are frozen in code before RUL-017 outcomes are interpreted.',
            'The three-feature candidate is not reselected on the RUL-017 data. All three observers reuse identical newly generated Boids trajectories; only the declared observer coordinates change.',
            'Feature scaling is estimated from pool A only and held fixed for pool B.',
            'The primary test requires the interaction-informed three-feature observer to exceed the established four-feature observer by at least +0.01 in both complete and local geometry stability. Failure is retained as a challenge rather than repaired by searching another subset.',
            'This experiment validates predictive value of one RUL-016 subset choice; it does not establish a universally optimal Boids observer.',
        ],
    }

    report_path = args.output_dir / 'interaction-informed-observer-validation-report.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    summary = {
        'experimentId': 'RUL-017',
        'selectionSource': report['selectionSource'],
        'design': report['design'],
        'simulation': report['simulation'],
        'localEdgeCount': report['localEdgeCount'],
        'observers': observers,
        'primaryProspectiveTest': primary,
        'secondaryChecks': secondary,
    }
    (args.output_dir / 'interaction-informed-observer-validation-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    write_csv(args.output_dir / 'observer-comparison.csv', [{k: v for k, v in row.items() if k not in ('features', 'description')} for row in observers])
    write_csv(args.output_dir / 'rule-points.csv', [{'ruleId': p['id'], **p['rule']} for p in points])
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (args.output_dir / 'sha256.txt').write_text(f'{digest}  interaction-informed-observer-validation-report.json\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
