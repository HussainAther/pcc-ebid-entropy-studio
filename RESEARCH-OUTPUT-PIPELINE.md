# Entropy Studio Research Output Pipeline

This iteration promotes the publication lifecycle from static registries to executable browser-side research transforms.

## Run to analysis

`app/lib/analysisEngine.ts` executes registered analysis definitions against completed compatible runs.

Implemented analysis families:

- descriptive summaries
- ordinary least-squares regression over compatible measurement series
- deterministic percentile bootstrap intervals
- threshold-lead/change-point summaries

Every result contains contributing run IDs, numerical estimates, limitations, and an explicit insufficient-data state.

## Run to figure

`app/lib/figureEngine.ts` converts compatible numeric measurement series into an accessible SVG product. The SVG embeds its title and caption, while the companion provenance export records figure definition, run IDs, series count, and warnings.

This is a generic first engine. Domain-specific figure generators can later replace the fallback selection rules while preserving the same output contract.

## Results to manuscript

`app/lib/publicationEngine.ts` refreshes a Markdown manuscript from:

- publication structure
- completed run conclusions
- registered analyses
- executed analysis results
- figure ledger
- reproducibility identifiers

Generated trace summaries are deliberately marked as machine-produced and do not masquerade as author-approved prose.

## Dataset integrity

`app/lib/packageEngine.ts` creates an `entropy-dataset-package/1.0.0` payload and calculates SHA-256 over a canonical JSON representation. The resulting checksum makes later release packaging and repository deposition auditable.

## Validation performed

- Python boids adapter compilation
- JSON Schema parsing
- sample run artifact parsing
- TypeScript/TSX syntax transpilation
- strict type-check of the core publication engines
- end-to-end sample boids analysis
- end-to-end SVG generation
