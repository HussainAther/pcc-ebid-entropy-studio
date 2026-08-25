#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "rulial-alife"))

from alife_rulial.run import RULE_DIMENSIONS, simulate_condition  # noqa: E402

EXPERIMENT_ID = "RUL-027"
OBSERVER_ID = "OBSERVER-ALIFE-RULIAL-FLUX-NETWORK"
RULE_SPACE_ID = "RSPACE-ALIFE-001"
SOURCE = ROOT / "data" / "ruliology" / "alife-selection-control" / "alife-selection-control-report.json"
RUL026_INTERVALS = ROOT / "data" / "ruliology" / "alife-lineage-transport" / "interval-transport.csv"
OUT = ROOT / "data" / "ruliology" / "alife-flux-network"
BINS_PER_DIM = 4
EPS = 1e-12


def bin_tuple(mu: np.ndarray) -> tuple[int, ...]:
    clipped = np.clip(np.asarray(mu, dtype=float), 0.0, 1.0 - np.finfo(float).eps)
    return tuple(np.floor(clipped * BINS_PER_DIM).astype(int).tolist())


def bin_id(b: tuple[int, ...]) -> str:
    return ".".join(str(x) for x in b)


def js_divergence(a: dict[str, float], b: dict[str, float]) -> float:
    keys = sorted(set(a) | set(b))
    if not keys:
        return 0.0
    pa = np.asarray([max(0.0, a.get(k, 0.0)) for k in keys], dtype=float)
    pb = np.asarray([max(0.0, b.get(k, 0.0)) for k in keys], dtype=float)
    if pa.sum() <= EPS or pb.sum() <= EPS:
        return 0.0
    pa /= pa.sum()
    pb /= pb.sum()
    m = 0.5 * (pa + pb)
    def kl(p: np.ndarray, q: np.ndarray) -> float:
        mask = p > 0
        return float(np.sum(p[mask] * np.log2(p[mask] / q[mask])))
    return 0.5 * kl(pa, m) + 0.5 * kl(pb, m)


def top_fraction_set(profile: dict[str, float], fraction: float = 0.20) -> set[str]:
    positive = [(k, v) for k, v in profile.items() if v > EPS]
    if not positive:
        return set()
    positive.sort(key=lambda kv: (-kv[1], kv[0]))
    n = max(1, math.ceil(fraction * len(positive)))
    return {k for k, _ in positive[:n]}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b) if (a | b) else 0.0


def load_rul026_within() -> dict[tuple[str, int, int, int], np.ndarray]:
    out: dict[tuple[str, int, int, int], np.ndarray] = {}
    with RUL026_INTERVALS.open(newline="") as f:
        for row in csv.DictReader(f):
            key = (row["condition"], int(row["seed"]), int(row["stepStart"]), int(row["stepEnd"]))
            out[key] = np.asarray(json.loads(row["withinVector"]), dtype=float)
    return out


def segments_for_run(run: dict[str, Any], shock_step: int) -> list[dict[str, Any]]:
    snaps = [x for x in run["history"] if "lineages" in x and int(x["step"]) >= shock_step - 1]
    rows: list[dict[str, Any]] = []
    for a, b in zip(snaps[:-1], snaps[1:]):
        a_by = {int(x["founderId"]): x for x in a["lineages"]}
        b_by = {int(x["founderId"]): x for x in b["lineages"]}
        for founder in sorted(set(a_by) | set(b_by)):
            aa, bb = a_by.get(founder), b_by.get(founder)
            if aa is None:
                mu1 = np.asarray(bb["ruleCentroid"], dtype=float); mu0 = mu1.copy(); p0 = 0.0; p1 = float(bb["fraction"])
            elif bb is None:
                mu0 = np.asarray(aa["ruleCentroid"], dtype=float); mu1 = mu0.copy(); p0 = float(aa["fraction"]); p1 = 0.0
            else:
                mu0 = np.asarray(aa["ruleCentroid"], dtype=float); mu1 = np.asarray(bb["ruleCentroid"], dtype=float)
                p0 = float(aa["fraction"]); p1 = float(bb["fraction"])
            pbar = 0.5 * (p0 + p1)
            delta = mu1 - mu0
            flux_vec = pbar * delta
            mag = float(np.linalg.norm(flux_vec))
            mid = 0.5 * (mu0 + mu1)
            sb, tb, mb = bin_tuple(mu0), bin_tuple(mu1), bin_tuple(mid)
            rows.append({
                "condition": run["condition"], "seed": int(run["seed"]), "founderId": founder,
                "stepStart": int(a["step"]), "stepEnd": int(b["step"]),
                "pStart": p0, "pEnd": p1, "deltaP": p1 - p0,
                "muStart": mu0.tolist(), "muEnd": mu1.tolist(), "midpoint": mid.tolist(),
                "fluxVector": flux_vec.tolist(), "fluxMagnitude": mag,
                "sourceCell": bin_id(sb), "targetCell": bin_id(tb), "midpointCell": bin_id(mb),
                "crossesCellBoundary": sb != tb,
            })
    return rows


