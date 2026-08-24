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
BOIDS_ROOT = ROOT / "adapters" / "pcc-boids"
if str(BOIDS_ROOT) not in sys.path:
    sys.path.insert(0, str(BOIDS_ROOT))

from pcc_boids.rulial import (  # noqa: E402
    DIMENSIONS,
    FEATURE_IDS,
    VALIDATION_SEEDS,
    build_profiles,
    feature_distance,
    local_edges,
    rule_to_unit,
    spearman,
)

ECA_FEATURE_SCALES = {
    "OBS-SHANNON": math.log(2.0),
    "OBS-HAMMING": 1.0,
    "OBS-PERTURB-GROWTH": 1.0,
    "OBS-AUTOCORR-TIME": 64.0,
    "OBS-COMPRESSION": 2.0,
}

BOIDS_CONFIG = {
    "n_agents": 40,
    "steps": 200,
    "dt": 0.2,
    "width": 100.0,
    "height": 100.0,
    "separation_radius": 3.0,
    "max_speed": 2.5,
    "pressure": 0.35,
    "tail_fraction": 0.25,
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def quantile(values: list[float], q: float) -> float:
    if not values:
        return float("nan")
    return float(np.quantile(np.asarray(values, dtype=float), q))


def top_fraction_keys(rows: list[dict[str, Any]], value_key: str, fraction: float) -> set[str]:
    n = max(1, int(math.ceil(len(rows) * fraction)))
    ordered = sorted(rows, key=lambda row: (row[value_key], row["edgeKey"]), reverse=True)
    return {row["edgeKey"] for row in ordered[:n]}


def jaccard(a: set[str], b: set[str]) -> float:
    union = a | b
    return len(a & b) / len(union) if union else 1.0


def eca_feature_map(profile: dict[str, Any]) -> dict[str, float]:
    return {feature["observableId"]: float(feature["value"]) for feature in profile["features"]}


def eca_observable_distance(a: dict[str, Any], b: dict[str, Any]) -> float:
    left = eca_feature_map(a)
    right = eca_feature_map(b)
    shared = [key for key in left if key in right and key in ECA_FEATURE_SCALES]
    z = [(left[key] - right[key]) / ECA_FEATURE_SCALES[key] for key in shared]
    return float(np.sqrt(np.mean(np.square(z))))


def eca_rule_distance(a: int, b: int) -> float:
    return (a ^ b).bit_count() / 8.0


def pairwise_eca(profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(len(profiles)):
        ai = int(profiles[i]["rule"]["ruleId"])
        for j in range(i + 1, len(profiles)):
            bj = int(profiles[j]["rule"]["ruleId"])
            rows.append({
                "pairKey": f"{ai}|{bj}",
                "ruleDistance": eca_rule_distance(ai, bj),
                "observableDistance": eca_observable_distance(profiles[i], profiles[j]),
            })
    return rows


def local_eca(campaign: dict[str, Any]) -> list[dict[str, Any]]:
    return [{
        "edgeKey": f'{min(int(t["fromRuleId"]), int(t["toRuleId"]))}|{max(int(t["fromRuleId"]), int(t["toRuleId"]))}',
        "ruleDistance": float(t["syntacticDistance"]),
        "observableDistance": float(t["observableDistance"]),
        "sensitivity": float(t["observableDistance"]) / max(float(t["syntacticDistance"]), 1e-12),
    } for t in campaign["transitions"]]


def load_boids_discovery_profiles(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rule = {name: float(row[name]) for name, _, _ in DIMENSIONS}
            features = {feature: float(row[feature]) for feature in FEATURE_IDS}
            rows.append({"ruleId": row["rule_id"], "rule": rule, "features": features, "seedCount": 3})
    return rows


def pairwise_boids(profiles: list[dict[str, Any]], scales: dict[str, float]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(len(profiles)):
        ui = rule_to_unit(profiles[i]["rule"])
        for j in range(i + 1, len(profiles)):
            uj = rule_to_unit(profiles[j]["rule"])
            a, b = profiles[i]["ruleId"], profiles[j]["ruleId"]
            rows.append({
                "pairKey": "|".join(sorted((a, b))),
                "ruleDistance": float(np.linalg.norm(ui - uj) / math.sqrt(len(DIMENSIONS))),
                "observableDistance": feature_distance(profiles[i]["features"], profiles[j]["features"], scales),
            })
    return rows


def keyed_local_boids(profiles: list[dict[str, Any]], scales: dict[str, float]) -> list[dict[str, Any]]:
    rows = local_edges(profiles, scales, k=4)
    out = []
    for row in rows:
        a, b = sorted((row["leftRuleId"], row["rightRuleId"]))
        out.append({**row, "edgeKey": f"{a}|{b}"})
    return out


def project_local_distances(frozen_edges: list[dict[str, Any]], profiles: list[dict[str, Any]], scales: dict[str, float]) -> list[dict[str, Any]]:
    by_id = {profile["ruleId"]: profile for profile in profiles}
    rows = []
    for edge in frozen_edges:
        a, b = edge["leftRuleId"], edge["rightRuleId"]
        de = feature_distance(by_id[a]["features"], by_id[b]["features"], scales)
        rows.append({
            "edgeKey": edge["edgeKey"],
            "leftRuleId": a,
            "rightRuleId": b,
            "ruleDistance": float(edge["ruleDistance"]),
            "observableDistance": de,
            "sensitivity": de / max(float(edge["ruleDistance"]), 1e-12),
        })
    return rows


def substrate_metrics(
    name: str,
    discovery_pairs: list[dict[str, Any]],
    holdout_pairs: list[dict[str, Any]],
    discovery_local: list[dict[str, Any]],
    holdout_local: list[dict[str, Any]],
    discovery_run_count: int,
    holdout_run_count: int,
) -> dict[str, Any]:
    holdout_pair_by_key = {row["pairKey"]: row for row in holdout_pairs}
    shared_pairs = [row for row in discovery_pairs if row["pairKey"] in holdout_pair_by_key]
    holdout_local_by_key = {row["edgeKey"]: row for row in holdout_local}
    shared_local = [row for row in discovery_local if row["edgeKey"] in holdout_local_by_key]

    discovery_sens = [row["sensitivity"] for row in discovery_local]
    holdout_sens = [holdout_local_by_key[row["edgeKey"]]["sensitivity"] for row in shared_local]
    median_sens = quantile(discovery_sens, 0.5)
    q95_sens = quantile(discovery_sens, 0.95)
    threshold = 2.0 * median_sens

    top10_discovery = top_fraction_keys(discovery_local, "observableDistance", 0.10)
    top10_holdout = top_fraction_keys(holdout_local, "observableDistance", 0.10)

    return {
        "substrate": name,
        "discoveryRunCount": discovery_run_count,
        "holdoutRunCount": holdout_run_count,
        "rulePairCount": len(discovery_pairs),
        "localEdgeCount": len(discovery_local),
        "globalRuleObservableSpearmanDiscovery": spearman(
            [row["ruleDistance"] for row in discovery_pairs],
            [row["observableDistance"] for row in discovery_pairs],
        ),
        "globalRuleObservableSpearmanHoldout": spearman(
            [row["ruleDistance"] for row in holdout_pairs],
            [row["observableDistance"] for row in holdout_pairs],
        ),
        "geometryStabilitySpearman": spearman(
            [row["observableDistance"] for row in shared_pairs],
            [holdout_pair_by_key[row["pairKey"]]["observableDistance"] for row in shared_pairs],
        ),
        "localEdgeStabilitySpearman": spearman(
            [row["observableDistance"] for row in shared_local],
            [holdout_local_by_key[row["edgeKey"]]["observableDistance"] for row in shared_local],
        ),
        "top10LocalEdgeJaccard": jaccard(top10_discovery, top10_holdout),
        "localSensitivity": {
            "median": median_sens,
            "q90": quantile(discovery_sens, 0.90),
            "q95": q95_sens,
            "q95OverMedian": q95_sens / max(median_sens, 1e-12),
            "fractionAbove2xMedian": sum(value >= threshold for value in discovery_sens) / max(1, len(discovery_sens)),
            "holdoutMedian": quantile(holdout_sens, 0.5),
            "holdoutQ95": quantile(holdout_sens, 0.95),
        },
    }


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RUL-007 cross-substrate rule-space universality challenge.")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data" / "ruliology" / "cross-substrate")
    args = parser.parse_args()

    eca_discovery = read_json(ROOT / "data" / "ruliology" / "eca-atlas" / "campaign-report.json")
    eca_holdout = read_json(ROOT / "data" / "ruliology" / "eca-validation" / "holdout-report.json")
    eca_discovery_pairs = pairwise_eca(eca_discovery["profiles"])
    eca_holdout_pairs = pairwise_eca(eca_holdout["profiles"])
    eca_discovery_local = local_eca(eca_discovery)
    eca_holdout_local = local_eca(eca_holdout)

    boids_rul006 = read_json(ROOT / "data" / "ruliology" / "boids-rulial" / "boids-rulial-report.json")
    boids_scales = {key: float(value) for key, value in boids_rul006["featureScaling"].items()}
    boids_discovery_profiles = load_boids_discovery_profiles(ROOT / "data" / "ruliology" / "boids-rulial" / "discovery-profiles.csv")
    boids_points = [{"id": p["ruleId"], "rule": p["rule"]} for p in boids_discovery_profiles]
    boids_holdout_runs, boids_holdout_profiles = build_profiles(boids_points, VALIDATION_SEEDS, BOIDS_CONFIG)

    boids_discovery_pairs = pairwise_boids(boids_discovery_profiles, boids_scales)
    boids_holdout_pairs = pairwise_boids(boids_holdout_profiles, boids_scales)
    boids_discovery_local = keyed_local_boids(boids_discovery_profiles, boids_scales)
    boids_holdout_local = project_local_distances(boids_discovery_local, boids_holdout_profiles, boids_scales)

    eca_metrics = substrate_metrics(
        "ECA",
        eca_discovery_pairs,
        eca_holdout_pairs,
        eca_discovery_local,
        eca_holdout_local,
        int(eca_discovery["summary"]["runCount"]),
        int(eca_holdout["summary"]["runCount"]),
    )
    boids_metrics = substrate_metrics(
        "Boids",
        boids_discovery_pairs,
        boids_holdout_pairs,
        boids_discovery_local,
        boids_holdout_local,
        int(boids_rul006["simulation"]["discoveryRunCount"]),
        len(boids_holdout_runs),
    )

    # Frozen RUL-007 challenge criteria. These are intentionally weak structural criteria,
    # not a claim that numerical metric values should match across substrates.
    criteria = {
        "positiveGlobalRuleObservableAssociation": {
            "definition": "Discovery Spearman rho(d_R,d_E) > 0 in both substrates.",
            "eca": eca_metrics["globalRuleObservableSpearmanDiscovery"] > 0,
            "boids": boids_metrics["globalRuleObservableSpearmanDiscovery"] > 0,
        },
        "reproducibleObservableGeometry": {
            "definition": "Discovery-vs-holdout pairwise observable-distance Spearman >= 0.70 in both substrates.",
            "eca": eca_metrics["geometryStabilitySpearman"] >= 0.70,
            "boids": boids_metrics["geometryStabilitySpearman"] >= 0.70,
        },
        "reproducibleLocalGeometry": {
            "definition": "Discovery-vs-holdout local-edge observable-distance Spearman >= 0.70 in both substrates.",
            "eca": eca_metrics["localEdgeStabilitySpearman"] >= 0.70,
            "boids": boids_metrics["localEdgeStabilitySpearman"] >= 0.70,
        },
        "localSensitivityTail": {
            "definition": "Discovery local-sensitivity q95/median >= 1.5 in both substrates.",
            "eca": eca_metrics["localSensitivity"]["q95OverMedian"] >= 1.5,
            "boids": boids_metrics["localSensitivity"]["q95OverMedian"] >= 1.5,
        },
        "topTailBoundaryReplication": {
            "definition": "Top-10% local-edge Jaccard >= 0.50 between discovery and holdout in both substrates.",
            "eca": eca_metrics["top10LocalEdgeJaccard"] >= 0.50,
            "boids": boids_metrics["top10LocalEdgeJaccard"] >= 0.50,
        },
    }
    for item in criteria.values():
        item["crossSubstratePass"] = bool(item["eca"] and item["boids"])
    pass_count = sum(bool(item["crossSubstratePass"]) for item in criteria.values())

    report = {
        "schemaVersion": "entropy-rulial-cross-substrate/1.0.0",
        "experimentId": "RUL-007",
        "title": "ECA-Boids Cross-Substrate Rulial Structure Challenge",
        "generatedAt": "2026-08-24T20:00:00.000Z",
        "substrates": [eca_metrics, boids_metrics],
        "challenge": {
            "criterionCount": len(criteria),
            "crossSubstratePassCount": pass_count,
            "allCriteriaPass": pass_count == len(criteria),
            "criteria": criteria,
        },
        "newSimulation": {
            "substrate": "Boids",
            "purpose": "Complete held-out coverage of all 32 frozen RUL-006 discovery coordinates under the two previously frozen validation seeds.",
            "seeds": VALIDATION_SEEDS,
            "rulePointCount": len(boids_points),
            "runCount": len(boids_holdout_runs),
        },
        "comparabilityContract": {
            "ruleDistance": "Each substrate uses a frozen dimensionless rule-space metric on [0,1]: transition-table Hamming distance / 8 for ECA; normalized Euclidean distance / sqrt(5) in the frozen Boids design cube.",
            "observableDistance": "Each substrate uses its previously frozen observer and feature scaling; RUL-007 compares structural statistics, not raw cross-substrate observable distances.",
            "localNeighborhood": "ECA uses every one-bit hypercube edge; Boids reuses the frozen k=4 discovery nearest-neighbor graph. The same edge set is evaluated under holdout data.",
            "replication": "Discovery and holdout initial-condition/random-seed ensembles are disjoint within each substrate.",
        },
        "interpretationBoundary": [
            "RUL-007 is a cross-substrate challenge, not evidence for universal laws of rule spaces.",
            "The ECA and Boids discovery datasets existed before RUL-007, so this is not a pristine preregistration of all compared quantities; the common metric contract and challenge thresholds are frozen here before adding further substrates.",
            "Raw observable distances are substrate-specific because the observers and feature scales differ. Only dimensionless structural summaries are compared across substrates.",
            "Boids has only 32 sampled rule coordinates, so local-tail statistics and top-10% overlap have much lower resolution than the complete 256-rule ECA benchmark.",
            "A failed criterion is retained as a result rather than tuned away; future substrates must use this frozen RUL-007 contract or explicitly version a new contract.",
        ],
    }

    args.output_dir.mkdir(parents=True, exist_ok=True)
    report_path = args.output_dir / "cross-substrate-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    summary = {
        "schemaVersion": "entropy-rulial-cross-substrate-summary/1.0.0",
        "experimentId": "RUL-007",
        "generatedAt": report["generatedAt"],
        "substrates": report["substrates"],
        "challenge": report["challenge"],
        "newSimulation": report["newSimulation"],
        "interpretationBoundary": report["interpretationBoundary"],
    }
    (args.output_dir / "cross-substrate-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")

    write_csv(
        args.output_dir / "substrate-metrics.csv",
        [{
            "substrate": item["substrate"],
            "global_rho_discovery": item["globalRuleObservableSpearmanDiscovery"],
            "global_rho_holdout": item["globalRuleObservableSpearmanHoldout"],
            "geometry_stability_rho": item["geometryStabilitySpearman"],
            "local_edge_stability_rho": item["localEdgeStabilitySpearman"],
            "top10_local_edge_jaccard": item["top10LocalEdgeJaccard"],
            "local_sensitivity_median": item["localSensitivity"]["median"],
            "local_sensitivity_q95": item["localSensitivity"]["q95"],
            "local_sensitivity_q95_over_median": item["localSensitivity"]["q95OverMedian"],
            "fraction_above_2x_median": item["localSensitivity"]["fractionAbove2xMedian"],
        } for item in report["substrates"]],
        [
            "substrate", "global_rho_discovery", "global_rho_holdout", "geometry_stability_rho",
            "local_edge_stability_rho", "top10_local_edge_jaccard", "local_sensitivity_median",
            "local_sensitivity_q95", "local_sensitivity_q95_over_median", "fraction_above_2x_median",
        ],
    )

    write_csv(
        args.output_dir / "boids-holdout-profiles.csv",
        [{
            "rule_id": p["ruleId"],
            **{name: p["rule"][name] for name, _, _ in DIMENSIONS},
            **{feature: p["features"][feature] for feature in FEATURE_IDS},
        } for p in boids_holdout_profiles],
        ["rule_id", *[name for name, _, _ in DIMENSIONS], *FEATURE_IDS],
    )

    report_hash = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (args.output_dir / "sha256.txt").write_text(f"{report_hash}  cross-substrate-report.json\n")

    print(json.dumps({
        "experimentId": "RUL-007",
        "newBoidsHoldoutRuns": len(boids_holdout_runs),
        "criteriaPassed": pass_count,
        "criteriaTotal": len(criteria),
        "eca": eca_metrics,
        "boids": boids_metrics,
    }, indent=2))


if __name__ == "__main__":
    main()
