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

EXPERIMENT_ID = "RUL-025"
OBSERVER_ID = "OBSERVER-ALIFE-LINEAGE-MOTION"
RULE_SPACE_ID = "RSPACE-ALIFE-001"
SOURCE = ROOT / "data" / "ruliology" / "alife-selection-control" / "alife-selection-control-report.json"
OUT = ROOT / "data" / "ruliology" / "alife-lineage-motion"
EPS = 1e-12


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < EPS or nb < EPS:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def find_snapshot(run: dict[str, Any], step: int | None = None, final: bool = False) -> dict[str, Any]:
    rows = [r for r in run["history"] if "lineages" in r]
    if final:
        return rows[-1]
    matches = [r for r in rows if int(r["step"]) <= int(step)]
    if not matches:
        raise RuntimeError(f"no lineage snapshot at or before step {step}")
    return matches[-1]


def decompose_run(run: dict[str, Any], shock_step: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    pre = find_snapshot(run, shock_step - 1)
    final = find_snapshot(run, final=True)
    pre_by = {int(x["founderId"]): x for x in pre["lineages"]}
    final_by = {int(x["founderId"]): x for x in final["lineages"]}
    founder_ids = sorted(pre_by)

    within = np.zeros(len(RULE_DIMENSIONS), dtype=float)
    reweight = np.zeros(len(RULE_DIMENSIONS), dtype=float)
    lineage_rows: list[dict[str, Any]] = []
    moving_deltas: list[np.ndarray] = []
    moving_weights: list[float] = []

    for founder in founder_ids:
        a = pre_by[founder]
        b = final_by.get(founder)
        p0 = float(a["fraction"])
        p1 = float(b["fraction"]) if b else 0.0
        mu0 = np.asarray(a["ruleCentroid"], dtype=float)
        # An extinct lineage has no final centroid.  Holding its centroid fixed makes
        # its disappearance enter entirely through the between-lineage reweighting term.
        mu1 = np.asarray(b["ruleCentroid"], dtype=float) if b else mu0.copy()
        dmu = mu1 - mu0
        within += 0.5 * (p0 + p1) * dmu
        reweight += (p1 - p0) * 0.5 * (mu0 + mu1)
        if b is not None and np.linalg.norm(dmu) > EPS:
            moving_deltas.append(dmu)
            moving_weights.append(p1)
        lineage_rows.append({
            "condition": run["condition"],
            "seed": int(run["seed"]),
            "founderId": founder,
            "preCount": int(a["count"]),
            "finalCount": int(b["count"]) if b else 0,
            "preFraction": p0,
            "finalFraction": p1,
            "survived": b is not None,
            "preCentroid": mu0.tolist(),
            "finalCentroid": mu1.tolist() if b else None,
            "withinLineageDelta": dmu.tolist(),
            "withinLineageDistance": float(np.linalg.norm(dmu)),
        })

    total = np.asarray(run["postShockDelta"], dtype=float)
    reconstructed = within + reweight
    error = float(np.linalg.norm(reconstructed - total))
    denom = float(np.linalg.norm(within) + np.linalg.norm(reweight))
    reweight_share = float(np.linalg.norm(reweight) / denom) if denom > EPS else 0.0
    within_share = float(np.linalg.norm(within) / denom) if denom > EPS else 0.0

    pair_cos: list[float] = []
    if len(moving_deltas) >= 2:
        for i in range(len(moving_deltas)):
            for j in range(i + 1, len(moving_deltas)):
                pair_cos.append(cosine(moving_deltas[i], moving_deltas[j]))
    coherence = float(np.mean(pair_cos)) if pair_cos else 0.0

    pre_hhi = float(sum(float(x["fraction"]) ** 2 for x in pre["lineages"]))
    final_hhi = float(sum(float(x["fraction"]) ** 2 for x in final["lineages"]))
    final_fracs = sorted((float(x["fraction"]) for x in final["lineages"]), reverse=True)

    row = {
        "condition": run["condition"],
        "seed": int(run["seed"]),
        "preLineageCount": len(pre["lineages"]),
        "finalLineageCount": len(final["lineages"]),
        "movingSurvivorLineageCount": len(moving_deltas),
        "postShockDelta": total.tolist(),
        "withinLineageVector": within.tolist(),
        "reweightingVector": reweight.tolist(),
        "reconstructedDelta": reconstructed.tolist(),
        "decompositionError": error,
        "withinLineageNorm": float(np.linalg.norm(within)),
        "reweightingNorm": float(np.linalg.norm(reweight)),
        "withinLineageNormShare": within_share,
        "reweightingNormShare": reweight_share,
        "withinAlignmentWithTotal": cosine(within, total),
        "reweightingAlignmentWithTotal": cosine(reweight, total),
        "lineageDirectionalCoherence": coherence,
        "preLineageHHI": pre_hhi,
        "finalLineageHHI": final_hhi,
        "lineageHHIChange": final_hhi - pre_hhi,
        "top3FinalLineageFraction": float(sum(final_fracs[:3])),
    }
    return row, lineage_rows


def summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "runCount": len(rows),
        "medianReweightingNormShare": float(np.median([r["reweightingNormShare"] for r in rows])),
        "medianWithinLineageNormShare": float(np.median([r["withinLineageNormShare"] for r in rows])),
        "medianLineageDirectionalCoherence": float(np.median([r["lineageDirectionalCoherence"] for r in rows])),
        "medianFinalLineageCount": float(np.median([r["finalLineageCount"] for r in rows])),
        "medianTop3FinalLineageFraction": float(np.median([r["top3FinalLineageFraction"] for r in rows])),
        "medianLineageHHIChange": float(np.median([r["lineageHHIChange"] for r in rows])),
        "maxDecompositionError": float(max(r["decompositionError"] for r in rows)),
    }


