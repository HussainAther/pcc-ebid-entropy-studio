from __future__ import annotations

import math
from typing import Any

import numpy as np

FEATURE_IDS = [
    "OBS-NETWORK-ACTIVITY",
    "OBS-SHANNON",
    "OBS-NETWORK-ORDER",
    "OBS-SWITCH-RATE",
    "OBS-TRANSITION-RATE",
    "OBS-METASTABLE-DWELL",
]

DIMENSIONS = [
    ("threshold", 0.25, 0.75),
    ("coupling", 0.50, 2.50),
    ("memory", 0.00, 1.50),
    ("temperature", 0.08, 0.50),
]

TOPOLOGIES = ["ring", "small_world", "erdos_renyi"]
DISCOVERY_SEEDS = [71011, 71023, 71039]
VALIDATION_SEEDS = [72019, 72031]
TOPOLOGY_SEEDS = {"ring": 8801, "small_world": 8817, "erdos_renyi": 8837}


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


def _add_edge(adj: list[set[int]], a: int, b: int) -> None:
    if a == b:
        return
    adj[a].add(b)
    adj[b].add(a)


def build_graph(topology: str, n: int, mean_degree: int = 6) -> list[np.ndarray]:
    if mean_degree % 2 != 0:
        raise ValueError("mean_degree must be even")
    adj = [set() for _ in range(n)]
    half = mean_degree // 2

    if topology in {"ring", "small_world"}:
        for i in range(n):
            for offset in range(1, half + 1):
                _add_edge(adj, i, (i + offset) % n)
        if topology == "small_world":
            rng = np.random.default_rng(TOPOLOGY_SEEDS[topology])
            p_rewire = 0.15
            # Rewire forward ring edges only so each undirected edge is considered once.
            for i in range(n):
                for offset in range(1, half + 1):
                    j = (i + offset) % n
                    if rng.random() >= p_rewire or j not in adj[i]:
                        continue
                    candidates = [k for k in range(n) if k != i and k not in adj[i]]
                    if not candidates:
                        continue
                    new_j = int(rng.choice(candidates))
                    adj[i].remove(j)
                    adj[j].remove(i)
                    _add_edge(adj, i, new_j)
    elif topology == "erdos_renyi":
        rng = np.random.default_rng(TOPOLOGY_SEEDS[topology])
        p = mean_degree / max(1, n - 1)
        for i in range(n):
            for j in range(i + 1, n):
                if rng.random() < p:
                    _add_edge(adj, i, j)
        # Deterministic isolate repair prevents undefined neighbor fractions.
        for i in range(n):
            if not adj[i]:
                _add_edge(adj, i, (i + 1) % n)
    else:
        raise ValueError(f"unknown topology: {topology}")

    return [np.array(sorted(neighbors), dtype=int) for neighbors in adj]


def _binary_entropy(p: float) -> float:
    if p <= 0.0 or p >= 1.0:
        return 0.0
    return float(-(p * math.log(p) + (1.0 - p) * math.log(1.0 - p)))


def _macrostate(activity: float) -> int:
    if activity < 0.30:
        return 0
    if activity <= 0.70:
        return 1
    return 2


