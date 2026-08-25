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

## RUL-009 — frozen three-substrate challenge

RUL-009 extends the **unchanged RUL-007 five-criterion structural contract** to the independently constructed RUL-008 network substrate. It adds no simulations and does not refit thresholds after seeing the network result. The ECA and Boids metric records are reused verbatim from RUL-007, while the network summary is projected into the same five pass/fail rules.

The frozen criteria remain:

1. positive discovery association between normalized rule distance and observer-space distance;
2. discovery/holdout full-geometry Spearman `>= 0.70`;
3. discovery/holdout local-edge Spearman `>= 0.70`;
4. discovery local-sensitivity `q95 / median >= 1.5`;
5. top-10% local-edge discovery/holdout Jaccard `>= 0.50`.

The current three-way result is deliberately mixed. ECA passes `5/5`, the topology-blocked Network substrate passes `5/5`, and Boids passes `2/5`. Consequently only **2 of 5 criteria pass in all three substrates**: positive global rule/observable association and a heterogeneous local-sensitivity tail. The other three replication criteria are shared by ECA and Network but challenged by Boids under the existing 32-point stochastic design.

This is not evidence for a universal rulial law. It is a sharper empirical pattern: some dimensionless distributional structure recurs across all three systems, while exact geometry and boundary replication are substrate/design dependent at current resolution. The failed Boids criteria remain frozen rather than being repaired post hoc.

Run with:

```bash
npm run ruliology:three-substrate
```

Artifacts are written under `data/ruliology/three-substrate/`.

## RUL-010 — Boids stochasticity and resolution decomposition

RUL-010 is a **diagnostic follow-up**, not a repair of RUL-009. The frozen three-substrate result remains unchanged. The experiment reuses the exact 32 RUL-006 Latin-hypercube rule coordinates and introduces two new disjoint four-seed pools. Nested 1-, 2-, and 4-seed averages estimate how much full and local observable geometry stabilizes as stochastic realizations are averaged.

A second diagnostic arm sets the per-step Gaussian Boids forcing multiplier to zero while leaving random initial positions/headings intact. This separates one source of dynamical stochasticity from initialization variability; it is not a deterministic Boids model. Finally, four observer projections are computed from the same full-stochastic runs: the six-feature core, four state/structure coordinates, two regime-dynamics coordinates, and a two-coordinate order/entropy view.

The current result points to **observer-coordinate instability more strongly than to per-step forcing noise**. With four seeds per independent half, the full six-feature geometry reaches about `rho = 0.747` and local-edge geometry about `rho = 0.746`, just above the old 0.70 replication threshold, but exact top-10% edge identity remains unstable. The state/structure observer is substantially more reproducible (`rho ~= 0.892` full geometry; `0.872` local), and the order/entropy view is also strong (`rho ~= 0.855`; `0.828`). In contrast, the two regime-dynamics coordinates are highly degenerate under this design because transition/dwell values are frequently zero or nearly constant.

Suppressing per-step Gaussian forcing at one seed per half does **not** improve geometry stability; the correlation is lower than in the matched full-stochastic arm. That argues against the simple explanation that the RUL-009 Boids gap is caused mainly by the explicit chaos forcing term. Feature-level variance decomposition instead shows especially high within-rule stochastic fractions for transition rate and metastable dwell under the full model. These are diagnostics, not proof of the causal source of the gap.

Run with:

```bash
npm run ruliology:boids:resolution
```

Artifacts are written under `data/ruliology/boids-resolution/`.

## RUL-011 — prospective Boids observer validation

RUL-011 turns the RUL-010 observer decomposition into a prospective test. Nothing from the frozen RUL-009 or RUL-010 benchmarks is rewritten. Instead, a new deterministic 40-point Latin-hypercube rule design (`seed=2026082411`) is simulated under two new disjoint four-seed pools. The resulting 320 trajectories are shared by three observer projections that are frozen before the new outcomes are interpreted:

1. `full_core`: the original six-feature RUL-006 observer;
2. `state_structure`: polarization, heading entropy, spatial entropy, and speed variance;
3. `order_entropy`: polarization and heading entropy only.

The primary criterion is intentionally narrow. The RUL-010 diagnosis is counted as prospectively replicated only if `state_structure` exceeds `full_core` by at least `0.05` in **both** complete rule-geometry split-half Spearman stability and local-edge split-half Spearman stability. Top-10% boundary overlap is a secondary check with a fixed `+0.10` margin; it does not redefine the primary test.

