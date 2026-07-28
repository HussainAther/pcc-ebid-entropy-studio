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
