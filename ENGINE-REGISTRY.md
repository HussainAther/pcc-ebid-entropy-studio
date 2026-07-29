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