def simulate_rule(config: dict[str, Any], rule: dict[str, float], seed: int, topology: str) -> dict[str, Any]:
    rng = np.random.default_rng(seed)
    n = int(config.get("n_nodes", 72))
    steps = int(config.get("steps", 220))
    mean_degree = int(config.get("mean_degree", 6))
    tail_fraction = float(config.get("tail_fraction", 0.25))
    graph = build_graph(topology, n, mean_degree)

    threshold = float(rule["threshold"])
    coupling = float(rule["coupling"])
    memory = float(rule["memory"])
    temperature = float(rule["temperature"])

    state = (rng.random(n) < 0.5).astype(np.int8)
    history = np.empty((steps, 4), dtype=float)
    macrostates = np.empty(steps, dtype=int)

    # Unique edge list for local agreement.
    edges = [(i, int(j)) for i, neighbors in enumerate(graph) for j in neighbors if i < int(j)]

    for t in range(steps):
        neighbor_fraction = np.array([float(state[neighbors].mean()) for neighbors in graph], dtype=float)
        score = coupling * (neighbor_fraction - threshold) + memory * (state.astype(float) - 0.5)
        logits = np.clip(score / max(temperature, 1e-6), -30.0, 30.0)
        probability = 1.0 / (1.0 + np.exp(-logits))
        next_state = (rng.random(n) < probability).astype(np.int8)

        activity = float(next_state.mean())
        entropy = _binary_entropy(activity)
        agreement = float(np.mean([next_state[a] == next_state[b] for a, b in edges])) if edges else 1.0
        switch_rate = float(np.mean(next_state != state))
        history[t] = (activity, entropy, agreement, switch_rate)
        macrostates[t] = _macrostate(activity)
        state = next_state

    tail_start = max(0, int(round(steps * (1.0 - tail_fraction))))
    tail = history[tail_start:]
    transitions = int(np.count_nonzero(macrostates[1:] != macrostates[:-1]))
    transition_rate = transitions / max(1, steps - 1)

    dwell_lengths: list[int] = []
    start = 0
    for i in range(1, steps + 1):
        if i == steps or macrostates[i] != macrostates[start]:
            dwell_lengths.append(i - start)
            start = i

    return {
        "features": {
            "OBS-NETWORK-ACTIVITY": float(np.mean(tail[:, 0])),
            "OBS-SHANNON": float(np.mean(tail[:, 1])),
            "OBS-NETWORK-ORDER": float(np.mean(tail[:, 2])),
            "OBS-SWITCH-RATE": float(np.mean(tail[:, 3])),
            "OBS-TRANSITION-RATE": float(transition_rate),
            "OBS-METASTABLE-DWELL": float(np.mean(dwell_lengths) / steps),
        },
        "terminalMacrostate": int(macrostates[-1]),
    }


def mean_features(runs: list[dict[str, Any]]) -> dict[str, float]:
    return {feature: float(np.mean([run["features"][feature] for run in runs])) for feature in FEATURE_IDS}


def build_profiles(points: list[dict[str, Any]], seeds: list[int], config: dict[str, Any], topologies: list[str] | None = None) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    topologies = topologies or list(TOPOLOGIES)
    runs: list[dict[str, Any]] = []
    profiles: list[dict[str, Any]] = []
    topology_profiles: list[dict[str, Any]] = []

    for point in points:
        point_runs: list[dict[str, Any]] = []
        for topology in topologies:
            topology_runs: list[dict[str, Any]] = []
            for seed in seeds:
                result = simulate_rule(config, point["rule"], seed, topology)
                run = {"ruleId": point["id"], "topology": topology, "seed": seed, **result}
                runs.append(run)
                topology_runs.append(run)
                point_runs.append(run)
            topology_profiles.append({
                "ruleId": point["id"], "topology": topology, "rule": point["rule"],
                "features": mean_features(topology_runs), "seedCount": len(seeds),
            })
        profiles.append({
            "ruleId": point["id"], "rule": point["rule"], "features": mean_features(point_runs),
            "seedCount": len(seeds), "topologyCount": len(topologies),
        })
    return runs, profiles, topology_profiles


def feature_scale(profiles: list[dict[str, Any]]) -> dict[str, float]:
    scales: dict[str, float] = {}
    for feature in FEATURE_IDS:
        values = np.asarray([p["features"][feature] for p in profiles], dtype=float)
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


def pairwise_rows(profiles: list[dict[str, Any]], scales: dict[str, float]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    d = len(DIMENSIONS)
    for i in range(len(profiles)):
        ui = rule_to_unit(profiles[i]["rule"])
        for j in range(i + 1, len(profiles)):
            uj = rule_to_unit(profiles[j]["rule"])
            a, b = profiles[i]["ruleId"], profiles[j]["ruleId"]
            dr = float(np.linalg.norm(ui - uj) / math.sqrt(d))
            de = feature_distance(profiles[i]["features"], profiles[j]["features"], scales)
            rows.append({"pairKey": "|".join(sorted((a, b))), "leftRuleId": a, "rightRuleId": b, "ruleDistance": dr, "observableDistance": de, "sensitivity": de / max(dr, 1e-12)})
    return rows


def local_edges(profiles: list[dict[str, Any]], scales: dict[str, float], k: int = 4) -> list[dict[str, Any]]:
    pairwise = pairwise_rows(profiles, scales)
    by_rule: dict[str, list[dict[str, Any]]] = {p["ruleId"]: [] for p in profiles}
    for row in pairwise:
        by_rule[row["leftRuleId"]].append(row)
        by_rule[row["rightRuleId"]].append(row)
    selected: dict[str, dict[str, Any]] = {}
    for rule_id, rows in by_rule.items():
        for row in sorted(rows, key=lambda item: item["ruleDistance"])[:k]:
            selected[row["pairKey"]] = row
    return sorted(selected.values(), key=lambda item: item["pairKey"])
