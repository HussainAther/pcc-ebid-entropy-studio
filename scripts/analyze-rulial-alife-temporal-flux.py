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
EXPERIMENT_ID = "RUL-029"
OBSERVER_ID = "OBSERVER-ALIFE-TEMPORAL-FLUX"
RULE_SPACE_ID = "RSPACE-ALIFE-001"
SEGMENTS = ROOT / "data" / "ruliology" / "alife-flux-network" / "flux-segments.csv"
RUL027 = ROOT / "data" / "ruliology" / "alife-flux-network" / "alife-flux-network-report.json"
OUT = ROOT / "data" / "ruliology" / "alife-temporal-flux"
CADENCES = [5, 10, 20, 40]
BINS_PER_DIM = 4
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


def bin_tuple(mu: np.ndarray) -> tuple[int, ...]:
    clipped = np.clip(np.asarray(mu, dtype=float), 0.0, 1.0 - np.finfo(float).eps)
    return tuple(np.floor(clipped * BINS_PER_DIM).astype(int).tolist())


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
    u = a | b
    return len(a & b) / len(u) if u else 0.0


def load_snapshot_states() -> tuple[dict[tuple[str, int, int], dict[int, tuple[float, np.ndarray]]], dict[tuple[str, int], list[int]]]:
    states: dict[tuple[str, int, int], dict[int, tuple[float, np.ndarray]]] = defaultdict(dict)
    steps: dict[tuple[str, int], set[int]] = defaultdict(set)
    with SEGMENTS.open(newline="") as f:
        for row in csv.DictReader(f):
            cond, seed, founder = row["condition"], int(row["seed"]), int(row["founderId"])
            a, b = int(row["stepStart"]), int(row["stepEnd"])
            p0, p1 = float(row["pStart"]), float(row["pEnd"])
            mu0 = np.asarray(json.loads(row["muStart"]), dtype=float)
            mu1 = np.asarray(json.loads(row["muEnd"]), dtype=float)
            # Segments already encode a sensible endpoint centroid for births/deaths.
            states[(cond, seed, a)][founder] = (p0, mu0)
            states[(cond, seed, b)][founder] = (p1, mu1)
            steps[(cond, seed)].add(a); steps[(cond, seed)].add(b)
    return states, {k: sorted(v) for k, v in steps.items()}


def selected_steps(all_steps: list[int], cadence: int) -> list[int]:
    # Preserve the one-step intervention boundary 179->180, then subsample the
    # regular post-shock snapshots. Always retain the final committed endpoint.
    if not all_steps:
        return []
    start = min(all_steps)
    shock = 180 if 180 in all_steps else all_steps[1]
    final = max(all_steps)
    chosen = [start]
    if shock != start:
        chosen.append(shock)
    t = shock + cadence
    while t < final:
        if t in all_steps:
            chosen.append(t)
        t += cadence
    if final not in chosen:
        chosen.append(final)
    return chosen


def make_segments(states: dict[tuple[str, int, int], dict[int, tuple[float, np.ndarray]]], steps_map: dict[tuple[str, int], list[int]], condition: str, seed: int, cadence: int) -> list[dict[str, Any]]:
    times = selected_steps(steps_map[(condition, seed)], cadence)
    out: list[dict[str, Any]] = []
    for a, b in zip(times[:-1], times[1:]):
        aa = states[(condition, seed, a)]
        bb = states[(condition, seed, b)]
        for founder in sorted(set(aa) | set(bb)):
            left, right = aa.get(founder), bb.get(founder)
            if left is None:
                p1, mu1 = right; p0 = 0.0; mu0 = mu1.copy()
            elif right is None:
                p0, mu0 = left; p1 = 0.0; mu1 = mu0.copy()
            else:
                p0, mu0 = left; p1, mu1 = right
            pbar = 0.5 * (p0 + p1)
            vec = pbar * (mu1 - mu0)
            mid = 0.5 * (mu0 + mu1)
            sb, tb, mb = bin_tuple(mu0), bin_tuple(mu1), bin_tuple(mid)
            out.append({
                "condition": condition, "seed": seed, "founderId": founder,
                "stepStart": a, "stepEnd": b, "pStart": p0, "pEnd": p1,
                "deltaP": p1 - p0, "muStart": mu0, "muEnd": mu1,
                "midpoint": mid, "fluxVector": vec,
                "fluxMagnitude": float(np.linalg.norm(vec)),
                "sourceCell": bin_id(sb), "targetCell": bin_id(tb), "midpointCell": bin_id(mb),
                "crossesCellBoundary": sb != tb,
            })
    return out


