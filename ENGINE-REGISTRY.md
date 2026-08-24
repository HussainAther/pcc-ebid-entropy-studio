# Repository and Engine Registry

Entropy Studio is the EBID research control plane. Scientific implementations remain in focused repositories and are connected through stable registry IDs and versioned artifact contracts.

## Registered repositories

- `REPO-PCC` — theory, canonical observables, reference numerical work
- `REPO-PCC-BOIDS` — agent-based and spatial simulation benchmarks
- `REPO-PCC-EBID-ML` — machine-learning inference and analysis
- `REPO-PCC-EBID-TRAINING` — dataset construction and model training

## Registered engines

- `ENGINE-LOCAL-REPLICATOR` is currently validated inside Entropy Studio.
- `ENGINE-PCC-CORE` records the target adapter for the core Python repository.
- `ENGINE-PCC-BOIDS`, `ENGINE-EBID-ML`, and `ENGINE-EBID-TRAINING` define planned integration contracts without pretending that unverified entrypoints already exist.

## Provenance contract

Every completed run records:

- engine ID
- repository ID
- engine version
- artifact schema version through the registry
- source revision
- observable registry version
- random seed and frozen parameters

Registry status distinguishes metadata availability from actual validation. A repository can exist while its Entropy Studio engine adapter remains planned.

## PCC-Boids validated adapter

`ENGINE-PCC-BOIDS` now exposes a validated deterministic CLI contract and emits `entropy-run/1.0.0`. The adapter bundle lives in `adapters/pcc-boids/`; its artifacts can be imported through the Simulation Bench after schema and registry validation.

## Ruliology engines

`ENGINE-LOCAL-ECA` is the calibration implementation for the finite `RSPACE-ECA-256` rule space. It is registered as **available**, not yet as a campaign-validated engine: the Rulial Atlas can exercise deterministic ECA trajectories, but the general campaign orchestrator must not silently route ECA campaigns through the replicator runner. A dedicated rulial campaign execution path is required before `CAMPAIGN-RUL-ECA-001` is promoted to ready/validated.

`ENGINE-PCC-BOIDS` is also mapped to `RSPACE-BOIDS-001`. The existing single-axis noise sweep remains a valid narrow benchmark; `CAMPAIGN-RUL-BOIDS-001` is a specified multidimensional extension and should use a frozen space-filling design plus held-out boundary validation before interpretation.

## Local ECA rulial campaign runner

`ENGINE-LOCAL-ECA` is now executable through `app/lib/rulialCampaignRunner.ts` and `scripts/run-rulial-eca.ts`. Engineering validation covers deterministic seeded initialization, complete 256-rule enumeration, matched perturbations, 8-bit truth-table Hamming neighborhoods, profile aggregation, and committed atlas generation. This validation is about execution/provenance correctness; it does not validate a scientific universality claim.

## RUL-008 local network engine

`ENGINE-LOCAL-NETWORK` executes the topology-blocked stochastic binary-network benchmark through `scripts/run-rulial-network.py`. The engine samples `RSPACE-NETWORK-001`, evaluates every local rule across fixed ring, small-world, and Erdos-Renyi topology blocks, and emits `entropy-rulial-network/1.0.0`. Topology is an explicit block, not a hidden coordinate in the normalized local-rule metric.

## RUL-020 mutable-rule ALife engine

`ENGINE-LOCAL-ALIFE` executes `RSPACE-ALIFE-001` through `scripts/run-rulial-alife.py`. Unlike the fixed-rule ECA, Boids, and Network benchmarks, agents carry heritable rule vectors and offspring may mutate them, so the population distribution over rules is part of the system state. RUL-020 uses matched stable-mutable, scarcity-mutable, and scarcity-frozen conditions and emits `entropy-rulial-alife-motion/1.0.0`.

## RUL-021 ALife selection-control extension

`ENGINE-LOCAL-ALIFE` now also supports `RUL-021` through `scripts/run-rulial-alife-selection-control.py`. The extension adds a 180-step burn-in and a per-seed neutral bottleneck control that keeps resources stable and mutation enabled while applying one random rule-blind cull matched to the paired scarcity bottleneck depth. The control matches bottleneck depth, not the full demographic trajectory.

### RUL-022 local performance-gradient probes

`ENGINE-LOCAL-ALIFE` now accepts an explicit `initial_rule_center` for frozen homogeneous probe populations. RUL-022 uses that capability only in separate `scarcity_frozen` finite-difference probes; the RUL-021 motion trajectories remain unchanged. The gradient probe is therefore an analysis-side intervention on rule coordinates, not a rewrite of the mutable ecology.


### RUL-023 contrastive environmental-gradient probes

`ENGINE-LOCAL-ALIFE` is reused for matched stable-resource finite-difference probes at exactly the RUL-022 rule centers and step size. RUL-023 does not rerun the frozen RUL-021 motion or RUL-022 scarcity probes; it adds stable probes only and constructs `grad(F_scarcity) - grad(F_stable)` analysis-side.
