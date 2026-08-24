# PCC / EBID Research Studio

An interactive computational laboratory for structured instability, adaptation, state transitions, information dynamics, and resilience.

The source framework defines **PCC as Pressure–Chaos–Control**: pressure drives or amplifies change, chaos introduces disruption or unpredictability, and control stabilizes or constrains. **EBID is Entropy-Based Instability Dynamics**, an observational layer relating entropy deficit and instability. Those definitions are preserved; the cognitive modules are exploratory extensions, not established consequences of PCC/EBID.

> Educational and research software only. It is not a clinical assessment, diagnostic device, treatment tool, or validated model of universal psychological mechanisms.

## Included labs

- Cognitive Flexibility Sandbox — deterministic task-switching comparison
- Thought-Loop & State-Transition Model — weighted named-state trajectories
- Cellular-Automata Resilience Lab — Wolfram rules, XOR maps, normalized Hamming distance
- Information-Dynamics Explorer — entropy, signal/noise, and bottlenecks
- Adaptive-Agent Playground — transparent policy baselines
- Personal Data Import — browser-local CSV preview with synthetic data

## Run locally

```bash
# web
pnpm install
pnpm dev

# API (second terminal)
python -m venv .venv
.venv/bin/pip install -e '.[dev]'
.venv/bin/uvicorn apps.api.main:app --reload --port 8000
```

Open `http://localhost:3000`; API documentation is at `http://localhost:8000/docs`.

## Test and build

```bash
pytest
pnpm build
node --test tests/rendered-html.test.mjs
```

Or run both services with `docker compose up --build`.

## Repository map

```text
app/                    React/TypeScript studio UI
apps/api/               FastAPI routes and validation
packages/simulations/   deterministic scientific engines
data/synthetic/         non-personal demonstration data
data/schemas/           import contracts
docs/                   audit, architecture, limitations, roadmap
tests/python/            deterministic metric and engine tests
```

The original `/Volumes/External/pcc` repository was audited read-only and was not modified. See [docs/AUDIT.md](docs/AUDIT.md) for provenance and findings.

## Generated sample

![Rule 110 XOR difference map](public/sample-ca-difference.png)

The amber cells show exact divergence after a single bit flip at `t=8`. Regenerate it with `PYTHONPATH=. python scripts/generate_sample.py`.

## Reproducibility

Every stochastic demo uses a visible fixed seed. API inputs are validated. The UI runs locally without personal-data upload. Results are simulation outputs, not empirical findings.

## License

No license was present in the supplied source repository. Choose an open-source license before public distribution; Apache-2.0 or MIT are reasonable candidates, but this project does not presume ownership rights over archived manuscripts or third-party PDFs.

## Current milestone: executable experiment runs

Entropy Studio now separates experiment definitions from immutable run records. The Simulation Bench can execute the registered E-007 cyclic-replicator toy protocol, capture measurement series, compute registered observables, preserve a reproducibility manifest, and derive result-backed Evidence Graph relations. See `EXPERIMENT-RUNNER.md`.

## Experiment Orchestrator

The `08 · Experiment Orchestrator` workspace executes registered research campaigns from a frozen seed/parameter grid through statistics, figures, evidence summaries, manuscript refresh, and reproducibility packaging. Validated local engines run directly; external engines remain explicitly import-gated. See `EXPERIMENT-ORCHESTRATOR.md`.

## Mission Control dashboard

The default landing page is now a front-facing Mission Control workspace. It derives presentation data from the active research registry and currently loaded immutable run records rather than calling a separate dashboard API.

The dashboard includes:

- time-aware workspace greeting and next-action focus
- research-health metrics with direct navigation
- campaign progress based on expected seed/parameter combinations
- actionable attention items for blocked campaigns, missing figures, challenged runs, and incomplete Results sections
- recent session and registry activity
- evidence balance from loaded run conclusions
- publication-pipeline readiness

The composition layer lives in `app/lib/missionControl.ts`; responsive presentation is implemented in `app/studio.tsx` and `app/globals.css`.

### Frontend verification

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Open `http://localhost:3000`. The repository intentionally uses pnpm as its single package manager.

## Ruliology layer

Entropy Studio now treats rule spaces and observers as first-class research objects. The initial program is documented in `RULIOLOGY.md` and begins with the complete 256-rule elementary cellular-automaton family before extending the same contracts to Boids and other engines.

