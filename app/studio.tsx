"use client";

import { ChangeEvent, createContext, useContext, useMemo, useState } from "react";

import type { EvidenceLevel, ResearchSource, ResearchView, ResearchWorkspace } from "./models/research";
import { defaultWorkspaceId, getWorkspace, workspaceRegistry } from "./data/workspaces";

const WorkspaceContext = createContext<ResearchWorkspace | null>(null);

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

function Graph() {
  const workspace = useWorkspace();
  const { graph, claims } = workspace;
  const graphNodes = graph.nodes;
  return <div className="view"><SectionHead eyebrow="02 · Scientific knowledge graph" title="Claims, concepts, and evidence"/><p className="lede">The graph distinguishes conceptual mappings from mathematical relations. An edge is not evidence unless it links to a derivation, dataset, or experiment.</p><div className="graph-layout"><section className="paper graph"><div className="edges"><i/><i/><i/><i/><i/></div>{graphNodes.map(node=><button key={node.id} className={`node ${node.kind}`} style={{left:`${node.x}%`,top:`${node.y}%`}}><b>{node.label}</b><span>{node.kind}</span></button>)}</section><section className="paper claim-ledger"><SectionHead eyebrow="Claim ledger" title="Evidence states"/>{claims.map(c=><article className="claim" key={c.id}><div><code>{c.id}</code><Tag level={c.evidence}/></div><p>{c.text}</p><small>{c.relation}</small></article>)}</section></div><Notice title="Graph interpretation">Conceptual edges encode the research program’s current vocabulary. They should not be read as causal, biological, or universal claims without independent evidence.</Notice></div>;
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
  const manifest={experiment_id:experimentDefinition.id,hypothesis_id:experimentDefinition.hypothesisId,model:experimentDefinition.model,seed,epsilon,fit_window:[0,window],observables:experimentDefinition.observables,controls:experimentDefinition.controls,primary_metric:experimentDefinition.primaryMetric};
  return <div className="view"><SectionHead eyebrow="04 · Experiment planner" title="Pre-execution protocol E-007"/><p className="lede">Parameters, controls, analysis windows, and failure criteria are fixed before a result is generated.</p><div className="experiment-layout"><section className="paper form"><h3>Design variables</h3><label><span>Random seed <b>{seed}</b></span><input type="range" min="1" max="99" value={seed} onChange={e=>setSeed(+e.target.value)}/></label><label><span>Instability ε <b>{epsilon.toFixed(3)}</b></span><input type="range" min=".005" max=".15" step=".005" value={epsilon} onChange={e=>setEpsilon(+e.target.value)}/></label><label><span>Fit-window end <b>t = {window}</b></span><input type="range" min="2" max="20" value={window} onChange={e=>setWindow(+e.target.value)}/></label><h3>Required comparisons</h3>{manifest.controls.map(c=><label className="check" key={c}><input type="checkbox" defaultChecked/><span>{c}</span></label>)}<Notice title="No result yet">This is a protocol, not an outcome. Expected behavior is not recorded as observed behavior.</Notice></section><section className="paper manifest"><div className="manifest-head"><span>Reproducibility manifest</span><code>YAML / JSON ready</code></div><pre>{JSON.stringify(manifest,null,2)}</pre></section></div></div>;
}

function caStep(row:number[],rule:number){return row.map((_,i)=>{const code=(row[(i-1+row.length)%row.length]<<2)|(row[i]<<1)|row[(i+1)%row.length];return(rule>>code)&1})}
function Simulation() {
  const [rule,setRule]=useState(110),[time,setTime]=useState(8),[run,setRun]=useState(1);
  const result=useMemo(()=>{const w=96,steps=64;let a=Array(w).fill(0),b=Array(w).fill(0);a[48]=1;b[48]=1;const diff:number[][]=[];const h:number[]=[];for(let t=0;t<steps;t++){if(t===time)b[43]^=1;const d=a.map((v,i)=>v^b[i]);diff.push(d);h.push(d.reduce((x,y)=>x+y,0)/w);a=caStep(a,rule);b=caStep(b,rule)}return{diff,h,final:h.at(-1)??0,max:Math.max(...h)}},[rule,time]);
  return <div className="view"><SectionHead eyebrow="05 · Scientific simulation library" title="Perturbation experiment" action={<button className="button" onClick={()=>setRun(r=>r+1)}>Execute deterministic run</button>}/><p className="lede">A transparent cellular-automata benchmark for exact trajectory divergence. This formal system is a methods testbed, not evidence for a cognitive or biological claim.</p><div className="sim-controls"><label>Wolfram rule <input type="number" min="0" max="255" value={rule} onChange={e=>setRule(Math.max(0,Math.min(255,+e.target.value)))}/></label><label>Perturbation time <input type="number" min="1" max="50" value={time} onChange={e=>setTime(Math.max(1,Math.min(50,+e.target.value)))}/></label><span>Run ID <b>CA-{rule}-{time}-{run}</b></span></div><div className="stats compact"><Stat label="Final Hamming" value={result.final.toFixed(3)} foot="exact difference"/><Stat label="Maximum Hamming" value={result.max.toFixed(3)} foot="over 64 steps"/><Stat label="Restoration" value={(1-result.final).toFixed(3)} foot="exact coefficient"/><Stat label="Seed" value="single center" foot="periodic boundary"/></div><section className="paper"><div className="figure-head"><div><span>Figure E-CA-01</span><h3>XOR difference trajectory</h3></div><small>amber = control ≠ perturbation</small></div><div className="ca">{result.diff.flatMap((row,y)=>row.map((v,x)=><i key={`${x}-${y}`} className={v?'on':''}/>))}</div><div className="caption"><b>Methods.</b> Elementary CA with periodic boundary, one-bit perturbation at the declared step, and cellwise XOR comparison. Normalized Hamming distance is the divergent-cell fraction.</div></section></div>;
}

