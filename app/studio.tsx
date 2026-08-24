"use client";

import { ChangeEvent, createContext, useContext, useMemo, useState } from "react";

import type { EvidenceLevel, ExperimentRun, ResearchSource, ResearchView, ResearchWorkspace } from "./models/research";
import { defaultWorkspaceId, getWorkspace, workspaceRegistry } from "./data/workspaces";
import { extendEvidenceGraphWithRuns } from "./data/runEvidence";
import { executeExperimentRun } from "./lib/experimentRunner";
import { importRunArtifact, validateRunArtifact } from "./lib/runArtifact";
import { executeAnalysis } from "./lib/analysisEngine";
import { generateFigure } from "./lib/figureEngine";
import { buildManuscript } from "./lib/publicationEngine";
import { buildReproducibilityPackage } from "./lib/packageEngine";
import { campaignRunCount, executeCampaign, type CampaignReport } from "./lib/campaignOrchestrator";
import { buildMissionControlViewModel, type DashboardTone } from "./lib/missionControl";
import { ecaInstabilitySignature } from "./lib/elementaryCA";
import { enumerateFiniteRuleSpace } from "./lib/ruleSpaceExplorer";
import ecaAtlas from "../data/ruliology/eca-atlas/atlas.json";
import ecaValidation from "../data/ruliology/eca-validation/validation-summary.json";
import ecaObserverDependence from "../data/ruliology/eca-observer-dependence/observer-dependence-summary.json";
import ecaObserverGeometry from "../data/ruliology/eca-observer-geometry/observer-geometry-summary.json";
import boidsRulial from "../data/ruliology/boids-rulial/boids-rulial-summary.json";
import crossSubstrate from "../data/ruliology/cross-substrate/cross-substrate-summary.json";
import networkRulial from "../data/ruliology/network-rulial/network-rulial-summary.json";
import threeSubstrate from "../data/ruliology/three-substrate/three-substrate-summary.json";
import boidsResolution from "../data/ruliology/boids-resolution/boids-resolution-summary.json";
import boidsObserverValidation from "../data/ruliology/boids-observer-validation/boids-observer-validation-summary.json";
import observerConditioning from "../data/ruliology/observer-conditioning/observer-conditioning-summary.json";
import observerInformation from "../data/ruliology/observer-information/observer-information-summary.json";
import prospectiveObserverSelection from "../data/ruliology/prospective-observer-selection/prospective-observer-selection-summary.json";
import informationWeightedObserver from "../data/ruliology/information-weighted-observer/information-weighted-observer-summary.json";
import interactionObserverValidation from "../data/ruliology/interaction-informed-observer-validation/interaction-informed-observer-validation-summary.json";

const WorkspaceContext = createContext<ResearchWorkspace | null>(null);
const RunContext = createContext<{ runs: ExperimentRun[]; addRun: (run: ExperimentRun) => void; addRuns: (runs: ExperimentRun[]) => void }>({ runs: [], addRun: () => undefined, addRuns: () => undefined });

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

function DashboardIcon({ kind }: { kind: string }) {
  const icons: Record<string, string> = { hypotheses: "◇", experiments: "⌁", runs: "▶", figures: "▧", papers: "¶", campaign: "↗", run: "✓", figure: "▥", analysis: "∿", paper: "¶", dataset: "⬡" };
  return <span className="dashboard-icon" aria-hidden="true">{icons[kind] ?? "·"}</span>;
}

function ToneDot({ tone }: { tone: DashboardTone }) { return <i className={`tone-dot ${tone}`} aria-hidden="true"/>; }