Key additions:

- `app/models/ruliology.ts` - rule-space, observer, profile, equivalence, and transition types.
- `app/data/ruleSpaces.ts` - registered ECA, Boids, and replicator rule spaces plus frozen observer definitions.
- `app/lib/elementaryCA.ts` - deterministic ECA calibration engine with matched single-cell perturbations.
- `app/lib/ruleSpaceExplorer.ts` - finite rule enumeration and normalized rule distance.
- `app/lib/rulialAnalysis.ts` - observable-profile distance, equivalence components, and sensitivity detection.
- `app/lib/crossSystemAnalysis.ts` - shared-observable summaries across rule spaces.
- `schemas/rule-space.schema.json`, `schemas/rulial-profile.schema.json`, and `schemas/rulial-campaign.schema.json` - versioned rulial artifact contracts.
- `examples/ruliology/eca-atlas.json` - non-frozen RUL-001 campaign template.
- `04 · Rulial Atlas` - Studio workspace for browsing rule spaces, observers, and a deterministic ECA plumbing preview.

The scientific boundary is explicit: the ECA preview verifies infrastructure only. Claims about classes, phase boundaries, observer dependence, PCC regimes, or cross-system universality require frozen campaigns and held-out validation.

### RUL-001 executable atlas

The first complete Ruliology benchmark can now be regenerated locally with `npm run ruliology:eca`. It enumerates all 256 elementary cellular automata over the frozen four-seed ensemble and writes the campaign report, rule profiles, one-bit rule-neighborhood transitions, and compact Rulial Atlas payload under `data/ruliology/eca-atlas/`.

The browser Rulial Atlas consumes the committed compact atlas payload, so the 256-rule population and highest one-bit sensitivity edges can be inspected without rerunning the campaign on every page load. `npm run ruliology:eca:quick` preserves a seven-rule smoke-test path.

### RUL-002 / RUL-003 held-out validation

Run `npm run ruliology:eca:validate` after generating or loading the frozen RUL-001 atlas. The validator generates a disjoint four-seed holdout ensemble, deterministic 95% bootstrap intervals for every rule-feature, rule-distance and one-bit-edge rank-stability statistics, replicated top-tail sensitivity edges, and conservative complete-link candidate EBID equivalence classes. Results are committed under `data/ruliology/eca-validation/` and surfaced in `04 · Rulial Atlas`.

The external-classification comparison is intentionally left unrun until a provenance-bearing label table is frozen. This prevents Wolfram or other CA class labels from influencing the unsupervised EBID metrics and candidate classes.

### RUL-004 observer-dependence benchmark

Entropy Studio can now test observer dependence without re-simulating the underlying system. `npm run ruliology:eca:observers` simulates a 16-seed ECA ensemble once, reprojects the same stored run summaries through four frozen observer definitions, calibrates each observer's equivalence tolerance from disjoint split halves, and writes candidate quotient classes plus cross-observer comparisons under `data/ruliology/eca-observer-dependence/`.


### RUL-005 observer-space geometry

After generating the fixed-trajectory RUL-004 observer dataset, enumerate all 31 non-empty subsets of the five-feature ECA observer basis and compare observer distance to induced rulial geometry/quotient distance:

```bash
npm run ruliology:eca:observer-geometry
```

The analysis reuses the existing 4,096 source runs and writes a 31-node / 465-pair observer lattice analysis to `data/ruliology/eca-observer-geometry/`.

### RUL-006 Boids rule-space stress test

Run the frozen multidimensional Boids benchmark with:

```bash
npm run ruliology:boids
```

It writes `data/ruliology/boids-rulial/` with the discovery profiles, local candidate boundaries, held-out endpoint tests, adaptive boundary probes, a compact Studio summary, and a provenance-oriented full report. RUL-006 is intentionally a stress test rather than a claimed universal flocking phase diagram.


### RUL-007 cross-substrate challenge

Run the first frozen ECA-Boids structural comparison with:

```bash
npm run ruliology:cross-substrate
```

The command reuses the committed ECA discovery/holdout artifacts and the frozen RUL-006 Boids discovery design, then adds complete held-out Boids coverage at all 32 rule coordinates (64 new simulations). It writes `data/ruliology/cross-substrate/` with a versioned report, compact summary, substrate metrics, held-out Boids profiles, and checksum.

