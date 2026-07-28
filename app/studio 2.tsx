"use client";

import { ChangeEvent, useMemo, useState } from "react";

type Module = "flex" | "loops" | "automata" | "info" | "agents" | "data";
type Point = { x: number; y: number };

const modules: { id: Module; code: string; name: string; note: string }[] = [
  { id: "flex", code: "01", name: "Flexibility", note: "Task switching" },
  { id: "loops", code: "02", name: "State loops", note: "Transitions" },
  { id: "automata", code: "03", name: "CA resilience", note: "Perturbations" },
  { id: "info", code: "04", name: "Information", note: "Signal + noise" },
  { id: "agents", code: "05", name: "Adaptive agents", note: "Policy shifts" },
  { id: "data", code: "06", name: "Private data", note: "Local only" },
];

function rand(seed: number) {
  let value = seed >>> 0;
  return () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
}

function LineChart({ series, labels = ["primary", "comparison"] }: { series: Point[][]; labels?: string[] }) {
  const w = 720, h = 230, pad = 20;
  const all = series.flat();
  const ymax = Math.max(1, ...all.map((p) => p.y));
  const xmax = Math.max(1, ...all.map((p) => p.x));
  const path = (s: Point[]) => s.map((p, i) => `${i ? "L" : "M"}${pad + (p.x / xmax) * (w - pad * 2)},${h - pad - (p.y / ymax) * (h - pad * 2)}`).join(" ");
  return <div className="chart-wrap"><svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Simulation time-series chart">
    {[.25, .5, .75].map((n) => <line key={n} x1={pad} x2={w-pad} y1={h*n} y2={h*n} className="grid" />)}
    {series.map((s, i) => <path key={i} d={path(s)} className={`line line-${i}`} />)}
  </svg><div className="legend">{labels.map((l, i) => <span key={l}><i className={`dot dot-${i}`} />{l}</span>)}</div></div>;
}

function Slider({ label, value, min=0, max=1, step=.05, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (n: number) => void }) {
  return <label className="control"><span>{label}<b>{value.toFixed(step < 1 ? 2 : 0)}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} /></label>;
}

function Flexibility() {
  const [switchFreq, setSwitch] = useState(.35), [cost, setCost] = useState(.45), [uncertainty, setUncertainty] = useState(.25), [perseveration, setPerseveration] = useState(.4), [fatigue, setFatigue] = useState(.2), [recovery, setRecovery] = useState(.35);
  const sim = useMemo(() => {
    const r = rand(42), flexible: Point[] = [], rigid: Point[] = []; let lf=0, lr=0, ef=0, er=0, pf=0, pr=0;
    for (let t=0;t<120;t++) { const sw = r()<switchFreq; const shock = r()<uncertainty*.25; lf=Math.max(0, lf + fatigue*.035 + (sw?cost*.38:0) + (shock?.2:0) - recovery*.065); lr=Math.max(0, lr + fatigue*.04 + (sw?cost*.55:0) + (shock?.24:0) - recovery*.035); pf=sw ? Math.max(0,pf-perseveration*.6) : pf*.75; pr=sw ? Math.min(1,pr+perseveration*.45) : pr*.92; ef += Math.min(1,.05+lf*.18+pf*.2+uncertainty*.12); er += Math.min(1,.06+lr*.2+pr*.28+uncertainty*.15); flexible.push({x:t,y:Math.max(0,1-lf*.22-pf*.18)}); rigid.push({x:t,y:Math.max(0,1-lr*.24-pr*.24)}); }
    return { flexible, rigid, load: lf, errors: [ef/120,er/120], pers: pr };
  }, [switchFreq,cost,uncertainty,perseveration,fatigue,recovery]);
  return <Lab title="Cognitive Flexibility Sandbox" kicker="Abstract task-switching model" description="Compare a recovery-aware policy with a perseverative policy under the same deterministic task stream.">
    <div className="controls"><Slider label="Switch frequency" value={switchFreq} onChange={setSwitch}/><Slider label="Switching cost" value={cost} onChange={setCost}/><Slider label="Uncertainty" value={uncertainty} onChange={setUncertainty}/><Slider label="Perseveration" value={perseveration} onChange={setPerseveration}/><Slider label="Fatigue" value={fatigue} onChange={setFatigue}/><Slider label="Recovery rate" value={recovery} onChange={setRecovery}/></div>
    <Metrics items={[["Flexible error",sim.errors[0].toFixed(3)],["Rigid error",sim.errors[1].toFixed(3)],["End load",sim.load.toFixed(2)],["Rigid dwell",sim.pers.toFixed(2)]]}/>
    <section className="panel"><PanelHead title="Performance over time" tag="seed 42"/><LineChart series={[sim.flexible,sim.rigid]} labels={["flexible policy","rigid policy"]}/></section>
    <Interpret text="Performance is an abstract normalized score. Switching adds load; recovery reduces it. A policy can be called ‘flexible’ only within these declared rules." />
  </Lab>;
}

