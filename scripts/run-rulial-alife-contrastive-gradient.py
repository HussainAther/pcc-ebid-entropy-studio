from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "rulial-alife"))

from alife_rulial.run import RULE_DIMENSIONS, simulate_condition

MOTION_SOURCE = ROOT / "data" / "ruliology" / "alife-selection-control" / "alife-selection-control-report.json"
SCARCITY_GRADIENT_SOURCE = ROOT / "data" / "ruliology" / "alife-fitness-gradient" / "alife-fitness-gradient-report.json"
STEP = 0.06
PROBE_CONFIG = {
    "steps": 120,
    "shock_step": 0,
    "initial_population": 72,
    "population_cap": 150,
    "max_age": 260,
    "initial_rule_sd": 0.0,
    "mutation_sd": 0.0,
    "record_every": 5,
}


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def cosine(a, b):
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    return 0.0 if na < 1e-12 or nb < 1e-12 else float(np.dot(a, b) / (na * nb))


def unit_to_physical(u):
    lo = np.array([x[1] for x in RULE_DIMENSIONS], float)
    hi = np.array([x[2] for x in RULE_DIMENSIONS], float)
    return lo + np.clip(u, 0, 1) * (hi - lo)


def performance(run):
    hist = run["history"]
    return 0.0 if not hist else float(np.mean([row["population"] for row in hist]) / PROBE_CONFIG["initial_population"])


def stable_gradient_for(seed, center_unit):
    grad = np.zeros(len(RULE_DIMENSIONS))
    probes = []
    for i, (name, _, _) in enumerate(RULE_DIMENSIONS):
        minus = center_unit.copy()
        plus = center_unit.copy()
        minus[i] = max(0.0, minus[i] - STEP)
        plus[i] = min(1.0, plus[i] + STEP)
        denom = plus[i] - minus[i]
        vals = []
        for side, u in [("minus", minus), ("plus", plus)]:
            cfg = {**PROBE_CONFIG, "initial_rule_center": unit_to_physical(u).tolist()}
            # stable_mutable with mutation_sd=0 is a homogeneous, no-mutation stable-resource probe.
            run = simulate_condition(seed, "stable_mutable", cfg)
            score = performance(run)
            vals.append(score)
            probes.append(
                {
                    "seed": seed,
                    "environment": "stable",
                    "dimension": name,
                    "side": side,
                    "performance": score,
                    "finalPopulation": run["finalPopulation"],
                    "probeUnit": u.tolist(),
                }
            )
        grad[i] = (vals[1] - vals[0]) / denom if denom > 1e-12 else 0.0
    return grad, probes


