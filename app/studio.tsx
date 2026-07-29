"use client";

import { ChangeEvent, createContext, useContext, useMemo, useState } from "react";

import type { EvidenceLevel, ExperimentRun, ResearchSource, ResearchView, ResearchWorkspace } from "./models/research";
import { defaultWorkspaceId, getWorkspace, workspaceRegistry } from "./data/workspaces";
import { extendEvidenceGraphWithRuns } from "./data/runEvidence";
import { executeExperimentRun } from "./lib/experimentRunner";
import { importRunArtifact, validateRunArtifact } from "./lib/runArtifact";

const WorkspaceContext = createContext<ResearchWorkspace | null>(null);
const RunContext = createContext<{ runs: ExperimentRun[]; addRun: (run: ExperimentRun) => void }>({ runs: [], addRun: () => undefined });

function useWorkspace(): ResearchWorkspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("WorkspaceContext is unavailable");
  return workspace;
}

function claimSources(workspace: ResearchWorkspace, sourceIds: string[]): string {
  const sourceNameById = new Map(workspace.sources.map(source => [source.id, source.name]));
  return sourceIds.map(id => sourceNameById.get(id) ?? id).join(" · ");
}

function Tag({ level }: { level: EvidenceLevel }) { return <span className={`tag ${level}`}>{level}</span>; }
function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <header className="section-head"><div><span>{eyebrow}</span><h2>{title}</h2></div>{action}</header>; }
function Stat({ label, value, foot }: { label: string; value: string; foot: string }) { return <div className="stat"><span>{label}</span><strong>{value}</strong><small>{foot}</small></div>; }
function Notice({ title, children }: { title: string; children: React.ReactNode }) { return <aside className="notice"><b>{title}</b><p>{children}</p></aside>; }

function Overview({ onNavigate }: { onNavigate: (v: ResearchView) => void }) {
  const workspace = useWorkspace();
  const { project, stats, lifecycle, claims } = workspace;
  return <div className="view">
    <div className="hero">
      <div><span className="kicker">Active research program · {project.shortTitle}</span><h1>Can entropy make<br/><em>instability observable?</em></h1><p>{project.summary}</p></div>
      <div className="question-card"><span>Primary question · {project.questionId}</span><p>{project.primaryQuestion}</p><div><Tag level="hypothesis"/><small>last revised {project.updatedAt}</small></div></div>
    </div>
    <div className="stats"><Stat label="Source artifacts" value={stats.sourceArtifacts.toLocaleString()} foot="archive audit"/><Stat label="Tracked claims" value={String(stats.trackedClaims)} foot={`${stats.claimsNeedingEvidence} need evidence`}/><Stat label="Experiments" value={String(stats.experiments).padStart(2,"0")} foot={`${stats.reproducibleExperiments} reproducible`}/><Stat label="Open questions" value={String(stats.openQuestions)} foot="human review required"/></div>
    <section className="paper"><SectionHead eyebrow="Research lifecycle" title="From source material to reproducible evidence"/><div className="lifecycle">
      {lifecycle.map(stage=><button key={stage.index} onClick={()=>onNavigate(stage.view)}><i>{stage.index}</i><b>{stage.title}</b><span>{stage.description}</span></button>)}
    </div></section>
    <div className="two-col"><section className="paper"><SectionHead eyebrow="Evidence ledger" title="Claims needing attention"/>{claims.slice(2).map(c=><article className="claim" key={c.id}><div><code>{c.id}</code><Tag level={c.evidence}/></div><p>{c.text}</p><small>{claimSources(workspace, c.sourceIds)}</small></article>)}</section><section className="paper"><SectionHead eyebrow="Research principles" title="Epistemic contract"/><ol className="principles"><li><b>Evidence over fluency.</b><span>Generated text is never promoted to a finding.</span></li><li><b>Provenance by default.</b><span>Every claim points to a source or is marked unsupported.</span></li><li><b>Falsifiability first.</b><span>Every hypothesis includes a possible disconfirming result.</span></li><li><b>Human judgment remains central.</b><span>AI proposes and critiques; researchers decide.</span></li></ol></section></div>
  </div>;
}