const stateNames = ["neutral","focused","uncertain","frustrated","replaying","hyperverbalizing","problem-solving","resting","recovered"];
function StateLoops() {
  const [loop, setLoop] = useState(.62), [support, setSupport] = useState(.25), [ambiguity, setAmbiguity] = useState(.45);
  const data = useMemo(() => { const r=rand(7), counts=Object.fromEntries(stateNames.map(s=>[s,0])) as Record<string,number>; let s="neutral", recoveredAt=180; const trace: Point[]=[]; for(let t=0;t<180;t++){counts[s]++; const strain=(ambiguity*(s==="uncertain"||s==="frustrated"||s==="replaying"?1:.25)); if(r()<support*.16) s=r()<.5?"resting":"problem-solving"; else if(r()<loop*.34+strain*.16) s=s==="replaying"?"frustrated":s==="frustrated"?"replaying":"uncertain"; else s=stateNames[Math.floor(r()*stateNames.length)]; if(s==="recovered"&&recoveredAt===180) recoveredAt=t; trace.push({x:t,y:stateNames.indexOf(s)+1}); } const probs=Object.values(counts).map(v=>v/180).filter(Boolean); const entropy=-probs.reduce((a,p)=>a+p*Math.log2(p),0); return {counts,entropy,recoveredAt,trace};},[loop,support,ambiguity]);
  return <Lab title="Thought-Loop & State Transitions" kicker="Weighted Markov-style system" description="See how recurrence, ambiguity, and a generic support intervention alter trajectories through named model states.">
    <div className="controls"><Slider label="Loop reinforcement" value={loop} onChange={setLoop}/><Slider label="Support intervention" value={support} onChange={setSupport}/><Slider label="Unresolved ambiguity" value={ambiguity} onChange={setAmbiguity}/></div>
    <Metrics items={[["Transition entropy",`${data.entropy.toFixed(2)} bits`],["Recovery time",data.recoveredAt===180?"> 180":`${data.recoveredAt} steps`],["Replay dwell",`${data.counts.replaying} steps`],["Attractor",Object.entries(data.counts).sort((a,b)=>b[1]-a[1])[0][0]]]}/>
    <section className="panel state-panel"><PanelHead title="State occupancy" tag="180 transitions"/><div className="bars">{stateNames.map((s)=><div key={s} className="bar-row"><span>{s}</span><i style={{width:`${(data.counts[s]/Math.max(...Object.values(data.counts)))*100}%`}}/><b>{data.counts[s]}</b></div>)}</div></section>
    <Interpret text="The state names are illustrative labels, not universal psychological mechanisms. Interventions modify transition weights; they do not model treatment effects." />
  </Lab>;
}

function evolve(row:number[], rule:number){return row.map((_,i)=>{const code=(row[(i-1+row.length)%row.length]<<2)|(row[i]<<1)|row[(i+1)%row.length];return (rule>>code)&1;});}
function buildCA(rule:number,width:number,steps:number,perturb=false){let row=Array(width).fill(0);row[Math.floor(width/2)]=1;if(perturb)row[Math.floor(width*.42)]=1;const rows=[row];for(let i=1;i<steps;i++){row=evolve(row,rule);rows.push(row);}return rows;}
function Automata(){const [rule,setRule]=useState(110),[perturb,setPerturb]=useState(8);const data=useMemo(()=>{const control=buildCA(rule,96,72), changed=buildCA(rule,96,72);changed[perturb][43]=changed[perturb][43]?0:1;for(let i=perturb+1;i<72;i++)changed[i]=evolve(changed[i-1],rule);const diff=control.map((r,y)=>r.map((v,x)=>v^changed[y][x]));const ham=diff.map((r,x)=>({x,y:r.reduce((a,b)=>a+b,0)/r.length}));return{control,changed,diff,ham,rest:1-ham.at(-1)!.y};},[rule,perturb]);return <Lab title="Cellular-Automata Resilience Lab" kicker="Control vs perturbed trajectories" description="Run an elementary cellular automaton, inject one localized bit flip, and inspect exact divergence."><div className="controls"><Slider label="Wolfram rule" value={rule} min={0} max={255} step={1} onChange={setRule}/><Slider label="Perturbation time" value={perturb} min={1} max={50} step={1} onChange={setPerturb}/></div><Metrics items={[["Rule",String(rule)],["Final Hamming",data.ham.at(-1)!.y.toFixed(3)],["Exact restoration",data.rest.toFixed(3)],["Grid","96 × 72"]]}/><section className="panel"><PanelHead title="XOR difference map" tag="amber = divergence"/><div className="ca-grid">{data.diff.flatMap((row,y)=>row.map((v,x)=><i key={`${x}-${y}`} className={v?"changed":""}/>))}</div><LineChart series={[data.ham]} labels={["normalized Hamming distance"]}/></section><Interpret text="Exact restoration compares cell-for-cell equality. Functional or shift-tolerant restoration may tell a different story and must be reported separately." /></Lab>}

