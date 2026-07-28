# Entropy Studio: typed workspace milestone

This milestone turns the PCC/EBID prototype into the first workspace hosted by Entropy Studio.

## What changed

- Added a top-level `ResearchWorkspace` model.
- Added typed project metadata, workspace statistics, graph edges, entity IDs, statuses, and project ownership.
- Converted the PCC/EBID seed data into a single `pccWorkspace` object.
- Updated the UI to read branding, project metadata, counts, navigation, sources, claims, hypotheses, experiments, graph records, and review concerns from that workspace.
- Added explicit source IDs and project IDs so objects can later be persisted in JSON, SQLite, D1, or an API without reshaping the UI.

## Next recommended milestone

Add a workspace registry and selector:

```ts
export const workspaces = [pccWorkspace, strxWorkspace, webarWorkspace];
```

Then route the application by workspace slug, for example `/workspaces/pcc-ebid`.

## Workspace registry milestone

- Added `app/data/workspaces.ts` as the single registry for available and planned research workspaces.
- Added a sidebar workspace selector.
- PCC / EBID remains the default available workspace.
- STRX, WebAR, and ML Research are represented as disabled planned entries until typed workspace datasets are added.
- Resetting the active view to the overview on workspace change prevents stale cross-workspace state.
- Research views now consume the active workspace through a React context rather than module-level globals.