The committed RUL-011 result passes the primary criterion on unseen rule coordinates. `state_structure` reaches full-geometry stability of about `0.829` versus `0.678` for `full_core`, a gain of about `+0.151`. Local-edge stability is about `0.802` versus `0.740`, a gain of about `+0.062`. The secondary top-10% local-edge Jaccard also improves from about `0.158` to `0.294`, exceeding the frozen `+0.10` margin. The narrower `order_entropy` observer improves full geometry only modestly and underperforms full-core local stability, so the result is not a generic “fewer observables is better” effect.

This supports a more specific methodological interpretation: in the current Boids design, sparse transition/dwell coordinates materially destabilize the induced rule-space geometry, and removing them improves reproducibility on an independent rule sample. It does **not** establish that the four-feature observer is universally optimal, nor does it alter the original six-feature RUL-006 or RUL-009 results.

Run with:

```bash
npm run ruliology:boids:observer-validation
```

Artifacts are written under `data/ruliology/boids-observer-validation/`.


## RUL-012 — Cross-substrate observer conditioning diagnostic

RUL-012 asks whether a simple coordinate-level reliability rule generalizes across ECA, Boids, and Network: do observable coordinates that move more for the same rule across independent pools induce less reproducible rule-space geometry? The analysis adds **zero new simulations**, uses 17 registered coordinates from frozen prior profile pairs, normalizes same-rule displacement by discovery-pool robust range, and applies a 5,000-draw substrate-stratified permutation test.

The frozen primary hypothesis is **challenged**. The pooled association is approximately `rho = 0.004` with stratified permutation `p = 0.792`, rather than the preregistered `rho <= -0.50`. This preserves the narrower prospective RUL-011 result while rejecting the stronger idea that one scalar same-rule-shift score is a general cross-substrate predictor of observer geometry conditioning. The next observer theory should therefore model feature semantics, degeneracy, and interactions among coordinates rather than relying on a single noise magnitude.

Run with `npm run ruliology:observer-conditioning`. Outputs live under `data/ruliology/observer-conditioning/`.


## RUL-013 — Observer information and degeneracy analysis

RUL-013 follows the challenged RUL-012 scalar-shift hypothesis without adding simulations. It reuses the same 17 ECA, Boids, and Network coordinate profile pairs, but separates **between-rule discrimination** from **independent-pool uncertainty**. For two independent aggregate pools A and B, `Var(A-B)/2` estimates per-pool error variance; midpoint variance is then corrected to estimate between-rule variance. Their ratio defines an explicitly labeled **ICC-like aggregate reliability** rather than a classical per-trial ICC.

The frozen primary test is supported: ICC-like reliability is strongly positively associated with single-feature geometry stability (`rho ≈ 0.882`) with a 5,000-draw within-substrate permutation `p ≈ 0.0010`, exceeding the preregistered `rho >= 0.70` threshold. A separately frozen robust signal-to-uncertainty ratio also tracks geometry stability (`rho ≈ 0.833`, `p ≈ 0.0134`). The result is not simply a rebranding of RUL-012: raw same-rule shift alone had essentially no pooled association, whereas signal relative to uncertainty is strongly predictive.

Degeneracy is retained as a secondary diagnostic. The pooled degeneracy association is weaker (`rho ≈ -0.198`), although the Boids transition-rate and metastable-dwell coordinates remain conspicuous low-reliability, low-support cases. This motivates a prospective observer-selection experiment rather than retroactively changing any frozen RUL-006 through RUL-012 observer.

Run with `npm run ruliology:observer-information`. Outputs live under `data/ruliology/observer-information/`.


## RUL-014 — Prospective observer selection from RUL-013

RUL-014 tests whether the information-conditioning result from RUL-013 can be turned into a prospective measurement-design rule. Before generating any RUL-014 outcomes, the selector is frozen to include Boids coordinates whose RUL-013 ICC-like reliability is at least `0.80`. That rule selects spatial entropy, speed variance, polarization, and heading entropy, while rejecting transition rate and metastable dwell.

