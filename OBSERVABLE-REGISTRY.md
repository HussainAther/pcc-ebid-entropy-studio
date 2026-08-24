# Entropy Studio Observable Registry

The observable registry is the canonical catalog of measurable quantities used by EBID experiments.

## Files

- `app/models/research.ts` defines `ObservableDefinition` and related enums.
- `app/data/observables.ts` contains the PCC / EBID observable records.
- `app/data/research.ts` attaches the registry to the active workspace.
- `app/studio.tsx` provides the searchable registry interface.

## Registry contract

Every observable records:

- a stable ID and slug;
- mathematical symbol and formula;
- scientific interpretation;
- required inputs and output;
- reference estimator;
- validity conditions;
- known failure modes;
- implementation status and optional code path;
- links to sources, claims, and hypotheses;
- tags and project ownership.

Experiments reference observables by stable ID through `observableIds`. They should not embed display names or duplicate formulas.

## Initial records

- `OBS-SHANNON` — Shannon entropy
- `OBS-DEFICIT` — entropy deficit
- `OBS-KL` — KL divergence to equilibrium
- `OBS-QUADRATIC` — quadratic distance
- `OBS-LOG-SLOPE` — log-deficit growth-rate estimator
- `OBS-ENTROPY-RATE` — entropy time derivative
- `OBS-HAMMING` — normalized Hamming benchmark

## Adding an observable

Add one `ObservableDefinition` to `createPccObservables`. Use a stable uppercase ID, link actual source IDs, distinguish implemented code from a mathematical specification, and declare failure modes before using the observable in an experiment.

## Ruliology additions

The registry now includes planned or implemented quantities for trajectory compression, perturbation growth, recovery time, mutual information, autocorrelation time, macrostate occupancy, transition rate, metastable dwell time, and rule sensitivity. These definitions are intentionally estimator-aware: no compression statistic is labeled exact algorithmic complexity, and no finite perturbation-growth statistic is labeled a Lyapunov exponent without the required assumptions.

## RUL-001 implemented estimators

The ECA benchmark now computes ensemble summaries for Shannon entropy, normalized Hamming perturbation distance, finite-horizon perturbation-growth slope, entropy-series autocorrelation threshold time, and a frozen binary run-length compression ratio. The compression statistic is an explicitly codec-dependent proxy and must not be described as Kolmogorov complexity. Cross-feature rule-neighborhood distances use fixed scales declared in `app/lib/rulialAnalysis.ts`.

## RUL-020 rule-motion observables

The mutable-rule ALife pilot adds `OBS-RULE-CENTROID-DISPLACEMENT`, `OBS-RULE-DIVERSITY`, `OBS-RULE-PATH-LENGTH`, `OBS-POPULATION-RECOVERY`, and `OBS-LINEAGE-DIVERSITY`. Rule-space quantities are computed only after per-coordinate normalization to the declared `RSPACE-ALIFE-001` bounds. These are population summaries: they do not by themselves establish adaptation, biological fitness, or a universal evolutionary law.

## RUL-021 ALife observables

- `OBS-POSTSHOCK-RULE-DISPLACEMENT`: normalized distance between the last pre-shock population rule centroid and the final centroid.
- `OBS-BOTTLENECK-DEPTH`: fractional demographic decline from the pre-shock reference population to the minimum post-shock population.

These observables are paired in RUL-021 to distinguish intervention-associated rule motion from population-loss magnitude.

### OBS-FITNESS-GRADIENT-ALIGNMENT

RUL-022 adds `OBS-FITNESS-GRADIENT-ALIGNMENT`, the cosine between a realized post-shock rule-centroid motion vector and a local finite-difference gradient of the frozen scarcity performance target. The current target is 120-step time-averaged population persistence in homogeneous no-mutation probe populations. It is a local engineered performance proxy, not a universal biological fitness quantity.


RUL-023 adds `OBS-CONTRASTIVE-FITNESS-GRADIENT-ALIGNMENT`, the cosine between realized post-shock rule motion and `grad(F_scarcity) - grad(F_stable)`. The contrast is intended to remove performance directions shared by stable and scarce ecology, but remains a local engineered proxy based on short-horizon homogeneous-population persistence.

### RUL-025 lineage observables

- `OBS-LINEAGE-REWEIGHTING-SHARE`: norm share of the exact two-time population-centroid decomposition attributable to changing founder-lineage abundances rather than within-lineage centroid change.
- `OBS-LINEAGE-DIRECTIONAL-COHERENCE`: mean pairwise cosine among nonzero rule-centroid motion vectors of surviving founder lineages; low values indicate that a whole-population centroid hides divergent subpopulation directions.
