from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

SCHEMA_VERSION = "entropy-run/1.0.0"
ENGINE_VERSION = "0.2.0"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def git_revision() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return "uncommitted-local-adapter"


def periodic_delta(delta: np.ndarray, size: float) -> np.ndarray:
    return (delta + size / 2.0) % size - size / 2.0


def entropy_from_hist(values: np.ndarray, bins: int, value_range: tuple[float, float]) -> float:
    counts, _ = np.histogram(values, bins=bins, range=value_range)
    probabilities = counts[counts > 0] / max(1, counts.sum())
    return float(-(probabilities * np.log(probabilities)).sum())


def spatial_entropy(position: np.ndarray, width: float, height: float, bins: int = 10) -> float:
    counts, _, _ = np.histogram2d(position[:, 0], position[:, 1], bins=bins, range=[[0, width], [0, height]])
    probabilities = counts[counts > 0] / max(1, counts.sum())
    return float(-(probabilities * np.log(probabilities)).sum())


def simulate(config: dict[str, Any], noise: float, seed: int) -> dict[str, list[float]]:
    rng = np.random.default_rng(seed)
    n = int(config["n_agents"])
    width, height = float(config["width"]), float(config["height"])
    positions = np.column_stack((rng.uniform(0, width, n), rng.uniform(0, height, n)))
    angles = rng.uniform(-math.pi, math.pi, n)
    velocities = np.column_stack((np.cos(angles), np.sin(angles)))
    max_speed = float(config["max_speed"])
    dt = float(config["dt"])
    neighbor_radius = float(config["neighbor_radius"])
    separation_radius = float(config["separation_radius"])
    pressure = float(config["pressure"])
    control = float(config["control"])
    history = {"alignment": [], "heading_entropy": [], "spatial_entropy": [], "speed_variance": []}

    for _ in range(int(config["steps"])):
        next_velocity = velocities.copy()
        for i in range(n):
            delta = positions - positions[i]
            delta[:, 0] = periodic_delta(delta[:, 0], width)
            delta[:, 1] = periodic_delta(delta[:, 1], height)
            distances = np.linalg.norm(delta, axis=1)
            neighbors = (distances > 0) & (distances < neighbor_radius)
            close = (distances > 0) & (distances < separation_radius)
            alignment = velocities[neighbors].mean(axis=0) - velocities[i] if neighbors.any() else 0.0
            cohesion = delta[neighbors].mean(axis=0) / neighbor_radius if neighbors.any() else 0.0
            separation = -(delta[close] / np.maximum(distances[close, None], 1e-9)).sum(axis=0) if close.any() else 0.0
            goal = np.array([1.0, 0.0])
            perturbation = rng.normal(0.0, noise, size=2)
            next_velocity[i] += dt * (control * (alignment + 0.6 * cohesion) + 1.2 * separation + pressure * goal + perturbation)
        speeds = np.linalg.norm(next_velocity, axis=1)
        next_velocity *= np.minimum(1.0, max_speed / np.maximum(speeds, 1e-9))[:, None]
        velocities = next_velocity
        positions = (positions + dt * velocities) % np.array([width, height])
        unit = velocities / np.maximum(np.linalg.norm(velocities, axis=1, keepdims=True), 1e-9)
        headings = np.arctan2(velocities[:, 1], velocities[:, 0])
        history["alignment"].append(float(np.linalg.norm(unit.mean(axis=0))))
        history["heading_entropy"].append(entropy_from_hist(headings, 24, (-math.pi, math.pi)))
        history["spatial_entropy"].append(spatial_entropy(positions, width, height))
        history["speed_variance"].append(float(np.var(np.linalg.norm(velocities, axis=1))))
    return history


def noise_sweep(config: dict[str, Any], seed: int) -> dict[str, Any]:
    sweep = []
    for index, noise in enumerate(config["noise_levels"]):
        history = simulate(config, float(noise), seed + index)
        tail = slice(max(0, len(history["alignment"]) - 60), None)
        sweep.append({
            "noise": float(noise),
            "alignment": float(np.mean(history["alignment"][tail])),
            "heading_entropy": float(np.mean(history["heading_entropy"][tail])),
            "spatial_entropy": float(np.mean(history["spatial_entropy"][tail])),
            "speed_variance": float(np.mean(history["speed_variance"][tail])),
        })
    return {"sweep": sweep}