The experiment then generates a completely new 48-point Boids Latin-hypercube design and two disjoint four-seed pools, for **384 new simulations**. Three observers are projected from those identical trajectories: the full six-feature core, the RUL-013-selected four-feature observer, and the two rejected coordinates as a negative-control observer. The primary success margin is fixed at `+0.05` for both complete-geometry and local-edge split-half Spearman stability.

The selected observer improves in the predicted direction, but the frozen primary criterion is **challenged**: geometry improves by about `+0.045` and local-edge stability by about `+0.016`, both below the preregistered `+0.05` margins. The secondary top-10% boundary Jaccard improves strongly (`+0.283`), and the rejected-coordinate control is near-zero/negative in geometry stability. The correct interpretation is therefore not that RUL-013 failed, nor that the selector is validated, but that the simple hard-threshold selection rule has directional predictive value without meeting the stronger prospective effect-size criterion on this sample.

Run with `npm run ruliology:observer-selection`. Outputs live under `data/ruliology/prospective-observer-selection/`.


## RUL-015 — Prospective continuous information-conditioned observer weighting

RUL-015 tests the natural follow-up to RUL-014: replace binary keep/drop selection with a continuous metric fixed entirely from prior RUL-013 information. Before any new outcome is generated, each Boids coordinate receives weight proportional to `ICC-like reliability × log(1 + signal-to-uncertainty) × (1 - degeneracy)`. The experiment then generates a new 56-point Latin-hypercube rule design and two disjoint four-seed pools, for **448 new simulations**, and compares equal full-core, RUL-013 hard selection, reliability-only weighting, and the information-conditioned continuous metric on identical trajectories.

The preregistered primary criterion is **challenged**. The information-weighted metric improves complete geometry by only about `+0.001` and local-edge stability by about `+0.006` relative to equal weighting, below the frozen `+0.03` margins. Its top-10% local-boundary overlap is also lower. In contrast, the hard four-feature RUL-013 selection again gives the strongest complete-geometry stability (`rho ≈ 0.939`) and top-boundary Jaccard (`≈ 0.684`) on this unseen design. This does not invalidate RUL-013; it challenges this particular smooth weighting equation and suggests that severely degenerate coordinates may need exclusion rather than merely small positive weights.

Run with `npm run ruliology:observer-weighting`. Outputs live under `data/ruliology/information-weighted-observer/`.

## RUL-016 — Exact observer subset ablation and interaction decomposition

RUL-016 keeps the RUL-015 population frozen and asks a different question: are observer coordinates acting independently, or does the geometry depend on feature combinations? It introduces **zero new unique simulations**. The deterministic RUL-015 56-point design and two four-seed pools are replayed, then every one of the `2^6 - 1 = 63` non-empty subsets of the six-coordinate Boids observer is evaluated on identical trajectories.

For each subset, the analysis records complete-geometry stability, local-edge stability, and top-10% local-boundary overlap. It then computes leave-one-out effects, exact Shapley contributions with an explicit `v(empty)=0` bookkeeping baseline, and exact pairwise Shapley interaction indices. These are finite observer-set decompositions, not causal claims about the physical observables.

The diagnostic finds clear non-additivity. The strongest complete-geometry interaction is polarization × speed variance (`I ≈ -0.298`), far above the frozen `|I| >= 0.05` diagnostic magnitude. Both regime coordinates (transition rate and metastable dwell) have negative complete-geometry Shapley contributions (about `-0.041` each), and removing either from the full six-feature observer improves both complete and local stability slightly. However, the largest interaction does **not** involve those regime coordinates, so the result is richer than “two bad features”: observer conditioning depends materially on combinations among otherwise useful structural coordinates.

Run with `npm run ruliology:observer-ablation`. Outputs live under `data/ruliology/observer-ablation/`.

## RUL-017 — Prospective interaction-informed compact observer validation

RUL-017 turns the diagnostic RUL-016 subset result into a prospective test. Before reading new outcomes, it freezes the three-feature Boids observer `polarization + spatial entropy + speed variance`, compares it against the established four-feature RUL-013 hard-selection observer and the six-feature full-core baseline, and generates a new deterministic 40-point Latin-hypercube rule-space design with two disjoint four-seed pools (**320 new simulations**). Pool-A feature scaling is held fixed for pool B.

The primary margins are frozen at **+0.01** for both complete-geometry and local-edge split-half Spearman stability relative to the four-feature observer. The three-feature candidate passes both: complete geometry improves by about **+0.082** and local geometry by about **+0.012**. The secondary top-10% boundary-overlap margin is challenged: Jaccard is lower than the four-feature comparator. This supports predictive value for the RUL-016 interaction-informed geometry choice without claiming universal observer optimality.

