#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def write_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def network_metrics(summary: dict[str, Any]) -> dict[str, Any]:
    d = summary["discovery"]
    v = summary["validation"]
    return {
        "substrate": "Network",
        "discoveryRunCount": int(summary["simulation"]["discoveryRunCount"]),
        "holdoutRunCount": int(summary["simulation"]["holdoutRunCount"]),
        "rulePairCount": 24 * 23 // 2,
        "localEdgeCount": int(d["localEdgeCount"]),
        "globalRuleObservableSpearmanDiscovery": float(d["pairwiseRuleVsObservableSpearman"]),
        "globalRuleObservableSpearmanHoldout": float(v["pairwiseRuleVsObservableSpearman"]),
        "geometryStabilitySpearman": float(v["geometryStabilitySpearman"]),
        "localEdgeStabilitySpearman": float(v["localEdgeStabilitySpearman"]),
        "top10LocalEdgeJaccard": float(v["top10LocalEdgeJaccard"]),
        "localSensitivity": {
            "median": float(d["localSensitivityMedian"]),
            "q95": float(d["localSensitivityQ95"]),
            "q95OverMedian": float(d["localSensitivityQ95OverMedian"]),
        },
    }


def criterion_result(metric: dict[str, Any], criterion: str) -> bool:
    if criterion == "positiveGlobalRuleObservableAssociation":
        return float(metric["globalRuleObservableSpearmanDiscovery"]) > 0
    if criterion == "reproducibleObservableGeometry":
        return float(metric["geometryStabilitySpearman"]) >= 0.70
    if criterion == "reproducibleLocalGeometry":
        return float(metric["localEdgeStabilitySpearman"]) >= 0.70
    if criterion == "localSensitivityTail":
        return float(metric["localSensitivity"]["q95OverMedian"]) >= 1.5
    if criterion == "topTailBoundaryReplication":
        return float(metric["top10LocalEdgeJaccard"]) >= 0.50
    raise KeyError(criterion)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RUL-009 frozen three-substrate challenge.")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data" / "ruliology" / "three-substrate")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    rul007 = read_json(ROOT / "data" / "ruliology" / "cross-substrate" / "cross-substrate-report.json")
    rul008 = read_json(ROOT / "data" / "ruliology" / "network-rulial" / "network-rulial-summary.json")

    # RUL-009 is deliberately analysis-only: the two prior ECA/Boids metrics are reused
    # verbatim from the frozen RUL-007 report, and the Network metrics are projected into
    # that exact five-criterion contract without retuning thresholds after RUL-008.
    eca = next(item for item in rul007["substrates"] if item["substrate"] == "ECA")
    boids = next(item for item in rul007["substrates"] if item["substrate"] == "Boids")
    network = network_metrics(rul008)
    substrates = [eca, boids, network]

    frozen = rul007["challenge"]["criteria"]
    criteria: dict[str, Any] = {}
    for criterion_id, old in frozen.items():
        per_substrate = {m["substrate"]: criterion_result(m, criterion_id) for m in substrates}
        pass_count = sum(per_substrate.values())
        criteria[criterion_id] = {
            "definition": old["definition"],
            "thresholdSource": "RUL-007 frozen contract",
            "substrates": per_substrate,
            "passCount": pass_count,
            "substrateCount": len(substrates),
            "allSubstratesPass": pass_count == len(substrates),
            "status": "retained-all" if pass_count == len(substrates) else "challenged",
        }

    substrate_pass_counts = {
        metric["substrate"]: sum(criterion["substrates"][metric["substrate"]] for criterion in criteria.values())
        for metric in substrates
    }
    all_pass_count = sum(c["allSubstratesPass"] for c in criteria.values())
    two_or_more_count = sum(c["passCount"] >= 2 for c in criteria.values())

    report = {
        "schemaVersion": "entropy-rulial-three-substrate/1.0.0",
        "experimentId": "RUL-009",
        "title": "Frozen Three-Substrate Rulial Structure Challenge",
        "generatedAt": "2026-08-24T21:30:00.000Z",
        "sourceExperiments": ["RUL-007", "RUL-008"],
        "newSimulationRunCount": 0,
        "substrates": substrates,
        "challenge": {
            "criterionCount": len(criteria),
            "substrateCount": len(substrates),
            "allSubstratePassCount": all_pass_count,
            "criteriaPassingAtLeastTwoSubstrates": two_or_more_count,
            "allCriteriaPassAllSubstrates": all_pass_count == len(criteria),
            "substratePassCounts": substrate_pass_counts,
            "criteria": criteria,
        },
        "pattern": {
            "allThree": [key for key, value in criteria.items() if value["allSubstratesPass"]],
            "ecaAndNetworkOnly": [key for key, value in criteria.items() if value["substrates"] == {"ECA": True, "Boids": False, "Network": True}],
            "interpretation": "Under the unchanged RUL-007 thresholds, ECA and Network satisfy all five structural criteria, while Boids satisfies two. The two properties retained across all three are positive global rule/observable association and a heterogeneous local-sensitivity tail. This is a three-substrate pattern, not a universality theorem.",
        },
        "frozenContract": {
            "origin": "RUL-007",
            "rule": "No metric, neighborhood, threshold, or pass criterion is changed after observing RUL-008.",
            "criteria": {key: value["definition"] for key, value in frozen.items()},
        },
        "interpretationBoundary": [
            "RUL-009 adds no new simulations; it is a prospective extension of the already-frozen RUL-007 structural contract to the independently built RUL-008 network substrate.",
            "Two of five criteria pass in all three substrates. This does not establish rulial universality.",
            "ECA and Network passing all five while Boids passes two may reflect deterministic versus stochastic sampling, design density, substrate dynamics, observer choice, or other factors; RUL-009 does not identify the cause.",
            "The common local-sensitivity-tail criterion is distributional and does not imply that particular phase boundaries or rule identities transfer across substrates.",
            "Future substrates must either reuse this versioned contract unchanged or declare a new contract version before results are examined.",
        ],
    }

    summary = {
        "schemaVersion": "entropy-rulial-three-substrate-summary/1.0.0",
        "experimentId": report["experimentId"],
        "generatedAt": report["generatedAt"],
        "newSimulationRunCount": 0,
        "substrates": substrates,
        "challenge": report["challenge"],
        "pattern": report["pattern"],
        "interpretationBoundary": report["interpretationBoundary"],
    }

    report_path = args.output_dir / "three-substrate-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    (args.output_dir / "three-substrate-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")

    write_csv(
        args.output_dir / "substrate-metrics.csv",
        [{
            "substrate": m["substrate"],
            "global_rho_discovery": m["globalRuleObservableSpearmanDiscovery"],
            "global_rho_holdout": m["globalRuleObservableSpearmanHoldout"],
            "geometry_stability_rho": m["geometryStabilitySpearman"],
            "local_edge_stability_rho": m["localEdgeStabilitySpearman"],
            "top10_local_edge_jaccard": m["top10LocalEdgeJaccard"],
            "local_sensitivity_q95_over_median": m["localSensitivity"]["q95OverMedian"],
            "criteria_passed": substrate_pass_counts[m["substrate"]],
        } for m in substrates],
        ["substrate", "global_rho_discovery", "global_rho_holdout", "geometry_stability_rho", "local_edge_stability_rho", "top10_local_edge_jaccard", "local_sensitivity_q95_over_median", "criteria_passed"],
    )

    criterion_rows = []
    for key, c in criteria.items():
        criterion_rows.append({
            "criterion": key,
            "eca": c["substrates"]["ECA"],
            "boids": c["substrates"]["Boids"],
            "network": c["substrates"]["Network"],
            "pass_count": c["passCount"],
            "all_substrates_pass": c["allSubstratesPass"],
        })
    write_csv(args.output_dir / "criterion-matrix.csv", criterion_rows, ["criterion", "eca", "boids", "network", "pass_count", "all_substrates_pass"])

    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (args.output_dir / "sha256.txt").write_text(f"{digest}  three-substrate-report.json\n")

    print(json.dumps({
        "experimentId": "RUL-009",
        "newSimulationRunCount": 0,
        "allSubstrateCriteriaPassed": all_pass_count,
        "criterionCount": len(criteria),
        "substratePassCounts": substrate_pass_counts,
        "allThree": report["pattern"]["allThree"],
        "ecaAndNetworkOnly": report["pattern"]["ecaAndNetworkOnly"],
    }, indent=2))


if __name__ == "__main__":
    main()
