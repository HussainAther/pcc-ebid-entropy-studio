# Experiment Orchestrator

Entropy Studio now treats a research campaign as a first-class, versioned object rather than a loose sequence of manual clicks.

## Pipeline

```text
Campaign manifest
  -> seed x parameter grid
  -> registered engine execution or artifact-import boundary
  -> immutable run artifacts
  -> registered statistics
  -> run-derived figures
  -> evidence summary
  -> manuscript refresh
  -> integrity-checked reproducibility package
```

## Initial campaigns

### CAMPAIGN-REPLICATOR-EPSILON-001

A browser-executable 3-seed x 5-epsilon campaign for `E-007`.

- 15 deterministic runs
- analyses `AN-001` and `AN-002`
- figures `FIG-001` and `FIG-002`
- manuscript `PAPER-001`
- dataset `DATASET-001`

### CAMPAIGN-BOIDS-NOISE-001

An import-gated campaign for the external PCC-Boids Python engine.

Entropy Studio does not pretend that this engine can execute in the browser. The campaign remains blocked until schema-valid `entropy-run/1.0.0` artifacts are generated externally and imported through the Simulation Bench.

## Execution guarantees

- The parameter grid and fixed parameters are stored in the campaign definition.
- Every local campaign run receives a campaign-derived immutable ID.
- Downstream analyses and figures record contributing run IDs.
- The evidence step counts supporting, challenging, and inconclusive outcomes without rewriting authored claims.
- Manuscript output remains a traceable scaffold requiring author review.
- Dataset packages include a SHA-256 checksum over canonicalized contents.
- External engines stop at an explicit artifact-import boundary.

## Report contract

Completed or blocked executions export:

```text
entropy-campaign-report/1.0.0
```

The report contains the run artifacts, step ledger, analysis results, figure products, manuscript scaffolds, reproducibility packages, evidence summary, and warnings.