RUL-007 compares dimensionless structural summaries rather than raw cross-system observables. Its five criteria are frozen in the script and failures are retained. The current benchmark passes 2/5 criteria across both substrates, so it is a mixed cross-substrate result rather than evidence of universality.

### RUL-008 network rulial benchmark

Entropy Studio now includes a topology-blocked stochastic network substrate. A deterministic 24-point Latin hypercube samples threshold, neighbor coupling, node memory, and stochastic temperature. Each local rule is evaluated on fixed ring, small-world, and matched-degree Erdos-Renyi graphs, with three discovery and two disjoint validation seeds.

Run:

```bash
npm run ruliology:network
```

The benchmark writes `entropy-rulial-network/1.0.0` artifacts to `data/ruliology/network-rulial/`. Topology is retained as an explicit experimental block rather than hidden inside the local rule metric. The committed result shows strong held-out stability, but no cross-substrate universality claim is made until the pre-existing RUL-007 contract is applied unchanged to all three substrates.

### RUL-009: frozen three-substrate challenge

The Ruliology program now includes a versioned three-way comparison across elementary cellular automata, stochastic Boids, and topology-blocked stochastic networks. RUL-009 reuses the five structural criteria frozen in RUL-007 **without changing any threshold after seeing RUL-008**. It performs no new simulations.

Current result: ECA passes 5/5 criteria, Network passes 5/5, and Boids passes 2/5. Two criteria are retained across all three substrates: positive global rule/observable association and a heterogeneous local-sensitivity tail. The stronger geometry and local-boundary replication criteria remain challenged by Boids.

```bash
npm run ruliology:three-substrate
```

See `data/ruliology/three-substrate/` and `schemas/rulial-three-substrate.schema.json`.

### RUL-010: Boids stochasticity / resolution diagnostic

RUL-010 keeps the RUL-009 benchmark frozen and asks why Boids was the replication outlier. It reuses the same 32 RUL-006 rule coordinates with two new disjoint seed pools, a nested 1/2/4-seed averaging ladder, a diagnostic per-step-noise-suppressed arm, and four observer projections computed from identical runs.

```bash
npm run ruliology:boids:resolution
```

The committed diagnostic indicates that averaging improves the full Boids geometry only modestly, while observer choice matters strongly: state/structure and order/entropy projections are much more stable than the sparse transition/dwell projection. Suppressing per-step Gaussian forcing does not repair the one-seed geometry, so the current evidence does not support blaming the RUL-009 gap primarily on that forcing term. See `data/ruliology/boids-resolution/` and `schemas/rulial-boids-resolution.schema.json`.

### RUL-011 prospective Boids observer validation

`npm run ruliology:boids:observer-validation` runs a new 40-point Boids rule-space sample under two new four-seed pools and projects the identical 320 trajectories through three preregistered observers. The primary test asks whether the RUL-010 state/structure observer beats the frozen six-feature observer by at least `0.05` in both full-geometry and local-edge split-half Spearman stability. The committed result passes both margins on unseen rule coordinates; earlier RUL-009/RUL-010 benchmarks remain unchanged. Outputs are frozen under `data/ruliology/boids-observer-validation/`.


## RUL-012 — Cross-substrate observer conditioning diagnostic

RUL-012 asks whether a simple coordinate-level reliability rule generalizes across ECA, Boids, and Network: do observable coordinates that move more for the same rule across independent pools induce less reproducible rule-space geometry? The analysis adds **zero new simulations**, uses 17 registered coordinates from frozen prior profile pairs, normalizes same-rule displacement by discovery-pool robust range, and applies a 5,000-draw substrate-stratified permutation test.

The frozen primary hypothesis is **challenged**. The pooled association is approximately `rho = 0.004` with stratified permutation `p = 0.792`, rather than the preregistered `rho <= -0.50`. This preserves the narrower prospective RUL-011 result while rejecting the stronger idea that one scalar same-rule-shift score is a general cross-substrate predictor of observer geometry conditioning. The next observer theory should therefore model feature semantics, degeneracy, and interactions among coordinates rather than relying on a single noise magnitude.

Run with `npm run ruliology:observer-conditioning`. Outputs live under `data/ruliology/observer-conditioning/`.