function Corpus() {
  const workspace = useWorkspace();
  const { project, sources: initialResearchSources, methods: researchMethods } = workspace;
  const [sources, setSources] = useState<ResearchSource[]>(initialResearchSources);
  function ingest(e: ChangeEvent<HTMLInputElement>) { const files = Array.from(e.target.files ?? []); setSources(s => [...s, ...files.map(f => ({id:`LOCAL-${Date.now()}-${f.name}`,name:f.name,type:f.name.split('.').pop()?.toUpperCase() || 'file',status:'local · awaiting extraction',provenance:'local-session' as const,projectId:project.id}))]); }
  return <div className="view"><SectionHead eyebrow="01 · Literature intelligence" title="Research corpus" action={<label className="button">Add local artifacts<input type="file" multiple accept=".pdf,.md,.txt,.tex,.bib,.csv,.json,.py" onChange={ingest}/></label>}/><p className="lede">A local provenance index for papers, manuscripts, code, notes, datasets, and bibliographies. Adding a file records it in this browser session; it does not upload content.</p>
    <div className="stats compact"><Stat label="Indexed" value={String(sources.length)} foot="current session"/><Stat label="Equations" value="14" foot="human verification: 9"/><Stat label="Methods" value="11" foot="6 executable"/><Stat label="Citation gaps" value="07" foot="triage queue"/></div>
    <section className="paper"><div className="table-head"><span>Artifact</span><span>Type</span><span>Extraction state</span><span>Provenance</span></div>{sources.map((s,i)=><div className="source-row" key={`${s.name}-${i}`}><b>{s.name}</b><code>{s.type}</code><span>{s.status}</span><small>{s.provenance === 'archive' ? 'archive · read-only' : 'local session'}</small></div>)}</section>
    <div className="two-col"><section className="paper"><SectionHead eyebrow="Method extraction" title="Detected computational methods"/><div className="method-list">{researchMethods.map((method,i)=><div key={method.name}><span>{String(i+1).padStart(2,'0')}</span><b>{method.name}</b><small>{method.status === 'code-located' ? 'code located' : 'described in notes'}</small></div>)}</div></section><section className="paper"><SectionHead eyebrow="Caution queue" title="Corpus-level issues"/><ul className="issue-list"><li>Generated figures substantially outnumber source scripts.</li><li>Several manuscript directories duplicate models and outputs.</li><li>Some cross-domain language exceeds current evidence.</li><li>Third-party PDFs require license review before redistribution.</li></ul></section></div>
  </div>;
}