def aggregate_condition(condition: str, segs: list[dict[str, Any]], seeds_a: set[int], seeds_b: set[int]) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    cell_vec: dict[str, np.ndarray] = defaultdict(lambda: np.zeros(len(RULE_DIMENSIONS), dtype=float))
    cell_mag: dict[str, float] = defaultdict(float)
    turnover: dict[str, float] = defaultdict(float)
    edge_mag: dict[str, float] = defaultdict(float)
    edge_count: dict[str, int] = defaultdict(int)
    half_profiles = {"A": defaultdict(float), "B": defaultdict(float)}
    total_flux = 0.0
    cross_flux = 0.0
    for s in segs:
        c = s["midpointCell"]
        v = np.asarray(s["fluxVector"], dtype=float)
        mag = float(s["fluxMagnitude"])
        cell_vec[c] += v
        cell_mag[c] += mag
        turnover[c] += abs(float(s["deltaP"]))
        edge = f'{s["sourceCell"]}->{s["targetCell"]}'
        edge_mag[edge] += mag
        edge_count[edge] += 1
        total_flux += mag
        if s["crossesCellBoundary"]:
            cross_flux += mag
        half = "A" if int(s["seed"]) in seeds_a else "B"
        half_profiles[half][c] += mag

    cells: list[dict[str, Any]] = []
    for c in sorted(set(cell_mag) | set(turnover)):
        scalar = cell_mag[c]
        vector = cell_vec[c]
        persistence = float(np.linalg.norm(vector) / scalar) if scalar > EPS else 0.0
        cells.append({
            "condition": condition, "cellId": c, "fluxMagnitude": scalar,
            "netFluxVector": vector.tolist(), "directionalPersistence": persistence,
            "abundanceTurnoverMass": turnover[c],
        })
    edges = [{"condition": condition, "edgeId": e, "fluxMagnitude": edge_mag[e], "segmentCount": edge_count[e]} for e in sorted(edge_mag)]

    occupied = [x for x in cells if x["fluxMagnitude"] > EPS]
    occupied_sorted = sorted(occupied, key=lambda x: (-x["fluxMagnitude"], x["cellId"]))
    top_n = max(1, math.ceil(0.20 * len(occupied_sorted))) if occupied_sorted else 0
    top_flux = sum(x["fluxMagnitude"] for x in occupied_sorted[:top_n])
    concentration = top_flux / total_flux if total_flux > EPS else 0.0
    weighted_persistence = sum(x["fluxMagnitude"] * x["directionalPersistence"] for x in occupied) / total_flux if total_flux > EPS else 0.0
    recurrence = jaccard(top_fraction_set(dict(half_profiles["A"])), top_fraction_set(dict(half_profiles["B"])))

    summary = {
        "condition": condition,
        "segmentCount": len(segs),
        "occupiedFluxCells": len(occupied),
        "directedEdges": len(edge_mag),
        "totalAdvectiveFluxMagnitude": total_flux,
        "cellBoundaryCrossingFluxFraction": cross_flux / total_flux if total_flux > EPS else 0.0,
        "top20PercentCellFluxConcentration": concentration,
        "fluxWeightedDirectionalPersistence": weighted_persistence,
        "top20PercentCellHalfSplitJaccard": recurrence,
        "cellFluxProfile": dict(cell_mag),
        "abundanceTurnoverProfile": dict(turnover),
        "edgeFluxProfile": dict(edge_mag),
    }
    return summary, cells, edges


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
    seeds_a, seeds_b = set(seeds[:6]), set(seeds[6:])
    cfg = {**source["config"], "record_lineages": True}
    shock_step = int(cfg["shock_step"])
    src_scarcity = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "scarcity_mutable"}
    src_neutral = {int(r["seed"]): r for r in source["runs"] if r["condition"] == "neutral_bottleneck_mutable"}
    rul026 = load_rul026_within()

    all_segments: list[dict[str, Any]] = []
    replay_checks: list[dict[str, Any]] = []
    interval_recon_errors: list[float] = []
    for seed in seeds:
        scarcity = simulate_condition(seed, "scarcity_mutable", cfg)
        neutral = simulate_condition(seed, "neutral_bottleneck_mutable", {**cfg, "neutral_bottleneck_fraction": float(src_scarcity[seed]["bottleneckFraction"])})
        for run, src in ((scarcity, src_scarcity[seed]), (neutral, src_neutral[seed])):
            segs = segments_for_run(run, shock_step)
            all_segments.extend(segs)
            grouped: dict[tuple[int, int], np.ndarray] = defaultdict(lambda: np.zeros(len(RULE_DIMENSIONS), dtype=float))
            for s in segs:
                grouped[(int(s["stepStart"]), int(s["stepEnd"]))] += np.asarray(s["fluxVector"], dtype=float)
            for (a, b), vec in grouped.items():
                ref = rul026[(run["condition"], int(run["seed"]), a, b)]
                interval_recon_errors.append(float(np.linalg.norm(vec - ref)))
            replay_checks.append({
                "condition": run["condition"], "seed": seed,
                "finalPopulationMatch": int(run["finalPopulation"]) == int(src["finalPopulation"]),
                "postShockDeltaMaxAbsError": float(np.max(np.abs(np.asarray(run["postShockDelta"]) - np.asarray(src["postShockDelta"])))),
            })

    scar_segs = [s for s in all_segments if s["condition"] == "scarcity_mutable"]
    neut_segs = [s for s in all_segments if s["condition"] == "neutral_bottleneck_mutable"]
    scar, scar_cells, scar_edges = aggregate_condition("scarcity_mutable", scar_segs, seeds_a, seeds_b)
    neut, neut_cells, neut_edges = aggregate_condition("neutral_bottleneck_mutable", neut_segs, seeds_a, seeds_b)

    results = {
        "scarcity": {k: v for k, v in scar.items() if not k.endswith("Profile")},
        "neutral": {k: v for k, v in neut.items() if not k.endswith("Profile")},
        "scarcityVsNeutralCellFluxJensenShannon": js_divergence(scar["cellFluxProfile"], neut["cellFluxProfile"]),
        "scarcityVsNeutralAbundanceTurnoverJensenShannon": js_divergence(scar["abundanceTurnoverProfile"], neut["abundanceTurnoverProfile"]),
        "scarcityVsNeutralEdgeFluxJensenShannon": js_divergence(scar["edgeFluxProfile"], neut["edgeFluxProfile"]),
        "maxIntervalFluxVectorReconstructionErrorVsRUL026": max(interval_recon_errors) if interval_recon_errors else 0.0,
        "maxReplayPostShockDeltaAbsError": max(x["postShockDeltaMaxAbsError"] for x in replay_checks),
        "allReplayFinalPopulationsMatch": all(x["finalPopulationMatch"] for x in replay_checks),
    }
    criteria = {
        "exactFluxAccounting": results["maxIntervalFluxVectorReconstructionErrorVsRUL026"] <= 1e-9,
        "scarcityHasRecurringHighFluxCells": scar["top20PercentCellHalfSplitJaccard"] >= 0.25,
        "scarcityFluxIsChannelConcentrated": scar["top20PercentCellFluxConcentration"] >= 0.50,
        "scarcityFluxHasLocalDirectionalPersistence": scar["fluxWeightedDirectionalPersistence"] >= 0.20,
        "scarcityAndNeutralOccupyDifferentFluxProfiles": results["scarcityVsNeutralCellFluxJensenShannon"] >= 0.05,
        "scarcityAndNeutralHaveDifferentTurnoverProfiles": results["scarcityVsNeutralAbundanceTurnoverJensenShannon"] >= 0.05,
        "deterministicReplayMatchesRUL021": results["maxReplayPostShockDeltaAbsError"] <= 1e-12 and results["allReplayFinalPopulationsMatch"],
    }

    report = {
        "schemaVersion": "entropy-rulial-alife-flux-network/1.0.0",
        "experimentId": EXPERIMENT_ID,
        "ruleSpaceId": RULE_SPACE_ID,
        "observerId": OBSERVER_ID,
        "source": {
            "motionExperimentId": "RUL-021", "transportExperimentId": "RUL-026",
            "sourceArtifact": str(SOURCE.relative_to(ROOT)), "transportArtifact": str(RUL026_INTERVALS.relative_to(ROOT)),
            "newUniqueSimulationConditions": 0, "deterministicReplayRuns": len(replay_checks),
        },
        "design": {
            "seeds": seeds, "seedHalves": {"A": seeds[:6], "B": seeds[6:]},
            "conditions": ["scarcity_mutable", "neutral_bottleneck_mutable"],
            "ruleDimensions": [d[0] for d in RULE_DIMENSIONS],
            "binsPerDimension": BINS_PER_DIM, "maximumPossibleCells": BINS_PER_DIM ** len(RULE_DIMENSIONS),
            "binning": "fixed equal-width bins in each normalized rule coordinate; frozen before RUL-027 outcomes",
            "segmentFlux": "J_l,t = 0.5*(p_l,t+p_l,t+1)*(mu_l,t+1-mu_l,t)",
            "cellAssignment": "lineage segment midpoint cell",
            "abundanceTurnover": "absolute lineage abundance change |p_l,t+1-p_l,t| assigned to the midpoint cell",
            "channelRecurrence": "Jaccard overlap of top-20%-by-flux occupied cells between the first and second six-seed halves",
            "primaryCriteria": {
                "exactFluxAccounting": "aggregated lineage segment flux vectors reconstruct every RUL-026 within-lineage interval vector within 1e-9",
                "scarcityHasRecurringHighFluxCells": "top-20% high-flux cell Jaccard between frozen seed halves >= 0.25",
                "scarcityFluxIsChannelConcentrated": "top 20% of occupied scarcity cells carry >= 0.50 of total advective flux magnitude",
                "scarcityFluxHasLocalDirectionalPersistence": "flux-weighted within-cell directional persistence >= 0.20",
                "scarcityAndNeutralOccupyDifferentFluxProfiles": "cell-flux Jensen-Shannon divergence >= 0.05 bits",
                "scarcityAndNeutralHaveDifferentTurnoverProfiles": "abundance-turnover Jensen-Shannon divergence >= 0.05 bits",
                "deterministicReplayMatchesRUL021": "post-shock deltas match within 1e-12 and all final populations match",
            },
        },
        "results": results,
        "primaryTest": {"criteria": criteria, "criteriaPassed": int(sum(criteria.values())), "criteriaTotal": len(criteria), "pilotSupported": bool(all(criteria.values()))},
        "interpretationBoundary": "RUL-027 is a coarse-grained descriptive flux-network analysis. Fixed bins summarize founder-lineage advective rule motion and abundance turnover; recurring or condition-specific channels do not establish adaptive selection, optimality, or a continuous physical conservation law.",
        "conditionProfiles": {"scarcity": {"cellFluxProfile": scar["cellFluxProfile"], "abundanceTurnoverProfile": scar["abundanceTurnoverProfile"], "edgeFluxProfile": scar["edgeFluxProfile"]}, "neutral": {"cellFluxProfile": neut["cellFluxProfile"], "abundanceTurnoverProfile": neut["abundanceTurnoverProfile"], "edgeFluxProfile": neut["edgeFluxProfile"]}},
    }

    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "alife-flux-network-report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    summary = {k: v for k, v in report.items() if k != "conditionProfiles"}
    (OUT / "alife-flux-network-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    write_csv(OUT / "flux-cells.csv", scar_cells + neut_cells)
    write_csv(OUT / "flux-edges.csv", scar_edges + neut_edges)
    write_csv(OUT / "flux-segments.csv", all_segments)
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (OUT / "sha256.txt").write_text(f"{digest}  {report_path.name}\n")
    print(json.dumps({"experimentId": EXPERIMENT_ID, "results": results, "primaryTest": report["primaryTest"], "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
