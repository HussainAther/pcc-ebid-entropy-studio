# Ruliology in Entropy Studio

## Scope

Entropy Studio uses **Ruliology** operationally as the systematic study of generative rule spaces, the trajectories those rules produce, and the equivalence classes or transitions induced by declared observers.

The term is a research-program label, not a claim that a new mathematical field has already been established. Results should be described at the narrowest level supported by registered experiments.

## Three spaces

Every rulial experiment must distinguish:

1. **Rule space (R)**: the set or parameter family of transition rules.
2. **State space (X)**: the states evolved by a rule.
3. **Observable space (O)**: registered measurements produced by a declared observer or coarse-graining.

The experimental map is

`rule -> trajectory in state space -> observer -> observable profile`.

Two rules may therefore be observationally equivalent for one observer and distinguishable for another.

## Initial benchmark program

- **RUL-001 - Elementary CA Instability Atlas**: enumerate all 256 elementary cellular automata and construct EBID-style instability profiles across frozen initial conditions and perturbations.
- **RUL-002 - Rulial Neighborhood Sensitivity**: compare distance in rule representation against distance in observable profiles.
- **RUL-003 - EBID Equivalence Classes**: cluster or quotient rules using preregistered observable-distance criteria, then compare post hoc with external CA classifications.
- **RUL-004 - PCC Regime Atlas**: test preregistered macro-regime criteria without defining Pressure, Chaos, or Control from the outcomes being explained.
- **RUL-005 - Boids Rulial Landscape**: extend the validated noise sweep into a structured multi-parameter rule-space campaign.
- **RUL-006 - Cross-System Universality Challenge**: test whether any instability structure survives transfer across CA, Boids, and replicator systems.

## Guardrails

- Do not infer universality from one rule family.
- Do not tune observer definitions after inspecting the result they are meant to test.
- Keep syntactic rule distance separate from dynamical/observable distance.
- Treat clustering and embeddings as exploratory until stability and sensitivity are measured.
- Report negative and inconclusive outcomes.
- Preserve seeds, initial states, parameter grids, observer definitions, estimator versions, and source revisions in exported artifacts.

## Executable ECA benchmark

`CAMPAIGN-RUL-ECA-001` now has a dedicated local campaign runner in `app/lib/rulialCampaignRunner.ts` and a no-dependency Node 22 CLI in `scripts/run-rulial-eca.ts`.

Run the frozen benchmark with:

```bash
npm run ruliology:eca
```

Use `npm run ruliology:eca:quick` for the seven-rule plumbing subset.

The complete benchmark currently freezes 256 ECA rules × 4 seeded Bernoulli initial conditions at width 257 for 256 steps, with periodic boundaries and a matched center-cell flip. It writes:

- `data/ruliology/eca-atlas/campaign-report.json` — run summaries, profiles, and rule-neighborhood transitions;
- `data/ruliology/eca-atlas/profiles.csv` — one EBID feature vector per rule;
- `data/ruliology/eca-atlas/transitions.csv` — one-bit truth-table edges with scaled observable distance;
- `data/ruliology/eca-atlas/atlas.json` — compact UI payload used by the Rulial Atlas.

The rule geometry is the 8-dimensional Hamming hypercube of ECA transition tables: two rules are neighbors only when exactly one of the eight local outputs differs. This produces 1024 undirected one-bit edges across the complete 256-rule family. Observable distances use fixed, declared feature scales before cross-feature Euclidean comparison.

The generated atlas is a benchmark dataset, not a discovered universal taxonomy. External cellular-automaton classes remain excluded from feature construction and may only be compared post hoc.
