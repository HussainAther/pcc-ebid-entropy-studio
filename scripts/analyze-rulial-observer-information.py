#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PRIMARY_RELIABILITY_RHO_MIN = 0.70
SECONDARY_SIGNAL_RHO_MIN = 0.60
PERMUTATIONS = 5000
PERMUTATION_SEED = 2026082413
BIN_COUNT = 10
GROUP_TOLERANCE_FRACTION = 1e-3

FEATURES = {
    "ECA": ["OBS-AUTOCORR-TIME", "OBS-COMPRESSION", "OBS-HAMMING", "OBS-PERTURB-GROWTH", "OBS-SHANNON"],
    "Boids": ["OBS-POLARIZATION", "OBS-HEADING-ENTROPY", "OBS-SPATIAL", "OBS-SPEED-VARIANCE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"],
    "Network": ["OBS-NETWORK-ACTIVITY", "OBS-SHANNON", "OBS-NETWORK-ORDER", "OBS-SWITCH-RATE", "OBS-TRANSITION-RATE", "OBS-METASTABLE-DWELL"],
}


def rankdata(values: list[float]) -> np.ndarray:
    a = np.asarray(values, float)
    order = np.argsort(a, kind="mergesort")
    ranks = np.empty(len(a), float)
    i = 0
    while i < len(a):
        j = i + 1
        while j < len(a) and a[order[j]] == a[order[i]]:
            j += 1
        ranks[order[i:j]] = (i + j - 1) / 2 + 1
        i = j
    return ranks


def spearman(x: list[float], y: list[float]) -> float:
    if len(x) < 2:
        return 0.0
    rx, ry = rankdata(x), rankdata(y)
    if np.std(rx) == 0 or np.std(ry) == 0:
        return 0.0
    return float(np.corrcoef(rx, ry)[0, 1])


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def eca_profiles() -> tuple[dict[str, dict[str, float]], dict[str, dict[str, float]]]:
    discovery = {
        r["rule_id"]: {f: float(r[f]) for f in FEATURES["ECA"]}
        for r in read_csv(ROOT / "data/ruliology/eca-atlas/profiles.csv")
    }
    holdout_report = json.loads((ROOT / "data/ruliology/eca-validation/holdout-report.json").read_text())
    holdout: dict[str, dict[str, float]] = {}
    for profile in holdout_report["profiles"]:
        rule_id = str(profile["rule"]["ruleId"])
        feature_map = {item["observableId"]: float(item["value"]) for item in profile["features"]}
        holdout[rule_id] = {f: feature_map[f] for f in FEATURES["ECA"]}
    return discovery, holdout


def csv_profile_pair(substrate: str, discovery_path: Path, holdout_path: Path) -> tuple[dict[str, dict[str, float]], dict[str, dict[str, float]]]:
    features = FEATURES[substrate]
    discovery = {r["rule_id"]: {f: float(r[f]) for f in features} for r in read_csv(discovery_path)}
    holdout = {r["rule_id"]: {f: float(r[f]) for f in features} for r in read_csv(holdout_path)}
    return discovery, holdout


def pairwise_absolute(values: dict[str, float]) -> list[float]:
    keys = sorted(values)
    out: list[float] = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            out.append(abs(values[keys[i]] - values[keys[j]]))
    return out


def effective_groups(values: np.ndarray, tolerance: float) -> list[list[float]]:
    groups: list[list[float]] = []
    for value in sorted(float(v) for v in values):
        if not groups or abs(value - groups[-1][-1]) > tolerance:
            groups.append([value])
        else:
            groups[-1].append(value)
    return groups


def normalized_histogram_entropy(values: np.ndarray) -> float:
    if len(values) < 2 or float(np.max(values)) == float(np.min(values)):
        return 0.0
    bins = min(BIN_COUNT, len(values))
    counts, _ = np.histogram(values, bins=bins, range=(float(np.min(values)), float(np.max(values))))
    positive = counts[counts > 0].astype(float)
    if len(positive) <= 1:
        return 0.0
    p = positive / np.sum(positive)
    return float(-(p * np.log(p)).sum() / np.log(bins))