Run with `npm run ruliology:observer-interaction-validation`. Outputs live under `data/ruliology/interaction-informed-observer-validation/`.

## RUL-018 — Objective-dependent observer geometry

RUL-018 reuses the frozen RUL-017 Boids population and introduces **zero new unique simulations**. It evaluates all 63 non-empty subsets of the six registered Boids observer coordinates under three fixed objectives: complete rule-space geometry stability, local-edge geometry stability, and top-10% local-boundary recovery. The objectives are intentionally kept separate rather than collapsed into a post-hoc scalar score.

The optimum depends on the scientific target. Global geometry is maximized by `spatial entropy + speed variance` (rho = 0.914), while local geometry is maximized by `speed variance + transition rate` (rho = 0.845). Boundary recovery is discrete and has ten co-optimal subsets at Jaccard = 0.571; the smallest representative is `polarization` alone, and the local-geometry optimum is also boundary co-optimal. Global- and local-objective rankings are strongly related (rho = 0.901), but boundary-recovery rankings are nearly orthogonal to both (rho = 0.079 and 0.017).

This is a diagnostic result, not a prospective claim that these subsets are universally optimal. It supports treating observer design as **task-dependent**: preserving the global rulial map, preserving local neighborhoods, and recovering extreme boundaries are distinct measurement goals. Run with `npm run ruliology:observer-objectives`.
## RUL-019 — Cross-substrate objective-dependent observer geometry

RUL-019 extends the RUL-018 task-dependence analysis beyond Boids without adding any new simulations. It reuses the frozen ECA calibration/holdout atlas, the RUL-018 Boids population, and the RUL-008 Network discovery/holdout population. For each substrate, every non-empty subset of the substrate's native core observer basis is evaluated under the same three objectives: complete rule-space geometry stability, local-edge geometry stability, and top-10% local-boundary recovery. ECA contributes 31 observer subsets from five coordinates; Boids and Network contribute 63 subsets each from six coordinates.

The cross-substrate pattern is consistent: all three substrates show objective dependence, none has a single observer subset co-optimal for all three objectives, and boundary-recovery rankings are more decoupled from geometry rankings than global and local geometry are from each other. Global-vs-local observer ranking Spearman correlations are approximately 0.962 for ECA, 0.901 for Boids, and 0.806 for Network. By contrast, global-vs-boundary correlations are approximately 0.623, 0.079, and -0.040 respectively.

The representative optima remain substrate-specific: ECA global geometry favors Shannon entropy + compression while boundary recovery favors compression alone; Boids global geometry favors spatial entropy + speed variance while local geometry favors speed variance + transition rate; Network global geometry favors order + switch rate + transition rate while boundary recovery has many co-optimal subsets. These identities are not treated as cross-substrate invariants. The recurring result is the higher-level structure: observer choice is task-dependent, geometry-preservation objectives are more closely related to each other, and extreme-boundary recovery behaves as a distinct measurement target.

Run with:

```bash
npm run ruliology:cross-substrate-objectives
```

Outputs are written to `data/ruliology/cross-substrate-objectives/`.


## RUL-020 — Mutable-rule ALife ecological response

RUL-020 is the first Entropy Studio experiment in which the rule distribution itself is a dynamical object rather than a fixed experimental coordinate. Each agent carries a bounded heritable rule vector

\[
r=(w_f,w_h,\eta_e,E_r)
\]

for resource seeking, hazard avoidance, stochastic exploration, and reproduction threshold. Population dynamics can therefore be written schematically as

\[
(X_t,\mathcal P(R_t))\rightarrow (X_{t+1},\mathcal P(R_{t+1})),
\]

where \(X_t\) is ecological state and \(\mathcal P(R_t)\) is the population distribution over rules.

The frozen pilot uses 12 matched seeds and three conditions: `stable_mutable`, `scarcity_mutable`, and `scarcity_frozen`. Scarcity reduces resource regeneration at step 130 of 260. The frozen-rule control disables offspring mutation but retains selection on standing initial variation, so population mean rules may still move without mutation.

