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
- **RUL-004 - Observer-Dependent Quotient Structure**: hold ECA trajectories fixed and test whether distinct frozen observers induce distinct candidate quotients of rule space.
- **RUL-005 - Observer-Space Geometry**: enumerate a finite lattice of observer feature subsets and test whether nearby observers induce nearby rulial geometries and quotient candidates.
- **RUL-006 - Boids Rulial Landscape**: extend the validated noise sweep into a structured multi-parameter rule-space campaign.
- **RUL-007 - ECA-Boids Cross-Substrate Structure Challenge**: freeze common dimensionless structural statistics and test which recur across ECA and Boids before adding a third substrate.
- **RUL-008 - Network Rule-Space Engine**: add a graph-based substrate only after the RUL-007 comparison contract is frozen.

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


## RUL-005 — Geometry of observers acting on rule space

RUL-005 turns the qualitative RUL-004 observer-dependence result into a finite, reproducible observer-space experiment. It reuses the **same 4,096 ECA rule-seed run summaries** generated for RUL-004 and never resimulates a trajectory per observer.

The frozen observer basis contains five registered coordinates:

- `OBS-SHANNON`
- `OBS-HAMMING`
- `OBS-PERTURB-GROWTH`
- `OBS-AUTOCORR-TIME`
- `OBS-COMPRESSION`

Every non-empty feature subset is treated as a declared observer, producing 31 observer nodes. Observer structure is the 5-dimensional Boolean subset lattice, with normalized Hamming distance

`d_O(O_i, O_j) = |feature symmetric difference| / 5`.

This gives 465 observer pairs and 75 one-feature lattice edges. Each observer independently calibrates its resolution epsilon from the median same-rule split-half EBID distance. Two rule pairs are compared in two ways:

1. **Quotient-proxy distance**: `1 - Jaccard(E_i, E_j)`, where `E_i` is the set of rule pairs observationally indistinguishable at observer `i`'s epsilon.
2. **Geometry distance**: `(1 - Spearman(D_i, D_j)) / 2`, where `D_i` is the full vector of 32,640 rule-pair distances induced by observer `i`.

Run with:

```bash
npm run ruliology:eca:observer-geometry
```

Outputs are written under `data/ruliology/eca-observer-geometry/`:

- `observer-geometry-report.json` — complete 31-node / 465-pair analysis;
- `observer-geometry-summary.json` — compact Studio payload and leading one-feature edges;
- `observer-nodes.csv` — observer resolution and quotient-size diagnostics;
- `observer-pairs.csv` — structural, quotient-proxy, and geometry distances for every observer pair.

The primary question is deliberately modest: **does increasing structural distance between declared observers tend to increase the distance between the rulial structures they induce?** A positive association is evidence of structured observer dependence in this finite measurement lattice, not evidence that all possible observers possess a universal metric geometry. Because the 465 observer-pair entries are not independent, RUL-005 uses a deterministic matrix-label permutation test over observer identities rather than a naive independent-pairs significance test.

## RUL-006 — multidimensional Boids rulial stress test

RUL-006 is the first cross-substrate challenge after the finite ECA program. It does **not** assume that ECA findings transfer to flocking. The rule space is a frozen five-dimensional continuous design over separation, alignment, cohesion, stochastic chaos, and neighborhood radius.

The discovery stage uses a deterministic 32-point Latin hypercube (design seed `20260824`) and three simulation seeds per point. A six-feature Boids observer records tail polarization, heading entropy, spatial occupancy entropy, speed variance, macrostate transition rate, and normalized dwell time. Feature distances use fixed 5–95% discovery ranges so a numerically large coordinate cannot dominate simply because of units.

Candidate local sensitivity boundaries are selected only from the discovery design. Their endpoints are then re-run with two disjoint validation seeds, and eight new transverse midpoint probes are simulated near those discovery-selected edges. These adaptive probes are new rule coordinates, not reused discovery points.