function Observables() {
  const workspace = useWorkspace();
  const { observables, sources } = workspace;
  const [selectedId, setSelectedId] = useState(observables[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => Array.from(new Set(observables.map(item => item.category))), [observables]);
  const filtered = observables.filter(item => {
    const matchesCategory = category === "all" || item.category === category;
    const haystack = `${item.id} ${item.name} ${item.symbol} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  });
  const selected = observables.find(item => item.id === selectedId) ?? filtered[0] ?? observables[0];
  const sourceNames = selected?.sourceIds.map(id => sources.find(source => source.id === id)?.name ?? id) ?? [];
  const implemented = observables.filter(item => item.implementationStatus === "implemented").length;
  const experimentReady = observables.filter(item => item.validWhen.length > 0 && item.failureModes.length > 0).length;

  if (!selected) return <div className="view"><Notice title="Registry empty">No observable definitions have been registered for this workspace.</Notice></div>;

  return <div className="view">
    <SectionHead eyebrow="02 · Observable registry" title="Measurable quantities, estimators, and validity bounds"/>
    <p className="lede">Every EBID experiment should reference a registered observable by ID. Definitions record the equation, estimator, assumptions, failure modes, provenance, and implementation state in one auditable place.</p>
    <div className="stats compact"><Stat label="Registered" value={String(observables.length).padStart(2,"0")} foot="workspace definitions"/><Stat label="Implemented" value={String(implemented).padStart(2,"0")} foot="code path recorded"/><Stat label="Experiment-ready" value={String(experimentReady).padStart(2,"0")} foot="validity + failures declared"/><Stat label="Categories" value={String(categories.length).padStart(2,"0")} foot="comparison dimensions"/></div>
    <div className="observable-toolbar"><input aria-label="Search observables" placeholder="Search name, symbol, ID, or tag" value={query} onChange={event=>setQuery(event.target.value)}/><select aria-label="Filter observable category" value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item=><option key={item} value={item}>{item}</option>)}</select></div>
    <div className="observable-layout">
      <div className="observable-list">{filtered.map(item=><button key={item.id} className={selected.id===item.id?'active':''} onClick={()=>setSelectedId(item.id)}><div><code>{item.id}</code><span className={`implementation ${item.implementationStatus}`}>{item.implementationStatus}</span></div><b>{item.name}</b><small>{item.symbol} · {item.category}</small><p>{item.description}</p></button>)}{filtered.length===0&&<Notice title="No matches">Adjust the search text or category filter.</Notice>}</div>
      <section className="paper observable-detail">
        <div className="observable-title"><div><code>{selected.id}</code><span>{selected.category}</span></div><span className={`implementation ${selected.implementationStatus}`}>{selected.implementationStatus}</span></div>
        <h2>{selected.name}</h2><p className="observable-description">{selected.description}</p>
        <div className="equation">{selected.formula}</div>
        <div className="observable-grid"><div><label>Interpretation</label><p>{selected.interpretation}</p></div><div><label>Output</label><p>{selected.output}</p></div></div>
        <label>Required inputs</label><ul>{selected.requiredInputs.map(item=><li key={item}>{item}</li>)}</ul>
        <label>Reference estimator</label><pre className="estimator">{selected.estimator}</pre>
        <div className="observable-grid validity"><div><label>Valid when</label><ul>{selected.validWhen.map(item=><li key={item}>{item}</li>)}</ul></div><div><label>Known failure modes</label><ul>{selected.failureModes.map(item=><li key={item}>{item}</li>)}</ul></div></div>
        <div className="registry-links"><div><span>Sources</span><b>{sourceNames.join(" · ") || "No source linked"}</b></div><div><span>Claims</span><b>{selected.relatedClaimIds.join(" · ") || "None"}</b></div><div><span>Hypotheses</span><b>{selected.relatedHypothesisIds.join(" · ") || "None"}</b></div>{selected.implementationPath&&<div><span>Implementation</span><b>{selected.implementationPath}</b></div>}</div>
        <div className="observable-tags">{selected.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
      </section>
    </div>
  </div>;
}

function Engines() {
  const workspace = useWorkspace();
  const [selectedId, setSelectedId] = useState(workspace.engines[0]?.id ?? "");
  const [role, setRole] = useState("all");
  const filtered = workspace.engines.filter(engine => role === "all" || engine.role === role);
  const selected = workspace.engines.find(engine => engine.id === selectedId) ?? filtered[0] ?? workspace.engines[0];
  const repository = selected ? workspace.repositories.find(item => item.id === selected.repositoryId) : undefined;
  const roles = Array.from(new Set(workspace.engines.map(engine => engine.role)));
  const validated = workspace.engines.filter(engine => engine.status === "validated").length;
  const available = workspace.engines.filter(engine => engine.status !== "planned").length;

  if (!selected) return <div className="view"><Notice title="Registry empty">No repositories or engines are registered.</Notice></div>;

  return <div className="view">
    <SectionHead eyebrow="03 · Repository and engine registry" title="The EBID execution ecosystem"/>
    <p className="lede">Entropy Studio owns experiment definitions and evidence provenance; registered repositories own theory, simulation, analysis, and model-training implementations. Every run identifies the exact engine and repository that produced it.</p>
    <div className="stats compact"><Stat label="Repositories" value={String(workspace.repositories.length).padStart(2,"0")} foot="EBID codebases"/><Stat label="Engines" value={String(workspace.engines.length).padStart(2,"0")} foot="registered adapters"/><Stat label="Available" value={String(available).padStart(2,"0")} foot="usable or validated"/><Stat label="Validated" value={String(validated).padStart(2,"0")} foot="executed in studio"/></div>
    <div className="observable-toolbar"><select aria-label="Filter engine role" value={role} onChange={event=>setRole(event.target.value)}><option value="all">All roles</option>{roles.map(item=><option key={item} value={item}>{item}</option>)}</select></div>
    <div className="observable-layout">
      <div className="observable-list">{filtered.map(engine=>{
        const repo=workspace.repositories.find(item=>item.id===engine.repositoryId);
        return <button key={engine.id} className={selected.id===engine.id?'active':''} onClick={()=>setSelectedId(engine.id)}><div><code>{engine.id}</code><span className={`implementation ${engine.status}`}>{engine.status}</span></div><b>{engine.name}</b><small>{engine.role} · {repo?.name ?? engine.repositoryId}</small><p>{engine.description}</p></button>;
      })}</div>
      <section className="paper observable-detail">
        <div className="observable-title"><div><code>{selected.id}</code><span>{selected.role}</span></div><span className={`implementation ${selected.status}`}>{selected.status}</span></div>
        <h2>{selected.name}</h2><p>{selected.description}</p>
        <div className="two-col"><div><label>Repository</label><p><b>{repository?.fullName ?? selected.repositoryId}</b><br/><small>{repository?.language} · {repository?.defaultBranch} · {repository?.visibility}</small></p></div><div><label>Versioned contract</label><p><b>{selected.version}</b><br/><small>{selected.artifactSchemaVersion} · {selected.deterministic ? "deterministic" : "stochastic/controlled"}</small></p></div></div>
        <label>Entrypoints</label><div className="method-list">{selected.entrypoints.map(entry=><div key={entry.id}><span>{entry.protocol}</span><b>{entry.label}</b><small><code>{entry.command}</code> · {entry.description}</small></div>)}</div>
        <label>Supported observables</label><p>{selected.supportedObservableIds.length ? selected.supportedObservableIds.join(" · ") : "No observable contract declared yet."}</p>
        <label>Supported experiments</label><p>{selected.supportedExperimentIds.length ? selected.supportedExperimentIds.join(" · ") : "No experiment adapter declared yet."}</p>
      </section>
    </div>
    <section className="paper"><SectionHead eyebrow="Repository responsibilities" title="Clear ownership boundaries"/><div className="table-head"><span>Repository</span><span>Role</span><span>Status</span><span>Responsibility</span></div>{workspace.repositories.map(repo=><div className="source-row" key={repo.id}><b>{repo.fullName}</b><code>{repo.role}</code><span>{repo.status}</span><small>{repo.description}</small></div>)}</section>
  </div>;
}

function Graph() {
  const workspace = useWorkspace();
  const { runs } = useContext(RunContext);
  const evidenceGraph = useMemo(() => extendEvidenceGraphWithRuns(workspace.evidenceGraph, runs), [workspace.evidenceGraph, runs]);
  const [kind, setKind] = useState("all");
  const [selectedNodeId, setSelectedNodeId] = useState(evidenceGraph.nodes[0]?.id ?? "");
  const [selectedRelationId, setSelectedRelationId] = useState(evidenceGraph.relations[0]?.id ?? "");

  const visibleNodes = kind === "all" ? evidenceGraph.nodes : evidenceGraph.nodes.filter(node => node.kind === kind);
  const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
  const visibleRelations = evidenceGraph.relations.filter(relation => visibleNodeIds.has(relation.sourceId) && visibleNodeIds.has(relation.targetId));
  const nodeById = new Map(evidenceGraph.nodes.map(node => [node.id, node]));
  const selectedNode = nodeById.get(selectedNodeId) ?? visibleNodes[0] ?? evidenceGraph.nodes[0];
  const selectedRelation = evidenceGraph.relations.find(relation => relation.id === selectedRelationId) ?? visibleRelations[0];
  const connectedRelations = selectedNode
    ? evidenceGraph.relations.filter(relation => relation.sourceId === selectedNode.id || relation.targetId === selectedNode.id)
    : [];
  const kinds = ["all", ...Array.from(new Set(evidenceGraph.nodes.map(node => node.kind)))];

  return <div className="view">
    <SectionHead eyebrow="03 · Evidence graph" title="Trace claims to sources, tests, and measurements"/>
    <p className="lede">Every displayed edge is a typed research relation with a rationale and evidence state. Select a node to inspect its neighborhood, or select an edge to audit why the connection exists.</p>
    <div className="evidence-toolbar">
      <label>Entity layer<select value={kind} onChange={event => setKind(event.target.value)}>{kinds.map(value => <option key={value} value={value}>{value === "all" ? "All research entities" : value}</option>)}</select></label>
      <div><span>{visibleNodes.length} nodes</span><span>{visibleRelations.length} visible relations</span><span>{evidenceGraph.relations.length} total relations</span></div>
    </div>
    <div className="evidence-layout">
      <section className="paper evidence-canvas" aria-label="Evidence graph">
        <div className="evidence-columns">{["Sources", "Methods", "Observables", "Claims", "Hypotheses", "Experiments"].map(label => <span key={label}>{label}</span>)}</div>
        <svg className="evidence-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {visibleRelations.map(relation => {
            const source = nodeById.get(relation.sourceId);
            const target = nodeById.get(relation.targetId);
            if (!source || !target) return null;
            const active = selectedRelation?.id === relation.id || selectedNode?.id === source.id || selectedNode?.id === target.id;
            return <line key={relation.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className={`${relation.evidence} ${active ? "active" : ""}`} onClick={() => setSelectedRelationId(relation.id)}/>;
          })}
        </svg>
        {visibleNodes.map(node => <button key={node.id} className={`evidence-node ${node.kind} ${selectedNode?.id === node.id ? "active" : ""}`} style={{left:`${node.x}%`,top:`${node.y}%`}} onClick={() => setSelectedNodeId(node.id)}><code>{node.entityId}</code><b>{node.label}</b><span>{node.kind}</span></button>)}
      </section>
      <aside className="evidence-inspector">
        <section className="paper">
          <span className="inspector-kicker">Selected entity</span>
          {selectedNode ? <><div className="inspector-title"><div><code>{selectedNode.entityId}</code><h3>{selectedNode.label}</h3></div>{selectedNode.evidence && <Tag level={selectedNode.evidence}/>}</div><p>{selectedNode.summary}</p><dl><div><dt>Kind</dt><dd>{selectedNode.kind}</dd></div>{selectedNode.status && <div><dt>Status</dt><dd>{selectedNode.status}</dd></div>}<div><dt>Connections</dt><dd>{connectedRelations.length}</dd></div></dl></> : <p>No entity selected.</p>}
        </section>
        <section className="paper relation-audit">
          <span className="inspector-kicker">Relation audit</span>
          {selectedRelation ? <><div className="relation-route"><b>{nodeById.get(selectedRelation.sourceId)?.label}</b><span>{selectedRelation.label}</span><b>{nodeById.get(selectedRelation.targetId)?.label}</b></div><Tag level={selectedRelation.evidence}/><p>{selectedRelation.rationale}</p><code>{selectedRelation.id} · {selectedRelation.type}</code></> : <p>Select a visible relation.</p>}
        </section>
      </aside>
    </div>
    <section className="paper relation-ledger"><SectionHead eyebrow="Queryable relations" title="Evidence neighborhood"/><div className="relation-table"><div className="relation-table-head"><span>From</span><span>Relation</span><span>To</span><span>Evidence</span></div>{(connectedRelations.length ? connectedRelations : visibleRelations).map(relation => <button key={relation.id} className={selectedRelation?.id === relation.id ? "active" : ""} onClick={() => setSelectedRelationId(relation.id)}><b>{nodeById.get(relation.sourceId)?.label}</b><span>{relation.label}</span><b>{nodeById.get(relation.targetId)?.label}</b><Tag level={relation.evidence}/></button>)}</div></section>
    <Notice title="Interpretation rule">A graph edge records a declared relationship, not automatic proof. Its rationale and evidence state must remain auditable, and unsupported links should be challenged or removed.</Notice>
  </div>;
}

function Hypotheses() {
  const { hypotheses } = useWorkspace();
  const [selected,setSelected]=useState(hypotheses[0]?.id ?? "");
  const h=hypotheses.find(x=>x.id===selected)!;
  return <div className="view"><SectionHead eyebrow="03 · Hypothesis generator" title="Testable hypothesis ledger"/><p className="lede">AI-assisted suggestions enter as candidates. Promotion requires a precise statement, assumptions, alternatives, and a disconfirming outcome.</p><div className="hyp-layout"><div className="hyp-list">{hypotheses.map(x=><button key={x.id} className={selected===x.id?'active':''} onClick={()=>setSelected(x.id)}><code>{x.id}</code><b>{x.title}</b><Tag level={x.evidence}/></button>)}</div><section className="paper protocol"><div className="protocol-title"><code>{h.id}</code><Tag level={h.evidence}/></div><h2>{h.title}</h2><label>Formal statement</label><p>{h.statement}</p><div className="equation">{h.equation ?? "No equation specified"}</div><label>Assumptions</label><ul>{h.assumptions.map(assumption=><li key={assumption}>{assumption}</li>)}</ul><label>Disconfirming outcome</label><p>{h.disconfirmingOutcome}</p><div className="provenance"><span>Derived from</span><b>{h.derivedFromIds.join(" · ")}</b></div></section></div></div>;
}

function Experiments() {
  const { experiments } = useWorkspace();
  const experimentDefinition = experiments[0];
  const [seed,setSeed]=useState(42),[epsilon,setEpsilon]=useState(.05),[window,setWindow]=useState(8);
  if (!experimentDefinition) return <div className="view"><Notice title="No experiment configured">This workspace does not yet contain an experiment definition.</Notice></div>;
  const manifest={experiment_id:experimentDefinition.id,hypothesis_id:experimentDefinition.hypothesisId,model:experimentDefinition.model,seed,epsilon,fit_window:[0,window],observable_ids:experimentDefinition.observableIds,controls:experimentDefinition.controls,primary_metric:experimentDefinition.primaryMetric};
  return <div className="view"><SectionHead eyebrow="04 · Experiment planner" title="Pre-execution protocol E-007"/><p className="lede">Parameters, controls, analysis windows, and failure criteria are fixed before a result is generated.</p><div className="experiment-layout"><section className="paper form"><h3>Design variables</h3><label><span>Random seed <b>{seed}</b></span><input type="range" min="1" max="99" value={seed} onChange={e=>setSeed(+e.target.value)}/></label><label><span>Instability ε <b>{epsilon.toFixed(3)}</b></span><input type="range" min=".005" max=".15" step=".005" value={epsilon} onChange={e=>setEpsilon(+e.target.value)}/></label><label><span>Fit-window end <b>t = {window}</b></span><input type="range" min="2" max="20" value={window} onChange={e=>setWindow(+e.target.value)}/></label><h3>Required comparisons</h3>{manifest.controls.map(c=><label className="check" key={c}><input type="checkbox" defaultChecked/><span>{c}</span></label>)}<Notice title="No result yet">This is a protocol, not an outcome. Expected behavior is not recorded as observed behavior.</Notice></section><section className="paper manifest"><div className="manifest-head"><span>Reproducibility manifest</span><code>YAML / JSON ready</code></div><pre>{JSON.stringify(manifest,null,2)}</pre></section></div></div>;
}

function MiniSeries({ values }: { values: number[] }) {
  const sample = values.filter(Number.isFinite);
  if (!sample.length) return <div className="series empty">No numeric series</div>;
  const min = Math.min(...sample), max = Math.max(...sample), span = Math.max(max - min, 1e-12);
  const points = sample.map((value, index) => `${(index / Math.max(sample.length - 1, 1)) * 100},${36 - ((value - min) / span) * 32}`).join(" ");
  return <svg className="series" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Measurement time series"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

function Simulation() {
  const workspace = useWorkspace();
  const { runs, addRun } = useContext(RunContext);
  const experiment = workspace.experiments[0];
  const engine = workspace.engines.find(item => item.id === experiment?.engineId);
  const repository = workspace.repositories.find(item => item.id === engine?.repositoryId);
  const [seed,setSeed]=useState(42),[epsilon,setEpsilon]=useState(.05),[window,setWindow]=useState(8);
  const [selectedRunId,setSelectedRunId]=useState("");
  const [importState,setImportState]=useState<{kind:"idle"|"success"|"error";message:string}>({kind:"idle",message:""});
  if (!experiment) return <div className="view"><Notice title="No executable experiment">Add an experiment definition before creating runs.</Notice></div>;

  const workspaceRuns = runs.filter(run => run.experimentId === experiment.id);
  const selectedRun = workspaceRuns.find(run => run.id === selectedRunId) ?? workspaceRuns.at(-1);
  const slopeResult = selectedRun?.observableResults.find(result => result.observableId === "OBS-LOG-SLOPE");

  function execute() {
    const run = executeExperimentRun({
      experiment,
      observables: workspace.observables,
      seed,
      epsilon,
      fitWindowEnd: window,
      projectRevision: workspace.project.revision,
      projectId: workspace.project.id,
    });
    addRun(run);
    setSelectedRunId(run.id);
  }

  async function importArtifact(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const validation = validateRunArtifact(parsed);
      if (!validation.valid) throw new Error(validation.errors.join(" "));
      const run = importRunArtifact(parsed, workspace.project.id);
      const knownExperiment = workspace.experiments.some(item => item.id === run.experimentId);
      const knownEngine = workspace.engines.some(item => item.id === run.provenance.engineId);
      if (!knownExperiment) throw new Error(`Unknown experimentId ${run.experimentId}.`);
      if (!knownEngine) throw new Error(`Unknown engineId ${run.provenance.engineId}.`);
      addRun(run);
      setSelectedRunId(run.id);
      setImportState({kind:"success",message:`Imported ${run.id} from ${run.provenance.engineId}.`});
    } catch (error) {
      setImportState({kind:"error",message:error instanceof Error ? error.message : "Artifact import failed."});
    }
  }

  return <div className="view">
    <SectionHead eyebrow="07 · Experiment runner" title="Execute, import, and preserve evidence" action={<div className="action-row"><button className="button" onClick={execute}>Run E-007</button><label className="button secondary">Import run.json<input type="file" accept="application/json,.json" onChange={importArtifact}/></label></div>}/>
    <p className="lede">Execute the browser-local replicator or import a schema-validated <code>entropy-run/1.0.0</code> artifact from PCC-Boids. Imported runs preserve engine, repository revision, measurements, registered observables, and conclusion provenance before entering the evidence workflow.</p>{importState.kind!=="idle" && <Notice title={importState.kind==="success"?"Artifact imported":"Import rejected"}>{importState.message}</Notice>}
    <div className="experiment-layout">
      <section className="paper form">
        <h3>Frozen run parameters</h3>
        <label><span>Random seed <b>{seed}</b></span><input type="range" min="1" max="999" value={seed} onChange={event=>setSeed(+event.target.value)}/></label>
        <label><span>Instability ε <b>{epsilon.toFixed(3)}</b></span><input type="range" min="-.10" max=".15" step=".005" value={epsilon} onChange={event=>setEpsilon(+event.target.value)}/></label>
        <label><span>Fit-window end <b>t = {window}</b></span><input type="range" min="1" max="11" step=".5" value={window} onChange={event=>setWindow(+event.target.value)}/></label>
        <Notice title="Scope of evidence">A completed run evaluates the declared toy model and seed. It does not establish cross-domain universality.</Notice>
      </section>
      <section className="paper manifest">
        <div className="manifest-head"><span>Execution request</span><code>deterministic · local</code></div>
        <pre>{JSON.stringify({experimentId:experiment.id,hypothesisId:experiment.hypothesisId,seed,epsilon,fitWindowEnd:window,observableIds:experiment.observableIds,engineId:experiment.engineId,engineVersion:engine?.version,repository:repository?.fullName,artifactSchemaVersion:engine?.artifactSchemaVersion},null,2)}</pre>
      </section>
    </div>

    <div className="stats compact">
      <Stat label="Recorded runs" value={String(workspaceRuns.length).padStart(2,"0")} foot="current browser session"/>
      <Stat label="Latest status" value={selectedRun?.status ?? "none"} foot={selectedRun?.id ?? "execute a run"}/>
      <Stat label="Conclusion" value={selectedRun?.conclusion ?? "—"} foot="preregistered tolerance"/>
      <Stat label="β estimate" value={slopeResult && Number.isFinite(slopeResult.value) ? slopeResult.value.toFixed(4) : "—"} foot="OBS-LOG-SLOPE"/>
    </div>

    {workspaceRuns.length > 0 && <div className="run-layout">
      <section className="paper run-list">
        <SectionHead eyebrow="Run ledger" title="Immutable session records"/>
        {workspaceRuns.slice().reverse().map(run=><button key={run.id} className={selectedRun?.id===run.id?'active':''} onClick={()=>setSelectedRunId(run.id)}><code>{run.id}</code><b>{run.conclusion}</b><small>seed {run.randomSeed} · ε {String(run.parameters.epsilon)}</small></button>)}
      </section>
      {selectedRun && <section className="paper run-detail">
        <div className="protocol-title"><code>{selectedRun.id}</code><Tag level={selectedRun.conclusion === "inconclusive" ? "hypothesis" : "supported"}/></div>
        <h2>{selectedRun.conclusion.toUpperCase()}</h2>
        <p>{selectedRun.conclusionRationale}</p>
        <div className="result-grid">{selectedRun.observableResults.map(result=><article key={result.id}><span>{result.observableId}</span><strong>{Number.isFinite(result.value)?result.value.toPrecision(6):"non-finite"}</strong><small>{result.unit ?? "dimensionless"} · {result.computationTimeMs} ms</small></article>)}</div>
        <h3>Recorded measurements</h3>
        {selectedRun.measurements.map(measurement=><article className="measurement" key={measurement.id}><div><b>{measurement.name}</b><small>{measurement.values.length} samples</small></div><MiniSeries values={measurement.values}/></article>)}
        <h3>Reproducibility provenance</h3>
        <pre>{JSON.stringify({parameters:selectedRun.parameters,randomSeed:selectedRun.randomSeed,provenance:selectedRun.provenance,observableResultIds:selectedRun.observableResults.map(result=>result.id)},null,2)}</pre>
      </section>}
    </div>}
  </div>;
}

function Review() {
  const { reviewConcerns } = useWorkspace();
  const [resolved,setResolved]=useState<number[]>([]);
  return <div className="view"><SectionHead eyebrow="06 · AI-assisted paper review" title="Critical review queue"/><p className="lede">A structured adversarial reading of the current entropy–instability argument. The reviewer proposes concerns; a human author adjudicates them.</p><div className="review-summary"><div><strong>B</strong><span>Methodological readiness</span></div><p>The computational idea is testable and promising, but generality claims exceed the present validation set. A stronger paper would narrow the main claim and expand adversarial controls.</p></div><section className="paper review-list">{reviewConcerns.map((concern,i)=><article key={concern.id} className={resolved.includes(i)?'resolved':''}><button aria-label="Toggle resolved" onClick={()=>setResolved(r=>r.includes(i)?r.filter(x=>x!==i):[...r,i])}>{resolved.includes(i)?'✓':'!'}</button><div><span>{concern.id} · {concern.severity} concern</span><h3>{concern.title}</h3><p>{concern.description}</p></div><Tag level={concern.evidence}/></article>)}</section><div className="two-col"><section className="paper"><SectionHead eyebrow="Required revision" title="Minimum convincing package"/><ul className="issue-list"><li>Preregister slope-estimation windows and tolerances.</li><li>Report failures alongside successful observables.</li><li>Run initial-condition and seed sensitivity analyses.</li><li>Separate theorem, numerical evidence, and analogy.</li></ul></section><section className="paper"><SectionHead eyebrow="Reviewer questions" title="Questions for the authors"/><ul className="issue-list"><li>What class of entropy-like functionals is admissible?</li><li>How is equilibrium chosen outside the simplex model?</li><li>What observation would falsify the proposed correspondence?</li><li>Which result has been reproduced independently?</li></ul></section></div></div>;
}

export function Studio() {
  const [view,setView]=useState<ResearchView>("overview");
  const [workspaceId,setWorkspaceId]=useState(defaultWorkspaceId);
  const [runs,setRuns]=useState<ExperimentRun[]>([]);
  const workspace=getWorkspace(workspaceId);
  const { project, navigation } = workspace;
  const content={overview:<Overview onNavigate={setView}/>,corpus:<Corpus/>,observables:<Observables/>,engines:<Engines/>,graph:<Graph/>,hypotheses:<Hypotheses/>,experiments:<Experiments/>,simulation:<Simulation/>,review:<Review/>}[view];

  function selectWorkspace(nextId: string) {
    const entry = workspaceRegistry.find(item => item.id === nextId);
    if (!entry?.workspace) return;
    setWorkspaceId(nextId);
    setView("overview");
  }

  return <WorkspaceContext.Provider key={workspaceId} value={workspace}><RunContext.Provider value={{runs,addRun:run=>setRuns(current=>[...current,run])}}><main className="shell"><header className="mast"><div className="identity"><span>{workspace.name}</span><b>{project.shortTitle} Research Laboratory</b></div><div className="mission">{workspace.tagline} <i>·</i> evidence over speculation</div><div className="lab-status"><i/> local research state</div></header><aside className="sidebar"><div className="workspace-picker"><span>Workspace</span><select aria-label="Research workspace" value={workspaceId} onChange={event=>selectWorkspace(event.target.value)}>{workspaceRegistry.map(entry=><option key={entry.id} value={entry.id} disabled={!entry.workspace}>{entry.label}{entry.availability === "planned" ? " · planned" : ""}</option>)}</select><small>{workspaceRegistry.find(entry=>entry.id===workspaceId)?.description}</small></div><div className="program"><span>Research program</span><b>{project.title}</b><small>Program revision {project.revision}</small></div><nav>{navigation.map(v=><button key={v.id} className={view===v.id?'active':''} onClick={()=>setView(v.id)}><code>{v.index}</code><span><b>{v.label}</b><small>{v.note}</small></span></button>)}</nav><div className="scope"><span>Epistemic status</span><b>{project.epistemicStatus}</b><small>{project.disclaimer}</small></div></aside><section className="content">{content}<footer><span>{project.shortTitle} is loaded from the Entropy Studio workspace registry.</span><b>All AI contributions require human verification.</b></footer></section></main></RunContext.Provider></WorkspaceContext.Provider>;
}