The primary pilot criteria were fixed as: scarcity-mutable median normalized rule-centroid displacement exceeds stable-mutable by at least 0.015; exceeds scarcity-frozen by at least 0.010; mean pairwise post-shock direction cosine is at least 0.20; and no more than 25% of seeds go extinct. All four criteria are satisfied in the committed artifact. This is a model-specific pilot result, not a biological-evolution or universal-adaptation claim.

The main conceptual addition is a shift from static rule geometry to **rule-space trajectories**: centroid displacement, cumulative centroid path length, occupied rule-space diversity, lineage diversity, and demographic recovery can now be studied together.

## RUL-021 — Selection versus matched neutral bottleneck

RUL-021 attacks the largest ambiguity left by RUL-020: a population centroid can move through rule space simply because a demographic crash randomly removes lineages, even if the crash is not rule-dependent. The experiment therefore adds a fixed **180-step pre-intervention burn-in** and compares three matched conditions across 12 new seeds: `stable_mutable`, `scarcity_mutable`, and `neutral_bottleneck_mutable`.

For each seed the scarcity arm is simulated first. Its realized demographic depth is summarized as

\[
b = \frac{\min_{t\ge t_s} N_t}{\bar N_{\mathrm{pre}}}.
\]

The matched neutral arm keeps stable resource regeneration and mutation enabled, but at the shock step applies a one-time random cull that is blind to the heritable rule vector and targets the same fraction \(b\). The primary rule-motion statistic is now explicitly post-shock:

\[
\Delta_R^{\mathrm{post}}=\|\bar R_T-\bar R_{t_s^-}\|_2.
\]

Five criteria were frozen before interpretation: selective scarcity must exceed neutral post-shock displacement by at least `0.015` in the median paired comparison; the excess must be positive in at least two thirds of seeds; selective directional reproducibility must exceed neutral by at least `0.10`; median absolute bottleneck-fraction mismatch must be at most `0.06`; and scarcity extinction must remain within the declared tolerance.

The committed result is **challenged (3/5 criteria pass)**. Scarcity and the depth-matched neutral bottleneck have nearly identical median post-shock displacement (`0.092` vs `0.093`), and scarcity exceeds neutral in only 5 of 12 seeds. However, scarcity rule motion is more directionally reproducible (`0.195` vs `-0.064` mean pairwise cosine), bottleneck depth is matched exactly at the median, and no scarcity population goes extinct. The neutral control therefore explains much of the raw displacement observed after demographic contraction, while the directional difference leaves open a narrower hypothesis about structured selection-induced direction.

The result does **not** show that scarcity has no selection effect. The neutral control matches bottleneck depth, not the complete time-varying demographic trajectory, and subsequent stable ecology can still select among randomly retained survivors. RUL-021 should be read as a successful confound challenge that narrows the next experiment rather than as a final causal decomposition.

Run with:

```bash
npm run ruliology:alife:selection-control
```

Outputs are written to `data/ruliology/alife-selection-control/`.


## RUL-022 — Local fitness-gradient alignment of rule motion

RUL-022 targets the directional ambiguity left by RUL-021. It does not rerun the 12 matched scarcity/neutral motion trajectories. Instead, for each frozen pre-shock population rule centroid it estimates a local ecological performance gradient in the normalized four-dimensional rule space using eight central finite-difference probes (±0.06 per coordinate). Each probe is a homogeneous, no-mutation population evaluated for 120 steps under immediate scarcity, with time-averaged population persistence as the frozen local performance target.

The scarcity motion vectors are positively aligned with this gradient in 9/12 seeds and have median cosine `0.431`, satisfying the positive-alignment and majority criteria. However, neutral-bottleneck motion is also positively aligned (median `0.320`), and the median paired scarcity-minus-neutral alignment is `-0.059`, failing the preregistered +0.10 selection-specific advantage criterion. All 12 gradients are identifiable. The result is therefore **3/4 criteria passed, pilot not supported**.

The narrow interpretation is that RUL-021 scarcity trajectories often move locally toward rule regions that perform better under the chosen immediate-scarcity persistence proxy, but that direction is not specific to scarcity selection relative to the matched neutral bottleneck. This may reflect the shared post-bottleneck ecology, the local/proxy nature of the performance landscape, or demographic reweighting toward similar high-persistence regions. RUL-022 is an engineered ALife diagnostic, not evidence of natural adaptive evolution.


