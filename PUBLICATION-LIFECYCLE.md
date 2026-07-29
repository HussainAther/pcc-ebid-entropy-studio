# Entropy Studio Publication Lifecycle

This build promotes publication outputs to first-class, typed research objects.

## Added workspaces

- **Figure Studio** — versioned figure specifications linked to experiments, observables, generators, and run provenance. SVG export is disabled until compatible run data exists.
- **Statistics Studio** — preregistered analysis definitions with compatible-run detection and analysis-manifest export.
- **Publication Studio** — paper records, section ledgers, evidence links, manuscript Markdown export, and explicit pending-review markers.
- **Dataset Builder** — versioned reproducibility-package manifests containing runs, figures, analyses, citation metadata, licensing, and release boundaries.
- **Mission Control** — portfolio-level counts for papers, figures, analyses, datasets, and the next scientific action.

## Epistemic safeguards

1. Missing data produces an explicit awaiting-run state.
2. Figures are not exported as scientific results without compatible runs.
3. Manuscripts do not invent Results prose; they summarize loaded run conclusions and mark remaining author work.
4. Dataset export creates a transparent manifest rather than pretending to mint a DOI or upload to Zenodo.
5. All generated artifacts preserve experiment, observable, engine, repository, revision, and run identifiers when available.

## Current publication objects

- `PAPER-001` — Minimal cyclic replicator paper
- `PAPER-002` — PCC-Boids transition paper
- `FIG-001` through `FIG-003`
- `AN-001` through `AN-003`
- `DATASET-001` and `DATASET-002`
