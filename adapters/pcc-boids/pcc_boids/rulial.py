from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

FEATURE_IDS = [
    "OBS-POLARIZATION",
    "OBS-HEADING-ENTROPY",
    "OBS-SPATIAL",
    "OBS-SPEED-VARIANCE",
    "OBS-TRANSITION-RATE",
    "OBS-METASTABLE-DWELL",
]

DIMENSIONS = [
    ("separation", 0.4, 1.8),
    ("alignment", 0.2, 1.8),
    ("cohesion", 0.2, 1.4),
    ("chaos", 0.0, 0.60),
    ("neighborhood_radius", 8.0, 20.0),
]

DISCOVERY_SEEDS = [12345, 22345, 32345]
VALIDATION_SEEDS = [42345, 52345]


def entropy_from_hist(values: np.ndarray, bins: int, value_range: tuple[float, float]) -> float:
    counts, _ = np.histogram(values, bins=bins, range=value_range)
    probabilities = counts[counts > 0] / max(1, counts.sum())
    return float(-(probabilities * np.log(probabilities)).sum())


def spatial_entropy(position: np.ndarray, width: float, height: float, bins: int = 8) -> float:
    counts, _, _ = np.histogram2d(position[:, 0], position[:, 1], bins=bins, range=[[0, width], [0, height]])
    probabilities = counts[counts > 0] / max(1, counts.sum())
    return float(-(probabilities * np.log(probabilities)).sum())


