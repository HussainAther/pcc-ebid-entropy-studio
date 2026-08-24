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

EXPERIMENT_ID = "RUL-024"
OBSERVER_ID = "OBSERVER-ALIFE-INVASION-GRADIENT"
RULE_SPACE_ID = "RSPACE-ALIFE-001"
SOURCE = ROOT / "data" / "ruliology" / "alife-selection-control" / "alife-selection-control-report.json"
OUT = ROOT / "data" / "ruliology" / "alife-invasion-gradient"
STEP = 0.06
INVASION_FRACTION = 0.10
EPS = 1e-12


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < EPS or nb < EPS:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def main() -> None:
    source = json.loads(SOURCE.read_text())
    seeds = list(source["design"]["seeds"])
    cfg = dict(source["config"])
    scarcity_runs = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "scarcity_mutable"}
    neutral_runs = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "neutral_bottleneck_mutable"}

    probes: list[dict[str, Any]] = []
    seed_rows: list[dict[str, Any]] = []

    for seed in seeds:
        scarcity = scarcity_runs[seed]
        neutral = neutral_runs[seed]
        center = np.asarray(scarcity["preShockCentroid"], dtype=float)
        grad = np.zeros(len(RULE_DIMENSIONS), dtype=float)

        for dim, (name, _, _) in enumerate(RULE_DIMENSIONS):
            scores: dict[int, float] = {}
            for sign in (-1, 1):
                mutant = center.copy()
                mutant[dim] = float(np.clip(mutant[dim] + sign * STEP, 0.0, 1.0))
                actual_step = abs(float(mutant[dim] - center[dim]))
                probe_cfg = {
                    **cfg,
                    "invasion_mutant_rule_unit": mutant.tolist(),
                    "invasion_fraction": INVASION_FRACTION,
                    "freeze_mutation_after_invasion": True,
                }
                run = simulate_condition(seed, "scarcity_mutable", probe_cfg)
                score = float(run["invasionFrequencyChange"] or 0.0)
                scores[sign] = score
                probes.append({
                    "seed": seed,
                    "dimension": name,
                    "sign": sign,
                    "centerUnit": float(center[dim]),
                    "mutantUnit": float(mutant[dim]),
                    "actualStepUnit": actual_step,
                    "initialMutantFraction": run["invasionInitialFraction"],
                    "finalMutantFraction": run["invasionFinalFraction"],
                    "invasionFrequencyChange": score,
                    "extinct": bool(run["extinct"]),
                    "finalPopulation": int(run["finalPopulation"]),
                })

            plus_step = min(STEP, 1.0 - float(center[dim]))
            minus_step = min(STEP, float(center[dim]))
            denom = plus_step + minus_step
            grad[dim] = (scores[1] - scores[-1]) / denom if denom > EPS else 0.0

        scarcity_delta = np.asarray(scarcity["postShockDelta"], dtype=float)
        neutral_delta = np.asarray(neutral["postShockDelta"], dtype=float)
        scarcity_alignment = cosine(scarcity_delta, grad)
        neutral_alignment = cosine(neutral_delta, grad)
        seed_rows.append({
            "seed": seed,
            "gradient": grad.tolist(),
            "gradientNorm": float(np.linalg.norm(grad)),
            "scarcityAlignment": scarcity_alignment,
            "neutralAlignment": neutral_alignment,
            "scarcityMinusNeutralAlignment": scarcity_alignment - neutral_alignment,
            "scarcityPostShockDisplacement": float(scarcity["postShockDisplacement"]),
            "neutralPostShockDisplacement": float(neutral["postShockDisplacement"]),
        })

    scarcity_align = np.array([r["scarcityAlignment"] for r in seed_rows], dtype=float)
    neutral_align = np.array([r["neutralAlignment"] for r in seed_rows], dtype=float)
    paired = scarcity_align - neutral_align
    identifiable = sum(r["gradientNorm"] > 1e-9 for r in seed_rows)
    positive = int(np.sum(scarcity_align > 0))

    results = {
        "medianScarcityAlignment": float(np.median(scarcity_align)),
        "meanScarcityAlignment": float(np.mean(scarcity_align)),
        "medianNeutralAlignment": float(np.median(neutral_align)),
        "meanNeutralAlignment": float(np.mean(neutral_align)),
        "medianScarcityMinusNeutralAlignment": float(np.median(paired)),
        "meanScarcityMinusNeutralAlignment": float(np.mean(paired)),
        "positiveScarcityAlignmentCount": positive,
        "identifiableInvasionGradientCount": identifiable,
        "medianGradientNorm": float(np.median([r["gradientNorm"] for r in seed_rows])),
    }
    criteria = {
        "scarcityAlignsWithInvasionGradient": results["medianScarcityAlignment"] >= 0.10,
        "scarcityExceedsNeutralAlignment": results["medianScarcityMinusNeutralAlignment"] >= 0.10,
        "scarcityPositiveInTwoThirds": positive >= math.ceil((2 * len(seeds)) / 3),
        "invasionGradientIdentifiable": identifiable >= math.ceil((3 * len(seeds)) / 4),
    }

    report = {
        "schemaVersion": "entropy-rulial-alife-invasion-gradient/1.0.0",
        "experimentId": EXPERIMENT_ID,
        "ruleSpaceId": RULE_SPACE_ID,
        "observerId": OBSERVER_ID,
        "source": {
            "motionExperimentId": "RUL-021",
            "newMotionSimulations": 0,
            "newInvasionProbeSimulations": len(probes),
            "sourceArtifact": str(SOURCE.relative_to(ROOT)),
        },
        "design": {
            "seedCount": len(seeds),
            "seeds": seeds,
            "ruleDimensions": [d[0] for d in RULE_DIMENSIONS],
            "finiteDifferenceStepUnit": STEP,
            "invasionFraction": INVASION_FRACTION,
            "residentContext": "actual mixed pre-shock population generated by the matched seed-specific burn-in",
            "mutantIntroduction": "rule-blind sample of residents reassigned to the declared mutant rule at shock_step; tagged lineage inherited by descendants",
            "postIntroductionMutation": "disabled to preserve tagged mutant identity",
            "invasionScore": "final tagged-mutant frequency minus initial tagged-mutant frequency",
            "primaryCriteria": {
                "scarcityAlignsWithInvasionGradient": "median cosine >= 0.10",
                "scarcityExceedsNeutralAlignment": "median paired scarcity-minus-neutral cosine >= +0.10",
                "scarcityPositiveInTwoThirds": ">= 2/3 scarcity motion vectors have positive alignment",
                "invasionGradientIdentifiable": "nonzero gradient in >= 3/4 of seeds",
            },
        },
        "results": results,
        "primaryTest": {
            "criteria": criteria,
            "criteriaPassed": int(sum(criteria.values())),
            "criteriaTotal": len(criteria),
            "pilotSupported": bool(all(criteria.values())),
        },
        "interpretationBoundary": "This is an engineered frequency-dependent invasion proxy in a simulated ecology. It does not establish biological fitness, adaptation, or a universal selection gradient. A tagged-mutant frequency change can reflect ecological interactions, finite-population drift, and demographic effects.",
        "seedAlignments": seed_rows,
        "probes": probes,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "alife-invasion-gradient-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    summary = {k: report[k] for k in ["schemaVersion", "experimentId", "ruleSpaceId", "observerId", "source", "design", "results", "primaryTest", "interpretationBoundary"]}
    (OUT / "alife-invasion-gradient-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")

    with (OUT / "seed-invasion-alignment.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["seed", "gradient_norm", "scarcity_alignment", "neutral_alignment", "scarcity_minus_neutral_alignment"])
        for r in seed_rows:
            w.writerow([r["seed"], r["gradientNorm"], r["scarcityAlignment"], r["neutralAlignment"], r["scarcityMinusNeutralAlignment"]])

    with (OUT / "invasion-probes.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["seed", "dimension", "sign", "center_unit", "mutant_unit", "actual_step_unit", "initial_mutant_fraction", "final_mutant_fraction", "frequency_change", "extinct", "final_population"])
        for r in probes:
            w.writerow([r["seed"], r["dimension"], r["sign"], r["centerUnit"], r["mutantUnit"], r["actualStepUnit"], r["initialMutantFraction"], r["finalMutantFraction"], r["invasionFrequencyChange"], r["extinct"], r["finalPopulation"]])

    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (OUT / "sha256.txt").write_text(f"{digest}  {report_path.name}\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