def scarcity_gradient_from_rul022(seed, source_report):
    rows = [r for r in source_report["probeRuns"] if int(r["seed"]) == int(seed)]
    by = {(r["dimension"], r["side"]): r for r in rows}
    grad = np.zeros(len(RULE_DIMENSIONS))
    for i, (name, _, _) in enumerate(RULE_DIMENSIONS):
        minus = by[(name, "minus")]
        plus = by[(name, "plus")]
        denom = float(plus["probeUnit"][i]) - float(minus["probeUnit"][i])
        grad[i] = (float(plus["performance"]) - float(minus["performance"])) / denom if denom > 1e-12 else 0.0
    return grad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output-dir", default="data/ruliology/alife-contrastive-gradient")
    args = ap.parse_args()
    out = ROOT / args.output_dir
    out.mkdir(parents=True, exist_ok=True)

    motion = json.loads(MOTION_SOURCE.read_text())
    scarcity_source = json.loads(SCARCITY_GRADIENT_SOURCE.read_text())
    by = {(int(r["seed"]), r["condition"]): r for r in motion["runs"]}
    seeds = list(motion["design"]["seeds"])

    rows = []
    stable_probe_rows = []
    for seed in seeds:
        scarcity_motion = by[(seed, "scarcity_mutable")]
        neutral_motion = by[(seed, "neutral_bottleneck_mutable")]
        center = np.asarray(scarcity_motion["preShockCentroid"], float)
        scarcity_grad = scarcity_gradient_from_rul022(seed, scarcity_source)
        stable_grad, stable_probes = stable_gradient_for(seed, center)
        stable_probe_rows.extend(stable_probes)
        contrast = scarcity_grad - stable_grad

        scarcity_delta = np.asarray(scarcity_motion["postShockDelta"], float)
        neutral_delta = np.asarray(neutral_motion["postShockDelta"], float)
        scarcity_alignment = cosine(scarcity_delta, contrast)
        neutral_alignment = cosine(neutral_delta, contrast)
        rows.append(
            {
                "seed": seed,
                "scarcityGradient": scarcity_grad.tolist(),
                "stableGradient": stable_grad.tolist(),
                "contrastiveGradient": contrast.tolist(),
                "scarcityGradientNorm": float(np.linalg.norm(scarcity_grad)),
                "stableGradientNorm": float(np.linalg.norm(stable_grad)),
                "contrastiveGradientNorm": float(np.linalg.norm(contrast)),
                "scarcityAlignment": scarcity_alignment,
                "neutralAlignment": neutral_alignment,
                "alignmentDifference": scarcity_alignment - neutral_alignment,
                "scarcityDisplacement": float(np.linalg.norm(scarcity_delta)),
                "neutralDisplacement": float(np.linalg.norm(neutral_delta)),
            }
        )

    s_align = np.array([r["scarcityAlignment"] for r in rows])
    n_align = np.array([r["neutralAlignment"] for r in rows])
    diff = s_align - n_align
    cnorm = np.array([r["contrastiveGradientNorm"] for r in rows])

    criteria = {
        "scarcityMedianContrastiveAlignmentPositive": float(np.median(s_align)) >= 0.10,
        "scarcityContrastiveAlignmentExceedsNeutral": float(np.median(diff)) >= 0.10,
        "scarcityPositiveInMajority": int(np.sum(s_align > 0)) >= math.ceil(2 * len(seeds) / 3),
        "contrastiveGradientIdentifiable": int(np.sum(cnorm > 1e-6)) >= math.ceil(3 * len(seeds) / 4),
    }

    summary = {
        "schemaVersion": "entropy-rulial-alife-contrastive-gradient/1.0.0",
        "experimentId": "RUL-023",
        "ruleSpaceId": "RSPACE-ALIFE-001",
        "observerId": "OBSERVER-ALIFE-CONTRASTIVE-GRADIENT",
        "source": {
            "motionExperiment": "RUL-021",
            "scarcityGradientExperiment": "RUL-022",
            "motionSourceReport": str(MOTION_SOURCE.relative_to(ROOT)),
            "scarcityGradientSourceReport": str(SCARCITY_GRADIENT_SOURCE.relative_to(ROOT)),
            "newMotionSimulations": 0,
            "reusedScarcityProbeSimulations": int(scarcity_source["source"]["newFitnessProbeSimulations"]),
            "newStableProbeSimulations": len(stable_probe_rows),
        },
        "design": {
            "seedCount": len(seeds),
            "seeds": seeds,
            "ruleDimensions": [x[0] for x in RULE_DIMENSIONS],
            "finiteDifferenceStepUnit": STEP,
            "stableProbesPerSeed": 2 * len(RULE_DIMENSIONS),
            "contrastiveGradientDefinition": "grad(F_scarcity) - grad(F_stable) at the same RUL-021 pre-shock centroid",
            "performanceTarget": "time-averaged population persistence divided by initial population over matched 120-step homogeneous no-mutation probes",
            "primaryCriteria": {
                "scarcityMedianContrastiveAlignmentPositive": ">= 0.10 median cosine with the contrastive scarcity-minus-stable gradient",
                "scarcityContrastiveAlignmentExceedsNeutral": ">= +0.10 median paired cosine advantage over neutral bottleneck motion",
                "scarcityPositiveInMajority": ">= 2/3 of seeds have positive scarcity/contrastive-gradient cosine",
                "contrastiveGradientIdentifiable": ">= 3/4 of seeds have nonzero contrastive finite-difference gradient norm",
            },
        },
        "results": {
            "medianScarcityContrastiveAlignment": float(np.median(s_align)),
            "meanScarcityContrastiveAlignment": float(np.mean(s_align)),
            "medianNeutralContrastiveAlignment": float(np.median(n_align)),
            "meanNeutralContrastiveAlignment": float(np.mean(n_align)),
            "medianScarcityMinusNeutralContrastiveAlignment": float(np.median(diff)),
            "positiveScarcityAlignmentCount": int(np.sum(s_align > 0)),
            "positiveAlignmentAdvantageCount": int(np.sum(diff > 0)),
            "identifiableContrastiveGradientCount": int(np.sum(cnorm > 1e-6)),
            "medianContrastiveGradientNorm": float(np.median(cnorm)),
        },
        "primaryTest": {
            **criteria,
            "criteriaPassed": int(sum(criteria.values())),
            "criteriaTotal": len(criteria),
            "pilotSupported": all(criteria.values()),
        },
        "interpretationBoundary": [
            "RUL-023 is an engineered ALife contrastive-selection diagnostic, not evidence about natural biological evolution.",
            "The contrastive gradient subtracts a stable-resource local performance landscape from the scarcity landscape at the same frozen pre-shock rule centroid.",
            "The scarcity component is reused exactly from committed RUL-022 probes; only the matched stable-resource probes are new in RUL-023.",
            "The performance target remains short-horizon population persistence in homogeneous no-mutation probe populations and is not a universal fitness function.",
            "Positive selection-specific contrastive alignment would strengthen the interpretation that environmental scarcity shapes the direction of rulial motion; failure would challenge that interpretation without erasing the observed motion itself.",
        ],
    }

    report = {**summary, "seedResults": rows, "stableProbeRuns": stable_probe_rows}
    rp = out / "alife-contrastive-gradient-report.json"
    sp = out / "alife-contrastive-gradient-summary.json"
    rp.write_bytes(canonical_json(report) + b"\n")
    sp.write_bytes(canonical_json(summary) + b"\n")

    with (out / "seed-contrastive-alignment.csv").open("w", newline="") as f:
        fields = [
            "seed",
            "scarcityGradientNorm",
            "stableGradientNorm",
            "contrastiveGradientNorm",
            "scarcityAlignment",
            "neutralAlignment",
            "alignmentDifference",
            "scarcityDisplacement",
            "neutralDisplacement",
        ]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in rows:
            w.writerow({k: row[k] for k in fields})

    with (out / "stable-fitness-probes.csv").open("w", newline="") as f:
        fields = ["seed", "dimension", "side", "performance", "finalPopulation"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in stable_probe_rows:
            w.writerow({k: row[k] for k in fields})

    digest = hashlib.sha256(rp.read_bytes()).hexdigest()
    (out / "sha256.txt").write_text(f"{digest}  {rp.name}\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