## RUL-023 — Contrastive scarcity-versus-stable performance gradient

RUL-023 follows the failure of the raw scarcity gradient in RUL-022 to distinguish resource-selective motion from matched neutral bottleneck motion. It freezes a more specific environmental contrast before outcome analysis: for each RUL-021 pre-shock rule centroid, define `g_delta = grad(F_scarcity) - grad(F_stable)`, where both local gradients use the same seed geometry, homogeneous no-mutation population, 120-step horizon, time-averaged population-persistence target, and ±0.06 normalized finite-difference step. The scarcity component is reused exactly from RUL-022; RUL-023 adds only the 96 matched stable-resource probes.

The four frozen criteria require median scarcity/contrastive-gradient cosine >= 0.10, median paired scarcity-minus-neutral alignment >= +0.10, positive scarcity alignment in at least two thirds of seeds, and an identifiable nonzero contrastive gradient in at least three quarters of seeds. The result is 1/4: all 12 contrastive gradients are identifiable, but median scarcity alignment is `0.038`, only 6/12 scarcity vectors have positive alignment, and median scarcity-minus-neutral contrastive alignment is `-0.079`. The result therefore challenges the hypothesis that the current short-horizon persistence landscape contains a clean scarcity-specific gradient that explains the realized population rule motion. This does not erase the RUL-020/RUL-021 motion itself; it narrows which mechanistic interpretation is supported by the present local performance proxy.


## RUL-024 — Frequency-dependent invasion-gradient alignment

RUL-024 tests the frequency-dependent alternative raised after RUL-023. Instead of evaluating a homogeneous population at a single rule vector, each probe reproduces the actual seed-specific mixed resident population generated by the RUL-021 burn-in. At the shock step, a rule-blind 10% sample is relabeled as a tagged mutant and assigned a rule offset by ±0.06 normalized units along one coordinate. Tagged identity is inherited and post-introduction mutation is disabled. The invasion score is final minus initial tagged-mutant frequency, and central finite differences across the eight probes estimate a local invasion gradient.

The frozen criteria require median scarcity/invasion-gradient cosine at least 0.10, median paired scarcity-minus-neutral cosine at least +0.10, positive scarcity alignment in at least two thirds of seeds, and an identifiable nonzero invasion gradient in at least three quarters of seeds. The committed result passes 0/4 criteria: median scarcity alignment is 0.000, only 4/12 scarcity trajectories align positively, only 7/12 gradients are identifiable, and the median paired scarcity-minus-neutral alignment is 0.000. The context-dependent local-gradient account is therefore challenged under this tagged-mutant frequency-change estimator. This does not imply the absence of selection or frequency dependence; it shows that the realized centroid motion is not captured by this particular local invasion-gradient construction.

## RUL-025 — From centroid trajectories to lineage-resolved rule distributions

RUL-025 treats the ALife population as a distribution over founder lineages rather than only its mean rule vector. The frozen RUL-021 scarcity and neutral-bottleneck conditions are deterministically replayed with observational lineage logging; no new seed/parameter conditions are introduced. Each lineage is summarized at the pre-shock and final endpoints by its abundance fraction and normalized rule centroid.

The exact symmetric two-time identity

\[
\Delta\mu = \sum_\ell \frac{p_{\ell,0}+p_{\ell,1}}{2}(\mu_{\ell,1}-\mu_{\ell,0})
+ \sum_\ell (p_{\ell,1}-p_{\ell,0})\frac{\mu_{\ell,0}+\mu_{\ell,1}}{2}
\]

separates within-lineage rule motion from between-lineage abundance reweighting. In the committed scarcity runs, the median norm share of the reweighting term is `0.788`, while the within-lineage share is `0.212`. Median pairwise directional coherence among moving surviving lineages is only `0.190`, showing that the whole-population centroid can indeed hide divergent lineage trajectories. The final population is also concentrated: the median top-three founder-lineage fraction is `0.708`.

The stronger scarcity-specific claim is challenged. Neutral bottlenecks are also reweighting-dominated (`0.764` median share), and the paired scarcity-minus-neutral reweighting difference is only `+0.038`, below the frozen `+0.10` margin. RUL-025 therefore strengthens the representation of rulial dynamics from a single centroid \(\bar R_t\) toward an evolving distribution \(\mathcal P(R,t)\), while simultaneously showing that lineage reweighting is not unique to resource-dependent scarcity in the current control design.