The current committed pilot contains 134 simulations: 96 discovery runs, 22 held-out endpoint runs, and 16 boundary-probe runs. The global rule-distance / observable-distance association is modest rather than deterministic, while the discovery ranking of the eight selected local sensitivity edges has a positive held-out rank association. Only half of the selected edges remain above the discovery local-distance 75th percentile under the held-out seeds. That mixed result is useful: local rulial sensitivity is present, but the exact boundary set is not yet stable enough to call a phase diagram.

The operational polarization bins (`A >= 0.75`, `0.40 <= A < 0.75`, `A < 0.40`) are deliberately described as control-like, pressure-like, and chaos-like summaries only. They are not evidence that PCC semantics have been derived from flocking dynamics.


## RUL-007 — ECA-Boids cross-substrate structure challenge

RUL-007 freezes a first common comparison contract across the complete ECA benchmark and the 32-point Boids design. It does **not** compare raw observable distances across substrates; each system keeps its previously frozen observer and feature scaling. Instead, the experiment compares dimensionless structural summaries: global rule-distance/observable-distance rank association, discovery-to-holdout geometry stability, local-edge stability, top-10% local-boundary overlap, and the shape of the local sensitivity tail.

To make the Boids replication genuinely comparable, RUL-007 adds 64 new simulations: all 32 frozen discovery coordinates are re-run under the two already frozen validation seeds. This removes the RUL-006 limitation where only discovery-selected endpoints received holdout runs. The local graph itself remains frozen from discovery (k=4 nearest neighbors), while ECA continues to use all 1,024 one-bit hypercube edges.

The five frozen challenge criteria are intentionally modest and are not retuned after execution. The current result is **mixed**: 2 of 5 criteria pass in both substrates. Both systems show a positive global rule/observable association and a heavy local sensitivity tail. However, the Boids discovery-to-holdout full geometry and local-edge rank correlations fall below the frozen 0.70 threshold, and its top-10% local-edge overlap is low. ECA passes all five criteria.

This means RUL-007 does **not** support a claim of cross-substrate rulial universality. It does support a narrower result: local sensitivity heterogeneity appears in both systems, while robust boundary identity is much stronger in the deterministic complete ECA space than in the sampled stochastic Boids space. The failed criteria are retained as first-class results and become the fixed benchmark that a future network substrate must face.

Run the analysis with:

```bash
npm run ruliology:cross-substrate
```

Artifacts are written to `data/ruliology/cross-substrate/`.

## RUL-008 — topology-blocked network rule space

RUL-008 adds a third substrate without changing the RUL-007 cross-substrate thresholds after seeing the new system. The substrate is a synchronous stochastic binary-state network model whose local rule is

`R = (threshold, coupling, memory, temperature)`.

The four coordinates are normalized within frozen ranges before Euclidean rule distance is computed. Graph topology is **not** treated as a fifth Euclidean rule coordinate. Instead, every rule point is crossed with three preregistered topology blocks of matched nominal mean degree: ring lattice, small-world, and Erdos-Renyi. This separates local update rules from interaction structure and preserves topology-specific profiles for audit.

The frozen discovery design uses 24 deterministic Latin-hypercube points (`seed=20260824`) and three dynamics seeds per point/topology. The complete design is then repeated with two disjoint validation seeds. With 3 topology blocks this yields 216 discovery simulations and 144 held-out simulations, 360 total.

The frozen network observer reports tail network activity, binary state entropy, edge agreement, node switch rate, operational macrostate transition rate, and normalized macrostate dwell time. The activity bins are coarse-graining devices only; they do not establish PCC semantics.

The committed RUL-008 result is strongly reproducible under held-out stochastic realizations. Discovery-to-holdout full-geometry Spearman is about `0.992`, local-edge Spearman about `0.983`, and top-10% local-edge Jaccard is `0.75`. The local sensitivity tail is heterogeneous (`q95 / median ~= 3.51`). Across the three topology blocks, rule-space geometries remain highly rank-aligned in the discovery ensemble. These findings support using the network substrate in the next frozen three-substrate challenge, but they are not themselves evidence of universal rulial laws.

Run with:

```bash
npm run ruliology:network
```

Artifacts are written under `data/ruliology/network-rulial/`.