def main() -> None:
    source = json.loads(SOURCE.read_text())
    seeds = [int(x) for x in source["design"]["seeds"]]
    cfg = {**source["config"], "record_lineages": True}
    shock_step = int(cfg["shock_step"])
    src_scarcity = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "scarcity_mutable"}
    src_neutral = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "neutral_bottleneck_mutable"}

    replay_rows: list[dict[str, Any]] = []
    lineage_rows: list[dict[str, Any]] = []
    replay_checks: list[dict[str, Any]] = []

    for seed in seeds:
        scarcity = simulate_condition(seed, "scarcity_mutable", cfg)
        neutral_cfg = {**cfg, "neutral_bottleneck_fraction": float(src_scarcity[seed]["bottleneckFraction"])}
        neutral = simulate_condition(seed, "neutral_bottleneck_mutable", neutral_cfg)
        for run, src in ((scarcity, src_scarcity[seed]), (neutral, src_neutral[seed])):
            row, lineages = decompose_run(run, shock_step)
            replay_rows.append(row)
            lineage_rows.extend(lineages)
            replay_checks.append({
                "seed": seed,
                "condition": run["condition"],
                "finalPopulationMatch": int(run["finalPopulation"]) == int(src["finalPopulation"]),
                "postShockDeltaMaxAbsError": float(np.max(np.abs(np.asarray(run["postShockDelta"]) - np.asarray(src["postShockDelta"])))),
                "bottleneckFractionAbsError": abs(float(run["bottleneckFraction"]) - float(src["bottleneckFraction"])),
            })

    scarcity_rows = [r for r in replay_rows if r["condition"] == "scarcity_mutable"]
    neutral_rows = [r for r in replay_rows if r["condition"] == "neutral_bottleneck_mutable"]
    scarcity_summary = summary(scarcity_rows)
    neutral_summary = summary(neutral_rows)
    paired_share = np.array([s["reweightingNormShare"] - n["reweightingNormShare"] for s, n in zip(scarcity_rows, neutral_rows)], dtype=float)
    identifiable = sum(r["movingSurvivorLineageCount"] >= 3 for r in scarcity_rows)
    max_replay_delta_error = max(r["postShockDeltaMaxAbsError"] for r in replay_checks)
    all_pop_match = all(r["finalPopulationMatch"] for r in replay_checks)

    results = {
        "scarcity": scarcity_summary,
        "neutral": neutral_summary,
        "medianScarcityMinusNeutralReweightingShare": float(np.median(paired_share)),
        "scarcityRunsWithAtLeastThreeMovingSurvivorLineages": identifiable,
        "maxReplayPostShockDeltaAbsError": float(max_replay_delta_error),
        "allReplayFinalPopulationsMatch": bool(all_pop_match),
    }
    criteria = {
        "exactCentroidDecomposition": max(scarcity_summary["maxDecompositionError"], neutral_summary["maxDecompositionError"]) <= 1e-9,
        "scarcityMostlyReweighting": scarcity_summary["medianReweightingNormShare"] >= 0.60,
        "scarcityExceedsNeutralReweighting": results["medianScarcityMinusNeutralReweightingShare"] >= 0.10,
        "scarcityLineageDirectionsHeterogeneousAndIdentifiable": scarcity_summary["medianLineageDirectionalCoherence"] <= 0.50 and identifiable >= math.ceil(3 * len(seeds) / 4),
        "deterministicReplayMatchesRUL021": max_replay_delta_error <= 1e-12 and all_pop_match,
    }

    report = {
        "schemaVersion": "entropy-rulial-alife-lineage-motion/1.0.0",
        "experimentId": EXPERIMENT_ID,
        "ruleSpaceId": RULE_SPACE_ID,
        "observerId": OBSERVER_ID,
        "source": {
            "motionExperimentId": "RUL-021",
            "sourceArtifact": str(SOURCE.relative_to(ROOT)),
            "newUniqueSimulationConditions": 0,
            "deterministicReplayRuns": len(replay_checks),
            "replayPurpose": "non-invasive founder-lineage logging; no new parameter/seed conditions",
        },
        "design": {
            "seedCount": len(seeds),
            "seeds": seeds,
            "conditions": ["scarcity_mutable", "neutral_bottleneck_mutable"],
            "ruleDimensions": [d[0] for d in RULE_DIMENSIONS],
            "burnInSteps": shock_step,
            "decomposition": "Delta_mu = sum_l 0.5(p0_l+p1_l)(mu1_l-mu0_l) + sum_l (p1_l-p0_l)0.5(mu0_l+mu1_l)",
            "extinctLineageConvention": "for lineages absent at final time, set mu1_l = mu0_l so disappearance is attributed entirely to reweighting",
            "primaryCriteria": {
                "exactCentroidDecomposition": "maximum vector reconstruction error <= 1e-9",
                "scarcityMostlyReweighting": "median scarcity reweighting norm share >= 0.60",
                "scarcityExceedsNeutralReweighting": "median paired scarcity-minus-neutral reweighting norm share >= +0.10",
                "scarcityLineageDirectionsHeterogeneousAndIdentifiable": "median pairwise within-lineage direction cosine <= 0.50 and >= 3 moving surviving lineages in at least 3/4 seeds",
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
        "interpretationBoundary": "RUL-025 is a lineage-resolved decomposition of the engineered RUL-021 ALife system. Founder labels are bookkeeping identities, and the symmetric within-lineage/reweighting decomposition is descriptive rather than a biological Price-equation claim. A large reweighting term does not by itself establish natural selection.",
        "runDecompositions": replay_rows,
        "replayChecks": replay_checks,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "alife-lineage-motion-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    summary_obj = {k: report[k] for k in ["schemaVersion", "experimentId", "ruleSpaceId", "observerId", "source", "design", "results", "primaryTest", "interpretationBoundary"]}
    (OUT / "alife-lineage-motion-summary.json").write_text(json.dumps(summary_obj, indent=2, sort_keys=True) + "\n")

    with (OUT / "run-decomposition.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["condition", "seed", "pre_lineages", "final_lineages", "moving_survivor_lineages", "reweighting_norm_share", "within_norm_share", "lineage_directional_coherence", "pre_hhi", "final_hhi", "top3_final_fraction", "decomposition_error"])
        for r in replay_rows:
            w.writerow([r["condition"], r["seed"], r["preLineageCount"], r["finalLineageCount"], r["movingSurvivorLineageCount"], r["reweightingNormShare"], r["withinLineageNormShare"], r["lineageDirectionalCoherence"], r["preLineageHHI"], r["finalLineageHHI"], r["top3FinalLineageFraction"], r["decompositionError"]])

    with (OUT / "lineage-endpoints.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["condition", "seed", "founder_id", "pre_count", "final_count", "pre_fraction", "final_fraction", "survived", "within_lineage_distance"])
        for r in lineage_rows:
            w.writerow([r["condition"], r["seed"], r["founderId"], r["preCount"], r["finalCount"], r["preFraction"], r["finalFraction"], r["survived"], r["withinLineageDistance"]])

    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (OUT / "sha256.txt").write_text(f"{digest}  {report_path.name}\n")
    print(json.dumps(summary_obj, indent=2))


if __name__ == "__main__":
    main()