## RUL-026 — Time-resolved lineage transport

RUL-026 replaces the two-endpoint view of RUL-025 with a sequence of interval decompositions over the frozen five-step lineage-snapshot cadence. For each adjacent pair, the population centroid increment is written exactly as `Delta_mu_t = W_t + B_t`, where `W_t` is within-lineage rule change and `B_t` is abundance reweighting. This allows the lineage distribution to be treated as moving probability mass through time rather than only as two endpoint mixtures.

The scarcity arm is cumulatively reweighting-dominated (`0.839` median path share), but the reweighting component is highly tortuous: cumulative reweighting path length is about `4.12x` the norm of its net vector. Eleven of twelve scarcity runs change dominant founder lineage at least once, with a median of three switches and three distinct dominant lineages. Cumulative lineage total-variation turnover is `1.951` under scarcity versus `1.779` under the matched neutral bottleneck, and the paired median scarcity-minus-neutral difference is `+0.201`, above the frozen `+0.10` criterion.

All six frozen criteria pass. The result supports a time-resolved transport description of the engineered ALife population, but not a biological selection claim: neutral bottlenecks are also highly tortuous and sequential, and the metrics depend on the declared snapshot cadence.

## RUL-027 — Coarse-grained rulial flux network

RUL-027 takes the time-resolved founder-lineage transport from RUL-026 and projects it onto a fixed four-dimensional grid with four equal-width bins per normalized rule coordinate (`4^4 = 256` possible cells). A lineage segment contributes `J_l,t = 0.5(p0+p1)(mu1-mu0)` to its midpoint cell and a directed source-to-target cell edge; absolute abundance change is tracked separately as local turnover mass. The grid, five-step cadence, seed halves, and seven pilot criteria are frozen before the RUL-027 outcomes. No new seed/parameter conditions are added: 24 deterministic RUL-021 replays are used only to recover lineage-resolved segment geometry.

Scarcity occupies 29 flux-bearing cells and 78 directed coarse edges. The top 20% of occupied cells carry `0.751` of total advective flux, flux-weighted local directional persistence is `0.282`, and the top-flux cells recur across the two frozen six-seed halves with Jaccard `0.667`. Scarcity and matched neutral bottlenecks differ in their cell-flux profile (`JSD = 0.144` bits), abundance-turnover profile (`JSD = 0.055` bits), and directed edge-flux profile (`JSD = 0.230` bits). All seven frozen pilot criteria pass, with exact interval reconstruction against RUL-026 and exact RUL-021 replay.

The result supports a coarse transport-network description in this engineered ALife model: lineage rule motion is not uniformly distributed through rule space, and scarcity changes where transport and abundance turnover are allocated. These cells and edges are observer-dependent summaries, not literal physical currents, and the result does not by itself establish adaptive selection.

## RUL-028 — Multiscale robustness of rulial flux channels

RUL-028 tests whether the RUL-027 coarse-flux result is an artifact of choosing exactly four bins per normalized rule coordinate. It performs **zero new simulations** and reuses the exact committed RUL-027 lineage segment coordinates. Before inspecting the new multiscale outcomes, the resolution family was frozen to `b in {3,4,5,6}` and each original qualitative RUL-027 threshold was declared robust only if it passed at least three of the four resolutions. The committed `b=4` metrics must also reproduce RUL-027 exactly.

The result is supported under that contract. Channel concentration passes at `4/4` scales, seed-half top-channel recurrence at `4/4`, flux-weighted directional persistence at `4/4`, and scarcity-versus-neutral cell-flux Jensen-Shannon divergence at `4/4`. Abundance-turnover profile divergence passes at `3/4`: the coarsest `b=3` grid gives `0.028` bits, while `b=4,5,6` give `0.055`, `0.088`, and `0.117` bits. Channel concentration ranges from `0.578` to `0.751`; recurrence from `0.286` to `1.000`; directional persistence from `0.253` to `0.423`; and cell-flux divergence from `0.070` to `0.233` bits.

All six frozen RUL-028 criteria pass. The result reduces concern that RUL-027's qualitative transport-channel picture is unique to a single `4^4` grid, but it does **not** establish a grid-free continuum current, scale invariance over arbitrary resolutions, adaptive selection, or observer independence. The analysis is intentionally a small-family multiscale robustness test.