def feature_information_rows(substrate: str, discovery: dict[str, dict[str, float]], holdout: dict[str, dict[str, float]]) -> list[dict[str, Any]]:
    keys = sorted(set(discovery) & set(holdout))
    rows: list[dict[str, Any]] = []
    for feature_id in FEATURES[substrate]:
        a = np.asarray([discovery[k][feature_id] for k in keys], float)
        b = np.asarray([holdout[k][feature_id] for k in keys], float)
        midpoint = (a + b) / 2.0
        difference = a - b

        # Two-independent-pool random-effects decomposition. If each pool mean is
        # true-rule value + independent pool error e, Var(A-B)=2 Var(e).
        pool_error_variance = float(np.var(difference, ddof=1) / 2.0)
        midpoint_variance = float(np.var(midpoint, ddof=1))
        between_rule_variance = max(midpoint_variance - pool_error_variance / 2.0, 0.0)
        icc_like_reliability = between_rule_variance / max(between_rule_variance + pool_error_variance, 1e-15)

        q05, q95 = np.quantile(midpoint, [0.05, 0.95])
        robust_between_range = max(float(q95 - q05), 1e-12)
        within_rule_rmse = float(np.sqrt(np.mean(difference * difference) / 2.0))
        signal_to_uncertainty = robust_between_range / max(within_rule_rmse, 1e-12)

        tolerance = max(robust_between_range * GROUP_TOLERANCE_FRACTION, 1e-12)
        groups = effective_groups(midpoint, tolerance)
        effective_support_fraction = len(groups) / len(midpoint)
        largest_group_fraction = max(len(group) for group in groups) / len(midpoint)
        tied_rule_fraction = sum(len(group) for group in groups if len(group) > 1) / len(midpoint)
        degeneracy_index = 1.0 - effective_support_fraction

        discovery_map = {k: discovery[k][feature_id] for k in keys}
        holdout_map = {k: holdout[k][feature_id] for k in keys}
        geometry_stability = spearman(pairwise_absolute(discovery_map), pairwise_absolute(holdout_map))
        profile_stability = spearman(a.tolist(), b.tolist())

        rows.append({
            "substrate": substrate,
            "featureId": feature_id,
            "ruleCount": len(keys),
            "betweenRuleVarianceEstimate": between_rule_variance,
            "poolErrorVarianceEstimate": pool_error_variance,
            "iccLikeReliability": icc_like_reliability,
            "robustBetweenRuleRange": robust_between_range,
            "withinRulePoolRmse": within_rule_rmse,
            "signalToUncertainty": signal_to_uncertainty,
            "effectiveSupportCount": len(groups),
            "effectiveSupportFraction": effective_support_fraction,
            "degeneracyIndex": degeneracy_index,
            "largestSupportGroupFraction": largest_group_fraction,
            "tiedRuleFraction": tied_rule_fraction,
            "observableEntropyAcrossRules": normalized_histogram_entropy(midpoint),
            "ruleProfileStabilitySpearman": profile_stability,
            "singleFeatureGeometryStabilitySpearman": geometry_stability,
        })
    return rows


