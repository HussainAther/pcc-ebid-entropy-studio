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
sys.path.insert(0, str(ROOT / "adapters" / "rulial-network"))

from network_rulial import (  # noqa: E402
    DIMENSIONS,
    DISCOVERY_SEEDS,
    TOPOLOGIES,
    VALIDATION_SEEDS,
    build_profiles,
    feature_distance,
    feature_scale,
    latin_hypercube,
    local_edges,
    pairwise_rows,
    spearman,
    unit_to_rule,
)

CONFIG = {"n_nodes": 72, "steps": 220, "mean_degree": 6, "tail_fraction": 0.25}
POINT_COUNT = 24
LHS_SEED = 20260824


def quantile(values: list[float], q: float) -> float:
    return float(np.quantile(np.asarray(values, dtype=float), q))


def jaccard(a: set[str], b: set[str]) -> float:
    union = a | b
    return len(a & b) / len(union) if union else 1.0


def top_fraction(rows: list[dict[str, Any]], key: str, fraction: float) -> set[str]:
    count = max(1, math.ceil(len(rows) * fraction))
    ranked = sorted(rows, key=lambda row: float(row[key]), reverse=True)
    return {str(row["pairKey"]) for row in ranked[:count]}


def project_edges(edges: list[dict[str, Any]], profiles: list[dict[str, Any]], scales: dict[str, float]) -> list[dict[str, Any]]:
    by_id = {p["ruleId"]: p for p in profiles}
    rows: list[dict[str, Any]] = []
    for edge in edges:
        a = by_id[edge["leftRuleId"]]
        b = by_id[edge["rightRuleId"]]
        de = feature_distance(a["features"], b["features"], scales)
        dr = float(edge["ruleDistance"])
        rows.append({**edge, "observableDistance": de, "sensitivity": de / max(dr, 1e-12)})
    return rows


def topology_profile_map(rows: list[dict[str, Any]]) -> dict[str, dict[str, dict[str, float]]]:
    result: dict[str, dict[str, dict[str, float]]] = {}
    for row in rows:
        result.setdefault(row["topology"], {})[row["ruleId"]] = row["features"]
    return result


def topology_geometry(topology_profiles: list[dict[str, Any]], points: list[dict[str, Any]], scales: dict[str, float]) -> list[dict[str, Any]]:
    by_topology = topology_profile_map(topology_profiles)
    rows: list[dict[str, Any]] = []
    for topology in TOPOLOGIES:
        profiles = [{"ruleId": p["id"], "rule": p["rule"], "features": by_topology[topology][p["id"]]} for p in points]
        pairs = pairwise_rows(profiles, scales)
        rows.append({
            "topology": topology,
            "ruleObservableSpearman": spearman([r["ruleDistance"] for r in pairs], [r["observableDistance"] for r in pairs]),
            "meanObservableDistance": float(np.mean([r["observableDistance"] for r in pairs])),
        })
    return rows


def cross_topology_geometry(topology_profiles: list[dict[str, Any]], points: list[dict[str, Any]], scales: dict[str, float]) -> list[dict[str, Any]]:
    by_topology = topology_profile_map(topology_profiles)
    pair_distances: dict[str, list[dict[str, Any]]] = {}
    for topology in TOPOLOGIES:
        profiles = [{"ruleId": p["id"], "rule": p["rule"], "features": by_topology[topology][p["id"]]} for p in points]
        pair_distances[topology] = pairwise_rows(profiles, scales)
    out = []
    for i, left in enumerate(TOPOLOGIES):
        for right in TOPOLOGIES[i + 1:]:
            left_by_key = {r["pairKey"]: r for r in pair_distances[left]}
            right_by_key = {r["pairKey"]: r for r in pair_distances[right]}
            keys = sorted(set(left_by_key) & set(right_by_key))
            out.append({
                "leftTopology": left,
                "rightTopology": right,
                "geometrySpearman": spearman(
                    [left_by_key[k]["observableDistance"] for k in keys],
                    [right_by_key[k]["observableDistance"] for k in keys],
                ),
            })
    return out


