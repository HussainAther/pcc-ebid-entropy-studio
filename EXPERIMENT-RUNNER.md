# Entropy Studio Experiment Runner

This milestone adds the first executable EBID research workflow.

## New domain objects

- `ExperimentRun`
- `MeasurementSeries`
- `ObservableResult`
- `RunProvenance`

A definition describes what should be run. A run records what was actually executed.

## Local runner

`app/lib/experimentRunner.ts` provides a deterministic seeded runner for experiment `E-007`. It:

1. integrates a three-state cyclic replicator toy model;
2. records entropy deficit, KL divergence, and quadratic distance time series;
3. computes the registered log-deficit slope estimator;
4. compares the estimate with the preregistered `2 epsilon` target;
5. returns a support, challenge, or inconclusive conclusion;
6. preserves engine, registry, revision, parameter, seed, and timestamp provenance.

## Evidence graph integration

`app/data/runEvidence.ts` derives run and result nodes plus typed relations:

- experiment `produces` run;
- run `produces` observable result;
- result is `computed-with` a registered observable;
- run `supports-with-result` or `challenges-with-result` the hypothesis.

No static claim is promoted automatically. The graph records the scope and rationale of each computational result.

## Current limitations

- Run records live in browser state and are not persisted after refresh.
- The runner is an in-browser reference implementation, not yet a Python worker or queued backend.
- Confidence is a transparent heuristic score, not a formal statistical confidence interval.
- The current executable model covers only the declared cyclic-replicator toy experiment.