def build_artifact(config: dict[str, Any], result: dict[str, Any], seed: int, started_at: str) -> dict[str, Any]:
    completed_at = utc_now()
    sweep = result["sweep"]
    noise = [row["noise"] for row in sweep]
    alignment = [row["alignment"] for row in sweep]
    heading_entropy = [row["heading_entropy"] for row in sweep]
    spatial = [row["spatial_entropy"] for row in sweep]
    variance = [row["speed_variance"] for row in sweep]
    collapse_match = next((noise[i] for i, value in enumerate(alignment) if value < 0.5), None)
    entropy_match = next((noise[i] for i, value in enumerate(heading_entropy) if value > heading_entropy[0] + 0.2), None)
    collapse = collapse_match if collapse_match is not None else noise[-1]
    entropy_rise = entropy_match if entropy_match is not None else noise[-1]
    conclusion = "inconclusive" if collapse_match is None or entropy_match is None else ("supports" if entropy_rise <= collapse else "challenges")
    run_id = f"RUN-BOIDS-NOISE-{seed}"
    return {
        "schemaVersion": SCHEMA_VERSION,
        "run": {"id": run_id, "experimentId": "E-BOIDS-001", "hypothesisId": "H-BOIDS-001", "engineId": "ENGINE-PCC-BOIDS", "seed": seed, "parameters": {**{k: v for k, v in config.items() if k != "noise_levels"}, "noise_level_count": len(noise)}, "startedAt": started_at, "completedAt": completed_at, "status": "completed"},
        "provenance": {"repository": "HussainAther/pcc-boids", "repositoryId": "REPO-PCC-BOIDS", "revision": git_revision(), "engineVersion": ENGINE_VERSION, "observableRegistryVersion": "0.2.0", "deterministic": True},
        "measurements": [
            {"id": f"{run_id}-NOISE", "name": "Chaos/noise level", "values": noise},
            {"id": f"{run_id}-ALIGNMENT", "name": "Mean polarization", "values": alignment, "timestamps": noise},
            {"id": f"{run_id}-HEADING-ENTROPY", "name": "Heading entropy", "values": heading_entropy, "timestamps": noise},
            {"id": f"{run_id}-SPATIAL-ENTROPY", "name": "Spatial entropy", "values": spatial, "timestamps": noise},
            {"id": f"{run_id}-SPEED-VARIANCE", "name": "Speed variance", "values": variance, "timestamps": noise}
        ],
        "observableResults": [
            {"id": f"RES-{seed}-POLARIZATION", "observableId": "OBS-POLARIZATION", "value": alignment[-1], "computationTimeMs": 0.0, "metadata": {"noise": noise[-1]}},
            {"id": f"RES-{seed}-HEADING-ENTROPY", "observableId": "OBS-HEADING-ENTROPY", "value": heading_entropy[-1], "computationTimeMs": 0.0, "metadata": {"noise": noise[-1]}},
            {"id": f"RES-{seed}-SPATIAL", "observableId": "OBS-SPATIAL", "value": spatial[-1], "computationTimeMs": 0.0, "metadata": {"noise": noise[-1]}},
            {"id": f"RES-{seed}-TRANSITION", "observableId": "OBS-TRANSITION-LEAD", "value": collapse - entropy_rise, "unit": "noise", "computationTimeMs": 0.0, "metadata": {"alignment_collapse": collapse, "entropy_rise": entropy_rise}}
        ],
        "artifacts": [{"id": f"{run_id}-CONFIG", "kind": "configuration", "path": "configs/noise-sweep.json", "mediaType": "application/json"}],
        "conclusion": {"status": conclusion, "hypothesisId": "H-BOIDS-001", "rationale": (f"Heading-entropy rise occurred at chaos={entropy_rise:.3f}; polarization fell below 0.5 at chaos={collapse:.3f}. A positive lead means entropy changed earlier." if collapse_match is not None and entropy_match is not None else "At least one preregistered transition threshold was not crossed within the configured chaos sweep; the benchmark is inconclusive and the sweep range or thresholds must be reviewed before interpretation.")},
        "notes": ["Each noise level uses a deterministic derived seed.", "This benchmark tests one implementation and parameterization; it does not establish universal early-warning behavior."]
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the PCC-Boids EBID noise sweep and emit an Entropy Studio artifact.")
    parser.add_argument("--experiment", default="noise-sweep", choices=["noise-sweep"])
    parser.add_argument("--seed", type=int, default=12345)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    started_at = utc_now()
    config = json.loads(args.config.read_text())
    artifact = build_artifact(config, noise_sweep(config, args.seed), args.seed, started_at)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(artifact, indent=2, sort_keys=True)
    args.output.write_text(payload + "\n")
    print(f"wrote {args.output} sha256={hashlib.sha256(payload.encode()).hexdigest()}")


if __name__ == "__main__":
    main()
