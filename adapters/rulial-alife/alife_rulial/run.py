from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import numpy as np

RULE_DIMENSIONS = [
    ("forage_weight", 0.2, 2.0),
    ("hazard_avoidance", 0.2, 2.0),
    ("exploration", 0.0, 0.8),
    ("reproduction_threshold", 8.0, 16.0),
]

FEATURE_IDS = [
    "OBS-RULE-CENTROID-DISPLACEMENT",
    "OBS-RULE-DIVERSITY",
    "OBS-RULE-PATH-LENGTH",
    "OBS-POPULATION-RECOVERY",
    "OBS-LINEAGE-DIVERSITY",
]

DEFAULT_CONFIG: dict[str, Any] = {
    "world_size": 60.0,
    "steps": 260,
    "shock_step": 130,
    "initial_population": 72,
    "population_cap": 150,
    "resource_patch_count": 16,
    "hazard_patch_count": 7,
    "resource_capacity": 18.0,
    "resource_regen": 0.55,
    "scarcity_multiplier": 0.26,
    "food_gain": 1.05,
    "food_radius": 2.4,
    "hazard_radius": 3.3,
    "hazard_cost": 0.62,
    "movement_cost": 0.115,
    "speed": 1.25,
    "max_age": 240,
    "initial_energy": 7.0,
    "initial_rule_sd": 0.10,
    "mutation_sd": 0.035,
    "record_every": 5,
}

CENTER_RULE = np.array([1.05, 1.05, 0.35, 11.5], dtype=float)


def _bounds() -> tuple[np.ndarray, np.ndarray]:
    lo = np.array([d[1] for d in RULE_DIMENSIONS], dtype=float)
    hi = np.array([d[2] for d in RULE_DIMENSIONS], dtype=float)
    return lo, hi


def to_unit(rules: np.ndarray) -> np.ndarray:
    lo, hi = _bounds()
    return (rules - lo) / (hi - lo)


def _torus_delta(target: np.ndarray, source: np.ndarray, world: float) -> np.ndarray:
    delta = target - source
    return (delta + world / 2.0) % world - world / 2.0


def _normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return np.divide(v, n, out=np.zeros_like(v), where=n > 1e-12)


def _centroid_and_diversity(rules: np.ndarray) -> tuple[np.ndarray, float]:
    if len(rules) == 0:
        return np.full(len(RULE_DIMENSIONS), np.nan), float("nan")
    u = to_unit(rules)
    return np.mean(u, axis=0), float(np.mean(np.std(u, axis=0)))


def _lineage_diversity(founders: np.ndarray, initial_population: int) -> float:
    if len(founders) == 0:
        return 0.0
    counts = np.bincount(founders, minlength=initial_population).astype(float)
    p = counts[counts > 0] / counts.sum()
    h = -float(np.sum(p * np.log(p))) if len(p) else 0.0
    return h / math.log(initial_population) if initial_population > 1 else 0.0