def stratified_permutation_p(rows: list[dict[str, Any]], x_key: str, y_key: str, observed: float, direction: str) -> float:
    rng = np.random.default_rng(PERMUTATION_SEED)
    x = np.asarray([float(r[x_key]) for r in rows])
    y = np.asarray([float(r[y_key]) for r in rows])
    substrate = np.asarray([r["substrate"] for r in rows], object)
    extreme = 0
    for _ in range(PERMUTATIONS):
        yp = y.copy()
        for sub in sorted(set(substrate.tolist())):
            idx = np.flatnonzero(substrate == sub)
            yp[idx] = rng.permutation(yp[idx])
        permuted = spearman(x.tolist(), yp.tolist())
        if direction == "positive" and permuted >= observed - 1e-15:
            extreme += 1
        elif direction == "negative" and permuted <= observed + 1e-15:
            extreme += 1
    return float((extreme + 1) / (PERMUTATIONS + 1))


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data/ruliology/observer-information")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    eca_a, eca_b = eca_profiles()
    boids_a, boids_b = csv_profile_pair(
        "Boids",
        ROOT / "data/ruliology/boids-rulial/discovery-profiles.csv",
        ROOT / "data/ruliology/cross-substrate/boids-holdout-profiles.csv",
    )
    network_a, network_b = csv_profile_pair(
        "Network",
        ROOT / "data/ruliology/network-rulial/discovery-profiles.csv",
        ROOT / "data/ruliology/network-rulial/holdout-profiles.csv",
    )

    rows = (
        feature_information_rows("ECA", eca_a, eca_b)
        + feature_information_rows("Boids", boids_a, boids_b)
        + feature_information_rows("Network", network_a, network_b)
    )

    geometry = [r["singleFeatureGeometryStabilitySpearman"] for r in rows]
    reliability = [r["iccLikeReliability"] for r in rows]
    signal = [r["signalToUncertainty"] for r in rows]
    degeneracy = [r["degeneracyIndex"] for r in rows]
    support_entropy = [r["observableEntropyAcrossRules"] for r in rows]
    tied = [r["tiedRuleFraction"] for r in rows]

    reliability_rho = spearman(reliability, geometry)
    reliability_p = stratified_permutation_p(rows, "iccLikeReliability", "singleFeatureGeometryStabilitySpearman", reliability_rho, "positive")
    signal_rho = spearman(signal, geometry)
    signal_p = stratified_permutation_p(rows, "signalToUncertainty", "singleFeatureGeometryStabilitySpearman", signal_rho, "positive")
    degeneracy_rho = spearman(degeneracy, geometry)
    degeneracy_p = stratified_permutation_p(rows, "degeneracyIndex", "singleFeatureGeometryStabilitySpearman", degeneracy_rho, "negative")

    primary = {
        "frozenReliabilityRhoMinimum": PRIMARY_RELIABILITY_RHO_MIN,
        "reliabilityVsGeometrySpearman": reliability_rho,
        "substrateStratifiedPermutationCount": PERMUTATIONS,
        "substrateStratifiedPermutationP": reliability_p,
        "rhoCriterionPassed": reliability_rho >= PRIMARY_RELIABILITY_RHO_MIN,
        "permutationCriterionPassed": reliability_p <= 0.05,
    }
    primary["informationConditioningSupported"] = bool(primary["rhoCriterionPassed"] and primary["permutationCriterionPassed"])

    secondary = {
        "frozenSignalRhoMinimum": SECONDARY_SIGNAL_RHO_MIN,
        "signalToUncertaintyVsGeometrySpearman": signal_rho,
        "signalToUncertaintyPermutationP": signal_p,
        "signalCriterionPassed": signal_rho >= SECONDARY_SIGNAL_RHO_MIN and signal_p <= 0.05,
        "degeneracyVsGeometrySpearman": degeneracy_rho,
        "degeneracyPermutationP": degeneracy_p,
        "supportEntropyVsGeometrySpearman": spearman(support_entropy, geometry),
        "tiedRuleFractionVsGeometrySpearman": spearman(tied, geometry),
    }

    substrates: list[dict[str, Any]] = []
    for substrate in ["ECA", "Boids", "Network"]:
        subset = [r for r in rows if r["substrate"] == substrate]
        substrates.append({
            "substrate": substrate,
            "featureCount": len(subset),
            "reliabilityVsGeometrySpearman": spearman(
                [r["iccLikeReliability"] for r in subset],
                [r["singleFeatureGeometryStabilitySpearman"] for r in subset],
            ),
            "signalToUncertaintyVsGeometrySpearman": spearman(
                [r["signalToUncertainty"] for r in subset],
                [r["singleFeatureGeometryStabilitySpearman"] for r in subset],
            ),
            "degeneracyVsGeometrySpearman": spearman(
                [r["degeneracyIndex"] for r in subset],
                [r["singleFeatureGeometryStabilitySpearman"] for r in subset],
            ),
            "medianReliability": float(np.median([r["iccLikeReliability"] for r in subset])),
            "medianGeometryStability": float(np.median([r["singleFeatureGeometryStabilitySpearman"] for r in subset])),
        })

    lowest_reliability = sorted(rows, key=lambda r: r["iccLikeReliability"])[:5]
    highest_reliability = sorted(rows, key=lambda r: r["iccLikeReliability"], reverse=True)[:5]

    report = {
        "schemaVersion": "entropy-rulial-observer-information/1.0.0",
        "experimentId": "RUL-013",
        "title": "Cross-substrate observer information and degeneracy analysis",
        "generatedAt": "2026-08-24T22:59:00.000Z",
        "newSimulationRunCount": 0,
        "design": {
            "substrates": ["ECA", "Boids", "Network"],
            "featureCount": len(rows),
            "sourceExperiments": ["RUL-001/RUL-003", "RUL-006/RUL-007", "RUL-008"],
            "principle": "Observer conditioning should depend on between-rule discrimination relative to independent-pool uncertainty and on degeneracy, not on same-rule shift alone.",
            "primaryCriterionFrozenBeforeOutcome": f"pooled Spearman(ICC-like reliability, single-feature geometry stability) >= {PRIMARY_RELIABILITY_RHO_MIN} with substrate-stratified permutation p <= 0.05.",
            "secondaryCriterionFrozenBeforeOutcome": f"pooled Spearman(signal-to-uncertainty, single-feature geometry stability) >= {SECONDARY_SIGNAL_RHO_MIN} with substrate-stratified permutation p <= 0.05.",
            "poolVarianceModel": "For independent aggregate pools A and B, Var(A-B)/2 estimates per-pool error variance; between-rule variance is estimated from midpoint variance after subtracting half that pool error variance.",
            "degeneracyTolerance": f"Rules are grouped when adjacent midpoint feature values differ by no more than {GROUP_TOLERANCE_FRACTION} times the pooled 5th-95th percentile feature range.",
        },
        "primaryTest": primary,
        "secondary": secondary,
        "substrates": substrates,
        "features": rows,
        "diagnosticExtremes": {
            "lowestReliability": lowest_reliability,
            "highestReliability": highest_reliability,
        },
        "interpretationBoundary": [
            "RUL-013 adds zero simulations and leaves RUL-012's challenged result unchanged.",
            "ICC-like reliability is a two-independent-pool aggregate estimator, not a classical per-trial ICC; the source artifacts do not preserve a common raw replicate table across all three substrates.",
            "Signal-to-uncertainty is a robust 5th-95th percentile between-rule range divided by independent-pool RMSE; it is descriptive, not an information-theoretic channel capacity.",
            "Degeneracy statistics depend on an explicitly frozen numerical grouping tolerance and are treated as secondary diagnostics rather than a universal invariant.",
            "A supported pooled association motivates prospective observer selection; it does not establish a universal observer-conditioning law until replicated on unseen observer/substrate designs.",
        ],
    }

    summary = report.copy()
    report_path = args.output_dir / "observer-information-report.json"
    summary_path = args.output_dir / "observer-information-summary.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")
    write_csv(args.output_dir / "feature-information.csv", rows)
    write_csv(args.output_dir / "substrate-information.csv", substrates)
    digest = hashlib.sha256(report_path.read_bytes()).hexdigest()
    (args.output_dir / "sha256.txt").write_text(digest + "  observer-information-report.json\n")
    print(json.dumps({"primaryTest": primary, "secondary": secondary, "substrates": substrates, "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