def aggregate(condition: str, rows: list[dict[str, Any]], seeds_a: set[int]) -> dict[str, Any]:
    cell_vec: dict[str, np.ndarray] = defaultdict(lambda: np.zeros(4, dtype=float))
    cell_mag: dict[str, float] = defaultdict(float)
    turnover: dict[str, float] = defaultdict(float)
    edge_mag: dict[str, float] = defaultdict(float)
    halves = {"A": defaultdict(float), "B": defaultdict(float)}
    total = 0.0
    crossing = 0.0
    for r in rows:
        if r["condition"] != condition:
            continue
        c = r["midpointCell"]
        mag = float(r["fluxMagnitude"])
        cell_vec[c] += r["fluxVector"]
        cell_mag[c] += mag
        turnover[c] += abs(float(r["deltaP"]))
        edge_mag[f'{r["sourceCell"]}->{r["targetCell"]}'] += mag
        total += mag
        if r["crossesCellBoundary"]:
            crossing += mag
        halves["A" if r["seed"] in seeds_a else "B"][c] += mag
    occupied = sorted([(c,m) for c,m in cell_mag.items() if m > EPS], key=lambda kv: (-kv[1], kv[0]))
    n_top = max(1, math.ceil(TOP_FRACTION * len(occupied))) if occupied else 0
    concentration = sum(m for _,m in occupied[:n_top]) / total if total > EPS else 0.0
    persistence = sum(float(np.linalg.norm(cell_vec[c])) for c,_ in occupied) / total if total > EPS else 0.0
    return {
        "condition": condition,
        "segmentCount": len(rows),
        "occupiedFluxCells": len(occupied),
        "directedEdges": len(edge_mag),
        "totalAdvectiveFluxMagnitude": total,
        "cellBoundaryCrossingFluxFraction": crossing / total if total > EPS else 0.0,
        "top20PercentCellFluxConcentration": concentration,
        "fluxWeightedDirectionalPersistence": persistence,
        "top20PercentCellHalfSplitJaccard": jaccard(top_fraction_set(dict(halves["A"])), top_fraction_set(dict(halves["B"]))),
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
    states, steps_map = load_snapshot_states()
    seeds = [int(x) for x in source["design"]["seeds"]]
    seeds_a = set(seeds[:6])

    cadence_rows: list[dict[str, Any]] = []
    segment_export: list[dict[str, Any]] = []
    profiles: dict[int, dict[str, dict[str, Any]]] = {}
    for cadence in CADENCES:
        all_rows: list[dict[str, Any]] = []
        for condition in ("scarcity_mutable", "neutral_bottleneck_mutable"):
            for seed in seeds:
                all_rows.extend(make_segments(states, steps_map, condition, seed, cadence))
        scarcity = aggregate("scarcity_mutable", [r for r in all_rows if r["condition"] == "scarcity_mutable"], seeds_a)
        neutral = aggregate("neutral_bottleneck_mutable", [r for r in all_rows if r["condition"] == "neutral_bottleneck_mutable"], seeds_a)
        profiles[cadence] = {"scarcity": scarcity, "neutral": neutral}
        cadence_rows.append({
            "cadenceSteps": cadence,
            "scarcitySegmentCount": scarcity["segmentCount"],
            "neutralSegmentCount": neutral["segmentCount"],
            "scarcityOccupiedFluxCells": scarcity["occupiedFluxCells"],
            "scarcityTop20FluxConcentration": scarcity["top20PercentCellFluxConcentration"],
            "scarcityFluxWeightedDirectionalPersistence": scarcity["fluxWeightedDirectionalPersistence"],
            "scarcitySeedHalfTop20Jaccard": scarcity["top20PercentCellHalfSplitJaccard"],
            "scarcityVsNeutralCellFluxJensenShannon": js_divergence(scarcity["cellFluxProfile"], neutral["cellFluxProfile"]),
            "scarcityVsNeutralAbundanceTurnoverJensenShannon": js_divergence(scarcity["abundanceTurnoverProfile"], neutral["abundanceTurnoverProfile"]),
            "scarcityVsNeutralEdgeFluxJensenShannon": js_divergence(scarcity["edgeFluxProfile"], neutral["edgeFluxProfile"]),
            "scarcityTotalAdvectiveFluxMagnitude": scarcity["totalAdvectiveFluxMagnitude"],
        })
        for r in all_rows:
            segment_export.append({
                "cadenceSteps": cadence, "condition": r["condition"], "seed": r["seed"], "founderId": r["founderId"],
                "stepStart": r["stepStart"], "stepEnd": r["stepEnd"], "deltaP": r["deltaP"],
                "midpointCell": r["midpointCell"], "fluxMagnitude": r["fluxMagnitude"],
                "sourceCell": r["sourceCell"], "targetCell": r["targetCell"],
            })

    def pass_count(key: str, threshold: float) -> int:
        return sum(float(r[key]) >= threshold for r in cadence_rows)

    r5 = next(r for r in cadence_rows if r["cadenceSteps"] == 5)
    s27 = source["results"]["scarcity"]
    reproduction_errors = {
        "concentration": abs(r5["scarcityTop20FluxConcentration"] - s27["top20PercentCellFluxConcentration"]),
        "directionalPersistence": abs(r5["scarcityFluxWeightedDirectionalPersistence"] - s27["fluxWeightedDirectionalPersistence"]),
        "seedHalfJaccard": abs(r5["scarcitySeedHalfTop20Jaccard"] - s27["top20PercentCellHalfSplitJaccard"]),
        "cellFluxJensenShannon": abs(r5["scarcityVsNeutralCellFluxJensenShannon"] - source["results"]["scarcityVsNeutralCellFluxJensenShannon"]),
        "turnoverJensenShannon": abs(r5["scarcityVsNeutralAbundanceTurnoverJensenShannon"] - source["results"]["scarcityVsNeutralAbundanceTurnoverJensenShannon"]),
    }
    criteria = {
        "reproducesCommittedRUL027AtFiveStepCadence": max(reproduction_errors.values()) <= 1e-12,
        "channelConcentrationRobustAcrossCadences": pass_count("scarcityTop20FluxConcentration", 0.50) >= 3,
        "channelRecurrenceRobustAcrossCadences": pass_count("scarcitySeedHalfTop20Jaccard", 0.25) >= 3,
        "directionalPersistenceRobustAcrossCadences": pass_count("scarcityFluxWeightedDirectionalPersistence", 0.20) >= 3,
        "cellFluxDivergenceRobustAcrossCadences": pass_count("scarcityVsNeutralCellFluxJensenShannon", 0.05) >= 3,
        "turnoverDivergenceRobustAcrossCadences": pass_count("scarcityVsNeutralAbundanceTurnoverJensenShannon", 0.05) >= 3,
    }
    results = {
        "cadences": cadence_rows,
        "passesByMetric": {
            "channelConcentration": pass_count("scarcityTop20FluxConcentration", 0.50),
            "channelRecurrence": pass_count("scarcitySeedHalfTop20Jaccard", 0.25),
            "directionalPersistence": pass_count("scarcityFluxWeightedDirectionalPersistence", 0.20),
            "cellFluxDivergence": pass_count("scarcityVsNeutralCellFluxJensenShannon", 0.05),
            "turnoverDivergence": pass_count("scarcityVsNeutralAbundanceTurnoverJensenShannon", 0.05),
        },
        "rul027FiveStepReproductionErrors": reproduction_errors,
    }
    report = {
        "schemaVersion": "entropy-rulial-alife-temporal-flux/1.0.0",
        "experimentId": EXPERIMENT_ID,
        "ruleSpaceId": RULE_SPACE_ID,
        "observerId": OBSERVER_ID,
        "source": {
            "sourceExperimentId": "RUL-027",
            "sourceArtifact": str(SEGMENTS.relative_to(ROOT)),
            "newUniqueSimulationConditions": 0,
            "newSimulationRuns": 0,
            "reconstructsLineageSnapshotsFromCommittedSegments": True,
        },
        "design": {
            "seeds": seeds,
            "conditions": ["scarcity_mutable", "neutral_bottleneck_mutable"],
            "cadenceFamilySteps": CADENCES,
            "binsPerDimension": BINS_PER_DIM,
            "topCellFraction": TOP_FRACTION,
            "ruleDimensions": source["design"]["ruleDimensions"],
            "temporalCoarseGraining": "retain the 179->180 intervention boundary, then subsample post-shock lineage snapshots at cadence dt in {5,10,20,40}, always retaining the final committed endpoint",
            "robustnessRule": "an original RUL-027 qualitative threshold is temporally robust when it passes at >=3 of 4 frozen cadences",
            "primaryThresholds": {
                "channelConcentration": 0.50,
                "channelRecurrence": 0.25,
                "directionalPersistence": 0.20,
                "cellFluxJensenShannonBits": 0.05,
                "turnoverJensenShannonBits": 0.05,
                "minimumPassingCadences": 3,
                "fiveStepReproductionTolerance": 1e-12,
            },
        },
        "results": results,
        "primaryTest": {
            "criteria": criteria,
            "criteriaPassed": int(sum(criteria.values())),
            "criteriaTotal": len(criteria),
            "pilotSupported": bool(all(criteria.values())),
        },
        "interpretationBoundary": "RUL-029 tests a frozen family of temporal sampling cadences at the fixed four-bin RUL-027 spatial observer. Robustness across these cadences does not establish continuum-time invariance, arbitrary-scale renormalization, adaptive selection, or observer independence.",
    }

    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "alife-temporal-flux-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    (OUT / "alife-temporal-flux-summary.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    write_csv(OUT / "cadence-summary.csv", cadence_rows)
    write_csv(OUT / "temporal-segments.csv", segment_export)
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (OUT / "sha256.txt").write_text(f"{digest}  {report_path.name}\n")
    print(json.dumps({"experimentId": EXPERIMENT_ID, "primaryTest": report["primaryTest"], "results": results, "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
