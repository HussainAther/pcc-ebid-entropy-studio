from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "rulial-alife"))

from alife_rulial.run import RULE_DIMENSIONS, run_experiment  # noqa: E402

SEEDS = [13001, 13007, 13019, 13033, 13049, 13063, 13079, 13099, 13121, 13139, 13159, 13177]


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="data/ruliology/alife-rule-motion")
    args = parser.parse_args()
    out = ROOT / args.output_dir
    out.mkdir(parents=True, exist_ok=True)

    result = run_experiment(SEEDS)
    summary = {
        "schemaVersion": "entropy-rulial-alife-motion/1.0.0",
        "experimentId": "RUL-020",
        "ruleSpaceId": "RSPACE-ALIFE-001",
        "observerId": "OBSERVER-ALIFE-RULE-MOTION",
        "design": {
            "seedCount": len(SEEDS),
            "seeds": SEEDS,
            "conditions": ["stable_mutable", "scarcity_mutable", "scarcity_frozen"],
            "ruleDimensions": [name for name, _, _ in RULE_DIMENSIONS],
            "primaryCriteria": {
                "scarcityExceedsStableDisplacement": ">= +0.015 normalized rule distance",
                "scarcityExceedsFrozenDisplacement": ">= +0.010 normalized rule distance",
                "scarcityDirectionallyReproducible": ">= 0.20 mean pairwise cosine",
                "scarcityPopulationPersists": "extinction count <= 25% of seeds (minimum tolerance 1)",
            },
        },
        "simulation": {
            "runCount": len(result["runs"]),
            "steps": result["config"]["steps"],
            "shockStep": result["config"]["shock_step"],
            "initialPopulation": result["config"]["initial_population"],
            "populationCap": result["config"]["population_cap"],
        },
        "conditions": result["conditions"],
        "primaryTest": {
            **result["criteria"],
            "criteriaPassed": result["criteriaPassed"],
            "criteriaTotal": result["criteriaTotal"],
            "pilotSupported": result["criteriaPassed"] == result["criteriaTotal"],
        },
        "interpretationBoundary": [
            "RUL-020 is a first mutable-rule ALife pilot, not evidence of biological evolution or universal adaptation.",
            "Population-level rule-centroid motion can arise from selection on standing variation as well as mutation; the scarcity_frozen control separates these contributions only within this model.",
            "Directional reproducibility is measured in the declared normalized four-dimensional rule coordinates and is representation dependent.",
            "The scarcity intervention is an engineered resource-regeneration shock; PCC language is not assigned to these conditions in RUL-020.",
        ],
    }
    report = {**summary, "config": result["config"], "runs": result["runs"]}

    report_path = out / "alife-rule-motion-report.json"
    summary_path = out / "alife-rule-motion-summary.json"
    report_path.write_bytes(canonical_json(report) + b"\n")
    summary_path.write_bytes(canonical_json(summary) + b"\n")

    with (out / "condition-summary.csv").open("w", newline="") as f:
        fields = ["condition", "runCount", "extinctionCount", "medianRuleDisplacement", "medianRulePathLength", "medianFinalRuleDiversity", "medianPopulationRecovery", "medianLineageDiversity", "directionalReproducibility"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for condition, row in summary["conditions"].items():
            w.writerow({"condition": condition, **row})

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
