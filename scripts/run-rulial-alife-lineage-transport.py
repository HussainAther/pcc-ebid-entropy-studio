#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "rulial-alife"))

from alife_rulial.run import RULE_DIMENSIONS, simulate_condition  # noqa: E402

EXPERIMENT_ID = "RUL-026"
OBSERVER_ID = "OBSERVER-ALIFE-LINEAGE-TRANSPORT"
RULE_SPACE_ID = "RSPACE-ALIFE-001"
SOURCE = ROOT / "data" / "ruliology" / "alife-selection-control" / "alife-selection-control-report.json"
OUT = ROOT / "data" / "ruliology" / "alife-lineage-transport"
EPS = 1e-12


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < EPS or nb < EPS:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def interval_decomposition(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    a_by = {int(x["founderId"]): x for x in a["lineages"]}
    b_by = {int(x["founderId"]): x for x in b["lineages"]}
    founders = sorted(set(a_by) | set(b_by))
    within = np.zeros(len(RULE_DIMENSIONS), dtype=float)
    reweight = np.zeros(len(RULE_DIMENSIONS), dtype=float)
    tv = 0.0
    for founder in founders:
        aa = a_by.get(founder)
        bb = b_by.get(founder)
        if aa is None:
            # Founder labels cannot reappear in this engine, but keep the algebra total.
            mu1 = np.asarray(bb["ruleCentroid"], dtype=float)
            mu0 = mu1.copy()
            p0 = 0.0
            p1 = float(bb["fraction"])
        elif bb is None:
            mu0 = np.asarray(aa["ruleCentroid"], dtype=float)
            mu1 = mu0.copy()
            p0 = float(aa["fraction"])
            p1 = 0.0
        else:
            mu0 = np.asarray(aa["ruleCentroid"], dtype=float)
            mu1 = np.asarray(bb["ruleCentroid"], dtype=float)
            p0 = float(aa["fraction"])
            p1 = float(bb["fraction"])
        within += 0.5 * (p0 + p1) * (mu1 - mu0)
        reweight += (p1 - p0) * 0.5 * (mu0 + mu1)
        tv += abs(p1 - p0)

    total = np.asarray(b["ruleCentroid"], dtype=float) - np.asarray(a["ruleCentroid"], dtype=float)
    reconstructed = within + reweight
    return {
        "stepStart": int(a["step"]),
        "stepEnd": int(b["step"]),
        "totalVector": total.tolist(),
        "withinVector": within.tolist(),
        "reweightingVector": reweight.tolist(),
        "totalNorm": float(np.linalg.norm(total)),
        "withinNorm": float(np.linalg.norm(within)),
        "reweightingNorm": float(np.linalg.norm(reweight)),
        "decompositionError": float(np.linalg.norm(reconstructed - total)),
        "lineageTurnoverTV": float(0.5 * tv),
        "lineageCountStart": len(a_by),
        "lineageCountEnd": len(b_by),
    }


def analyze_run(run: dict[str, Any], shock_step: int) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    snapshots = [r for r in run["history"] if "lineages" in r and int(r["step"]) >= shock_step - 1]
    if len(snapshots) < 2:
        raise RuntimeError("insufficient post-shock lineage snapshots")

    intervals: list[dict[str, Any]] = []
    for a, b in zip(snapshots[:-1], snapshots[1:]):
        row = interval_decomposition(a, b)
        row.update({"condition": run["condition"], "seed": int(run["seed"])})
        intervals.append(row)

    total_path = float(sum(x["totalNorm"] for x in intervals))
    within_path = float(sum(x["withinNorm"] for x in intervals))
    reweight_path = float(sum(x["reweightingNorm"] for x in intervals))
    denom = within_path + reweight_path
    reweight_share = reweight_path / denom if denom > EPS else 0.0

    endpoint = np.asarray(run["postShockDelta"], dtype=float)
    centroid_tortuosity = total_path / max(float(np.linalg.norm(endpoint)), EPS)
    sum_reweight = np.sum([np.asarray(x["reweightingVector"], dtype=float) for x in intervals], axis=0)
    reweight_tortuosity = reweight_path / max(float(np.linalg.norm(sum_reweight)), EPS)
    cumulative_turnover = float(sum(x["lineageTurnoverTV"] for x in intervals))

    dominant_ids: list[int] = []
    snapshot_rows: list[dict[str, Any]] = []
    lineage_max: dict[int, float] = {}
    for snap in snapshots:
        lineages = snap["lineages"]
        dominant = max(lineages, key=lambda x: (float(x["fraction"]), -int(x["founderId"]))) if lineages else None
        dominant_id = int(dominant["founderId"]) if dominant else -1
        dominant_ids.append(dominant_id)
        for lin in lineages:
            fid = int(lin["founderId"])
            lineage_max[fid] = max(lineage_max.get(fid, 0.0), float(lin["fraction"]))
        snapshot_rows.append({
            "condition": run["condition"],
            "seed": int(run["seed"]),
            "step": int(snap["step"]),
            "population": int(snap["population"]),
            "lineageCount": len(lineages),
            "dominantFounderId": dominant_id,
            "dominantFraction": float(dominant["fraction"]) if dominant else 0.0,
            "lineageHHI": float(sum(float(x["fraction"]) ** 2 for x in lineages)),
        })

    switches = sum(a != b for a, b in zip(dominant_ids[:-1], dominant_ids[1:]))
    unique_dominants = len(set(dominant_ids))
    final_by = {int(x["founderId"]): float(x["fraction"]) for x in snapshots[-1]["lineages"]}
    transient_sweeps = sum(1 for fid, mx in lineage_max.items() if mx >= 0.25 and final_by.get(fid, 0.0) <= 0.10)
    reversal_cos = []
    vecs = [np.asarray(x["totalVector"], dtype=float) for x in intervals]
    for x, y in zip(vecs[:-1], vecs[1:]):
        if np.linalg.norm(x) > EPS and np.linalg.norm(y) > EPS:
            reversal_cos.append(cosine(x, y))
    reversal_fraction = float(np.mean(np.asarray(reversal_cos) < 0.0)) if reversal_cos else 0.0

    summary = {
        "condition": run["condition"],
        "seed": int(run["seed"]),
        "snapshotCount": len(snapshots),
        "intervalCount": len(intervals),
        "cumulativeCentroidPath": total_path,
        "cumulativeWithinLineagePath": within_path,
        "cumulativeReweightingPath": reweight_path,
        "cumulativeReweightingShare": float(reweight_share),
        "centroidPathTortuosity": float(centroid_tortuosity),
        "reweightingPathTortuosity": float(reweight_tortuosity),
        "cumulativeLineageTurnoverTV": cumulative_turnover,
        "dominantLineageSwitchCount": int(switches),
        "uniqueDominantLineageCount": int(unique_dominants),
        "transientSweepCount": int(transient_sweeps),
        "centroidStepReversalFraction": reversal_fraction,
        "maxIntervalDecompositionError": float(max(x["decompositionError"] for x in intervals)),
    }
    return summary, intervals, snapshot_rows


def cond_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    keys = [
        "cumulativeReweightingShare", "centroidPathTortuosity", "reweightingPathTortuosity",
        "cumulativeLineageTurnoverTV", "dominantLineageSwitchCount", "uniqueDominantLineageCount",
        "transientSweepCount", "centroidStepReversalFraction",
    ]
    out = {"runCount": len(rows)}
    for key in keys:
        out["median" + key[0].upper() + key[1:]] = float(np.median([r[key] for r in rows]))
    out["runsWithDominantLineageSwitch"] = int(sum(r["dominantLineageSwitchCount"] >= 1 for r in rows))
    out["runsWithTransientSweep"] = int(sum(r["transientSweepCount"] >= 1 for r in rows))
    out["maxIntervalDecompositionError"] = float(max(r["maxIntervalDecompositionError"] for r in rows))
    return out


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for row in rows:
            w.writerow({k: json.dumps(v, separators=(",", ":")) if isinstance(v, (list, dict)) else v for k, v in row.items()})


def main() -> None:
    source = json.loads(SOURCE.read_text())
    seeds = [int(x) for x in source["design"]["seeds"]]
    cfg = {**source["config"], "record_lineages": True}
    shock_step = int(cfg["shock_step"])
    src_scarcity = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "scarcity_mutable"}
    src_neutral = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "neutral_bottleneck_mutable"}

    run_rows: list[dict[str, Any]] = []
    interval_rows: list[dict[str, Any]] = []
    snapshot_rows: list[dict[str, Any]] = []
    replay_checks: list[dict[str, Any]] = []

    for seed in seeds:
        scarcity = simulate_condition(seed, "scarcity_mutable", cfg)
        neutral_cfg = {**cfg, "neutral_bottleneck_fraction": float(src_scarcity[seed]["bottleneckFraction"])}
        neutral = simulate_condition(seed, "neutral_bottleneck_mutable", neutral_cfg)
        for run, src in ((scarcity, src_scarcity[seed]), (neutral, src_neutral[seed])):
            rr, ii, ss = analyze_run(run, shock_step)
            run_rows.append(rr)
            interval_rows.extend(ii)
            snapshot_rows.extend(ss)
            replay_checks.append({
                "condition": run["condition"], "seed": seed,
                "finalPopulationMatch": int(run["finalPopulation"]) == int(src["finalPopulation"]),
                "postShockDeltaMaxAbsError": float(np.max(np.abs(np.asarray(run["postShockDelta"]) - np.asarray(src["postShockDelta"])))),
            })

    scarcity_rows = [r for r in run_rows if r["condition"] == "scarcity_mutable"]
    neutral_rows = [r for r in run_rows if r["condition"] == "neutral_bottleneck_mutable"]
    scarcity_summary = cond_summary(scarcity_rows)
    neutral_summary = cond_summary(neutral_rows)
    paired_turnover = [s["cumulativeLineageTurnoverTV"] - n["cumulativeLineageTurnoverTV"] for s, n in zip(scarcity_rows, neutral_rows)]
    max_replay_error = max(x["postShockDeltaMaxAbsError"] for x in replay_checks)
    all_pop_match = all(x["finalPopulationMatch"] for x in replay_checks)

    results = {
        "scarcity": scarcity_summary,
        "neutral": neutral_summary,
        "medianScarcityMinusNeutralCumulativeTurnover": float(np.median(paired_turnover)),
        "maxReplayPostShockDeltaAbsError": float(max_replay_error),
        "allReplayFinalPopulationsMatch": bool(all_pop_match),
    }
    criteria = {
        "exactIntervalDecomposition": max(scarcity_summary["maxIntervalDecompositionError"], neutral_summary["maxIntervalDecompositionError"]) <= 1e-9,
        "scarcityCumulativeTransportMostlyReweighting": scarcity_summary["medianCumulativeReweightingShare"] >= 0.60,
        "scarcityReweightingPathIsNontrivial": scarcity_summary["medianReweightingPathTortuosity"] >= 1.50,
        "scarcityShowsSequentialDominance": scarcity_summary["runsWithDominantLineageSwitch"] >= math.ceil(len(seeds) / 2),
        "scarcityExceedsNeutralTemporalTurnover": results["medianScarcityMinusNeutralCumulativeTurnover"] >= 0.10,
        "deterministicReplayMatchesRUL021": max_replay_error <= 1e-12 and all_pop_match,
    }

    report = {
        "schemaVersion": "entropy-rulial-alife-lineage-transport/1.0.0",
        "experimentId": EXPERIMENT_ID,
        "ruleSpaceId": RULE_SPACE_ID,
        "observerId": OBSERVER_ID,
        "source": {
            "motionExperimentId": "RUL-021",
            "endpointExperimentId": "RUL-025",
            "sourceArtifact": str(SOURCE.relative_to(ROOT)),
            "newUniqueSimulationConditions": 0,
            "deterministicReplayRuns": len(replay_checks),
            "replayPurpose": "time-resolved non-invasive founder-lineage transport logging on frozen RUL-021 conditions",
        },
        "design": {
            "seedCount": len(seeds), "seeds": seeds,
            "conditions": ["scarcity_mutable", "neutral_bottleneck_mutable"],
            "burnInSteps": shock_step,
            "postShockSteps": int(cfg["steps"]) - shock_step,
            "recordEvery": int(cfg["record_every"]),
            "ruleDimensions": [d[0] for d in RULE_DIMENSIONS],
            "intervalDecomposition": "Delta_mu_t = W_t + B_t using the symmetric lineage decomposition on every adjacent recorded snapshot",
            "primaryCriteria": {
                "exactIntervalDecomposition": "maximum interval reconstruction error <= 1e-9",
                "scarcityCumulativeTransportMostlyReweighting": "median cumulative scarcity reweighting path share >= 0.60",
                "scarcityReweightingPathIsNontrivial": "median scarcity cumulative reweighting path / norm(net reweighting vector) >= 1.50",
                "scarcityShowsSequentialDominance": "at least half of scarcity seeds change dominant founder lineage at least once post-shock",
                "scarcityExceedsNeutralTemporalTurnover": "median paired scarcity-minus-neutral cumulative lineage total-variation turnover >= +0.10",
                "deterministicReplayMatchesRUL021": "replayed post-shock deltas match source within 1e-12 and all final populations match",
            },
        },
        "results": results,
        "primaryTest": {
            "criteria": criteria,
            "criteriaPassed": int(sum(criteria.values())),
            "criteriaTotal": len(criteria),
            "pilotSupported": bool(all(criteria.values())),
        },
        "interpretationBoundary": "RUL-026 is a time-resolved descriptive transport analysis of founder-lineage mass in the engineered ALife system. Sequential dominance, turnover, and path tortuosity do not by themselves establish adaptive selection, and scarcity-specific claims require comparison with the matched neutral bottleneck.",
        "runs": run_rows,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "alife-lineage-transport-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    summary = {k: v for k, v in report.items() if k != "runs"}
    (OUT / "alife-lineage-transport-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    write_csv(OUT / "run-transport-summary.csv", run_rows)
    write_csv(OUT / "interval-transport.csv", interval_rows)
    write_csv(OUT / "lineage-snapshot-summary.csv", snapshot_rows)
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (OUT / "sha256.txt").write_text(f"{digest}  {report_path.name}\n")
    print(json.dumps({"experimentId": EXPERIMENT_ID, "results": results, "primaryTest": report["primaryTest"], "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
