#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
EXPERIMENT_ID = "RUL-028"
OBSERVER_ID = "OBSERVER-ALIFE-MULTISCALE-FLUX"
RULE_SPACE_ID = "RSPACE-ALIFE-001"
SEGMENTS = ROOT / "data" / "ruliology" / "alife-flux-network" / "flux-segments.csv"
RUL027 = ROOT / "data" / "ruliology" / "alife-flux-network" / "alife-flux-network-report.json"
OUT = ROOT / "data" / "ruliology" / "alife-multiscale-flux"
BINS_FAMILY = [3, 4, 5, 6]
TOP_FRACTION = 0.20
EPS = 1e-12


def js_divergence(a: dict[str, float], b: dict[str, float]) -> float:
    keys = sorted(set(a) | set(b))
    if not keys:
        return 0.0
    pa = np.asarray([max(0.0, a.get(k, 0.0)) for k in keys], dtype=float)
    pb = np.asarray([max(0.0, b.get(k, 0.0)) for k in keys], dtype=float)
    if pa.sum() <= EPS or pb.sum() <= EPS:
        return 0.0
    pa /= pa.sum(); pb /= pb.sum(); m = 0.5 * (pa + pb)
    def kl(p: np.ndarray, q: np.ndarray) -> float:
        mask = p > 0
        return float(np.sum(p[mask] * np.log2(p[mask] / q[mask])))
    return 0.5 * kl(pa, m) + 0.5 * kl(pb, m)


def bin_tuple(mu: np.ndarray, bins: int) -> tuple[int, ...]:
    clipped = np.clip(np.asarray(mu, dtype=float), 0.0, 1.0 - np.finfo(float).eps)
    return tuple(np.floor(clipped * bins).astype(int).tolist())


def bin_id(b: tuple[int, ...]) -> str:
    return ".".join(str(x) for x in b)


def top_fraction_set(profile: dict[str, float], fraction: float = TOP_FRACTION) -> set[str]:
    positive = [(k, v) for k, v in profile.items() if v > EPS]
    positive.sort(key=lambda kv: (-kv[1], kv[0]))
    if not positive:
        return set()
    n = max(1, math.ceil(fraction * len(positive)))
    return {k for k, _ in positive[:n]}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    union = a | b
    return len(a & b) / len(union) if union else 0.0


def load_segments() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with SEGMENTS.open(newline="") as f:
        for row in csv.DictReader(f):
            rows.append({
                "condition": row["condition"],
                "seed": int(row["seed"]),
                "deltaP": float(row["deltaP"]),
                "muStart": np.asarray(json.loads(row["muStart"]), dtype=float),
                "muEnd": np.asarray(json.loads(row["muEnd"]), dtype=float),
                "midpoint": np.asarray(json.loads(row["midpoint"]), dtype=float),
                "fluxVector": np.asarray(json.loads(row["fluxVector"]), dtype=float),
                "fluxMagnitude": float(row["fluxMagnitude"]),
            })
    return rows


def aggregate(condition: str, rows: list[dict[str, Any]], bins: int, seeds_a: set[int]) -> dict[str, Any]:
    cell_vec: dict[str, np.ndarray] = defaultdict(lambda: np.zeros(4, dtype=float))
    cell_mag: dict[str, float] = defaultdict(float)
    turnover: dict[str, float] = defaultdict(float)
    edge_mag: dict[str, float] = defaultdict(float)
    half = {"A": defaultdict(float), "B": defaultdict(float)}
    total = 0.0
    crossing = 0.0
    for r in rows:
        if r["condition"] != condition:
            continue
        sb = bin_id(bin_tuple(r["muStart"], bins))
        tb = bin_id(bin_tuple(r["muEnd"], bins))
        mb = bin_id(bin_tuple(r["midpoint"], bins))
        mag = float(r["fluxMagnitude"])
        vec = r["fluxVector"]
        cell_vec[mb] += vec
        cell_mag[mb] += mag
        turnover[mb] += abs(float(r["deltaP"]))
        edge_mag[f"{sb}->{tb}"] += mag
        total += mag
        if sb != tb:
            crossing += mag
        half["A" if r["seed"] in seeds_a else "B"][mb] += mag

    occupied = [(c, m) for c, m in cell_mag.items() if m > EPS]
    occupied.sort(key=lambda kv: (-kv[1], kv[0]))
    n_top = max(1, math.ceil(TOP_FRACTION * len(occupied))) if occupied else 0
    top_share = sum(m for _, m in occupied[:n_top]) / total if total > EPS else 0.0
    weighted_persistence = 0.0
    if total > EPS:
        weighted_persistence = sum(float(np.linalg.norm(cell_vec[c])) for c, _ in occupied) / total
    return {
        "condition": condition,
        "binsPerDimension": bins,
        "maximumPossibleCells": bins ** 4,
        "occupiedFluxCells": len(occupied),
        "directedEdges": len(edge_mag),
        "totalAdvectiveFluxMagnitude": total,
        "cellBoundaryCrossingFluxFraction": crossing / total if total > EPS else 0.0,
        "top20PercentCellFluxConcentration": top_share,
        "fluxWeightedDirectionalPersistence": weighted_persistence,
        "top20PercentCellHalfSplitJaccard": jaccard(top_fraction_set(dict(half["A"])), top_fraction_set(dict(half["B"]))),
        "cellFluxProfile": dict(cell_mag),
        "abundanceTurnoverProfile": dict(turnover),
        "edgeFluxProfile": dict(edge_mag),
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)