def simulate_condition(seed: int, condition: str, config: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    if condition not in {"stable_mutable", "scarcity_mutable", "scarcity_frozen", "neutral_bottleneck_mutable"}:
        raise ValueError(f"unknown condition: {condition}")

    rng = np.random.default_rng(seed)
    world = float(cfg["world_size"])
    steps = int(cfg["steps"])
    shock_step = int(cfg["shock_step"])
    initial_population = int(cfg["initial_population"])
    pop_cap = int(cfg["population_cap"])

    # Environmental geometry is seed-matched across conditions.
    env_rng = np.random.default_rng(seed + 991_337)
    resource_pos = env_rng.uniform(0.0, world, size=(int(cfg["resource_patch_count"]), 2))
    hazard_pos = env_rng.uniform(0.0, world, size=(int(cfg["hazard_patch_count"]), 2))
    resource_stock = np.full(len(resource_pos), float(cfg["resource_capacity"]) * 0.75, dtype=float)

    positions = rng.uniform(0.0, world, size=(initial_population, 2))
    headings = _normalize(rng.normal(size=(initial_population, 2)))
    energy = np.full(initial_population, float(cfg["initial_energy"]), dtype=float)
    ages = rng.integers(0, 25, size=initial_population)
    founders = np.arange(initial_population, dtype=int)

    lo, hi = _bounds()
    rule_sd = float(cfg["initial_rule_sd"]) * (hi - lo)
    rules = np.clip(CENTER_RULE + rng.normal(size=(initial_population, len(RULE_DIMENSIONS))) * rule_sd, lo, hi)

    centroid0, diversity0 = _centroid_and_diversity(rules)
    history: list[dict[str, Any]] = []
    centroid_path: list[np.ndarray] = [centroid0.copy()]
    extinct = False
    neutral_bottleneck_applied = False
    neutral_bottleneck_fraction = float(cfg.get("neutral_bottleneck_fraction", 1.0))

    for t in range(steps):
        n = len(positions)
        if n == 0:
            extinct = True
            break

        scarcity = condition.startswith("scarcity") and t >= shock_step
        regen = float(cfg["resource_regen"]) * (float(cfg["scarcity_multiplier"]) if scarcity else 1.0)
        resource_stock = np.minimum(float(cfg["resource_capacity"]), resource_stock + regen)

        # Nearest food patch and nearest hazard define two environmental signals.
        resource_delta = _torus_delta(resource_pos[None, :, :], positions[:, None, :], world)
        resource_dist = np.linalg.norm(resource_delta, axis=2)
        # Empty patches are de-prioritized without changing the geometry.
        weighted_dist = resource_dist + (resource_stock[None, :] <= 0.05) * 1e6
        resource_idx = np.argmin(weighted_dist, axis=1)
        food_vec = _normalize(resource_delta[np.arange(n), resource_idx])

        hazard_delta = _torus_delta(hazard_pos[None, :, :], positions[:, None, :], world)
        hazard_dist = np.linalg.norm(hazard_delta, axis=2)
        hazard_idx = np.argmin(hazard_dist, axis=1)
        away_vec = -_normalize(hazard_delta[np.arange(n), hazard_idx])

        u = to_unit(rules)
        forage = rules[:, 0:1]
        avoid = rules[:, 1:2]
        exploration = rules[:, 2:3]
        random_vec = _normalize(rng.normal(size=(n, 2)))
        movement = forage * food_vec + avoid * away_vec + (0.15 + exploration) * random_vec + 0.15 * headings
        headings = _normalize(movement)
        positions = (positions + float(cfg["speed"]) * headings) % world

        # Feeding is local and stock limited.
        resource_delta_after = _torus_delta(resource_pos[None, :, :], positions[:, None, :], world)
        dist_after = np.linalg.norm(resource_delta_after, axis=2)
        nearest = np.argmin(dist_after, axis=1)
        nearest_dist = dist_after[np.arange(n), nearest]
        eaters = np.where(nearest_dist <= float(cfg["food_radius"]))[0]
        rng.shuffle(eaters)
        for i in eaters:
            patch = int(nearest[i])
            amount = min(float(cfg["food_gain"]), float(resource_stock[patch]))
            resource_stock[patch] -= amount
            energy[i] += amount

        hazard_delta_after = _torus_delta(hazard_pos[None, :, :], positions[:, None, :], world)
        hazard_d = np.min(np.linalg.norm(hazard_delta_after, axis=2), axis=1)
        # Avoidance reduces exposure cost but cannot eliminate it.
        avoidance_unit = u[:, 1]
        hazard_penalty = (hazard_d <= float(cfg["hazard_radius"])) * float(cfg["hazard_cost"]) * (1.1 - 0.65 * avoidance_unit)
        energy -= float(cfg["movement_cost"]) + hazard_penalty
        ages += 1

        # Reproduction is a rule-controlled threshold. Energy is split with the child.
        threshold = rules[:, 3]
        candidates = np.where((energy >= threshold) & (ages >= 8))[0]
        available = max(0, pop_cap - n)
        if len(candidates) > available:
            candidates = rng.choice(candidates, size=available, replace=False)
        if len(candidates):
            child_positions = positions[candidates] + rng.normal(scale=0.35, size=(len(candidates), 2))
            child_positions %= world
            child_headings = _normalize(headings[candidates] + rng.normal(scale=0.25, size=(len(candidates), 2)))
            child_energy = energy[candidates] * 0.48
            energy[candidates] *= 0.52
            child_ages = np.zeros(len(candidates), dtype=int)
            child_founders = founders[candidates].copy()
            child_rules = rules[candidates].copy()
            if condition != "scarcity_frozen":
                mut = rng.normal(size=child_rules.shape) * float(cfg["mutation_sd"]) * (hi - lo)
                child_rules = np.clip(child_rules + mut, lo, hi)
            positions = np.vstack([positions, child_positions])
            headings = np.vstack([headings, child_headings])
            energy = np.concatenate([energy, child_energy])
            ages = np.concatenate([ages, child_ages])
            founders = np.concatenate([founders, child_founders])
            rules = np.vstack([rules, child_rules])

        alive = (energy > 0.0) & (ages <= int(cfg["max_age"]))
        positions, headings, energy, ages, founders, rules = (
            positions[alive], headings[alive], energy[alive], ages[alive], founders[alive], rules[alive]
        )

        # Neutral bottleneck control: stable ecology + one rule-blind random cull at
        # the shock step.  The target fraction is derived outside this simulation
        # from the matched scarcity run for the same seed.  Mutation remains on.
        if condition == "neutral_bottleneck_mutable" and t == shock_step and not neutral_bottleneck_applied and len(rules):
            target = max(2, int(round(len(rules) * neutral_bottleneck_fraction)))
            target = min(target, len(rules))
            if target < len(rules):
                keep = np.sort(rng.choice(len(rules), size=target, replace=False))
                positions, headings, energy, ages, founders, rules = (
                    positions[keep], headings[keep], energy[keep], ages[keep], founders[keep], rules[keep]
                )
            neutral_bottleneck_applied = True

        if t % int(cfg["record_every"]) == 0 or t in {shock_step - 1, shock_step, steps - 1}:
            centroid, diversity = _centroid_and_diversity(rules)
            if np.all(np.isfinite(centroid)):
                centroid_path.append(centroid.copy())
            history.append({
                "step": t,
                "population": int(len(rules)),
                "meanEnergy": float(np.mean(energy)) if len(energy) else 0.0,
                "ruleCentroid": centroid.tolist() if np.all(np.isfinite(centroid)) else None,
                "ruleDiversity": diversity if math.isfinite(diversity) else None,
                "lineageDiversity": _lineage_diversity(founders, initial_population),
                "scarcityActive": bool(scarcity),
            })

    if len(rules):
        centroid_final, diversity_final = _centroid_and_diversity(rules)
    else:
        centroid_final = centroid_path[-1].copy()
        diversity_final = 0.0

    # Extract centroid just before shock from recorded history.
    pre_candidates = [row for row in history if row["step"] <= shock_step - 1 and row["ruleCentroid"] is not None]
    centroid_pre = np.array(pre_candidates[-1]["ruleCentroid"], dtype=float) if pre_candidates else centroid0.copy()
    final_delta = centroid_final - centroid0
    postshock_delta = centroid_final - centroid_pre
    postshock_displacement = float(np.linalg.norm(postshock_delta))
    path_length = float(sum(np.linalg.norm(b - a) for a, b in zip(centroid_path[:-1], centroid_path[1:])))

    post_pop = [row["population"] for row in history if row["step"] >= shock_step]
    pre_pop = [row["population"] for row in history if row["step"] < shock_step]
    reference_pop = float(np.mean(pre_pop[-5:])) if pre_pop else float(initial_population)
    final_pop = float(np.mean(post_pop[-5:])) if post_pop else float(len(rules))
    recovery = final_pop / max(reference_pop, 1.0)
    minimum_post_pop = float(min(post_pop)) if post_pop else float(len(rules))
    bottleneck_fraction = minimum_post_pop / max(reference_pop, 1.0)

    features = {
        "OBS-RULE-CENTROID-DISPLACEMENT": float(np.linalg.norm(final_delta)),
        "OBS-POSTSHOCK-RULE-DISPLACEMENT": postshock_displacement,
        "OBS-BOTTLENECK-DEPTH": float(1.0 - min(1.0, bottleneck_fraction)),
        "OBS-RULE-DIVERSITY": float(diversity_final),
        "OBS-RULE-PATH-LENGTH": path_length,
        "OBS-POPULATION-RECOVERY": float(recovery),
        "OBS-LINEAGE-DIVERSITY": _lineage_diversity(founders, initial_population),
    }

    return {
        "condition": condition,
        "seed": seed,
        "extinct": extinct,
        "stepsCompleted": int(history[-1]["step"] + 1) if history else 0,
        "finalPopulation": int(len(rules)),
        "initialCentroid": centroid0.tolist(),
        "preShockCentroid": centroid_pre.tolist(),
        "finalCentroid": centroid_final.tolist(),
        "finalDelta": final_delta.tolist(),
        "postShockDelta": postshock_delta.tolist(),
        "postShockDisplacement": postshock_displacement,
        "preShockReferencePopulation": reference_pop,
        "minimumPostShockPopulation": minimum_post_pop,
        "bottleneckFraction": bottleneck_fraction,
        "neutralBottleneckApplied": neutral_bottleneck_applied,
        "neutralBottleneckFractionRequested": neutral_bottleneck_fraction if condition == "neutral_bottleneck_mutable" else None,
        "initialDiversity": diversity0,
        "features": features,
        "history": history,
    }


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na < 1e-12 or nb < 1e-12:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def _directional_reproducibility(runs: list[dict[str, Any]]) -> float:
    deltas = [np.asarray(run["postShockDelta"], dtype=float) for run in runs]
    vals = [_cosine(deltas[i], deltas[j]) for i in range(len(deltas)) for j in range(i + 1, len(deltas))]
    return float(np.mean(vals)) if vals else 0.0


def _summary(runs: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "runCount": len(runs),
        "extinctionCount": sum(bool(r["extinct"]) for r in runs),
        "medianRuleDisplacement": float(np.median([r["features"]["OBS-RULE-CENTROID-DISPLACEMENT"] for r in runs])),
        "medianRulePathLength": float(np.median([r["features"]["OBS-RULE-PATH-LENGTH"] for r in runs])),
        "medianFinalRuleDiversity": float(np.median([r["features"]["OBS-RULE-DIVERSITY"] for r in runs])),
        "medianPopulationRecovery": float(np.median([r["features"]["OBS-POPULATION-RECOVERY"] for r in runs])),
        "medianLineageDiversity": float(np.median([r["features"]["OBS-LINEAGE-DIVERSITY"] for r in runs])),
        "directionalReproducibility": _directional_reproducibility(runs),
    }


def run_experiment(seeds: list[int], config: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    conditions = ["stable_mutable", "scarcity_mutable", "scarcity_frozen"]
    all_runs = [simulate_condition(seed, condition, cfg) for seed in seeds for condition in conditions]
    by_condition = {condition: [r for r in all_runs if r["condition"] == condition] for condition in conditions}
    summaries = {condition: _summary(runs) for condition, runs in by_condition.items()}

    scarcity = summaries["scarcity_mutable"]
    stable = summaries["stable_mutable"]
    frozen = summaries["scarcity_frozen"]
    criteria = {
        "scarcityExceedsStableDisplacement": scarcity["medianRuleDisplacement"] - stable["medianRuleDisplacement"] >= 0.015,
        "scarcityExceedsFrozenDisplacement": scarcity["medianRuleDisplacement"] - frozen["medianRuleDisplacement"] >= 0.01,
        "scarcityDirectionallyReproducible": scarcity["directionalReproducibility"] >= 0.20,
        "scarcityPopulationPersists": scarcity["extinctionCount"] <= max(1, len(seeds) // 4),
    }
    return {
        "config": cfg,
        "seeds": seeds,
        "conditions": summaries,
        "criteria": criteria,
        "criteriaPassed": int(sum(criteria.values())),
        "criteriaTotal": len(criteria),
        "runs": all_runs,
    }


def run_selection_bottleneck_experiment(seeds: list[int], config: dict[str, Any] | None = None) -> dict[str, Any]:
    """RUL-021 matched selective-pressure vs neutral-bottleneck experiment.

    For each seed, scarcity_mutable is simulated first.  Its minimum post-shock
    population fraction (relative to the pre-shock reference population) defines
    the depth of a rule-blind one-time cull in the matched neutral condition.
    Both arms retain mutation.  A stable mutable arm estimates background drift.
    """
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    scarcity_runs: list[dict[str, Any]] = []
    stable_runs: list[dict[str, Any]] = []
    neutral_runs: list[dict[str, Any]] = []

    for seed in seeds:
        scarcity = simulate_condition(seed, "scarcity_mutable", cfg)
        scarcity_runs.append(scarcity)
        stable_runs.append(simulate_condition(seed, "stable_mutable", cfg))

        target_fraction = float(np.clip(scarcity["bottleneckFraction"], 0.02, 1.0))
        neutral_cfg = {**cfg, "neutral_bottleneck_fraction": target_fraction}
        neutral = simulate_condition(seed, "neutral_bottleneck_mutable", neutral_cfg)
        neutral_runs.append(neutral)

    def post_summary(runs: list[dict[str, Any]]) -> dict[str, Any]:
        post_disp = np.array([float(r["postShockDisplacement"]) for r in runs], dtype=float)
        bottleneck = np.array([float(r["bottleneckFraction"]) for r in runs], dtype=float)
        return {
            **_summary(runs),
            "medianPostShockRuleDisplacement": float(np.median(post_disp)),
            "meanPostShockRuleDisplacement": float(np.mean(post_disp)),
            "medianBottleneckFraction": float(np.median(bottleneck)),
        }

    summaries = {
        "stable_mutable": post_summary(stable_runs),
        "scarcity_mutable": post_summary(scarcity_runs),
        "neutral_bottleneck_mutable": post_summary(neutral_runs),
    }

    paired_excess = np.array([
        float(s["postShockDisplacement"]) - float(n["postShockDisplacement"])
        for s, n in zip(scarcity_runs, neutral_runs)
    ])
    neutral_match_error = np.array([
        abs(float(s["bottleneckFraction"]) - float(n["bottleneckFraction"]))
        for s, n in zip(scarcity_runs, neutral_runs)
    ])

    criteria = {
        "selectiveExceedsNeutralPostShockMotion": float(np.median(paired_excess)) >= 0.015,
        "selectiveExcessPositiveInMajority": int(np.sum(paired_excess > 0)) >= math.ceil(2 * len(seeds) / 3),
        "selectiveDirectionExceedsNeutral": summaries["scarcity_mutable"]["directionalReproducibility"] - summaries["neutral_bottleneck_mutable"]["directionalReproducibility"] >= 0.10,
        "neutralBottleneckMatched": float(np.median(neutral_match_error)) <= 0.06,
        "selectivePopulationPersists": summaries["scarcity_mutable"]["extinctionCount"] <= max(1, len(seeds) // 4),
    }

    return {
        "config": cfg,
        "seeds": seeds,
        "conditions": summaries,
        "pairedExcessPostShockDisplacement": paired_excess.tolist(),
        "pairedExcessMedian": float(np.median(paired_excess)),
        "pairedExcessPositiveCount": int(np.sum(paired_excess > 0)),
        "neutralBottleneckMatchErrorMedian": float(np.median(neutral_match_error)),
        "criteria": criteria,
        "criteriaPassed": int(sum(criteria.values())),
        "criteriaTotal": len(criteria),
        "runs": stable_runs + scarcity_runs + neutral_runs,
    }
