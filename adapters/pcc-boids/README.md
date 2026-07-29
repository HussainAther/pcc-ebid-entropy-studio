# PCC-Boids Entropy Studio adapter

Copy `pcc_boids/`, `configs/`, and `requirements.txt` into the `pcc-boids` repository, then run:

```bash
python -m pcc_boids.run \
  --experiment noise-sweep \
  --seed 12345 \
  --config configs/noise-sweep.json \
  --output run.json
```

Import `run.json` through Entropy Studio's Simulation Bench. The command is deterministic for a fixed seed and configuration. It emits `entropy-run/1.0.0`.