def main() -> None:
    source = json.loads(RUL027.read_text())
    rows = load_segments()
    seeds = source["design"]["seeds"]
    seeds_a = set(int(x) for x in seeds[:6])

    scale_rows: list[dict[str, Any]] = []
    raw_profiles: dict[int, dict[str, dict[str, Any]]] = {}
    for bins in BINS_FAMILY:
        scarcity = aggregate("scarcity_mutable", rows, bins, seeds_a)
        neutral = aggregate("neutral_bottleneck_mutable", rows, bins, seeds_a)
        raw_profiles[bins] = {"scarcity": scarcity, "neutral": neutral}
        scale_rows.append({
            "binsPerDimension": bins,
            "maximumPossibleCells": bins ** 4,
            "scarcityOccupiedFluxCells": scarcity["occupiedFluxCells"],
            "neutralOccupiedFluxCells": neutral["occupiedFluxCells"],
            "scarcityTop20FluxConcentration": scarcity["top20PercentCellFluxConcentration"],
            "scarcityFluxWeightedDirectionalPersistence": scarcity["fluxWeightedDirectionalPersistence"],
            "scarcitySeedHalfTop20Jaccard": scarcity["top20PercentCellHalfSplitJaccard"],
            "scarcityVsNeutralCellFluxJensenShannon": js_divergence(scarcity["cellFluxProfile"], neutral["cellFluxProfile"]),
            "scarcityVsNeutralAbundanceTurnoverJensenShannon": js_divergence(scarcity["abundanceTurnoverProfile"], neutral["abundanceTurnoverProfile"]),
            "scarcityVsNeutralEdgeFluxJensenShannon": js_divergence(scarcity["edgeFluxProfile"], neutral["edgeFluxProfile"]),
        })

    # Frozen before examining RUL-028 outcomes: a qualitative RUL-027 finding is
    # considered multiscale-robust when it clears its original threshold at >=3/4
    # prespecified resolutions b in {3,4,5,6}. The b=4 projection must also reproduce
    # the committed RUL-027 summary within numerical tolerance.
    def pass_count(key: str, threshold: float) -> int:
        return sum(float(r[key]) >= threshold for r in scale_rows)

    r4 = next(r for r in scale_rows if r["binsPerDimension"] == 4)
    s27 = source["results"]["scarcity"]
    reproduction_errors = {
        "concentration": abs(r4["scarcityTop20FluxConcentration"] - s27["top20PercentCellFluxConcentration"]),
        "directionalPersistence": abs(r4["scarcityFluxWeightedDirectionalPersistence"] - s27["fluxWeightedDirectionalPersistence"]),
        "seedHalfJaccard": abs(r4["scarcitySeedHalfTop20Jaccard"] - s27["top20PercentCellHalfSplitJaccard"]),
        "cellFluxJensenShannon": abs(r4["scarcityVsNeutralCellFluxJensenShannon"] - source["results"]["scarcityVsNeutralCellFluxJensenShannon"]),
        "turnoverJensenShannon": abs(r4["scarcityVsNeutralAbundanceTurnoverJensenShannon"] - source["results"]["scarcityVsNeutralAbundanceTurnoverJensenShannon"]),
    }
    criteria = {
        "reproducesCommittedRUL027AtFourBins": max(reproduction_errors.values()) <= 1e-12,
        "channelConcentrationRobustAcrossScales": pass_count("scarcityTop20FluxConcentration", 0.50) >= 3,
        "channelRecurrenceRobustAcrossScales": pass_count("scarcitySeedHalfTop20Jaccard", 0.25) >= 3,
        "directionalPersistenceRobustAcrossScales": pass_count("scarcityFluxWeightedDirectionalPersistence", 0.20) >= 3,
        "cellFluxDivergenceRobustAcrossScales": pass_count("scarcityVsNeutralCellFluxJensenShannon", 0.05) >= 3,
        "turnoverDivergenceRobustAcrossScales": pass_count("scarcityVsNeutralAbundanceTurnoverJensenShannon", 0.05) >= 3,
    }
    results = {
        "scales": scale_rows,
        "passesByMetric": {
            "channelConcentration": pass_count("scarcityTop20FluxConcentration", 0.50),
            "channelRecurrence": pass_count("scarcitySeedHalfTop20Jaccard", 0.25),
            "directionalPersistence": pass_count("scarcityFluxWeightedDirectionalPersistence", 0.20),
            "cellFluxDivergence": pass_count("scarcityVsNeutralCellFluxJensenShannon", 0.05),
            "turnoverDivergence": pass_count("scarcityVsNeutralAbundanceTurnoverJensenShannon", 0.05),
        },
        "rul027FourBinReproductionErrors": reproduction_errors,
        "metricRanges": {
            "channelConcentration": [min(r["scarcityTop20FluxConcentration"] for r in scale_rows), max(r["scarcityTop20FluxConcentration"] for r in scale_rows)],
            "channelRecurrence": [min(r["scarcitySeedHalfTop20Jaccard"] for r in scale_rows), max(r["scarcitySeedHalfTop20Jaccard"] for r in scale_rows)],
            "directionalPersistence": [min(r["scarcityFluxWeightedDirectionalPersistence"] for r in scale_rows), max(r["scarcityFluxWeightedDirectionalPersistence"] for r in scale_rows)],
            "cellFluxDivergence": [min(r["scarcityVsNeutralCellFluxJensenShannon"] for r in scale_rows), max(r["scarcityVsNeutralCellFluxJensenShannon"] for r in scale_rows)],
            "turnoverDivergence": [min(r["scarcityVsNeutralAbundanceTurnoverJensenShannon"] for r in scale_rows), max(r["scarcityVsNeutralAbundanceTurnoverJensenShannon"] for r in scale_rows)],
        },
    }

    report = {
        "schemaVersion": "entropy-rulial-alife-multiscale-flux/1.0.0",
        "experimentId": EXPERIMENT_ID,
        "ruleSpaceId": RULE_SPACE_ID,
        "observerId": OBSERVER_ID,
        "source": {
            "sourceExperimentId": "RUL-027",
            "sourceArtifact": str(SEGMENTS.relative_to(ROOT)),
            "newUniqueSimulationConditions": 0,
            "newSimulationRuns": 0,
            "reusesCommittedFluxSegments": True,
        },
        "design": {
            "seeds": seeds,
            "conditions": ["scarcity_mutable", "neutral_bottleneck_mutable"],
            "binsPerDimensionFamily": BINS_FAMILY,
            "topCellFraction": TOP_FRACTION,
            "ruleDimensions": source["design"]["ruleDimensions"],
            "binning": "equal-width bins independently reapplied to the same committed RUL-027 segment coordinates at b in {3,4,5,6}",
            "robustnessRule": "an original RUL-027 qualitative threshold is multiscale-robust when it passes at >=3 of 4 frozen resolutions",
            "primaryThresholds": {
                "channelConcentration": 0.50,
                "channelRecurrence": 0.25,
                "directionalPersistence": 0.20,
                "cellFluxJensenShannonBits": 0.05,
                "turnoverJensenShannonBits": 0.05,
                "minimumPassingResolutions": 3,
                "fourBinReproductionTolerance": 1e-12,
            },
        },
        "results": results,
        "primaryTest": {
            "criteria": criteria,
            "criteriaPassed": int(sum(criteria.values())),
            "criteriaTotal": len(criteria),
            "pilotSupported": bool(all(criteria.values())),
        },
        "interpretationBoundary": "RUL-028 tests whether the qualitative RUL-027 coarse-flux findings survive a small prespecified family of grid resolutions. Persistence across b={3,4,5,6} reduces, but does not eliminate, observer-resolution dependence; it does not establish a grid-free continuum current, adaptation, or universality.",
    }

    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "alife-multiscale-flux-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    (OUT / "alife-multiscale-flux-summary.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    write_csv(OUT / "resolution-summary.csv", scale_rows)
    # Compact normalized profiles are retained for audit/reanalysis without duplicating segment data.
    profile_rows: list[dict[str, Any]] = []
    for bins in BINS_FAMILY:
        for condition in ("scarcity", "neutral"):
            p = raw_profiles[bins][condition]
            for profile_name, key in (("cell_flux", "cellFluxProfile"), ("turnover", "abundanceTurnoverProfile"), ("edge_flux", "edgeFluxProfile")):
                vals = p[key]; total = sum(vals.values())
                for item, value in sorted(vals.items()):
                    profile_rows.append({"binsPerDimension": bins, "condition": condition, "profile": profile_name, "item": item, "mass": value, "normalizedMass": value / total if total > EPS else 0.0})
    write_csv(OUT / "multiscale-profiles.csv", profile_rows)
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (OUT / "sha256.txt").write_text(f"{digest}  {report_path.name}\n")
    print(json.dumps({"experimentId": EXPERIMENT_ID, "results": results, "primaryTest": report["primaryTest"], "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
