#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import itertools
import json
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('r17', ROOT / 'scripts/analyze-rulial-interaction-informed-observer-validation.py')
r17 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(r17)
r15 = r17.r15

# RUL-018 is diagnostic, not prospective. It reuses the frozen RUL-017 design
# and asks whether observer quality is objective-dependent across the complete
# Boolean lattice of the six registered Boids coordinates.
FEATURES = list(r17.FULL_FEATURES)
OBJECTIVES = [
    ('global_geometry', 'geometryStabilitySpearman'),
    ('local_geometry', 'localEdgeStabilitySpearman'),
    ('boundary_recovery', 'top10LocalEdgeJaccard'),
]


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader(); writer.writerows(rows)


def subset_id(features: tuple[str, ...]) -> str:
    bits = ''.join('1' if f in features else '0' for f in FEATURES)
    return f'OBSSET-{bits}'


def rank_desc(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    ordered = sorted(rows, key=lambda r: (-float(r[key]), r['observerId']))
    return {row['observerId']: i + 1 for i, row in enumerate(ordered)}


def pareto_front(rows: list[dict[str, Any]]) -> list[str]:
    keys = [k for _name, k in OBJECTIVES]
    front = []
    for a in rows:
        dominated = False
        for b in rows:
            if a is b:
                continue
            ge_all = all(float(b[k]) >= float(a[k]) for k in keys)
            gt_any = any(float(b[k]) > float(a[k]) for k in keys)
            if ge_all and gt_any:
                dominated = True
                break
        if not dominated:
            front.append(a['observerId'])
    return sorted(front)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data/ruliology/objective-dependent-observer')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    lhs = r15.latin_hypercube(r17.DESIGN_POINT_COUNT, len(r15.DIMENSIONS), r17.DESIGN_SEED)
    points = [{'id': f'BOIDS-R17-{i:03d}', 'rule': r15.unit_to_rule(lhs[i])} for i in range(r17.DESIGN_POINT_COUNT)]
    config = {
        'n_agents': 40, 'steps': 200, 'dt': 0.2, 'width': 100.0, 'height': 100.0,
        'separation_radius': 3.0, 'max_speed': 2.5, 'pressure': 0.35,
        'tail_fraction': 0.25, 'stochastic_noise_scale': 1.0,
    }
    runs_a, _ = r15.build_profiles(points, r17.POOL_A, config)
    runs_b, _ = r15.build_profiles(points, r17.POOL_B, config)
    all_runs = runs_a + runs_b
    pa = r15.subset_profiles(all_runs, points, r17.POOL_A)
    pb = r15.subset_profiles(all_runs, points, r17.POOL_B)
    scales = r15.feature_scale(pa)
    pairs = r15.fixed_local_pairs(points, r17.LOCAL_K)

    rows: list[dict[str, Any]] = []
    for size in range(1, len(FEATURES) + 1):
        for combo in itertools.combinations(FEATURES, size):
            metrics = r15.observer_metrics(pa, pb, scales, r17.weights_for(list(combo)), pairs)
            rows.append({
                'observerId': subset_id(combo),
                'featureCount': size,
                'features': list(combo),
                **metrics,
            })

    ranks = {name: rank_desc(rows, key) for name, key in OBJECTIVES}
    for row in rows:
        for name, _key in OBJECTIVES:
            row[f'{name}Rank'] = ranks[name][row['observerId']]

    optima = []
    optimal_sets: dict[str, set[str]] = {}
    for name, key in OBJECTIVES:
        best_score = max(float(r[key]) for r in rows)
        cooptimal = [r for r in rows if abs(float(r[key]) - best_score) <= 1e-12]
        representative = min(cooptimal, key=lambda r: (r['featureCount'], r['observerId']))
        optimal_sets[name] = {r['observerId'] for r in cooptimal}
        optima.append({
            'objective': name,
            'metric': key,
            'representativeObserverId': representative['observerId'],
            'representativeFeatures': representative['features'],
            'representativeFeatureCount': representative['featureCount'],
            'score': best_score,
            'coOptimalObserverCount': len(cooptimal),
            'coOptimalObserverIds': sorted(r['observerId'] for r in cooptimal),
            'otherScoresForRepresentative': {other_name: representative[other_key] for other_name, other_key in OBJECTIVES if other_name != name},
        })

    rank_associations = []
    for (name_a, _), (name_b, _) in itertools.combinations(OBJECTIVES, 2):
        a = [ranks[name_a][row['observerId']] for row in rows]
        b = [ranks[name_b][row['observerId']] for row in rows]
        rank_associations.append({'objectiveA': name_a, 'objectiveB': name_b, 'spearman': r15.spearman(a, b)})

    frontier = pareto_front(rows)
    common_optima = set.intersection(*(optimal_sets[name] for name, _ in OBJECTIVES))
    objective_dependence = {
        'allObjectivesShareAtLeastOneOptimum': bool(common_optima),
        'commonOptimalObserverIds': sorted(common_optima),
        'globalAndLocalOptimaDiffer': optimal_sets['global_geometry'] != optimal_sets['local_geometry'],
        'minimumPairwiseObjectiveRankSpearman': min(x['spearman'] for x in rank_associations),
        'maximumPairwiseObjectiveRankSpearman': max(x['spearman'] for x in rank_associations),
        'paretoFrontSize': len(frontier),
        'objectiveDependenceDetected': bool(not common_optima and optimal_sets['global_geometry'] != optimal_sets['local_geometry']),
    }

    r17_report = ROOT / 'data/ruliology/interaction-informed-observer-validation/interaction-informed-observer-validation-report.json'
    report = {
        'schemaVersion': 'entropy-rulial-objective-dependent-observer/1.0.0',
        'experimentId': 'RUL-018',
        'title': 'Objective-dependent observer geometry on the frozen RUL-017 Boids population',
        'generatedAt': '2026-08-24T22:45:00.000Z',
        'source': {
            'experimentId': 'RUL-017',
            'reportSha256': hashlib.sha256(r17_report.read_bytes()).hexdigest(),
            'newUniqueSimulationRunCount': 0,
            'reconstructedFrozenRunCount': len(all_runs),
        },
        'design': {
            'featureCount': len(FEATURES),
            'nonEmptyObserverSubsetCount': len(rows),
            'rulePointCount': len(points),
            'seedPools': {'A': r17.POOL_A, 'B': r17.POOL_B},
            'localNeighborK': r17.LOCAL_K,
            'objectives': [{'id': n, 'metric': k} for n, k in OBJECTIVES],
        },
        'objectiveOptima': optima,
        'objectiveRankAssociations': rank_associations,
        'paretoFrontObserverIds': frontier,
        'objectiveDependence': objective_dependence,
        'interpretationBoundary': [
            'RUL-018 is a diagnostic reuse of the frozen RUL-017 rule coordinates and seed pools; it introduces zero new unique simulations.',
            'All 63 non-empty subsets of the six registered Boids coordinates are evaluated on the same reconstructed trajectories and pool-A feature scaling.',
            'Global geometry stability, local-edge geometry stability, and top-10% local-boundary recovery are treated as distinct scientific objectives rather than collapsed into a post-hoc scalar utility.',
            'Objective-specific optima are descriptive for this frozen population. RUL-018 does not declare any subset universally optimal and does not replace the prospective RUL-017 result.',
            'A distinct optimum across objectives demonstrates task dependence in this finite observer family; it does not by itself prove a general theorem about all observers or substrates.',
        ],
        'observerSubsets': rows,
    }

    report_path = args.output_dir / 'objective-dependent-observer-report.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    summary = {k: report[k] for k in ['experimentId', 'source', 'design', 'objectiveOptima', 'objectiveRankAssociations', 'paretoFrontObserverIds', 'objectiveDependence']}
    (args.output_dir / 'objective-dependent-observer-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    flat_rows = []
    for row in rows:
        flat = dict(row); flat['features'] = '|'.join(row['features']); flat_rows.append(flat)
    write_csv(args.output_dir / 'observer-objectives.csv', flat_rows)
    write_csv(args.output_dir / 'objective-optima.csv', [{**x, 'representativeFeatures': '|'.join(x['representativeFeatures']), 'coOptimalObserverIds': '|'.join(x['coOptimalObserverIds']), 'otherScoresForRepresentative': json.dumps(x['otherScoresForRepresentative'], sort_keys=True)} for x in optima])
    write_csv(args.output_dir / 'objective-rank-associations.csv', rank_associations)
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (args.output_dir / 'sha256.txt').write_text(f'{digest}  objective-dependent-observer-report.json\n')
    print(json.dumps(summary, indent=2))

if __name__ == '__main__':
    main()
