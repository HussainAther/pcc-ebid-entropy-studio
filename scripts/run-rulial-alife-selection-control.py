from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "rulial-alife"))

from alife_rulial.run import RULE_DIMENSIONS, run_selection_bottleneck_experiment  # noqa: E402

SEEDS = [14003, 14011, 14029, 14041, 14057, 14071, 14087, 14101, 14119, 14137, 14153, 14173]
CONFIG = {
    "steps": 340,
    "shock_step": 180,
    "max_age": 300,
}


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="data/ruliology/alife-selection-control")
    args = parser.parse_args()
    out = ROOT / args.output_dir
    out.mkdir(parents=True, exist_ok=True)

    result = run_selection_bottleneck_experiment(SEEDS, CONFIG)
    conditions = result["conditions"]
    summary = {
        "schemaVersion": "entropy-rulial-alife-selection-control/1.0.0",
        "experimentId": "RUL-021",
        "ruleSpaceId": "RSPACE-ALIFE-001",
        "observerId": "OBSERVER-ALIFE-SELECTION-CONTROL",
        "design": {
            "seedCount": len(SEEDS),
            "seeds": SEEDS,
            "conditions": ["stable_mutable", "scarcity_mutable", "neutral_bottleneck_mutable"],
            "ruleDimensions": [name for name, _, _ in RULE_DIMENSIONS],
            "burnInSteps": CONFIG["shock_step"],
            "postShockSteps": CONFIG["steps"] - CONFIG["shock_step"],
            "neutralControl": "stable-resource ecology with mutation retained and a rule-blind random cull at the shock step; cull depth is set per seed from the matched scarcity run's minimum post-shock population fraction",
            "primaryCriteria": {
                "selectiveExceedsNeutralPostShockMotion": ">= +0.015 median paired normalized rule distance",
                "selectiveExcessPositiveInMajority": ">= 2/3 of matched seeds",
                "selectiveDirectionExceedsNeutral": ">= +0.10 mean pairwise cosine",
                "neutralBottleneckMatched": "median absolute bottleneck-fraction error <= 0.06",
                "selectivePopulationPersists": "extinction count <= 25% of seeds (minimum tolerance 1)",
            },
        },
        "simulation": {
            "runCount": len(result["runs"]),
            "steps": result["config"]["steps"],
            "shockStep": result["config"]["shock_step"],
            "initialPopulation": result["config"]["initial_population"],
            "populationCap": result["config"]["population_cap"],
        },
        "conditions": conditions,
        "pairedComparison": {
            "medianSelectiveMinusNeutralPostShockDisplacement": result["pairedExcessMedian"],
            "positiveSeedCount": result["pairedExcessPositiveCount"],
            "seedCount": len(SEEDS),
            "medianNeutralBottleneckMatchError": result["neutralBottleneckMatchErrorMedian"],
        },
        "primaryTest": {
            **result["criteria"],
            "criteriaPassed": result["criteriaPassed"],
            "criteriaTotal": result["criteriaTotal"],
            "pilotSupported": result["criteriaPassed"] == result["criteriaTotal"],
        },
        "interpretationBoundary": [
            "RUL-021 is an engineered ALife selection-control experiment, not evidence about biological evolution in natural populations.",
            "The neutral control matches bottleneck depth, not the full time-varying demographic trajectory of scarcity.",
            "Both scarcity and neutral-bottleneck arms retain mutation; the primary contrast is resource-dependent selection versus rule-blind demographic loss.",
            "The neutral cull is random with respect to the declared rule vector, but subsequent ecology can still select among survivors.",
            "Post-shock rule displacement is measured from the pre-shock population centroid after a 180-step burn-in.",
        ],
    }
    report = {**summary, "config": result["config"], "pairedExcessPostShockDisplacement": result["pairedExcessPostShockDisplacement"], "runs": result["runs"]}

    report_path = out / "alife-selection-control-report.json"
    summary_path = out / "alife-selection-control-summary.json"
    report_path.write_bytes(canonical_json(report) + b"\n")
    summary_path.write_bytes(canonical_json(summary) + b"\n")

    with (out / "condition-summary.csv").open("w", newline="") as f:
        fields = ["condition", "runCount", "extinctionCount", "medianPostShockRuleDisplacement", "medianRulePathLength", "medianFinalRuleDiversity", "medianPopulationRecovery", "medianLineageDiversity", "medianBottleneckFraction", "directionalReproducibility"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for condition, row in conditions.items():
            w.writerow({"condition": condition, **{k: row[k] for k in fields if k != "condition"}})

    with (out / "paired-seed-comparison.csv").open("w", newline="") as f:
        fields = ["seed", "scarcityPostShockDisplacement", "neutralPostShockDisplacement", "scarcityMinusNeutral", "scarcityBottleneckFraction", "neutralBottleneckFraction", "bottleneckMatchError"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        runs = result["runs"]
        by = {(r["seed"], r["condition"]): r for r in runs}
        for seed in SEEDS:
            s = by[(seed, "scarcity_mutable")]
            n = by[(seed, "neutral_bottleneck_mutable")]
            w.writerow({
                "seed": seed,
                "scarcityPostShockDisplacement": s["postShockDisplacement"],
                "neutralPostShockDisplacement": n["postShockDisplacement"],
                "scarcityMinusNeutral": s["postShockDisplacement"] - n["postShockDisplacement"],
                "scarcityBottleneckFraction": s["bottleneckFraction"],
                "neutralBottleneckFraction": n["bottleneckFraction"],
                "bottleneckMatchError": abs(s["bottleneckFraction"] - n["bottleneckFraction"]),
            })

    with (out / "rule-trajectories.csv").open("w", newline="") as f:
        fields = ["condition", "seed", "step", "population", "meanEnergy", "ruleDiversity", "lineageDiversity", "scarcityActive", "forage_weight", "hazard_avoidance", "exploration", "reproduction_threshold"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for run in result["runs"]:
            for row in run["history"]:
                c = row["ruleCentroid"]
                w.writerow({
                    "condition": run["condition"], "seed": run["seed"], "step": row["step"], "population": row["population"], "meanEnergy": row["meanEnergy"],
                    "ruleDiversity": row["ruleDiversity"], "lineageDiversity": row["lineageDiversity"], "scarcityActive": row["scarcityActive"],
                    "forage_weight": c[0] if c else "", "hazard_avoidance": c[1] if c else "", "exploration": c[2] if c else "", "reproduction_threshold": c[3] if c else "",
                })

    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (out / "sha256.txt").write_text(f"{digest}  {report_path.name}\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
