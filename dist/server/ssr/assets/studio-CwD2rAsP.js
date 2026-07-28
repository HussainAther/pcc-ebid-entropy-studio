import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/studio.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var views = [
	{
		id: "overview",
		index: "00",
		label: "Research map",
		note: "program state"
	},
	{
		id: "corpus",
		index: "01",
		label: "Literature corpus",
		note: "sources + methods"
	},
	{
		id: "graph",
		index: "02",
		label: "Knowledge graph",
		note: "claims + relations"
	},
	{
		id: "hypotheses",
		index: "03",
		label: "Hypothesis ledger",
		note: "testable questions"
	},
	{
		id: "experiments",
		index: "04",
		label: "Experiment design",
		note: "controls + metrics"
	},
	{
		id: "simulation",
		index: "05",
		label: "Simulation bench",
		note: "execute + compare"
	},
	{
		id: "review",
		index: "06",
		label: "Critical review",
		note: "claims + limitations"
	}
];
var claims = [
	{
		id: "C-012",
		text: "Cyclic non-transitive interactions can sustain oscillatory regimes.",
		evidence: "supported",
		source: "PCC replicator simulations",
		relation: "supports H-003"
	},
	{
		id: "C-018",
		text: "Entropy deficit is locally quadratic near the simplex equilibrium.",
		evidence: "established",
		source: "Taylor expansion",
		relation: "grounds EBID observable"
	},
	{
		id: "C-021",
		text: "Log entropy-deficit growth may recover twice the leading linear growth rate.",
		evidence: "hypothesis",
		source: "Archived numerical experiments",
		relation: "tested by E-007"
	},
	{
		id: "C-027",
		text: "The same observable remains informative across domain mappings.",
		evidence: "speculation",
		source: "Cross-domain manuscript notes",
		relation: "requires independent validation"
	}
];
var initialSources = [
	{
		name: "PCC / EBID framework README",
		type: "Markdown",
		status: "indexed"
	},
	{
		name: "Cyclic dissipative replicator manuscript",
		type: "LaTeX",
		status: "equations extracted"
	},
	{
		name: "EBID model implementations",
		type: "Python",
		status: "executable"
	},
	{
		name: "Spatial sweep results",
		type: "NPZ",
		status: "provenance partial"
	},
	{
		name: "Source limitations",
		type: "Markdown",
		status: "indexed"
	}
];
function Tag({ level }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `tag ${level}`,
		children: level
	});
}
function SectionHead({ eyebrow, title, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "section-head",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: eyebrow }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: title })] }), action]
	});
}
function Stat({ label, value, foot }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "stat",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: foot })
		]
	});
}
function Notice({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "notice",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children })]
	});
}
function Overview({ onNavigate }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "view",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hero",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "kicker",
						children: "Active research program · PCC / EBID"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
						"Can entropy make",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "instability observable?" })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A provenance-aware laboratory for moving from literature and mathematical claims to falsifiable computational experiments." })
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "question-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Primary question · Q-017" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Under what local conditions does an entropy-derived observable recover the dominant instability rate of a dynamical system?" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { level: "hypothesis" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "last revised 2026-07-15" })] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "stats",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Source artifacts",
						value: "3,344",
						foot: "archive audit"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Tracked claims",
						value: "28",
						foot: "4 need evidence"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Experiments",
						value: "07",
						foot: "3 reproducible"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Open questions",
						value: "12",
						foot: "human review required"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "paper",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
					eyebrow: "Research lifecycle",
					title: "From source material to reproducible evidence"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lifecycle",
					children: [
						[
							"01",
							"Corpus",
							"Extract methods, equations, assumptions",
							"corpus"
						],
						[
							"02",
							"Claims",
							"Connect statements to evidence",
							"graph"
						],
						[
							"03",
							"Hypotheses",
							"Define falsifiable alternatives",
							"hypotheses"
						],
						[
							"04",
							"Experiments",
							"Specify controls and metrics",
							"experiments"
						],
						[
							"05",
							"Results",
							"Execute without inventing outcomes",
							"simulation"
						],
						[
							"06",
							"Critique",
							"Stress-test interpretation",
							"review"
						]
					].map(([n, t, d, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => onNavigate(v),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: n }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: t }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: d })
						]
					}, n))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "two-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						eyebrow: "Evidence ledger",
						title: "Claims needing attention"
					}), claims.slice(2).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "claim",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: c.id }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { level: c.evidence })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: c.text }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: c.source })
						]
					}, c.id))]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						eyebrow: "Research principles",
						title: "Epistemic contract"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "principles",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Evidence over fluency." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Generated text is never promoted to a finding." })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Provenance by default." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Every claim points to a source or is marked unsupported." })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Falsifiability first." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Every hypothesis includes a possible disconfirming result." })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Human judgment remains central." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AI proposes and critiques; researchers decide." })] })
						]
					})]
				})]
			})
		]
	});
}
function Corpus() {
	const [sources, setSources] = (0, import_react.useState)(initialSources);
	function ingest(e) {
		const files = Array.from(e.target.files ?? []);
		setSources((s) => [...s, ...files.map((f) => ({
			name: f.name,
			type: f.name.split(".").pop()?.toUpperCase() || "file",
			status: "local · awaiting extraction"
		}))]);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "view",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
				eyebrow: "01 · Literature intelligence",
				title: "Research corpus",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "button",
					children: ["Add local artifacts", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "file",
						multiple: true,
						accept: ".pdf,.md,.txt,.tex,.bib,.csv,.json,.py",
						onChange: ingest
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "lede",
				children: "A local provenance index for papers, manuscripts, code, notes, datasets, and bibliographies. Adding a file records it in this browser session; it does not upload content."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "stats compact",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Indexed",
						value: String(sources.length),
						foot: "current session"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Equations",
						value: "14",
						foot: "human verification: 9"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Methods",
						value: "11",
						foot: "6 executable"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Citation gaps",
						value: "07",
						foot: "triage queue"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "paper",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "table-head",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Artifact" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Type" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Extraction state" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Provenance" })
					]
				}), sources.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "source-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: s.name }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: s.type }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: s.status }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: i < 5 ? "archive · read-only" : "local session" })
					]
				}, `${s.name}-${i}`))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "two-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						eyebrow: "Method extraction",
						title: "Detected computational methods"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "method-list",
						children: [
							"Cyclic replicator dynamics",
							"Simplex entropy and KL divergence",
							"Linear stability analysis",
							"Spatial lattice sweeps",
							"Pitchfork / Ginzburg–Landau system",
							"Log-growth regression"
						].map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: String(i + 1).padStart(2, "0") }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: m }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: i < 4 ? "code located" : "described in notes" })
						] }, m))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						eyebrow: "Caution queue",
						title: "Corpus-level issues"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "issue-list",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Generated figures substantially outnumber source scripts." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Several manuscript directories duplicate models and outputs." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Some cross-domain language exceeds current evidence." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Third-party PDFs require license review before redistribution." })
						]
					})]
				})]
			})
		]
	});
}
function Graph() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "view",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
				eyebrow: "02 · Scientific knowledge graph",
				title: "Claims, concepts, and evidence"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "lede",
				children: "The graph distinguishes conceptual mappings from mathematical relations. An edge is not evidence unless it links to a derivation, dataset, or experiment."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "graph-layout",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper graph",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "edges",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
						]
					}), [
						[
							"PCC",
							"framework",
							50,
							50
						],
						[
							"Pressure",
							"variable",
							20,
							24
						],
						[
							"Chaos",
							"variable",
							50,
							16
						],
						[
							"Control",
							"variable",
							80,
							24
						],
						[
							"Replicator",
							"method",
							25,
							72
						],
						[
							"Entropy deficit",
							"observable",
							55,
							78
						],
						[
							"Instability rate",
							"quantity",
							85,
							67
						],
						[
							"EBID",
							"framework",
							72,
							48
						]
					].map(([n, t, x, y]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: `node ${t}`,
						style: {
							left: `${x}%`,
							top: `${y}%`
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: n }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t })]
					}, n))]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper claim-ledger",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						eyebrow: "Claim ledger",
						title: "Evidence states"
					}), claims.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "claim",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: c.id }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { level: c.evidence })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: c.text }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: c.relation })
						]
					}, c.id))]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Notice, {
				title: "Graph interpretation",
				children: "Conceptual edges encode the research program’s current vocabulary. They should not be read as causal, biological, or universal claims without independent evidence."
			})
		]
	});
}
function Hypotheses() {
	const [selected, setSelected] = (0, import_react.useState)("H-003");
	const hs = [
		{
			id: "H-003",
			title: "Local entropy-growth correspondence",
			statement: "Near an unstable equilibrium, the log-growth slope of a locally quadratic entropy deficit equals twice the dominant real eigenvalue.",
			test: "Reject if the fitted slope differs from 2λ beyond preregistered tolerance across seeds and initial perturbations.",
			level: "hypothesis"
		},
		{
			id: "H-006",
			title: "Observable robustness",
			statement: "KL divergence and quadratic distance recover the same local growth exponent when both are smooth at the equilibrium.",
			test: "Reject if their confidence intervals do not overlap in the declared linear window.",
			level: "hypothesis"
		},
		{
			id: "H-011",
			title: "Cross-domain invariance",
			statement: "The same correspondence persists across replicator, physical, and learning toy systems.",
			test: "Currently underspecified: domain mapping and equivalence criteria require revision.",
			level: "speculation"
		}
	];
	const h = hs.find((x) => x.id === selected);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "view",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
				eyebrow: "03 · Hypothesis generator",
				title: "Testable hypothesis ledger"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "lede",
				children: "AI-assisted suggestions enter as candidates. Promotion requires a precise statement, assumptions, alternatives, and a disconfirming outcome."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hyp-layout",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hyp-list",
					children: hs.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: selected === x.id ? "active" : "",
						onClick: () => setSelected(x.id),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: x.id }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: x.title }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { level: x.level })
						]
					}, x.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper protocol",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "protocol-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: h.id }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { level: h.level })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: h.title }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Formal statement" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: h.statement }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "equation",
							children: [
								"d/dt log ΔS(t) ≈ 2 Re(λ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "max" }),
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Assumptions" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Trajectory remains in a declared local neighborhood." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Observable is smooth and locally quadratic." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "The leading unstable mode is excited by the initial condition." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Fit window is selected before outcome inspection." })
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: "Disconfirming outcome" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: h.test }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "provenance",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Derived from" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "C-018 · C-021 · archived `ebid_models.py`" })]
						})
					]
				})]
			})
		]
	});
}
function Experiments() {
	const [seed, setSeed] = (0, import_react.useState)(42), [epsilon, setEpsilon] = (0, import_react.useState)(.05), [window, setWindow] = (0, import_react.useState)(8);
	const manifest = {
		experiment_id: "E-007",
		hypothesis_id: "H-003",
		model: "cyclic_dissipative_replicator",
		seed,
		epsilon,
		fit_window: [0, window],
		observables: [
			"shannon_deficit",
			"kl_to_equilibrium",
			"quadratic_distance"
		],
		controls: [
			"stable ε < 0",
			"neutral ε = 0",
			"bad observable |x₀|"
		],
		primary_metric: "absolute slope error |β̂ − 2λ|max"
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "view",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
				eyebrow: "04 · Experiment planner",
				title: "Pre-execution protocol E-007"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "lede",
				children: "Parameters, controls, analysis windows, and failure criteria are fixed before a result is generated."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "experiment-layout",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper form",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Design variables" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Random seed ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: seed })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: "1",
							max: "99",
							value: seed,
							onChange: (e) => setSeed(+e.target.value)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Instability ε ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: epsilon.toFixed(3) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: ".005",
							max: ".15",
							step: ".005",
							value: epsilon,
							onChange: (e) => setEpsilon(+e.target.value)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Fit-window end ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: ["t = ", window] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: "2",
							max: "20",
							value: window,
							onChange: (e) => setWindow(+e.target.value)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Required comparisons" }),
						manifest.controls.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "check",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								defaultChecked: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c })]
						}, c)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Notice, {
							title: "No result yet",
							children: "This is a protocol, not an outcome. Expected behavior is not recorded as observed behavior."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper manifest",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "manifest-head",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reproducibility manifest" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "YAML / JSON ready" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: JSON.stringify(manifest, null, 2) })]
				})]
			})
		]
	});
}
function caStep(row, rule) {
	return row.map((_, i) => {
		return rule >> (row[(i - 1 + row.length) % row.length] << 2 | row[i] << 1 | row[(i + 1) % row.length]) & 1;
	});
}
function Simulation() {
	const [rule, setRule] = (0, import_react.useState)(110), [time, setTime] = (0, import_react.useState)(8), [run, setRun] = (0, import_react.useState)(1);
	const result = (0, import_react.useMemo)(() => {
		const w = 96, steps = 64;
		let a = Array(w).fill(0), b = Array(w).fill(0);
		a[48] = 1;
		b[48] = 1;
		const diff = [];
		const h = [];
		for (let t = 0; t < steps; t++) {
			if (t === time) b[43] ^= 1;
			const d = a.map((v, i) => v ^ b[i]);
			diff.push(d);
			h.push(d.reduce((x, y) => x + y, 0) / w);
			a = caStep(a, rule);
			b = caStep(b, rule);
		}
		return {
			diff,
			h,
			final: h.at(-1) ?? 0,
			max: Math.max(...h)
		};
	}, [rule, time]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "view",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
				eyebrow: "05 · Scientific simulation library",
				title: "Perturbation experiment",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "button",
					onClick: () => setRun((r) => r + 1),
					children: "Execute deterministic run"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "lede",
				children: "A transparent cellular-automata benchmark for exact trajectory divergence. This formal system is a methods testbed, not evidence for a cognitive or biological claim."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sim-controls",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Wolfram rule ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						min: "0",
						max: "255",
						value: rule,
						onChange: (e) => setRule(Math.max(0, Math.min(255, +e.target.value)))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Perturbation time ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						min: "1",
						max: "50",
						value: time,
						onChange: (e) => setTime(Math.max(1, Math.min(50, +e.target.value)))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Run ID ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
						"CA-",
						rule,
						"-",
						time,
						"-",
						run
					] })] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "stats compact",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Final Hamming",
						value: result.final.toFixed(3),
						foot: "exact difference"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Maximum Hamming",
						value: result.max.toFixed(3),
						foot: "over 64 steps"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Restoration",
						value: (1 - result.final).toFixed(3),
						foot: "exact coefficient"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Seed",
						value: "single center",
						foot: "periodic boundary"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "paper",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "figure-head",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Figure E-CA-01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "XOR difference trajectory" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "amber = control ≠ perturbation" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ca",
						children: result.diff.flatMap((row, y) => row.map((v, x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: v ? "on" : "" }, `${x}-${y}`)))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "caption",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Methods." }), " Elementary CA with periodic boundary, one-bit perturbation at the declared step, and cellwise XOR comparison. Normalized Hamming distance is the divergent-cell fraction."]
					})
				]
			})
		]
	});
}
function Review() {
	const checks = [
		["Unsupported universality language", "“Domain-independent” is stronger than the current toy-model evidence."],
		["Fit-window researcher degrees of freedom", "Window selection must be preregistered or sensitivity-tested."],
		["Observable-selection bias", "Positive results across three related deficits do not establish robustness to arbitrary observables."],
		["Finite-size and saturation effects", "Local slope claims should be separated from nonlinear late-time regimes."],
		["Missing independent reproduction", "Most evidence currently originates inside the same research program."]
	];
	const [resolved, setResolved] = (0, import_react.useState)([]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "view",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
				eyebrow: "06 · AI-assisted paper review",
				title: "Critical review queue"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "lede",
				children: "A structured adversarial reading of the current entropy–instability argument. The reviewer proposes concerns; a human author adjudicates them."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "review-summary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "B" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Methodological readiness" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The computational idea is testable and promising, but generality claims exceed the present validation set. A stronger paper would narrow the main claim and expand adversarial controls." })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "paper review-list",
				children: checks.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: resolved.includes(i) ? "resolved" : "",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							"aria-label": "Toggle resolved",
							onClick: () => setResolved((r) => r.includes(i) ? r.filter((x) => x !== i) : [...r, i]),
							children: resolved.includes(i) ? "✓" : "!"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"R",
								String(i + 1).padStart(2, "0"),
								" · major concern"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: c[0] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: c[1] })
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { level: i === 0 || i === 4 ? "speculation" : "hypothesis" })
					]
				}, c[0]))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "two-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						eyebrow: "Required revision",
						title: "Minimum convincing package"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "issue-list",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Preregister slope-estimation windows and tolerances." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Report failures alongside successful observables." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Run initial-condition and seed sensitivity analyses." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Separate theorem, numerical evidence, and analogy." })
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						eyebrow: "Reviewer questions",
						title: "Questions for the authors"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "issue-list",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "What class of entropy-like functionals is admissible?" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "How is equilibrium chosen outside the simplex model?" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "What observation would falsify the proposed correspondence?" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Which result has been reproduced independently?" })
						]
					})]
				})]
			})
		]
	});
}
function Studio() {
	const [view, setView] = (0, import_react.useState)("overview");
	const content = {
		overview: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overview, { onNavigate: setView }),
		corpus: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Corpus, {}),
		graph: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Graph, {}),
		hypotheses: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hypotheses, {}),
		experiments: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Experiments, {}),
		simulation: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Simulation, {}),
		review: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Review, {})
	}[view];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mast",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "identity",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PCC / EBID" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "AI Research Laboratory" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mission",
						children: [
							"AI-assisted scientific discovery ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "·" }),
							" evidence over speculation"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lab-status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " local research state"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "sidebar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "program",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Research program" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Structured instability" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Program revision 0.2" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { children: views.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: view === v.id ? "active" : "",
						onClick: () => setView(v.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: v.index }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: v.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: v.note })] })]
					}, v.id)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "scope",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Epistemic status" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Exploratory research" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
								"Not clinical · not authoritative",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"No fabricated results"
							] })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "content",
				children: [content, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PCC provides a proposed structure. EBID provides candidate observables." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "All AI contributions require human verification." })] })]
			})
		]
	});
}
//#endregion
export { Studio };