function Overview({ onNavigate }: { onNavigate: (v: ResearchView) => void }) {
  const workspace = useWorkspace();
  const { runs } = useContext(RunContext);
  const dashboard = useMemo(() => buildMissionControlViewModel(workspace, runs), [workspace, runs]);
  const primaryCampaign = dashboard.campaigns.find(item => item.status !== "blocked") ?? dashboard.campaigns[0];
  const evidenceTotal = dashboard.evidence.supported + dashboard.evidence.challenged + dashboard.evidence.inconclusive;

  return <div className="view mission-dashboard">
    <section className="dashboard-welcome">
      <div className="dashboard-welcome-copy">
        <span className="dashboard-kicker">Mission control · {workspace.project.shortTitle}</span>
        <h1>{dashboard.greeting}, Hussain.</h1>
        <p><ToneDot tone={dashboard.workspaceStatus.tone}/>{dashboard.workspaceStatus.message}</p>
        <div className="dashboard-actions">
          <button className="button dashboard-primary" onClick={()=>onNavigate("orchestrator")}>Continue {primaryCampaign?.title ?? "campaign"}<span aria-hidden="true">→</span></button>
          <button className="button secondary" onClick={()=>onNavigate("experiments")}>Create experiment</button>
        </div>
      </div>
      <aside className="focus-card">
        <span>Next scientific action</span>
        <strong>{primaryCampaign?.stage ?? "Register a campaign"}</strong>
        <p>{primaryCampaign ? `${primaryCampaign.completedRuns} of ${primaryCampaign.totalRuns} expected runs are loaded.` : "Create a reproducible experiment and connect it to a registered engine."}</p>
        <button onClick={()=>onNavigate("orchestrator")}>Open campaign workspace <span>↗</span></button>
      </aside>
    </section>

    <section className="dashboard-section">
      <header className="dashboard-section-head"><div><span>Research health</span><h2>Program at a glance</h2></div><small>Derived from the active workspace registry</small></header>
      <div className="health-grid">{dashboard.metrics.map(metric=><button key={metric.id} className="health-card" onClick={()=>onNavigate(metric.view)}><div><DashboardIcon kind={metric.id}/><ToneDot tone={metric.tone}/></div><strong>{metric.value.toLocaleString()}</strong><span>{metric.label}</span><small>{metric.detail}</small></button>)}</div>
    </section>

    <div className="dashboard-grid dashboard-grid-primary">
      <section className="dashboard-panel active-research">
        <header className="panel-head"><div><span>Active research</span><h2>Campaigns in motion</h2></div><button onClick={()=>onNavigate("orchestrator")}>View all</button></header>
        <div className="campaign-stack">{dashboard.campaigns.map(campaign=><article className="campaign-card" key={campaign.id}>
          <div className="campaign-top"><div><span className={`status-pill ${campaign.status}`}>{campaign.status}</span><h3>{campaign.title}</h3><small>{campaign.engine}</small></div><strong>{campaign.progress}%</strong></div>
          <div className="progress-track" role="progressbar" aria-label={`${campaign.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={campaign.progress}><i style={{width:`${campaign.progress}%`}}/></div>
          <div className="campaign-meta"><span>{campaign.completedRuns} / {campaign.totalRuns} runs</span><span>{campaign.stage}</span></div>
          <button onClick={()=>onNavigate(campaign.view)}>Open campaign <span>→</span></button>
        </article>)}</div>
      </section>

      <section className="dashboard-panel attention-panel">
        <header className="panel-head"><div><span>Needs attention</span><h2>{dashboard.workspaceStatus.attentionCount} actionable items</h2></div></header>
        <div className="attention-stack">{dashboard.attentionItems.length ? dashboard.attentionItems.map(item=><article key={item.id} className={`attention-item ${item.tone}`}><div className="attention-mark">{item.tone === "critical" ? "!" : "○"}</div><div><h3>{item.title}</h3><p>{item.description}</p><button onClick={()=>onNavigate(item.view)}>{item.action} <span>→</span></button></div></article>) : <div className="empty-dashboard-state"><span>✓</span><h3>Nothing needs attention</h3><p>All registered research objects are in a healthy state.</p></div>}</div>
      </section>
    </div>

    <section className="dashboard-panel activity-panel">
      <header className="panel-head"><div><span>Recent activity</span><h2>Workspace pulse</h2></div><small>Session and registry events</small></header>
      <div className="activity-list">{dashboard.activity.map(event=><button key={event.id} onClick={()=>onNavigate(event.view)}><DashboardIcon kind={event.kind}/><span><b>{event.action}</b><small>{event.object}</small></span><time>{event.time}</time><i>›</i></button>)}</div>
    </section>

    <div className="dashboard-grid dashboard-grid-secondary">
      <section className="dashboard-panel evidence-panel">
        <header className="panel-head"><div><span>Evidence snapshot</span><h2>Current result balance</h2></div><button onClick={()=>onNavigate("graph")}>Explore graph</button></header>
        {evidenceTotal ? <><div className="evidence-bar" aria-label="Evidence result distribution"><i className="supported" style={{width:`${dashboard.evidence.supported/evidenceTotal*100}%`}}/><i className="challenged" style={{width:`${dashboard.evidence.challenged/evidenceTotal*100}%`}}/><i className="inconclusive" style={{width:`${dashboard.evidence.inconclusive/evidenceTotal*100}%`}}/></div><div className="evidence-counts"><div><i className="supported"/><strong>{dashboard.evidence.supported}</strong><span>Supported</span></div><div><i className="challenged"/><strong>{dashboard.evidence.challenged}</strong><span>Challenged</span></div><div><i className="inconclusive"/><strong>{dashboard.evidence.inconclusive}</strong><span>Inconclusive</span></div></div></> : <div className="empty-evidence"><div className="empty-evidence-orbit"><i/><i/><i/></div><div><h3>No run evidence loaded yet</h3><p>Execute the local campaign or import validated engine artifacts to populate this view.</p><button onClick={()=>onNavigate("simulation")}>Open Simulation Bench →</button></div></div>}
      </section>

      <section className="dashboard-panel pipeline-panel">
        <header className="panel-head"><div><span>Publication pipeline</span><h2>From experiment to release</h2></div><button onClick={()=>onNavigate("publications")}>Open workspace</button></header>
        <div className="pipeline-list">{dashboard.publication.map((stage,index)=><div key={stage.label}><span className={`pipeline-state ${stage.state}`}>{stage.state === "complete" ? "✓" : String(index+1).padStart(2,"0")}</span><b>{stage.label}</b><small>{stage.value}</small><i className={stage.state}/></div>)}</div>
      </section>
    </div>
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

function RulialAtlas() {
  const workspace = useWorkspace();
  const [selectedId, setSelectedId] = useState(workspace.ruleSpaces[0]?.id ?? "");
  const selected = workspace.ruleSpaces.find(item => item.id === selectedId) ?? workspace.ruleSpaces[0];
  const eca = workspace.ruleSpaces.find(item => item.id === "RSPACE-ECA-256");
  const ecaRules = eca ? enumerateFiniteRuleSpace(eca) : [];
  const initial = Array.from({ length: 129 }, (_, index) => index === 64 ? 1 : 0);
  const benchmarkRules = [0, 30, 54, 90, 110, 184, 255];
  const signatures = benchmarkRules.map(rule => ecaInstabilitySignature(rule, initial, 96));
  const atlasProfiles = ecaAtlas.profiles;
  const atlasProfileByRule = new Map(atlasProfiles.map(profile => [profile.rule.ruleId, profile]));
  const atlasPreview = benchmarkRules.map(rule => atlasProfileByRule.get(String(rule))).filter(Boolean);
  const sensitiveEdges = ecaAtlas.highSensitivityTransitions.slice(0, 8);
  const robustEdges = ecaValidation.neighborhoodSensitivity.robustTransitions.slice(0, 8);
  const candidateClasses = ecaValidation.equivalence.nonSingletonClasses.slice(0, 8);

  if (!selected) return <div className="view"><Notice title="No rule spaces">Register a rule space before opening the Rulial Atlas.</Notice></div>;

  return <div className="view rulial-atlas">
    <SectionHead eyebrow="04 · Rulial Atlas" title="Rule spaces, observers, and instability profiles"/>
    <p className="lede">Ruliology is treated here as an operational research layer: a declared rule space generates trajectories in state space, and frozen observers map those trajectories into registered EBID/PCC observables. The current atlas is infrastructure plus calibration data, not evidence of universality.</p>
    <div className="stats compact"><Stat label="Rule spaces" value={String(workspace.ruleSpaces.length).padStart(2,"0")} foot="registered families"/><Stat label="Observers" value={String(workspace.observers.length).padStart(2,"0")} foot="frozen measurement views"/><Stat label="ECA rules" value={String(ecaRules.length)} foot="complete finite benchmark"/><Stat label="Rulial experiments" value={String(workspace.experiments.filter(item=>item.id.startsWith("RUL-")).length).padStart(2,"0")} foot="registered tests"/></div>
    <div className="observable-layout">
      <div className="observable-list">{workspace.ruleSpaces.map(space=><button key={space.id} className={selected.id===space.id?"active":""} onClick={()=>setSelectedId(space.id)}><div><code>{space.id}</code><span className={`implementation ${space.enumerable?"implemented":"specified"}`}>{space.representation}</span></div><b>{space.name}</b><small>{space.engineId} · {space.enumerable ? `${space.size ?? "?"} rules` : `${space.dimensions.length} dimensions`}</small><p>{space.description}</p></button>)}</div>
      <section className="paper observable-detail">
        <div className="observable-title"><div><code>{selected.id}</code><span>{selected.representation}</span></div><span className={`implementation ${selected.enumerable?"implemented":"specified"}`}>{selected.enumerable?"enumerable":"sampled"}</span></div>
        <h2>{selected.name}</h2><p>{selected.description}</p>
        <div className="two-col"><div><label>State space</label><p>{selected.stateSpace}</p></div><div><label>Transition rule</label><p>{selected.transitionDescription}</p></div></div>
        <label>Rule coordinates</label><div className="method-list">{selected.dimensions.map(dimension=><div key={dimension.id}><span>{dimension.kind}</span><b>{dimension.name} · {dimension.symbol}</b><small>{dimension.description}{dimension.min!==undefined&&dimension.max!==undefined?` · [${dimension.min}, ${dimension.max}]`:""}</small></div>)}</div>
        <label>Registered observables</label><p>{selected.observableIds.join(" · ")}</p>
        {selected.canonicalization&&<><label>Canonicalization</label><p>{selected.canonicalization}</p></>}
      </section>
    </div>
    <section className="paper">
      <SectionHead eyebrow="Observer registry" title="Measurement views are first-class objects"/>
      <div className="analysis-grid">{workspace.observers.map(observer=><article className="analysis-card" key={observer.id}><div><code>{observer.id}</code><span className="implementation specified">frozen definition</span></div><h3>{observer.name}</h3><p>{observer.description}</p><small>{observer.observableIds.join(" · ")}</small><p><b>Coarse-graining:</b> {observer.coarseGraining}</p></article>)}</div>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-001 frozen benchmark" title="256-rule EBID atlas"/>
      <p>The committed benchmark enumerates all 256 ECA rules over four frozen seeded Bernoulli initial conditions, with matched one-cell perturbations. Profiles are constructed without external CA class labels.</p>
      <div className="stats compact"><Stat label="Profiles" value={String(ecaAtlas.summary.profileCount)} foot="complete rule population"/><Stat label="Runs" value={String(ecaAtlas.summary.runCount)} foot="rule × seed"/><Stat label="Rule edges" value={String(ecaAtlas.summary.transitionCount)} foot="one-bit truth-table neighbors"/><Stat label="Seeds" value={String(ecaAtlas.configuration.seeds.length)} foot="frozen ensemble"/></div>
      <div className="table-head rulial-table"><span>Rule</span><span>Entropy</span><span>Hamming</span><span>EBID features</span></div>
      {atlasPreview.map(profile=>{ const features=new Map(profile!.features.map(feature=>[feature.observableId,feature.value])); return <div className="source-row rulial-table" key={profile!.rule.ruleId}><b>Rule {profile!.rule.ruleId}</b><code>{Number(features.get("OBS-SHANNON") ?? 0).toFixed(4)}</code><span>{Number(features.get("OBS-HAMMING") ?? 0).toFixed(4)}</span><small>growth {Number(features.get("OBS-PERTURB-GROWTH") ?? 0).toExponential(2)} · τac {Number(features.get("OBS-AUTOCORR-TIME") ?? 0).toFixed(2)} · RLE {Number(features.get("OBS-COMPRESSION") ?? 0).toFixed(3)}</small></div>;})}
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-002 neighborhood scan" title="Highest one-bit rule sensitivities"/>
      <p>Edges compare rules separated by exactly one output bit in the 8-bit ECA truth table. Observable distance uses preregistered fixed feature scales rather than raw mixed-unit values.</p>
      <div className="table-head rulial-table"><span>Edge</span><span>Rule distance</span><span>Observable distance</span><span>Observer</span></div>
      {sensitiveEdges.map(edge=><div className="source-row rulial-table" key={`${edge.fromRuleId}-${edge.toRuleId}`}><b>{edge.fromRuleId} ↔ {edge.toRuleId}</b><code>{edge.syntacticDistance.toFixed(3)}</code><span>{edge.observableDistance.toFixed(4)}</span><small>{edge.observerId}</small></div>)}
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-002 held-out validation" title="Neighborhood sensitivity survives new initial conditions"/>
      <p>The original four-seed atlas is evaluated against four disjoint held-out seeds. Rankings are compared without refitting the original profiles. A robust edge must remain in the top 5% of one-bit observable distances in both ensembles.</p>
      <div className="stats compact"><Stat label="All-pair ρ" value={Number(ecaValidation.stability.allPairDistanceSpearman).toFixed(3)} foot="Spearman, calibration vs holdout"/><Stat label="One-bit ρ" value={Number(ecaValidation.stability.oneBitEdgeDistanceSpearman).toFixed(3)} foot="edge ranking stability"/><Stat label="Top-tail overlap" value={Number(ecaValidation.stability.topFivePercentEdgeJaccard).toFixed(3)} foot="Jaccard of top 5% edges"/><Stat label="Robust edges" value={String(ecaValidation.stability.robustTopTailEdgeCount)} foot="top 5% in both ensembles"/></div>
      <div className="table-head rulial-table"><span>Edge</span><span>Calibration</span><span>Holdout</span><span>Joint rank</span></div>
      {robustEdges.map(edge=><div className="source-row rulial-table" key={`robust-${edge.fromRuleId}-${edge.toRuleId}`}><b>{edge.fromRuleId} ↔ {edge.toRuleId}</b><code>{edge.calibrationDistance.toFixed(4)}</code><span>{edge.holdoutDistance.toFixed(4)}</span><small>pctl {Math.min(edge.calibrationPercentile, edge.holdoutPercentile).toFixed(3)} minimum</small></div>)}
      <p><small>Bootstrap: {ecaValidation.bootstrap.bootstrapReplicates.toLocaleString()} percentile resamples per rule-feature at {(ecaValidation.bootstrap.confidence*100).toFixed(0)}% confidence. With four calibration seeds, these intervals are diagnostic rather than precision estimates.</small></p>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-003 observer-dependent classes" title="Held-out candidate EBID equivalence classes"/>
      <p>Candidate classes use complete-link clustering on the stricter joint distance max(calibration, holdout). The epsilon threshold is the median same-rule calibration-to-holdout distance, so every pair in a class must remain close under both independent initial-condition ensembles.</p>
      <div className="stats compact"><Stat label="ε" value={Number(ecaValidation.equivalence.epsilon).toFixed(4)} foot="median same-rule shift"/><Stat label="Classes" value={String(ecaValidation.equivalence.classCount)} foot="complete partition"/><Stat label="Non-singletons" value={String(ecaValidation.equivalence.nonSingletonClassCount)} foot="candidate equivalence groups"/><Stat label="Cluster stability" value={Number(ecaValidation.stability.clustering.coassignmentJaccard).toFixed(3)} foot="calibration/holdout pair Jaccard"/></div>
      <div className="table-head rulial-table"><span>Class</span><span>Size</span><span>Max joint d</span><span>Members</span></div>
      {candidateClasses.map(group=><div className="source-row rulial-table" key={group.id}><b>{group.id}</b><code>{group.size}</code><span>{group.maximumJointDistance.toFixed(4)}</span><small>{group.memberRuleIds.join(" · ")}</small></div>)}
      <Notice title="Post-hoc comparison not run">{ecaValidation.externalClassification.reason} A provenance-bearing external label table can be compared only after these metrics and thresholds are frozen.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-004 fixed-trajectory observer test" title="The quotient changes when the observer changes"/>
      <p>All four observers are applied to the same 4,096 stored rule-seed run summaries. No observer gets a separately simulated trajectory set. Each observer calibrates its own resolution from two disjoint eight-seed halves, then constructs complete-link candidate classes.</p>
      <div className="stats compact"><Stat label="Expanded runs" value={ecaObserverDependence.simulation.runCount.toLocaleString()} foot={`${ecaObserverDependence.simulation.seeds.length} seeds × 256 rules`}/><Stat label="Observers" value={String(ecaObserverDependence.observers.length)} foot="same trajectories, different projections"/><Stat label="Observer-sensitive pairs" value={ecaObserverDependence.pairConsensus.observerSensitivePairs.toLocaleString()} foot="equivalent for some observers, not all"/><Stat label="All-observer pairs" value={ecaObserverDependence.pairConsensus.allObserverEquivalentPairs.toLocaleString()} foot="coassigned by every observer"/></div>
      <div className="table-head rulial-table"><span>Observer</span><span>Split ρ</span><span>Classes</span><span>Largest class</span></div>
      {ecaObserverDependence.observers.map(observer=><div className="source-row rulial-table" key={observer.observerId}><b>{observer.observerId.replace("OBSERVER-ECA-","").replace("OBSERVER-","")}</b><code>{Number(observer.splitGeometrySpearman).toFixed(3)}</code><span>{observer.classCount}</span><small>{observer.largestClassSize} rules · ε {Number(observer.epsilon).toFixed(4)} · {observer.observableIds.join(" · ")}</small></div>)}
      <div className="table-head rulial-table"><span>Observer pair</span><span>Geometry ρ</span><span>Class Jaccard</span><span>Equivalent-pair overlap</span></div>
      {ecaObserverDependence.crossObserver.map(pair=><div className="source-row rulial-table" key={`${pair.leftObserverId}-${pair.rightObserverId}`}><b>{pair.leftObserverId.replace("OBSERVER-ECA-","").replace("OBSERVER-","")} ↔ {pair.rightObserverId.replace("OBSERVER-ECA-","").replace("OBSERVER-","")}</b><code>{Number(pair.geometrySpearman).toFixed(3)}</code><span>{Number(pair.coassignmentJaccard).toFixed(3)}</span><small>{pair.sharedEquivalentPairCount} shared / {pair.unionEquivalentPairCount} union equivalent pairs</small></div>)}
      <Notice title="Operational observer dependence">These are candidate quotients at empirically calibrated observer resolution. Different partitions do not imply that one observer is correct; they show that observational equivalence depends on the declared measurement map.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-005 observer-space geometry" title="Nearby observers tend to induce nearby rulial structures"/>
      <p>The five-feature ECA observer basis generates every non-empty subset as a frozen observer: 31 nodes in a Boolean feature lattice. All observers reuse the same 4,096 stored trajectories. Structural observer distance is normalized feature-set Hamming distance; induced structure is compared by both quotient-pair overlap and full rule-geometry Spearman distance.</p>
      <div className="stats compact"><Stat label="Observers" value={String(ecaObserverGeometry.observerSpace.nodeCount)} foot={`${ecaObserverGeometry.observerSpace.pairCount} observer pairs`}/><Stat label="dO ↔ quotient ρ" value={Number(ecaObserverGeometry.summary.structuralVsQuotientSpearman).toFixed(3)} foot={`matrix permutation p ${Number(ecaObserverGeometry.summary.structuralVsQuotientPermutationP).toFixed(3)}`}/><Stat label="dO ↔ geometry ρ" value={Number(ecaObserverGeometry.summary.structuralVsGeometrySpearman).toFixed(3)} foot={`matrix permutation p ${Number(ecaObserverGeometry.summary.structuralVsGeometryPermutationP).toFixed(3)}`}/><Stat label="quotient ↔ geometry ρ" value={Number(ecaObserverGeometry.summary.quotientVsGeometrySpearman).toFixed(3)} foot="two induced-structure measures"/></div>
      <div className="table-head rulial-table"><span>Feature difference</span><span>Observer pairs</span><span>Mean quotient d</span><span>Mean geometry d</span></div>
      {ecaObserverGeometry.distanceLevels.map(level=><div className="source-row rulial-table" key={`observer-level-${level.structuralDistance}`}><b>{level.structuralDistance.toFixed(1)} normalized</b><code>{level.pairCount}</code><span>{Number(level.meanQuotientDistance).toFixed(3)}</span><small>{Number(level.meanGeometryDistance).toFixed(3)} mean geometry distance</small></div>)}
      <div className="table-head rulial-table"><span>One-feature edge</span><span>Quotient d</span><span>Geometry ρ</span><span>Class-pair Jaccard</span></div>
      {ecaObserverGeometry.topOneFeatureEdges.slice(0,6).map(pair=><div className="source-row rulial-table" key={`${pair.leftObserverId}-${pair.rightObserverId}`}><b>{pair.leftObserverId.replace("OBSERVER-ECA-SUBSET-","")} ↔ {pair.rightObserverId.replace("OBSERVER-ECA-SUBSET-","")}</b><code>{Number(pair.quotientDistance).toFixed(3)}</code><span>{Number(pair.geometrySpearman).toFixed(3)}</span><small>{Number(pair.coassignmentJaccard).toFixed(3)} overlap</small></div>)}
      <Notice title="Finite observer lattice">The positive association is a result for this frozen five-feature subset lattice and this empirical epsilon rule. It is not a claim that arbitrary scientific observers live in a universal Boolean geometry.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-006 cross-substrate stress test" title="A continuous Boids rule space shows mixed but reproducible local sensitivity"/>
      <p>The first non-ECA challenge samples a frozen five-dimensional Boids rule space with a deterministic Latin hypercube. Candidate local sensitivity edges are discovered from three seeds, then their endpoints are re-run with disjoint seeds and new transverse midpoint probes are simulated nearby.</p>
      <div className="stats compact"><Stat label="Boids runs" value={boidsRulial.simulation.totalRunCount.toLocaleString()} foot={`${boidsRulial.sampling.discoveryPointCount} discovery points`}/><Stat label="Global dR ↔ dE ρ" value={Number(boidsRulial.discovery.pairwiseRuleVsObservableSpearman).toFixed(3)} foot="all discovery pairs"/><Stat label="Boundary rank ρ" value={Number(boidsRulial.validation.candidateSensitivitySpearman).toFixed(3)} foot="discovery vs held-out seeds"/><Stat label="Retained boundaries" value={`${Math.round(Number(boidsRulial.validation.retentionFraction)*100)}%`} foot="above discovery local Q75 under holdout"/></div>
      <div className="table-head rulial-table"><span>Candidate edge</span><span>Discovery S_R</span><span>Holdout S_R</span><span>Probe residual</span></div>
      {boidsRulial.validation.rows.slice(0,8).map(row=><div className="source-row rulial-table" key={`${row.leftRuleId}-${row.rightRuleId}`}><b>{row.leftRuleId} ↔ {row.rightRuleId}</b><code>{Number(row.sensitivity).toFixed(2)}</code><span>{Number(row.holdoutSensitivity).toFixed(2)}</span><small>{Number(row.probeMidpointResidual).toFixed(3)} · {row.retainedAboveDiscoveryLocalQ75 ? "retained" : "not retained"}</small></div>)}
      <Notice title="Mixed validation is the result">The selected local sensitivity ranking remains positively associated across held-out seeds, but only half of the discovery-selected boundaries clear the frozen local-distance threshold again. RUL-006 therefore supports continued study of structured Boids rule space without claiming a stable universal phase diagram.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-007 frozen cross-substrate challenge" title="Two recurring signatures, three failed transfer criteria"/>
      <p>RUL-007 compares dimensionless structural summaries across ECA and Boids under one versioned contract. Boids now has complete held-out coverage at all 32 frozen discovery coordinates, adding 64 simulations rather than validating only discovery-selected endpoints.</p>
      <div className="stats compact"><Stat label="Criteria passed" value={`${crossSubstrate.challenge.crossSubstratePassCount}/${crossSubstrate.challenge.criterionCount}`} foot="must pass in both substrates"/><Stat label="New Boids holdout runs" value={String(crossSubstrate.newSimulation.runCount)} foot="32 rules × 2 frozen seeds"/><Stat label="ECA geometry ρ" value={Number(crossSubstrate.substrates[0].geometryStabilitySpearman).toFixed(3)} foot="discovery vs holdout"/><Stat label="Boids geometry ρ" value={Number(crossSubstrate.substrates[1].geometryStabilitySpearman).toFixed(3)} foot="discovery vs holdout"/></div>
      <div className="table-head rulial-table"><span>Substrate</span><span>Global dR ↔ dE ρ</span><span>Local-edge ρ</span><span>Top-10% overlap</span></div>
      {crossSubstrate.substrates.map(item=><div className="source-row rulial-table" key={`rul007-${item.substrate}`}><b>{item.substrate}</b><code>{Number(item.globalRuleObservableSpearmanDiscovery).toFixed(3)}</code><span>{Number(item.localEdgeStabilitySpearman).toFixed(3)}</span><small>{Number(item.top10LocalEdgeJaccard).toFixed(3)} Jaccard · q95/median sensitivity {Number(item.localSensitivity.q95OverMedian).toFixed(2)}</small></div>)}
      <div className="table-head rulial-table"><span>Frozen criterion</span><span>ECA</span><span>Boids</span><span>Cross-substrate</span></div>
      {Object.entries(crossSubstrate.challenge.criteria).map(([id,criterion])=><div className="source-row rulial-table" key={id}><b>{id.replaceAll(/([A-Z])/g," $1").trim()}</b><code>{criterion.eca ? "pass" : "fail"}</code><span>{criterion.boids ? "pass" : "fail"}</span><small>{criterion.crossSubstratePass ? "retained" : "challenged"} · {criterion.definition}</small></div>)}
      <Notice title="No universality claim">Only two of five frozen criteria pass in both substrates. The common positive association and heavy local sensitivity tail are worth carrying forward, while the failed Boids replication criteria are preserved rather than tuned away.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-008 network substrate" title="A third rule space survives held-out stochastic validation"/>
      <p>RUL-008 samples 24 local update rules in a four-dimensional stochastic binary-network space. Every rule is evaluated on ring, small-world, and matched-degree Erdos-Renyi graphs as fixed topology blocks, then the full design is repeated with disjoint held-out seeds.</p>
      <div className="stats compact"><Stat label="Network runs" value={networkRulial.simulation.totalRunCount.toLocaleString()} foot={`${networkRulial.sampling.pointCount} rules × 3 topology blocks`}/><Stat label="Geometry stability ρ" value={Number(networkRulial.validation.geometryStabilitySpearman).toFixed(3)} foot="discovery vs holdout"/><Stat label="Local stability ρ" value={Number(networkRulial.validation.localEdgeStabilitySpearman).toFixed(3)} foot={`${networkRulial.discovery.localEdgeCount} frozen local edges`}/><Stat label="Top-10% Jaccard" value={Number(networkRulial.validation.top10LocalEdgeJaccard).toFixed(3)} foot="boundary replication"/></div>
      <p>The local sensitivity tail is pronounced: q95/median = <b>{Number(networkRulial.discovery.localSensitivityQ95OverMedian).toFixed(2)}</b>. The three topology-specific rule geometries are also strongly rank-aligned, while mean within-rule topology displacement is only {Number(networkRulial.topologyBlocks.spread.topologyToLocalRuleDistanceRatio).toFixed(2)}× the mean local rule-induced observable distance.</p>
      <Notice title="Topology is blocked, not hidden">RUL-008 does not treat graph topology as another Euclidean rule coordinate. The same local rules are crossed with three preregistered interaction structures, topology-specific profiles are retained, and the aggregate rule profile averages across those blocks. The next three-substrate challenge must reuse the already-frozen RUL-007 criteria without changing thresholds after seeing this result.</Notice>
      <div className="table-head rulial-table"><span>Candidate edge</span><span>dR</span><span>Discovery S</span><span>Holdout S</span></div>
      {networkRulial.discovery.topCandidateEdges.slice(0,6).map(edge=><div className="table-row rulial-table" key={edge.pairKey}><span><b>{edge.leftRuleId} ↔ {edge.rightRuleId}</b></span><span>{Number(edge.ruleDistance).toFixed(3)}</span><span>{Number(edge.discoverySensitivity).toFixed(2)}</span><span>{Number(edge.holdoutSensitivity).toFixed(2)}</span></div>)}
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-009 frozen three-substrate challenge" title="Two structural signatures survive all three substrates"/>
      <p>RUL-009 adds no simulations. It projects ECA, Boids, and Network into the exact five structural criteria frozen in RUL-007 before the Network result existed.</p>
      <div className="stats compact"><Stat label="All-three criteria" value={`${threeSubstrate.challenge.allSubstratePassCount}/${threeSubstrate.challenge.criterionCount}`} foot="unchanged RUL-007 thresholds"/><Stat label="ECA" value={`${threeSubstrate.challenge.substratePassCounts.ECA}/5`} foot="criteria passed"/><Stat label="Boids" value={`${threeSubstrate.challenge.substratePassCounts.Boids}/5`} foot="criteria passed"/><Stat label="Network" value={`${threeSubstrate.challenge.substratePassCounts.Network}/5`} foot="criteria passed"/></div>
      <div className="table-head rulial-table"><span>Frozen criterion</span><span>ECA</span><span>Boids</span><span>Network</span></div>
      {Object.entries(threeSubstrate.challenge.criteria).map(([id,criterion])=><div className="source-row rulial-table" key={`rul009-${id}`}><b>{id.replaceAll(/([A-Z])/g," $1").trim()}</b><code>{criterion.substrates.ECA ? "pass" : "fail"}</code><span>{criterion.substrates.Boids ? "pass" : "fail"}</span><small>{criterion.substrates.Network ? "pass" : "fail"} · {criterion.passCount}/3 substrates</small></div>)}
      <Notice title="Pattern, not universality">Positive global rule/observable association and the heterogeneous local-sensitivity tail pass in all three substrates. Full-geometry stability, local-geometry stability, and top-tail boundary replication pass in ECA and Network but remain challenged by Boids. No thresholds were changed to produce this pattern.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-010 Boids diagnostic" title="The replication gap is observer-sensitive, not simply noise-forcing limited"/>
      <p>RUL-010 leaves RUL-009 untouched and reuses the same 32 Boids rules with two new independent seed pools. The nested averaging ladder and observer projections ask which part of the weak Boids replication is finite-realization noise versus measurement-coordinate instability.</p>
      <div className="stats compact"><Stat label="New runs" value={String(boidsResolution.simulation.totalNewRunCount)} foot="256 full + 64 forcing-suppressed"/><Stat label="4-seed geometry ρ" value={Number(boidsResolution.diagnosis.fourSeedFullCore.geometryStabilitySpearman).toFixed(3)} foot="full six-feature observer"/><Stat label="4-seed local ρ" value={Number(boidsResolution.diagnosis.fourSeedFullCore.localEdgeStabilitySpearman).toFixed(3)} foot="same frozen local graph"/><Stat label="Top-10% Jaccard" value={Number(boidsResolution.diagnosis.fourSeedFullCore.top10LocalEdgeJaccard).toFixed(3)} foot="exact edge identity still unstable"/></div>
      <div className="table-head rulial-table"><span>Observer</span><span>Geometry ρ</span><span>Local-edge ρ</span><span>Top-10% overlap</span></div>
      {boidsResolution.observerDecomposition.map(item=><div className="source-row rulial-table" key={`rul010-${item.observerId}`}><b>{item.observerId}</b><code>{Number(item.geometryStabilitySpearman).toFixed(3)}</code><span>{Number(item.localEdgeStabilitySpearman).toFixed(3)}</span><small>{Number(item.top10LocalEdgeJaccard).toFixed(3)} Jaccard</small></div>)}
      <Notice title="Diagnostic, not repair">The state/structure and order/entropy projections reproduce substantially better than the transition/dwell projection. Turning off per-step Gaussian forcing does not improve the matched one-seed geometry, so RUL-010 does not support a simple “Boids failed because chaos noise was too high” explanation. RUL-009 stays frozen.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-011 prospective observer validation" title="The state-structure observer replicates on unseen Boids rules"/>
      <p>RUL-011 freezes the RUL-010 observer hypothesis before simulating a new 40-point Latin-hypercube rule design. Two new four-seed pools generate 320 trajectories, and every observer sees exactly the same runs.</p>
      <div className="stats compact"><Stat label="New runs" value={String(boidsObserverValidation.simulation.totalNewRunCount)} foot="40 rules × 8 new seeds"/><Stat label="Structure geometry ρ" value={Number(boidsObserverValidation.observers.find(item=>item.observerId === "state_structure")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="prospective four-feature observer"/><Stat label="Full-core geometry ρ" value={Number(boidsObserverValidation.observers.find(item=>item.observerId === "full_core")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="original six-feature observer"/><Stat label="Primary test" value={boidsObserverValidation.primaryProspectiveTest.prospectiveReplicationPassed ? "PASS" : "CHALLENGED"} foot="+0.05 geometry and local margins"/></div>
      <div className="table-head rulial-table"><span>Observer</span><span>Geometry ρ</span><span>Local-edge ρ</span><span>Top-10% overlap</span></div>
      {boidsObserverValidation.observers.map(item=><div className="source-row rulial-table" key={`rul011-${item.observerId}`}><b>{item.observerId}</b><code>{Number(item.geometryStabilitySpearman).toFixed(3)}</code><span>{Number(item.localEdgeStabilitySpearman).toFixed(3)}</span><small>{Number(item.top10LocalEdgeJaccard).toFixed(3)} Jaccard</small></div>)}
      <Notice title="Prospective replication, narrow claim">The state-structure observer exceeds full-core stability by the frozen margins on both complete and local geometry. The two-feature order/entropy observer does not dominate across metrics, so this is evidence against unstable transition/dwell coordinates rather than a blanket preference for fewer measurements.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-012 observer conditioning diagnostic" title="The simple cross-substrate conditioning rule is challenged"/>
      <p>RUL-012 adds no simulations. It compares 17 registered observable coordinates across frozen ECA, Boids, and Network discovery/holdout profile pairs, asking whether coordinates that move more for the same rule systematically induce less reproducible rule-space geometry.</p>
      <div className="stats compact"><Stat label="New runs" value={String(observerConditioning.newSimulationRunCount)} foot="frozen profiles only"/><Stat label="Pooled ρ" value={Number(observerConditioning.primaryTest.pooledShiftVsGeometrySpearman).toFixed(3)} foot="same-rule shift vs geometry stability"/><Stat label="Permutation p" value={Number(observerConditioning.primaryTest.substrateStratifiedPermutationP).toFixed(3)} foot="5,000 within-substrate permutations"/><Stat label="Primary test" value={observerConditioning.primaryTest.observerConditioningSupported ? "PASS" : "CHALLENGED"} foot="frozen ρ ≤ −0.50 + p ≤ 0.05"/></div>
      <div className="table-head rulial-table"><span>Substrate</span><span>Coordinate count</span><span>Shift↔geometry ρ</span><span>Median geometry stability</span></div>
      {observerConditioning.substrates.map(item=><div className="source-row rulial-table" key={`rul012-${item.substrate}`}><b>{item.substrate}</b><code>{item.featureCount}</code><span>{Number(item.shiftVsGeometrySpearman).toFixed(3)}</span><small>{Number(item.medianGeometryStability).toFixed(3)}</small></div>)}
      <Notice title="A useful negative result">The preregistered simple rule is not supported: pooled coordinate-wise same-rule shift is essentially unrelated to geometry stability. ECA and Network trend weakly negative, while Boids trends positive. RUL-011 remains valid as a prospective observer-subset result; RUL-012 says a single scalar reliability proxy is not enough to explain observer conditioning across substrates.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-013 observer information analysis" title="Discrimination-to-uncertainty predicts coordinate geometry stability"/>
      <p>RUL-013 keeps the same 17 frozen coordinates and adds no simulations. Instead of using raw same-rule shift alone, it decomposes each coordinate into between-rule variance, independent-pool error variance, ICC-like reliability, robust signal-to-uncertainty, and explicit support degeneracy.</p>
      <div className="stats compact"><Stat label="New runs" value={String(observerInformation.newSimulationRunCount)} foot="same frozen profile pairs"/><Stat label="Reliability ↔ geometry ρ" value={Number(observerInformation.primaryTest.reliabilityVsGeometrySpearman).toFixed(3)} foot="primary cross-substrate association"/><Stat label="Permutation p" value={Number(observerInformation.primaryTest.substrateStratifiedPermutationP).toFixed(4)} foot="5,000 within-substrate shuffles"/><Stat label="Primary test" value={observerInformation.primaryTest.informationConditioningSupported ? "PASS" : "CHALLENGED"} foot="frozen ρ ≥ +0.70 + p ≤ 0.05"/></div>
      <div className="table-head rulial-table"><span>Substrate</span><span>Reliability↔geometry ρ</span><span>Signal↔geometry ρ</span><span>Median reliability</span></div>
      {observerInformation.substrates.map(item=><div className="source-row rulial-table" key={`rul013-${item.substrate}`}><b>{item.substrate}</b><code>{Number(item.reliabilityVsGeometrySpearman).toFixed(3)}</code><span>{Number(item.signalToUncertaintyVsGeometrySpearman).toFixed(3)}</span><small>{Number(item.medianReliability).toFixed(3)}</small></div>)}
      <Notice title="A better conditioning model, still provisional">The primary reliability association is strong and survives within-substrate permutation; the robust signal-to-uncertainty diagnostic agrees. Degeneracy is informative but weaker as a pooled scalar. RUL-013 therefore refines, rather than erases, RUL-012: low raw movement alone was insufficient, while discrimination relative to independent-pool uncertainty is much more predictive. A prospective RUL-014 is still required before treating this as a design rule.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-014 prospective observer selection" title="The RUL-013 selector improves directionally but misses the frozen primary margins"/>
      <p>RUL-014 converts RUL-013 into an explicit prospective design rule: include Boids coordinates with frozen ICC-like reliability at least 0.80, then test that selected observer on a new 48-point rule-space sample and two new four-seed pools. All three observer views use the same 384 newly simulated trajectories.</p>
      <div className="stats compact"><Stat label="New runs" value={String(prospectiveObserverSelection.simulation.totalNewRunCount)} foot="48 rules × 8 new seeds"/><Stat label="Selected geometry ρ" value={Number(prospectiveObserverSelection.observers.find(item=>item.observerId === "rul013_selected")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="RUL-013-selected observer"/><Stat label="Full-core geometry ρ" value={Number(prospectiveObserverSelection.observers.find(item=>item.observerId === "full_core")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="six-feature baseline"/><Stat label="Primary test" value={prospectiveObserverSelection.primaryProspectiveTest.prospectiveSelectionSupported ? "PASS" : "CHALLENGED"} foot="+0.05 geometry and local margins"/></div>
      <div className="table-head rulial-table"><span>Observer</span><span>Geometry ρ</span><span>Local-edge ρ</span><span>Top-10% overlap</span></div>
      {prospectiveObserverSelection.observers.map(item=><div className="source-row rulial-table" key={`rul014-${item.observerId}`}><b>{item.observerId}</b><code>{Number(item.geometryStabilitySpearman).toFixed(3)}</code><span>{Number(item.localEdgeStabilitySpearman).toFixed(3)}</span><small>{Number(item.top10LocalEdgeJaccard).toFixed(3)} Jaccard</small></div>)}
      <Notice title="Directional prediction, frozen primary challenge">The RUL-013-selected four-feature observer improves complete geometry and local-edge stability relative to full-core, and its top-boundary overlap improves substantially. But the gains of roughly +0.045 and +0.016 do not reach the preregistered +0.05 primary margins. The rejected low-reliability coordinates are near-zero or negative controls. Keep the primary outcome challenged rather than relaxing the threshold after the fact.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-015 continuous observer weighting" title="Continuous information weighting is challenged; hard selection remains stronger"/>
      <p>RUL-015 keeps all six Boids coordinates active but weights their standardized metric using only frozen RUL-013 conditioning information: ICC-like reliability × log(1 + signal-to-uncertainty) × non-degeneracy. A new 56-point rule design and two new four-seed pools produce 448 trajectories shared by every metric variant.</p>
      <div className="stats compact"><Stat label="New runs" value={String(informationWeightedObserver.simulation.totalNewRunCount)} foot="56 rules × 8 new seeds"/><Stat label="Weighted geometry ρ" value={Number(informationWeightedObserver.observers.find(item=>item.observerId === "information_weighted")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="continuous information weighting"/><Stat label="Hard-selection geometry ρ" value={Number(informationWeightedObserver.observers.find(item=>item.observerId === "rul013_hard_selection")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="RUL-013 threshold observer"/><Stat label="Primary test" value={informationWeightedObserver.primaryProspectiveTest.continuousWeightingSupported ? "PASS" : "CHALLENGED"} foot="+0.03 geometry and local margins"/></div>
      <div className="table-head rulial-table"><span>Metric</span><span>Geometry ρ</span><span>Local-edge ρ</span><span>Top-10% overlap</span></div>
      {informationWeightedObserver.observers.map(item=><div className="source-row rulial-table" key={`rul015-${item.observerId}`}><b>{item.observerId}</b><code>{Number(item.geometryStabilitySpearman).toFixed(3)}</code><span>{Number(item.localEdgeStabilitySpearman).toFixed(3)}</span><small>{Number(item.top10LocalEdgeJaccard).toFixed(3)} Jaccard</small></div>)}
      <Notice title="Specific weighting rule challenged">The information-weighted metric barely changes complete/local stability relative to equal weighting and does not meet either preregistered +0.03 margin. The hard four-feature selection is substantially stronger on complete geometry and top-boundary overlap in this unseen design. Keep RUL-015 challenged: continuous down-weighting is not automatically better than removing poorly conditioned coordinates.</Notice>

      <SectionHead eyebrow="RUL-016 observer ablation" title="Exact subset enumeration reveals non-additive observer geometry"/>
      <p>RUL-016 reuses the frozen RUL-015 population and evaluates all 63 non-empty subsets of the six Boids coordinates. Exact leave-one-out, Shapley, and pair-interaction decompositions separate individual coordinate contributions from combination effects without adding new unique simulations.</p>
      <div className="metricGrid">
        <Metric label="Observer subsets" value="63 / 63"/>
        <Metric label="Pair interactions" value="15"/>
        <Metric label="Strongest |I|" value="0.298"/>
        <Metric label="New unique runs" value="0"/>
      </div>
      <Notice title="Interaction structure detected">The strongest complete-geometry interaction is polarization × speed variance (I ≈ -0.298). Transition rate and metastable dwell each have negative complete-geometry Shapley contributions and small beneficial leave-one-out removals, but the dominant interaction lies among structural coordinates. Observer conditioning is therefore not reducible to independently good or bad features.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="RUL-017 prospective interaction observer" title="The compact interaction-informed observer wins the frozen geometry test"/>
      <p>RUL-017 freezes the three-coordinate candidate found diagnostically in RUL-016—polarization, spatial entropy, and speed variance—then tests it on a new 40-point Boids rule-space sample and two new four-seed pools. The comparison uses the established four-feature RUL-013 observer and the six-feature full-core baseline on the same 320 trajectories.</p>
      <div className="stats compact"><Stat label="New runs" value={String(interactionObserverValidation.simulation.totalNewRunCount)} foot="40 rules × 8 new seeds"/><Stat label="Three-feature geometry ρ" value={Number(interactionObserverValidation.observers.find(item=>item.observerId === "rul016_interaction3")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="interaction-informed candidate"/><Stat label="Four-feature geometry ρ" value={Number(interactionObserverValidation.observers.find(item=>item.observerId === "rul013_hard4")?.geometryStabilitySpearman ?? 0).toFixed(3)} foot="established comparison"/><Stat label="Primary test" value={interactionObserverValidation.primaryProspectiveTest.interactionInformedObserverSupported ? "PASS" : "CHALLENGED"} foot="+0.01 geometry and local margins"/></div>
      <div className="table-head rulial-table"><span>Observer</span><span>Geometry ρ</span><span>Local-edge ρ</span><span>Top-10% overlap</span></div>
      {interactionObserverValidation.observers.map(item=><div className="source-row rulial-table" key={`rul017-${item.observerId}`}><b>{item.observerId}</b><code>{Number(item.geometryStabilitySpearman).toFixed(3)}</code><span>{Number(item.localEdgeStabilitySpearman).toFixed(3)}</span><small>{Number(item.top10LocalEdgeJaccard).toFixed(3)} Jaccard</small></div>)}
      <Notice title="Prospective geometry replication, mixed boundary replication">The frozen three-feature candidate beats the four-feature observer by about +0.082 in complete geometry and +0.012 in local geometry, clearing both preregistered +0.01 margins. Its top-10% boundary overlap is lower than the four-feature observer, so the secondary Jaccard criterion is challenged. Treat RUL-017 as support for interaction-informed geometry conditioning, not proof that the compact observer dominates every notion of reproducibility.</Notice>
    </section>
    <section className="paper">
      <SectionHead eyebrow="Calibration-only preview" title="Centered-cell signatures"/>
      <p>The older single-centered-cell view remains as a plumbing check only; it is not the benchmark used for the atlas above.</p>
      <div className="table-head rulial-table"><span>Rule</span><span>Mean entropy</span><span>Terminal entropy</span><span>Perturbation distance</span></div>
      {signatures.map(signature=><div className="source-row rulial-table" key={signature.rule}><b>Rule {signature.rule}</b><code>{signature.meanEntropy.toFixed(4)}</code><span>{signature.terminalEntropy.toFixed(4)}</span><small>{signature.meanPerturbationDistance.toFixed(4)} mean · {signature.terminalPerturbationDistance.toFixed(4)} terminal</small></div>)}
    </section>
    <Notice title="Scientific boundary">External CA class labels are intentionally absent from the feature construction. Compare against them only after the EBID profiles, metrics, clustering choices, and validation criteria are frozen.</Notice>
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


function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ResultCards() {
  const workspace = useWorkspace();
  const { runs } = useContext(RunContext);
  return <div className="result-cards">{workspace.experiments.map(experiment => {
    const experimentRuns = runs.filter(run => run.experimentId === experiment.id);
    const latest = experimentRuns.at(-1);
    return <article key={experiment.id} className="paper result-card"><div><code>{experiment.id}</code><span className={`implementation ${latest ? "implemented" : "specified"}`}>{latest ? latest.status : "awaiting runs"}</span></div><h3>{experiment.title}</h3><dl><div><dt>Runs</dt><dd>{experimentRuns.length}</dd></div><div><dt>Hypothesis</dt><dd>{experiment.hypothesisId}</dd></div><div><dt>Latest conclusion</dt><dd>{latest?.conclusion ?? "not evaluated"}</dd></div><div><dt>Observables</dt><dd>{experiment.observableIds.length}</dd></div></dl>{latest && <small>{latest.id} · seed {latest.randomSeed} · {latest.provenance.engineId}</small>}</article>;
  })}</div>;
}


function Orchestrator() {
  const workspace = useWorkspace();
  const { runs, addRuns } = useContext(RunContext);
  const [selectedId, setSelectedId] = useState(workspace.campaigns[0]?.id ?? "");
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [running, setRunning] = useState(false);
  const campaign = workspace.campaigns.find(item => item.id === selectedId) ?? workspace.campaigns[0];
  if (!campaign) return <div className="view"><Notice title="No campaigns registered">Create a research campaign to orchestrate execution and downstream publication outputs.</Notice></div>;
  const experiment = workspace.experiments.find(item => item.id === campaign.experimentId);
  const engine = workspace.engines.find(item => item.id === experiment?.engineId);
  const executable = Boolean(engine?.status === "validated" && engine.entrypoints.some(entry => entry.protocol === "local"));

  async function runCampaign() {
    setRunning(true);
    try {
      const next = await executeCampaign({
        campaign, experiment, engine, observables: workspace.observables, analyses: workspace.analyses,
        figures: workspace.figures, papers: workspace.papers, datasets: workspace.datasets, existingRuns: runs,
        projectRevision: workspace.project.revision, projectId: workspace.project.id,
      });
      setReport(next);
      if (next.runs.length) addRuns(next.runs);
    } finally { setRunning(false); }
  }

  return <div className="view">
    <SectionHead eyebrow="08 · Experiment Orchestrator" title="Campaign execution and downstream refresh" action={<div className="action-row"><button className="button" disabled={running || !executable} onClick={()=>void runCampaign()}>{running ? "Executing campaign…" : "Execute campaign"}</button>{report && <button className="button secondary" onClick={()=>downloadText(`${report.campaignId}-report.json`,JSON.stringify(report,null,2),"application/json")}>Export campaign report</button>}</div>}/>
    <p className="lede">A campaign freezes its parameter grid, executes every registered run, then chains statistics, figures, evidence summaries, manuscripts, and integrity-checked dataset packages. External engines remain import-gated.</p>
    <div className="publication-layout">
      <div className="publication-list">{workspace.campaigns.map(item=>{const itemExperiment=workspace.experiments.find(exp=>exp.id===item.experimentId);const itemEngine=workspace.engines.find(candidate=>candidate.id===itemExperiment?.engineId);const ready=itemEngine?.status==="validated"&&itemEngine.entrypoints.some(entry=>entry.protocol==="local");return <button key={item.id} className={item.id===campaign.id?"active":""} onClick={()=>{setSelectedId(item.id);setReport(null);}}><code>{item.id}</code><b>{item.title}</b><small>{ready?"browser-executable":"artifact import required"} · {campaignRunCount(item)} planned runs</small></button>})}</div>
      <section className="paper manuscript">
        <div className="action-row"><span className={`implementation ${executable?"implemented":"specified"}`}>{executable?"ready":"blocked on external artifacts"}</span><code>{engine?.id ?? "unknown engine"}</code></div>
        <h2>{campaign.title}</h2><p>{campaign.description}</p>
        <div className="stats compact"><Stat label="Planned runs" value={String(campaignRunCount(campaign))} foot={`${campaign.seeds.length} seeds`}/><Stat label="Axes" value={String(campaign.parameterAxes.length)} foot={campaign.parameterAxes.map(axis=>axis.name).join(", ")||"fixed"}/><Stat label="Analyses" value={String(campaign.analysisIds.length)} foot="registered definitions"/><Stat label="Outputs" value={String(campaign.figureIds.length+campaign.paperIds.length+campaign.datasetIds.length)} foot="figures · papers · datasets"/></div>
        <h3>Frozen campaign manifest</h3><pre>{JSON.stringify({experimentId:campaign.experimentId,engineId:engine?.id,seeds:campaign.seeds,parameterAxes:campaign.parameterAxes,fixedParameters:campaign.fixedParameters,analysisIds:campaign.analysisIds,figureIds:campaign.figureIds,paperIds:campaign.paperIds,datasetIds:campaign.datasetIds},null,2)}</pre>
        <h3>Execution graph</h3><div className="section-ledger">{campaign.steps.map(step=>{const result=report?.steps.find(item=>item.stepId===step.id);return <article key={step.id}><div><code>{step.id}</code><span className={`implementation ${result?.status==="completed"?"implemented":"specified"}`}>{result?.status ?? step.kind}</span></div><h3>{step.label}</h3><p>{result?.message ?? step.description}</p><small>{step.dependsOn.length?`depends on ${step.dependsOn.join(", ")}`:"root step"}</small></article>})}</div>
        {!executable && <Notice title="Execution boundary">{engine?.name ?? "This engine"} is not available as a validated browser-local adapter. Generate its schema-valid run artifacts externally and import them through the Simulation Bench.</Notice>}
        {report && <><h3>Campaign evidence summary</h3><Notice title={report.status==="completed"?"Campaign completed":"Campaign blocked"}>{report.evidence.statement}</Notice><dl className="definition-grid"><div><dt>Runs added</dt><dd>{report.runs.length}</dd></div><div><dt>Analyses</dt><dd>{report.analyses.filter(item=>item.status==="completed").length}/{report.analyses.length}</dd></div><div><dt>Figures</dt><dd>{report.figures.filter(item=>item.status==="generated").length}/{report.figures.length}</dd></div><div><dt>Packages</dt><dd>{report.packages.length}</dd></div></dl>{report.warnings.map(item=><p key={item}><small>{item}</small></p>)}</>}
      </section>
    </div>
  </div>;
}

function Figures() {
  const workspace = useWorkspace();
  const { runs } = useContext(RunContext);
  const [selectedId,setSelectedId]=useState(workspace.figures[0]?.id ?? "");
  const figure=workspace.figures.find(item=>item.id===selectedId) ?? workspace.figures[0];
  if (!figure) return <div className="view"><Notice title="No figures registered">Create a figure definition before generating publication graphics.</Notice></div>;
  const product=generateFigure(figure,runs);
  return <div className="view"><SectionHead eyebrow="08 · Figure Studio" title="Run-derived scientific graphics"/><p className="lede">Figure products are generated directly from completed run measurements. Each export records the contributing run IDs; missing data produces an explicit insufficient-data state.</p><div className="publication-layout"><div className="publication-list">{workspace.figures.map(item=>{const state=generateFigure(item,runs);return <button key={item.id} className={item.id===figure.id?"active":""} onClick={()=>setSelectedId(item.id)}><code>{item.id}</code><b>Figure {item.number} · {item.title}</b><small>{state.status} · {state.seriesCount} series</small></button>})}</div><section className="paper manuscript"><div className="action-row"><span className={`implementation ${product.status==="generated"?"implemented":"specified"}`}>{product.status}</span><button className="button" disabled={!product.svg} onClick={()=>product.svg&&downloadText(`${figure.id}.svg`,product.svg,"image/svg+xml")}>Export SVG</button><button className="button secondary" onClick={()=>downloadText(`${figure.id}-provenance.json`,JSON.stringify({...product,definition:figure,svg:undefined},null,2),"application/json")}>Export provenance</button></div><h2>{figure.title}</h2><p>{figure.caption}</p>{product.svg?<div className="figure-preview" dangerouslySetInnerHTML={{__html:product.svg}}/>:<Notice title="Awaiting compatible run">Import or execute a completed {figure.experimentIds.join(" / ")} run containing numeric measurement series.</Notice>}<dl className="definition-grid"><div><dt>Generator</dt><dd>{figure.generator}</dd></div><div><dt>Run IDs</dt><dd>{product.runIds.join(", ")||"—"}</dd></div><div><dt>Series</dt><dd>{product.seriesCount}</dd></div><div><dt>Observables</dt><dd>{figure.observableIds.join(", ")}</dd></div></dl>{product.warnings.map(warning=><p key={warning}><small>{warning}</small></p>)}</section></div></div>;
}

function Statistics() {
  const workspace=useWorkspace();
  const {runs}=useContext(RunContext);
  return <div className="view"><SectionHead eyebrow="09 · Statistics Studio" title="Executable registered analyses"/><p className="lede">Each analysis is executed against compatible completed artifacts. Results include estimates, contributing run IDs, and limitations instead of a bare descriptive mean.</p><section className="analysis-grid">{workspace.analyses.map(analysis=>{const result=executeAnalysis(analysis,runs);return <article className="paper analysis-card" key={analysis.id}><div><code>{analysis.id}</code><span className={`implementation ${result.status==="completed"?"implemented":"specified"}`}>{result.status}</span></div><h3>{analysis.name}</h3><p>{analysis.method}</p><dl><div><dt>Kind</dt><dd>{analysis.kind}</dd></div><div><dt>Runs</dt><dd>{result.runIds.length}</dd></div><div><dt>Observations</dt><dd>{result.summary.n}</dd></div><div><dt>Mean</dt><dd>{result.summary.mean===undefined?"—":result.summary.mean.toPrecision(5)}</dd></div></dl><pre>{JSON.stringify(result.estimates,null,2)}</pre><ul>{result.limitations.map(item=><li key={item}>{item}</li>)}</ul><button className="button secondary" onClick={()=>downloadText(`${analysis.id}-result.json`,JSON.stringify({...analysis,result},null,2),"application/json")}>Export analysis result</button></article>})}</section></div>;
}

function Publications() {
  const workspace = useWorkspace();
  const { runs } = useContext(RunContext);
  const [selectedId,setSelectedId]=useState(workspace.papers[0]?.id ?? "");
  const paper=workspace.papers.find(item=>item.id===selectedId) ?? workspace.papers[0];
  if (!paper) return <div className="view"><Notice title="No papers registered">Create a publication object to connect evidence, figures, and analyses.</Notice></div>;
  const paperRuns=runs.filter(run=>paper.experimentIds.includes(run.experimentId));
  const analysisResults=workspace.analyses.filter(item=>paper.analysisIds.includes(item.id)).map(item=>executeAnalysis(item,runs));
  const manuscript=buildManuscript(paper,runs,workspace.figures,workspace.analyses,analysisResults);
  const completeAnalyses=analysisResults.filter(item=>item.status==="completed").length;
  return <div className="view"><SectionHead eyebrow="10 · Publication Studio" title="Evidence-linked manuscripts"/><p className="lede">The manuscript refresh now incorporates run conclusions and executable analysis summaries. Generated language remains visibly separated from author-approved prose.</p><div className="publication-layout"><div className="publication-list">{workspace.papers.map(item=><button key={item.id} className={item.id===paper.id?"active":""} onClick={()=>setSelectedId(item.id)}><code>{item.id}</code><b>{item.shortTitle}</b><small>{item.status} · {item.sections.length} sections</small></button>)}</div><section className="paper manuscript"><div className="action-row"><span className={`implementation ${paperRuns.length?"implemented":"specified"}`}>{paperRuns.length} runs · {completeAnalyses}/{analysisResults.length} analyses</span><button className="button" onClick={()=>downloadText(`${paper.id}.md`,manuscript,"text/markdown")}>Export refreshed manuscript</button><button className="button secondary" onClick={()=>downloadText(`${paper.id}-record.json`,JSON.stringify({...paper,runIds:paperRuns.map(r=>r.id),analysisResults},null,2),"application/json")}>Export record</button></div><h2>{paper.title}</h2><p><b>Target:</b> {paper.targetVenue ?? "Not selected"}</p><div className="section-ledger">{paper.sections.map(section=><article key={section.id}><div><code>{section.id}</code><span className={`implementation ${section.status==="reviewed"?"implemented":"specified"}`}>{section.status}</span></div><h3>{section.title}</h3><p>{section.purpose}</p><small>{section.sourceIds.join(" · ")}</small></article>)}</div><details><summary>Generated manuscript preview</summary><pre>{manuscript}</pre></details></section></div></div>;
}

function Datasets() {
  const workspace=useWorkspace();
  const {runs}=useContext(RunContext);
  const [building,setBuilding]=useState<string|null>(null);
  async function exportDataset(dataset: ResearchWorkspace["datasets"][number]) {
    setBuilding(dataset.id);
    try {
      const results=workspace.analyses.map(item=>executeAnalysis(item,runs));
      const bundle=await buildReproducibilityPackage(dataset,runs,workspace.figures,workspace.analyses,results);
      downloadText(`${dataset.id}-v${dataset.version}.json`,JSON.stringify(bundle,null,2),"application/json");
    } finally { setBuilding(null); }
  }
  return <div className="view"><SectionHead eyebrow="11 · Dataset Builder" title="Integrity-checked reproducibility packages"/><p className="lede">Exports now include run artifacts, definitions, executable analysis results, citation metadata, and a SHA-256 checksum over the canonical package payload.</p><section className="analysis-grid">{workspace.datasets.map(dataset=>{const includedRuns=runs.filter(run=>dataset.experimentIds.includes(run.experimentId)); const ready=includedRuns.length>0; return <article className="paper analysis-card" key={dataset.id}><div><code>{dataset.id}</code><span className={`implementation ${ready?"implemented":"specified"}`}>{ready?"exportable":dataset.status}</span></div><h3>{dataset.title}</h3><p>Version {dataset.version} · {dataset.license}</p><ul>{dataset.include.map(item=><li key={item}>{item}</li>)}</ul><p><b>{includedRuns.length}</b> compatible run artifact(s) currently loaded.</p><button className="button" disabled={!ready||building===dataset.id} onClick={()=>void exportDataset(dataset)}>{building===dataset.id?"Computing checksum…":"Export verified package"}</button></article>})}</section><Notice title="Release boundary">This produces an auditable release payload with cryptographic integrity metadata. Authenticated Zenodo deposition and DOI minting remain a separate integration.</Notice></div>;
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
  const content={overview:<Overview onNavigate={setView}/>,corpus:<Corpus/>,observables:<Observables/>,engines:<Engines/>,ruliology:<RulialAtlas/>,graph:<Graph/>,hypotheses:<Hypotheses/>,experiments:<Experiments/>,simulation:<Simulation/>,orchestrator:<Orchestrator/>,figures:<Figures/>,statistics:<Statistics/>,publications:<Publications/>,datasets:<Datasets/>,review:<Review/>}[view];

  function selectWorkspace(nextId: string) {
    const entry = workspaceRegistry.find(item => item.id === nextId);
    if (!entry?.workspace) return;
    setWorkspaceId(nextId);
    setView("overview");
  }

  const navGroups = [
    { label: "Research", ids: ["overview", "corpus", "hypotheses", "experiments", "orchestrator", "simulation"] },
    { label: "Analysis", ids: ["observables", "ruliology", "statistics", "figures", "graph"] },
    { label: "Publication", ids: ["publications", "datasets", "review"] },
    { label: "Infrastructure", ids: ["engines"] },
  ];
  const activeNavigation = navigation.find(item => item.id === view);

  return <WorkspaceContext.Provider key={workspaceId} value={workspace}><RunContext.Provider value={{runs,addRun:run=>setRuns(current=>[...current,run]),addRuns:nextRuns=>setRuns(current=>[...current,...nextRuns])}}><main className="shell ui-shell">
    <header className="mast ui-mast">
      <div className="brand-mark" aria-hidden="true">E</div>
      <div className="identity"><span>Entropy Studio</span><b>{project.shortTitle}</b></div>
      <div className="context-path"><span>{activeNavigation?.label ?? "Dashboard"}</span><small>{activeNavigation?.note ?? workspace.tagline}</small></div>
      <div className="top-actions"><button className="icon-button" title="Command palette">⌘K</button><div className="lab-status"><i/> local</div></div>
    </header>
    <aside className="sidebar ui-sidebar">
      <div className="workspace-picker"><span>Workspace</span><select aria-label="Research workspace" value={workspaceId} onChange={event=>selectWorkspace(event.target.value)}>{workspaceRegistry.map(entry=><option key={entry.id} value={entry.id} disabled={!entry.workspace}>{entry.label}{entry.availability === "planned" ? " · planned" : ""}</option>)}</select><small>{workspaceRegistry.find(entry=>entry.id===workspaceId)?.description}</small></div>
      <div className="program"><span>Active program</span><b>{project.title}</b><small>Revision {project.revision}</small></div>
      <nav aria-label="Research workflow">{navGroups.map(group=><div className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{navigation.filter(item=>group.ids.includes(item.id)).map(v=><button key={v.id} className={view===v.id?'active':''} onClick={()=>setView(v.id)}><code>{v.index}</code><span><b>{v.label}</b><small>{v.note}</small></span><i aria-hidden="true">›</i></button>)}</div>)}</nav>
      <div className="scope"><span>Epistemic status</span><b>{project.epistemicStatus}</b><small>{project.disclaimer}</small></div>
    </aside>
    <section className="content ui-content"><div className="page-toolbar"><div><span>{workspace.name}</span><b>{activeNavigation?.label ?? "Dashboard"}</b></div><div className="run-badge"><strong>{runs.length}</strong><span>loaded runs</span></div></div>{content}<footer><span>{project.shortTitle} · local workspace registry</span><b>Human verification required for AI-assisted outputs.</b></footer></section>
  </main></RunContext.Provider></WorkspaceContext.Provider>;
}
