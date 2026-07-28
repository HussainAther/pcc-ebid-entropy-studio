# Entropy Studio Evidence Graph

The Evidence Graph converts EBID research objects into an auditable network. It is distinct from the older conceptual diagram: every node points to a typed workspace entity and every edge carries a relation type, evidence state, and human-readable rationale.

## Included entity layers

- Sources
- Methods
- Observables
- Claims
- Hypotheses
- Experiments

## Relation semantics

- `documents`: a source records or defines another entity
- `grounds`: an observable provides formal structure for a claim
- `derived-from`: a hypothesis records an entity as part of its derivation
- `tested-by`: an experiment is designed to test a hypothesis
- `measured-by`: an experiment names an observable in its manifest
- `implemented-by`: a registered method implements an experiment model
- `uses`: a hypothesis depends on or evaluates an observable

The model also reserves `supports` and `challenges` for future result-backed relations. Those should be added only when an actual evidence object or adjudicated result exists.

## Integrity rules

1. Every relation endpoint must resolve to a graph node.
2. Node and relation IDs must be unique.
3. A relation is not proof; its evidence level and rationale remain visible.
4. Relations should be explicit rather than parsed from prose.
5. Future experiment results should create new result/evidence entities instead of silently promoting hypotheses to supported claims.

## Current validated graph

- 26 nodes
- 41 relations
- 5 sources
- 6 methods
- 7 observables
- 4 claims
- 3 hypotheses
- 1 experiment
- 0 integrity errors
