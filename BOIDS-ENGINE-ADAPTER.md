# PCC-Boids Engine Adapter

Entropy Studio now defines a real cross-repository integration for `HussainAther/pcc-boids`.

## Contract

The shared artifact contract is `schemas/entropy-run-artifact.schema.json` with version `entropy-run/1.0.0`. It freezes:

- experiment, hypothesis, engine, and seed identity
- scalar run parameters
- repository and revision provenance
- measurement time series
- registered observable results
- generated artifact references
- a scoped supports/challenges/inconclusive conclusion

## Validated command

```bash
python -m pcc_boids.run \
  --experiment noise-sweep \
  --seed 12345 \
  --config configs/noise-sweep.json \
  --output run.json
```

The adapter source is bundled under `adapters/pcc-boids/` so it can be copied into the `pcc-boids` repository. The generated `run.json` can be imported through the Entropy Studio Simulation Bench.

## Experiment

`E-BOIDS-001` varies Chaos while holding Pressure, Control, domain size, and agent count fixed. It records polarization, heading entropy, spatial entropy, and speed variance. `OBS-TRANSITION-LEAD` compares the first preregistered heading-entropy rise against the first polarization-collapse threshold.

If either threshold is not crossed inside the configured sweep, the result is explicitly inconclusive rather than forced into support or challenge.

## Validation performed

- repeated runs with the same seed produced identical measurements, observable results, and conclusions
- generated output passes the JSON Schema
- engine, experiment, hypothesis, and observable identifiers resolve inside Entropy Studio
- standalone TypeScript model/data/adapter compilation passes
