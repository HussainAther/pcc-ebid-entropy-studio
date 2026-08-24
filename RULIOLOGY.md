# Ruliology in Entropy Studio

## Scope

Entropy Studio uses **Ruliology** operationally as the systematic study of generative rule spaces, the trajectories those rules produce, and the equivalence classes or transitions induced by declared observers.

The term is a research-program label, not a claim that a new mathematical field has already been established. Results should be described at the narrowest level supported by registered experiments.

## Three spaces

Every rulial experiment must distinguish:

1. **Rule space (R)**: the set or parameter family of transition rules.
2. **State space (X)**: the states evolved by a rule.
3. **Observable space (O)**: registered measurements produced by a declared observer or coarse-graining.

The experimental map is

`rule -> trajectory in state space -> observer -> observable profile`.

Two rules may therefore be observationally equivalent for one observer and distinguishable for another.

## Initial benchmark program

- **RUL-001 - Elementary CA Instability Atlas**: enumerate all 256 elementary cellular automata and construct EBID-style instability profiles across frozen initial conditions and perturbations.
- **RUL-002 - Rulial Neighborhood Sensitivity**: compare distance in rule representation against distance in observable profiles.
- **RUL-003 - EBID Equivalence Classes**: cluster or quotient rules using preregistered observable-distance criteria, then compare post hoc with external CA classifications.
- **RUL-004 - PCC Regime Atlas**: test preregistered macro-regime criteria without defining Pressure, Chaos, or Control from the outcomes being explained.
- **RUL-005 - Boids Rulial Landscape**: extend the validated noise sweep into a structured multi-parameter rule-space campaign.
- **RUL-006 - Cross-System Universality Challenge**: test whether any instability structure survives transfer across CA, Boids, and replicator systems.

## Guardrails

- Do not infer universality from one rule family.
- Do not tune observer definitions after inspecting the result they are meant to test.
- Keep syntactic rule distance separate from dynamical/observable distance.
- Treat clustering and embeddings as exploratory until stability and sensitivity are measured.
- Report negative and inconclusive outcomes.
- Preserve seeds, initial states, parameter grids, observer definitions, estimator versions, and source revisions in exported artifacts.

## Executable ECA benchmark

`CAMPAIGN-RUL-ECA-001` now has a dedicated local campaign runner in `app/lib/rulialCampaignRunner.ts` and a no-dependency Node 22 CLI in `scripts/run-rulial-eca.ts`.

Run the frozen benchmark with:

```bash
npm run ruliology:eca
```

Use `npm run ruliology:eca:quick` for the seven-rule plumbing subset.

The complete benchmark currently freezes 256 ECA rules × 4 seeded Bernoulli initial conditions at width 257 for 256 steps, with periodic boundaries and a matched center-cell flip. It writes:

- `data/ruliology/eca-atlas/campaign-report.json` — run summaries, profiles, and rule-neighborhood transitions;
- `data/ruliology/eca-atlas/profiles.csv` — one EBID feature vector per rule;
- `data/ruliology/eca-atlas/transitions.csv` — one-bit truth-table edges with scaled observable distance;
- `data/ruliology/eca-atlas/atlas.json` — compact UI payload used by the Rulial Atlas.

The rule geometry is the 8-dimensional Hamming hypercube of ECA transition tables: two rules are neighbors only when exactly one of the eight local outputs differs. This produces 1024 undirected one-bit edges across the complete 256-rule family. Observable distances use fixed, declared feature scales before cross-feature Euclidean comparison.

The generated atlas is a benchmark dataset, not a discovered universal taxonomy. External cellular-automaton classes remain excluded from feature construction and may only be compared post hoc.

## RUL-002 / RUL-003 held-out validation

The first rule-space atlas is now followed by an independent initial-condition validation pass. Run:

```bash
npm run ruliology:eca:validate
```

The analysis keeps the frozen RUL-001 calibration ensemble (`11, 29, 47, 83`) untouched and generates a disjoint holdout ensemble (`101, 131, 173, 211`) with the same width, horizon, density, periodic boundary, perturbation policy, observer, and feature scaling.

RUL-002 reports:

- calibration-to-holdout EBID self-distance for every rule;
- Spearman stability of all 32,640 pairwise rule distances;
- Spearman stability of the 1,024 one-bit edge distances;
- top-5% edge-set overlap;
- robust high-sensitivity edges that remain in the top 5% in both ensembles.

RUL-003 reports observer-dependent **candidate** equivalence classes. The primary epsilon is frozen from the median same-rule calibration-to-holdout EBID distance. Classes use complete-link clustering on `max(d_calibration, d_holdout)`, so every pair in a class must remain within epsilon in both ensembles. q25/q50/q75 threshold sensitivity is exported, along with calibration-only versus holdout-only cluster coassignment Jaccard.

Profile uncertainty is estimated with deterministic percentile bootstrap intervals (2,000 replicates per rule-feature) over the four frozen calibration seeds. Because four initial conditions are a small ensemble, the intervals are explicitly treated as diagnostic rather than high-precision uncertainty estimates.

Outputs are written under `data/ruliology/eca-validation/`:

- `validation-report.json` - complete RUL-002/003 validation artifact;
- `validation-summary.json` - compact Studio payload;
- `holdout-report.json` - all 1,024 held-out runs and profiles;
- `bootstrap-intervals.csv` - per-rule feature uncertainty;
- `self-distances.csv` - same-rule calibration/holdout shifts;
- `robust-transitions.csv` - one-bit edge replication table;
- `equivalence-classes.csv` - candidate observer-dependent classes.

External cellular-automaton class labels remain deliberately absent. Whole-population Wolfram-class assignments are not uniquely canonical, so post-hoc comparison is gated on a provenance-bearing frozen label table supplied after the EBID metrics, thresholds, and validation criteria are fixed.

## RUL-004 — Observer-dependent quotient structure

RUL-004 holds the ECA simulations fixed and changes only the declared measurement observer. The default expanded ensemble uses 16 new seeded Bernoulli initial conditions (4,096 rule-seed runs) and is split into two disjoint eight-seed halves for observer-specific resolution calibration.

The initial frozen observer family is:

- `OBSERVER-EBID-CORE`: Shannon entropy, perturbation Hamming distance, perturbation growth, entropy autocorrelation time, and fixed-RLE compression.
- `OBSERVER-ECA-ENTROPY-STRUCTURE`: Shannon entropy, entropy autocorrelation time, and fixed-RLE compression only.
- `OBSERVER-ECA-PERTURBATION`: perturbation Hamming distance and perturbation growth only.
- `OBSERVER-ECA-MEMORY-COMPLEXITY`: entropy autocorrelation time and fixed-RLE compression only.

For each observer O, epsilon_O is the median same-rule distance between the two disjoint split halves. Candidate classes use complete-link clustering on the maximum pair distance across both split halves. This yields an empirical quotient candidate `R / ~_O` at that observer's measured resolution.

Cross-observer comparisons report both full-geometry Spearman correlation and class coassignment Jaccard overlap. A rule pair that is equivalent under at least one observer but not all observers is recorded as observer-sensitive. These are operational observer-dependence results, not claims that any observer is privileged or that the quotient is mathematically exact.

Run with:

```bash
npm run ruliology:eca:observers
```