function Review() {
  const { reviewConcerns } = useWorkspace();
  const [resolved,setResolved]=useState<number[]>([]);
  return <div className="view"><SectionHead eyebrow="06 · AI-assisted paper review" title="Critical review queue"/><p className="lede">A structured adversarial reading of the current entropy–instability argument. The reviewer proposes concerns; a human author adjudicates them.</p><div className="review-summary"><div><strong>B</strong><span>Methodological readiness</span></div><p>The computational idea is testable and promising, but generality claims exceed the present validation set. A stronger paper would narrow the main claim and expand adversarial controls.</p></div><section className="paper review-list">{reviewConcerns.map((concern,i)=><article key={concern.id} className={resolved.includes(i)?'resolved':''}><button aria-label="Toggle resolved" onClick={()=>setResolved(r=>r.includes(i)?r.filter(x=>x!==i):[...r,i])}>{resolved.includes(i)?'✓':'!'}</button><div><span>{concern.id} · {concern.severity} concern</span><h3>{concern.title}</h3><p>{concern.description}</p></div><Tag level={concern.evidence}/></article>)}</section><div className="two-col"><section className="paper"><SectionHead eyebrow="Required revision" title="Minimum convincing package"/><ul className="issue-list"><li>Preregister slope-estimation windows and tolerances.</li><li>Report failures alongside successful observables.</li><li>Run initial-condition and seed sensitivity analyses.</li><li>Separate theorem, numerical evidence, and analogy.</li></ul></section><section className="paper"><SectionHead eyebrow="Reviewer questions" title="Questions for the authors"/><ul className="issue-list"><li>What class of entropy-like functionals is admissible?</li><li>How is equilibrium chosen outside the simplex model?</li><li>What observation would falsify the proposed correspondence?</li><li>Which result has been reproduced independently?</li></ul></section></div></div>;
}

export function Studio() {
  const [view,setView]=useState<ResearchView>("overview");
  const [workspaceId,setWorkspaceId]=useState(defaultWorkspaceId);
  const workspace=getWorkspace(workspaceId);
  const { project, navigation } = workspace;
  const content={overview:<Overview onNavigate={setView}/>,corpus:<Corpus/>,graph:<Graph/>,hypotheses:<Hypotheses/>,experiments:<Experiments/>,simulation:<Simulation/>,review:<Review/>}[view];

  function selectWorkspace(nextId: string) {
    const entry = workspaceRegistry.find(item => item.id === nextId);
    if (!entry?.workspace) return;
    setWorkspaceId(nextId);
    setView("overview");
  }

  return <WorkspaceContext.Provider key={workspaceId} value={workspace}><main className="shell"><header className="mast"><div className="identity"><span>{workspace.name}</span><b>{project.shortTitle} Research Laboratory</b></div><div className="mission">{workspace.tagline} <i>·</i> evidence over speculation</div><div className="lab-status"><i/> local research state</div></header><aside className="sidebar"><div className="workspace-picker"><span>Workspace</span><select aria-label="Research workspace" value={workspaceId} onChange={event=>selectWorkspace(event.target.value)}>{workspaceRegistry.map(entry=><option key={entry.id} value={entry.id} disabled={!entry.workspace}>{entry.label}{entry.availability === "planned" ? " · planned" : ""}</option>)}</select><small>{workspaceRegistry.find(entry=>entry.id===workspaceId)?.description}</small></div><div className="program"><span>Research program</span><b>{project.title}</b><small>Program revision {project.revision}</small></div><nav>{navigation.map(v=><button key={v.id} className={view===v.id?'active':''} onClick={()=>setView(v.id)}><code>{v.index}</code><span><b>{v.label}</b><small>{v.note}</small></span></button>)}</nav><div className="scope"><span>Epistemic status</span><b>{project.epistemicStatus}</b><small>{project.disclaimer}</small></div></aside><section className="content">{content}<footer><span>{project.shortTitle} is loaded from the Entropy Studio workspace registry.</span><b>All AI contributions require human verification.</b></footer></section></main></WorkspaceContext.Provider>;
}