def latin_hypercube(n: int, d: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    result = np.empty((n, d), dtype=float)
    for j in range(d):
        perm = rng.permutation(n)
        result[:, j] = (perm + rng.random(n)) / n
    return result


def unit_to_rule(u: np.ndarray) -> dict[str, float]:
    return {name: float(lo + u[i] * (hi - lo)) for i, (name, lo, hi) in enumerate(DIMENSIONS)}


def rule_to_unit(rule: dict[str, float]) -> np.ndarray:
    return np.array([(rule[name] - lo) / (hi - lo) for name, lo, hi in DIMENSIONS], dtype=float)


def rule_id(prefix: str, index: int) -> str:
    return f"{prefix}-{index:03d}"


def classify_alignment(value: float) -> int:
    # Frozen operational PCC-like macrostate bins; descriptive only.
    if value >= 0.75:
        return 0  # control-like ordered flock
    if value >= 0.40:
        return 1  # pressure-like intermediate order
    return 2  # chaos-like low polarization


def simulate_rule(config: dict[str, Any], rule: dict[str, float], seed: int) -> dict[str, Any]:
    rng = np.random.default_rng(seed)
    n = int(config.get("n_agents", 56))
    steps = int(config.get("steps", 320))
    dt = float(config.get("dt", 0.2))
    width = float(config.get("width", 100.0))
    height = float(config.get("height", 100.0))
    separation_radius = float(config.get("separation_radius", 3.0))
    max_speed = float(config.get("max_speed", 2.5))
    pressure = float(config.get("pressure", 0.35))
    tail_fraction = float(config.get("tail_fraction", 0.25))

    positions = np.column_stack((rng.uniform(0, width, n), rng.uniform(0, height, n)))
    angles = rng.uniform(-math.pi, math.pi, n)
    velocities = np.column_stack((np.cos(angles), np.sin(angles)))
    history = np.empty((steps, 4), dtype=float)
    states = np.empty(steps, dtype=int)

    sep_w = float(rule["separation"])
    align_w = float(rule["alignment"])
    coh_w = float(rule["cohesion"])
    chaos = float(rule["chaos"])
    radius = float(rule["neighborhood_radius"])

    for t in range(steps):
        # Pairwise periodic displacement: delta[i,j] points from i to j.
        delta = positions[None, :, :] - positions[:, None, :]
        delta[:, :, 0] = (delta[:, :, 0] + width / 2.0) % width - width / 2.0
        delta[:, :, 1] = (delta[:, :, 1] + height / 2.0) % height - height / 2.0
        distances = np.linalg.norm(delta, axis=2)
        np.fill_diagonal(distances, np.inf)
        neigh = distances < radius
        close = distances < separation_radius

        counts = neigh.sum(axis=1)
        safe_counts = np.maximum(counts, 1)[:, None]
        mean_velocity = neigh.astype(float) @ velocities / safe_counts
        alignment_vec = mean_velocity - velocities
        alignment_vec[counts == 0] = 0.0

        cohesion_vec = (delta * neigh[:, :, None]).sum(axis=1) / safe_counts / max(radius, 1e-9)
        cohesion_vec[counts == 0] = 0.0

        safe_distances = np.where(np.isfinite(distances), np.maximum(distances, 1e-9), 1.0)
        separation_vec = -(delta / safe_distances[:, :, None] * close[:, :, None]).sum(axis=1)

        goal = np.array([1.0, 0.0])
        perturbation = rng.normal(0.0, chaos, size=(n, 2))
        accel = sep_w * separation_vec + align_w * alignment_vec + coh_w * cohesion_vec + pressure * goal + perturbation
        next_velocity = velocities + dt * accel
        speeds = np.linalg.norm(next_velocity, axis=1)
        next_velocity *= np.minimum(1.0, max_speed / np.maximum(speeds, 1e-9))[:, None]
        velocities = next_velocity
        positions = (positions + dt * velocities) % np.array([width, height])

        unit = velocities / np.maximum(np.linalg.norm(velocities, axis=1, keepdims=True), 1e-9)
        headings = np.arctan2(velocities[:, 1], velocities[:, 0])
        polarization = float(np.linalg.norm(unit.mean(axis=0)))
        history[t, 0] = polarization
        history[t, 1] = entropy_from_hist(headings, 24, (-math.pi, math.pi))
        history[t, 2] = spatial_entropy(positions, width, height)
        history[t, 3] = float(np.var(np.linalg.norm(velocities, axis=1)))
        states[t] = classify_alignment(polarization)

    tail_start = max(0, int(round(steps * (1.0 - tail_fraction))))
    tail = history[tail_start:]
    transitions = int(np.count_nonzero(states[1:] != states[:-1]))
    transition_rate = transitions / max(1, steps - 1)
    dwell_lengths: list[int] = []
    start = 0
    for i in range(1, steps + 1):
        if i == steps or states[i] != states[start]:
            dwell_lengths.append(i - start)
            start = i

    return {
        "features": {
            "OBS-POLARIZATION": float(np.mean(tail[:, 0])),
            "OBS-HEADING-ENTROPY": float(np.mean(tail[:, 1])),
            "OBS-SPATIAL": float(np.mean(tail[:, 2])),
            "OBS-SPEED-VARIANCE": float(np.mean(tail[:, 3])),
            "OBS-TRANSITION-RATE": float(transition_rate),
            "OBS-METASTABLE-DWELL": float(np.mean(dwell_lengths) / steps),
        },
        "terminal_state": int(states[-1]),
    }


def mean_features(runs: list[dict[str, Any]]) -> dict[str, float]:
    return {feature: float(np.mean([run["features"][feature] for run in runs])) for feature in FEATURE_IDS}


def feature_scale(profiles: list[dict[str, Any]]) -> dict[str, float]:
    scales: dict[str, float] = {}
    for feature in FEATURE_IDS:
        values = np.array([p["features"][feature] for p in profiles], dtype=float)
        lo, hi = np.quantile(values, [0.05, 0.95]) if len(values) >= 20 else (values.min(), values.max())
        scales[feature] = float(max(hi - lo, 1e-9))
    return scales


def feature_distance(a: dict[str, float], b: dict[str, float], scales: dict[str, float]) -> float:
    z = [(a[f] - b[f]) / scales[f] for f in FEATURE_IDS]
    return float(np.sqrt(np.mean(np.square(z))))


def rankdata(values: np.ndarray) -> np.ndarray:
    order = np.argsort(values, kind="mergesort")
    ranks = np.empty(len(values), dtype=float)
    i = 0
    while i < len(values):
        j = i + 1
        while j < len(values) and values[order[j]] == values[order[i]]:
            j += 1
        rank = (i + j - 1) / 2.0 + 1.0
        ranks[order[i:j]] = rank
        i = j
    return ranks


def spearman(x: list[float], y: list[float]) -> float:
    if len(x) < 2:
        return float("nan")
    rx = rankdata(np.asarray(x, dtype=float))
    ry = rankdata(np.asarray(y, dtype=float))
    if np.std(rx) == 0 or np.std(ry) == 0:
        return 0.0
    return float(np.corrcoef(rx, ry)[0, 1])


def build_profiles(points: list[dict[str, Any]], seeds: list[int], config: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    runs: list[dict[str, Any]] = []
    profiles: list[dict[str, Any]] = []
    for point in points:
        point_runs = []
        for seed in seeds:
            result = simulate_rule(config, point["rule"], seed)
            run = {"ruleId": point["id"], "seed": seed, **result}
            runs.append(run)
            point_runs.append(run)
        profiles.append({"ruleId": point["id"], "rule": point["rule"], "features": mean_features(point_runs), "seedCount": len(seeds)})
    return runs, profiles


def local_edges(profiles: list[dict[str, Any]], scales: dict[str, float], k: int = 4) -> list[dict[str, Any]]:
    units = np.array([rule_to_unit(p["rule"]) for p in profiles])
    seen: set[tuple[int, int]] = set()
    edges = []
    for i in range(len(profiles)):
        distances = np.linalg.norm(units - units[i], axis=1) / math.sqrt(len(DIMENSIONS))
        for j in np.argsort(distances)[1:k+1]:
            a, b = sorted((i, int(j)))
            if (a, b) in seen:
                continue
            seen.add((a, b))
            dr = float(distances[j])
            de = feature_distance(profiles[a]["features"], profiles[b]["features"], scales)
            edges.append({
                "leftRuleId": profiles[a]["ruleId"],
                "rightRuleId": profiles[b]["ruleId"],
                "ruleDistance": dr,
                "observableDistance": de,
                "sensitivity": de / max(dr, 1e-12),
            })
    return sorted(edges, key=lambda e: e["sensitivity"], reverse=True)


def select_candidate_edges(edges: list[dict[str, Any]], count: int = 8) -> list[dict[str, Any]]:
    selected = []
    endpoint_use: dict[str, int] = {}
    for edge in edges:
        a, b = edge["leftRuleId"], edge["rightRuleId"]
        if endpoint_use.get(a, 0) >= 2 or endpoint_use.get(b, 0) >= 2:
            continue
        selected.append(edge)
        endpoint_use[a] = endpoint_use.get(a, 0) + 1
        endpoint_use[b] = endpoint_use.get(b, 0) + 1
        if len(selected) >= count:
            break
    return selected


def run_campaign(output_dir: Path, discovery_points: int = 32) -> dict[str, Any]:
    config = {
        "n_agents": 40,
        "steps": 200,
        "dt": 0.2,
        "width": 100.0,
        "height": 100.0,
        "separation_radius": 3.0,
        "max_speed": 2.5,
        "pressure": 0.35,
        "tail_fraction": 0.25,
    }
    lhs = latin_hypercube(discovery_points, len(DIMENSIONS), 20260824)
    points = [{"id": rule_id("BOIDS-D", i), "rule": unit_to_rule(lhs[i])} for i in range(discovery_points)]
    discovery_runs, discovery_profiles = build_profiles(points, DISCOVERY_SEEDS, config)
    scales = feature_scale(discovery_profiles)
    edges = local_edges(discovery_profiles, scales, k=4)
    candidates = select_candidate_edges(edges, 8)

    profile_by_id = {p["ruleId"]: p for p in discovery_profiles}
    candidate_ids = sorted({e["leftRuleId"] for e in candidates} | {e["rightRuleId"] for e in candidates})
    endpoint_points = [{"id": rid, "rule": profile_by_id[rid]["rule"]} for rid in candidate_ids]
    endpoint_runs, endpoint_profiles = build_profiles(endpoint_points, VALIDATION_SEEDS, config)
    endpoint_by_id = {p["ruleId"]: p for p in endpoint_profiles}

    probes = []
    for i, edge in enumerate(candidates):
        ua = rule_to_unit(profile_by_id[edge["leftRuleId"]]["rule"])
        ub = rule_to_unit(profile_by_id[edge["rightRuleId"]]["rule"])
        mid = (ua + ub) / 2.0
        # Deterministic, small transverse jitter while staying inside the design cube.
        rng = np.random.default_rng(9000 + i)
        jitter = rng.normal(size=len(DIMENSIONS))
        edge_dir = ub - ua
        if np.linalg.norm(edge_dir) > 0:
            jitter -= np.dot(jitter, edge_dir) / np.dot(edge_dir, edge_dir) * edge_dir
        if np.linalg.norm(jitter) > 0:
            jitter = jitter / np.linalg.norm(jitter) * 0.035
        u = np.clip(mid + jitter, 0.0, 1.0)
        probes.append({"id": rule_id("BOIDS-V", i), "rule": unit_to_rule(u), "sourceEdge": [edge["leftRuleId"], edge["rightRuleId"]]})
    probe_runs, probe_profiles = build_profiles(probes, VALIDATION_SEEDS, config)
    probe_by_id = {p["ruleId"]: p for p in probe_profiles}

    all_dr: list[float] = []
    all_de: list[float] = []
    for i in range(len(discovery_profiles)):
        ui = rule_to_unit(discovery_profiles[i]["rule"])
        for j in range(i + 1, len(discovery_profiles)):
            uj = rule_to_unit(discovery_profiles[j]["rule"])
            all_dr.append(float(np.linalg.norm(ui - uj) / math.sqrt(len(DIMENSIONS))))
            all_de.append(feature_distance(discovery_profiles[i]["features"], discovery_profiles[j]["features"], scales))

    validation_rows = []
    discovery_sens = []
    holdout_sens = []
    local_distances = np.array([e["observableDistance"] for e in edges], dtype=float)
    local_q75 = float(np.quantile(local_distances, 0.75))
    retained = 0
    for i, edge in enumerate(candidates):
        left_disc = profile_by_id[edge["leftRuleId"]]
        right_disc = profile_by_id[edge["rightRuleId"]]
        left_hold = endpoint_by_id[edge["leftRuleId"]]
        right_hold = endpoint_by_id[edge["rightRuleId"]]
        de_hold = feature_distance(left_hold["features"], right_hold["features"], scales)
        s_hold = de_hold / max(edge["ruleDistance"], 1e-12)
        probe = probe_by_id[rule_id("BOIDS-V", i)]
        dl = feature_distance(probe["features"], left_hold["features"], scales)
        dr = feature_distance(probe["features"], right_hold["features"], scales)
        feature_mid = {f: (left_hold["features"][f] + right_hold["features"][f]) / 2.0 for f in FEATURE_IDS}
        nonlinear = feature_distance(probe["features"], feature_mid, scales)
        is_retained = de_hold >= local_q75
        retained += int(is_retained)
        discovery_sens.append(edge["sensitivity"])
        holdout_sens.append(s_hold)
        validation_rows.append({
            **edge,
            "holdoutObservableDistance": de_hold,
            "holdoutSensitivity": s_hold,
            "probeRuleId": probe["ruleId"],
            "probeDistanceToLeft": dl,
            "probeDistanceToRight": dr,
            "probeMidpointResidual": nonlinear,
            "retainedAboveDiscoveryLocalQ75": is_retained,
        })

    report = {
        "schemaVersion": "entropy-rulial-boids/1.0.0",
        "experimentId": "RUL-006",
        "ruleSpaceId": "RSPACE-BOIDS-001",
        "sampling": {
            "design": "deterministic Latin hypercube discovery plus adaptive transverse midpoint probes",
            "discoveryPointCount": discovery_points,
            "discoverySeeds": DISCOVERY_SEEDS,
            "validationSeeds": VALIDATION_SEEDS,
            "candidateEdgeCount": len(candidates),
            "boundaryProbeCount": len(probes),
            "dimensions": [{"id": name, "min": lo, "max": hi} for name, lo, hi in DIMENSIONS],
        },
        "simulation": {**config, "discoveryRunCount": len(discovery_runs), "validationEndpointRunCount": len(endpoint_runs), "boundaryProbeRunCount": len(probe_runs), "totalRunCount": len(discovery_runs) + len(endpoint_runs) + len(probe_runs)},
        "featureScaling": scales,
        "discovery": {
            "pairwiseRuleVsObservableSpearman": spearman(all_dr, all_de),
            "localEdgeCount": len(edges),
            "localObservableDistanceQ75": local_q75,
            "topCandidateEdges": candidates,
        },
        "validation": {
            "candidateSensitivitySpearman": spearman(discovery_sens, holdout_sens),
            "retainedCandidateCount": retained,
            "candidateCount": len(candidates),
            "retentionFraction": retained / max(1, len(candidates)),
            "rows": validation_rows,
        },
        "interpretationBoundary": [
            "The rule-space sample is finite and does not establish a universal Boids phase diagram.",
            "PCC-like macrostate bins are frozen operational summaries of polarization, not semantic proof of pressure, chaos, or control.",
            "Candidate boundaries are discovery-selected; held-out seeds and independently simulated probe points are used only as a stress test.",
            "Cross-substrate comparison to ECA is descriptive until a common preregistered statistic is frozen and independently validated.",
        ],
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "boids-rulial-report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    summary = {k: report[k] for k in ["schemaVersion", "experimentId", "ruleSpaceId", "sampling", "simulation", "discovery", "validation", "interpretationBoundary"]}
    # Keep UI summary light by dropping row-heavy arrays.
    summary["discovery"] = {k: v for k, v in report["discovery"].items() if k != "topCandidateEdges"}
    summary["discovery"]["topCandidateEdges"] = candidates[:8]
    summary["validation"] = {k: v for k, v in report["validation"].items() if k != "rows"}
    summary["validation"]["rows"] = validation_rows[:8]
    (output_dir / "boids-rulial-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")

    with (output_dir / "discovery-profiles.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["rule_id", *[name for name, _, _ in DIMENSIONS], *FEATURE_IDS])
        for p in discovery_profiles:
            writer.writerow([p["ruleId"], *[p["rule"][name] for name, _, _ in DIMENSIONS], *[p["features"][fid] for fid in FEATURE_IDS]])
    with (output_dir / "candidate-boundaries.csv").open("w", newline="") as f:
        keys = list(validation_rows[0].keys()) if validation_rows else []
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader(); writer.writerows(validation_rows)
    with (output_dir / "boundary-probes.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["rule_id", "source_left", "source_right", *[name for name, _, _ in DIMENSIONS], *FEATURE_IDS])
        for point, profile in zip(probes, probe_profiles):
            writer.writerow([point["id"], *point["sourceEdge"], *[point["rule"][name] for name, _, _ in DIMENSIONS], *[profile["features"][fid] for fid in FEATURE_IDS]])

    report_bytes = (output_dir / "boids-rulial-report.json").read_bytes()
    (output_dir / "sha256.txt").write_text(hashlib.sha256(report_bytes).hexdigest() + "  boids-rulial-report.json\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Run RUL-006 multidimensional Boids rule-space stress test.")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--discovery-points", type=int, default=32)
    args = parser.parse_args()
    report = run_campaign(args.output_dir, args.discovery_points)
    print(json.dumps({
        "totalRuns": report["simulation"]["totalRunCount"],
        "ruleObservableSpearman": report["discovery"]["pairwiseRuleVsObservableSpearman"],
        "candidateSensitivitySpearman": report["validation"]["candidateSensitivitySpearman"],
        "retentionFraction": report["validation"]["retentionFraction"],
    }, indent=2))


if __name__ == "__main__":
    main()