def topology_spread(profiles: list[dict[str, Any]], topology_profiles: list[dict[str, Any]], scales: dict[str, float]) -> dict[str, float]:
    by_topology = topology_profile_map(topology_profiles)
    spreads = []
    for profile in profiles:
        rid = profile["ruleId"]
        vals = []
        for i, left in enumerate(TOPOLOGIES):
            for right in TOPOLOGIES[i + 1:]:
                vals.append(feature_distance(by_topology[left][rid], by_topology[right][rid], scales))
        spreads.append(float(np.mean(vals)))
    locals_ = local_edges(profiles, scales, k=4)
    neighbor_dist = [float(r["observableDistance"]) for r in locals_]
    return {
        "meanWithinRuleAcrossTopologyDistance": float(np.mean(spreads)),
        "medianWithinRuleAcrossTopologyDistance": float(np.median(spreads)),
        "meanLocalRuleObservableDistance": float(np.mean(neighbor_dist)),
        "topologyToLocalRuleDistanceRatio": float(np.mean(spreads) / max(np.mean(neighbor_dist), 1e-12)),
    }


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RUL-008 network-dynamics rule-space benchmark.")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data" / "ruliology" / "network-rulial")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    lhs = latin_hypercube(POINT_COUNT, len(DIMENSIONS), LHS_SEED)
    points = [{"id": f"NET-{i + 1:03d}", "rule": unit_to_rule(lhs[i])} for i in range(POINT_COUNT)]

    discovery_runs, discovery_profiles, discovery_topology_profiles = build_profiles(points, DISCOVERY_SEEDS, CONFIG, list(TOPOLOGIES))
    scales = feature_scale(discovery_profiles)
    holdout_runs, holdout_profiles, holdout_topology_profiles = build_profiles(points, VALIDATION_SEEDS, CONFIG, list(TOPOLOGIES))

    discovery_pairs = pairwise_rows(discovery_profiles, scales)
    holdout_pairs = pairwise_rows(holdout_profiles, scales)
    holdout_by_pair = {r["pairKey"]: r for r in holdout_pairs}
    local_discovery = local_edges(discovery_profiles, scales, k=4)
    local_holdout = project_edges(local_discovery, holdout_profiles, scales)
    local_holdout_by_key = {r["pairKey"]: r for r in local_holdout}

    global_discovery = spearman([r["ruleDistance"] for r in discovery_pairs], [r["observableDistance"] for r in discovery_pairs])
    global_holdout = spearman([r["ruleDistance"] for r in holdout_pairs], [r["observableDistance"] for r in holdout_pairs])
    geometry_stability = spearman(
        [r["observableDistance"] for r in discovery_pairs],
        [holdout_by_pair[r["pairKey"]]["observableDistance"] for r in discovery_pairs],
    )
    local_stability = spearman(
        [r["observableDistance"] for r in local_discovery],
        [local_holdout_by_key[r["pairKey"]]["observableDistance"] for r in local_discovery],
    )
    top10_jaccard = jaccard(top_fraction(local_discovery, "observableDistance", 0.10), top_fraction(local_holdout, "observableDistance", 0.10))
    sensitivities = [float(r["sensitivity"]) for r in local_discovery]
    q50, q95 = quantile(sensitivities, 0.50), quantile(sensitivities, 0.95)

    topology_discovery = topology_geometry(discovery_topology_profiles, points, scales)
    topology_holdout = topology_geometry(holdout_topology_profiles, points, scales)
    cross_topology = cross_topology_geometry(discovery_topology_profiles, points, scales)
    spread = topology_spread(discovery_profiles, discovery_topology_profiles, scales)

    top_edges = sorted(local_discovery, key=lambda row: row["sensitivity"], reverse=True)[:8]
    top_edge_rows = []
    for edge in top_edges:
        h = local_holdout_by_key[edge["pairKey"]]
        top_edge_rows.append({
            "pairKey": edge["pairKey"], "leftRuleId": edge["leftRuleId"], "rightRuleId": edge["rightRuleId"],
            "ruleDistance": edge["ruleDistance"], "discoveryObservableDistance": edge["observableDistance"],
            "holdoutObservableDistance": h["observableDistance"], "discoverySensitivity": edge["sensitivity"],
            "holdoutSensitivity": h["sensitivity"],
        })

    report = {
        "schemaVersion": "entropy-rulial-network/1.0.0",
        "experimentId": "RUL-008",
        "ruleSpaceId": "RSPACE-NETWORK-001",
        "observerId": "OBSERVER-NETWORK-RULIAL-CORE",
        "sampling": {
            "design": "deterministic Latin hypercube in local-rule coordinates with fixed topology blocks",
            "lhsSeed": LHS_SEED,
            "pointCount": POINT_COUNT,
            "discoverySeeds": DISCOVERY_SEEDS,
            "validationSeeds": VALIDATION_SEEDS,
            "topologies": TOPOLOGIES,
            "dimensions": [{"name": n, "min": lo, "max": hi} for n, lo, hi in DIMENSIONS],
        },
        "simulation": {**CONFIG, "discoveryRunCount": len(discovery_runs), "holdoutRunCount": len(holdout_runs), "totalRunCount": len(discovery_runs) + len(holdout_runs)},
        "featureScaling": scales,
        "discovery": {
            "pairwiseRuleVsObservableSpearman": global_discovery,
            "localEdgeCount": len(local_discovery),
            "localSensitivityMedian": q50,
            "localSensitivityQ95": q95,
            "localSensitivityQ95OverMedian": q95 / max(q50, 1e-12),
            "topCandidateEdges": top_edge_rows,
        },
        "validation": {
            "pairwiseRuleVsObservableSpearman": global_holdout,
            "geometryStabilitySpearman": geometry_stability,
            "localEdgeStabilitySpearman": local_stability,
            "top10LocalEdgeJaccard": top10_jaccard,
        },
        "topologyBlocks": {
            "discovery": topology_discovery,
            "holdout": topology_holdout,
            "crossTopologyDiscovery": cross_topology,
            "spread": spread,
            "interpretation": "Topology is a blocked interaction-structure factor, not a coordinate in the RUL-008 rule metric. Aggregate profiles average over all three preregistered topology families.",
        },
        "interpretationBoundary": [
            "RUL-008 is a network-dynamics substrate benchmark, not evidence of universal rulial laws.",
            "Topology blocks are fixed before outcome analysis and are not tuned to improve replication metrics.",
            "The local rule-space metric covers threshold, coupling, memory, and stochastic temperature only.",
            "Macrostate thresholds are operational coarse-grainings of network activity and are not semantic PCC validation.",
            "Any future three-substrate comparison must reuse the already-frozen RUL-007 structural criteria without retuning them to RUL-008 outcomes.",
        ],
    }
    summary = {
        "schemaVersion": report["schemaVersion"],
        "experimentId": report["experimentId"],
        "ruleSpaceId": report["ruleSpaceId"],
        "observerId": report["observerId"],
        "sampling": report["sampling"],
        "simulation": report["simulation"],
        "discovery": report["discovery"],
        "validation": report["validation"],
        "topologyBlocks": report["topologyBlocks"],
        "interpretationBoundary": report["interpretationBoundary"],
    }

    (args.output_dir / "network-rulial-report.json").write_text(json.dumps(report, indent=2) + "\n")
    (args.output_dir / "network-rulial-summary.json").write_text(json.dumps(summary, indent=2) + "\n")

    profile_rows = []
    for p in discovery_profiles:
        profile_rows.append({"rule_id": p["ruleId"], **p["rule"], **p["features"]})
    write_csv(args.output_dir / "discovery-profiles.csv", profile_rows, ["rule_id", *[d[0] for d in DIMENSIONS], *list(discovery_profiles[0]["features"].keys())])

    holdout_profile_rows = []
    for p in holdout_profiles:
        holdout_profile_rows.append({"rule_id": p["ruleId"], **p["rule"], **p["features"]})
    write_csv(args.output_dir / "holdout-profiles.csv", holdout_profile_rows, ["rule_id", *[d[0] for d in DIMENSIONS], *list(holdout_profiles[0]["features"].keys())])

    write_csv(args.output_dir / "local-edges.csv", top_edge_rows, ["pairKey", "leftRuleId", "rightRuleId", "ruleDistance", "discoveryObservableDistance", "holdoutObservableDistance", "discoverySensitivity", "holdoutSensitivity"])

    topo_rows = []
    for row in discovery_topology_profiles:
        topo_rows.append({"rule_id": row["ruleId"], "topology": row["topology"], **row["features"]})
    write_csv(args.output_dir / "topology-profiles.csv", topo_rows, ["rule_id", "topology", *list(discovery_topology_profiles[0]["features"].keys())])

    digest = hashlib.sha256((args.output_dir / "network-rulial-report.json").read_bytes()).hexdigest()
    (args.output_dir / "sha256.txt").write_text(f"{digest}  network-rulial-report.json\n")

    print(json.dumps({
        "experimentId": "RUL-008", "points": POINT_COUNT, "discoveryRuns": len(discovery_runs), "holdoutRuns": len(holdout_runs),
        "globalDiscovery": global_discovery, "globalHoldout": global_holdout, "geometryStability": geometry_stability,
        "localStability": local_stability, "top10Jaccard": top10_jaccard, "q95OverMedian": q95 / max(q50, 1e-12),
        "topologyToLocalRuleDistanceRatio": spread["topologyToLocalRuleDistanceRatio"],
    }, indent=2))


if __name__ == "__main__":
    main()