function Information(){const [signal,setSignal]=useState(.7),[noise,setNoise]=useState(.25),[bottle,setBottle]=useState(.4);const p=Math.min(.999,Math.max(.001,signal*(1-noise)*(1-bottle*.45)));const h=-(p*Math.log2(p)+(1-p)*Math.log2(1-p));return <Lab title="Information-Dynamics Explorer" kicker="Signal, noise & bottlenecks" description="Explore how a binary channel trades selectivity against sensitivity."><div className="controls"><Slider label="Signal prevalence" value={signal} onChange={setSignal}/><Slider label="Noise" value={noise} onChange={setNoise}/><Slider label="Bottleneck" value={bottle} onChange={setBottle}/></div><Metrics items={[["Output entropy",`${h.toFixed(3)} bits`],["Retained signal",p.toFixed(3)],["Specificity",(1-noise*.8).toFixed(3)],["Sensitivity",(signal*(1-bottle)).toFixed(3)]]}/><section className="panel info-viz"><div className="signal-orbit" style={{"--noise":`${noise*22}px`} as React.CSSProperties}><i/><i/><i/></div><div><h3>Recalibration surface</h3><p>A narrow bottleneck suppresses both noise and potentially relevant variation. Move the controls to inspect the trade-off.</p><code>H(X) = −Σ p(x) log₂ p(x)</code></div></section><Interpret text="Entropy quantifies uncertainty in this toy channel; it is not inherently good or bad, and it does not establish causality." /></Lab>}

function Agents(){const [change,setChange]=useState(55),[explore,setExplore]=useState(.3);const runs=useMemo(()=>{const r=rand(19);return ["adaptive","greedy","fixed"].map((name,k)=>{let reward=0;return Array.from({length:120},(_,t)=>{const target=t<change?0:1;const pick=k===2?0:k===1?(t<change+18?0:1):(r()<explore?1-target:target);reward+=pick===target?1:-.35;return{x:t,y:Math.max(0,reward)};});});},[change,explore]);return <Lab title="Adaptive-Agent Playground" kicker="Transparent policy baselines" description="Compare fixed, greedy, and uncertainty-aware policies after an environmental change."><div className="controls"><Slider label="Environment changes" value={change} min={20} max={95} step={1} onChange={setChange}/><Slider label="Exploration" value={explore} onChange={setExplore}/></div><Metrics items={runs.map((r,i)=>[["Adaptive","Greedy","Fixed"][i],r.at(-1)!.y.toFixed(1)])}/><section className="panel"><PanelHead title="Cumulative reward" tag="same environment"/><LineChart series={runs} labels={["adaptive","greedy","fixed"]}/></section><Interpret text="These are intentionally simple baselines. Reward and regret depend on the declared environment and should not be generalized beyond it." /></Lab>}

function PrivateData(){const [rows,setRows]=useState<string[][]>([["sleep","switches","load"],["7.2","12","4"],["6.1","22","7"],["8.0","9","3"]]);function load(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>setRows(String(reader.result).trim().split(/\r?\n/).map(r=>r.split(",")));reader.readAsText(f);}return <Lab title="Personal Data Import" kicker="Optional · private · local-only" description="Preview a small CSV in your browser. This demo does not upload, persist, diagnose, or recommend."><div className="privacy"><b>Your file stays on this device.</b><span>The browser reads it in memory; no API request is made.</span><label className="upload">Choose CSV<input type="file" accept=".csv,text/csv" onChange={load}/></label></div><section className="panel table-wrap"><table><tbody>{rows.slice(0,8).map((row,i)=><tr key={i}>{row.map((c,j)=>i===0?<th key={j}>{c}</th>:<td key={j}>{c}</td>)}</tr>)}</tbody></table></section><Interpret text="Any association is exploratory correlation only. It cannot establish causes, diagnoses, or treatment effects. Remove direct identifiers before analysis." /></Lab>}

function Lab({title,kicker,description,children}:{title:string;kicker:string;description:string;children:React.ReactNode}){return <div className="lab"><header className="lab-head"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div><div className="status"><i/> deterministic demo</div></header>{children}</div>}
function Metrics({items}:{items:string[][]}){return <div className="metrics">{items.map(([l,v])=><div key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>}
function PanelHead({title,tag}:{title:string;tag:string}){return <div className="panel-head"><h2>{title}</h2><span>{tag}</span></div>}
function Interpret({text}:{text:string}){return <aside className="interpret"><b>What this does not prove</b><p>{text}</p></aside>}

export function Studio(){const [active,setActive]=useState<Module>("flex");const content={flex:<Flexibility/>,loops:<StateLoops/>,automata:<Automata/>,info:<Information/>,agents:<Agents/>,data:<PrivateData/>}[active];return <main><aside className="rail"><div className="brand"><div className="mark">P/E</div><div><b>PCC / EBID</b><span>Research Studio</span></div></div><nav>{modules.map(m=><button key={m.id} className={active===m.id?"active":""} onClick={()=>setActive(m.id)}><span>{m.code}</span><b>{m.name}</b><small>{m.note}</small></button>)}</nav><div className="framework"><span>Source framework</span><b>Pressure · Chaos · Control</b><p>Entropy-Based Instability Dynamics</p></div></aside><section className="workspace"><div className="topbar"><span>Computational laboratory</span><div><i/> exploratory · non-clinical</div></div>{content}</section></main>}
