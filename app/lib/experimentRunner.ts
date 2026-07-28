import type {
  ExperimentDefinition,
  ExperimentRun,
  ObservableDefinition,
  ObservableResult,
} from "../models/research";

export interface RunRequest {
  experiment: ExperimentDefinition;
  observables: ObservableDefinition[];
  seed: number;
  epsilon: number;
  fitWindowEnd: number;
  steps?: number;
  dt?: number;
  projectRevision: string;
  projectId: string;
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function entropy(values: number[]): number {
  return -values.reduce((sum, value) => sum + (value > 0 ? value * Math.log(value) : 0), 0);
}

function linearSlope(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return Number.NaN;
  const meanX = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  return denominator === 0 ? Number.NaN : numerator / denominator;
}

function integrateReplicator(seed: number, epsilon: number, steps: number, dt: number) {
  const random = mulberry32(seed);
  const perturbation = Array.from({ length: 3 }, () => random() - 0.5);
  const mean = perturbation.reduce((a, b) => a + b, 0) / 3;
  let state = perturbation.map(value => Math.max(1e-6, 1 / 3 + 0.025 * (value - mean)));
  const normalize = (x: number[]) => {
    const total = x.reduce((a, b) => a + b, 0);
    return x.map(value => Math.max(1e-12, value / total));
  };
  state = normalize(state);

  const times: number[] = [];
  const deficits: number[] = [];
  const kls: number[] = [];
  const quadratic: number[] = [];
  const states: number[][] = [];
  const equilibrium = [1 / 3, 1 / 3, 1 / 3];
  const hEq = Math.log(3);

  for (let step = 0; step < steps; step += 1) {
    const t = step * dt;
    times.push(t);
    states.push([...state]);
    const h = entropy(state);
    deficits.push(Math.max(1e-14, hEq - h));
    kls.push(state.reduce((sum, value) => sum + value * Math.log(value / (1 / 3)), 0));
    quadratic.push(state.reduce((sum, value, i) => sum + (value - equilibrium[i]) ** 2, 0));

    const [x, y, z] = state;
    const payoff = [y - z + epsilon * x, z - x + epsilon * y, x - y + epsilon * z];
    const average = x * payoff[0] + y * payoff[1] + z * payoff[2];
    state = normalize(state.map((value, i) => value + dt * value * (payoff[i] - average)));
  }

  return { times, deficits, kls, quadratic, states };
}

export function executeExperimentRun(request: RunRequest): ExperimentRun {
  const startedAt = new Date().toISOString();
  const steps = request.steps ?? 240;
  const dt = request.dt ?? 0.05;
  const trajectory = integrateReplicator(request.seed, request.epsilon, steps, dt);
  const fitCount = Math.max(3, Math.min(trajectory.times.length, Math.floor(request.fitWindowEnd / dt) + 1));
  const fitTimes = trajectory.times.slice(0, fitCount);
  const logDeficit = trajectory.deficits.slice(0, fitCount).map(value => Math.log(value));
  const betaHat = linearSlope(fitTimes, logDeficit);
  const expected = 2 * request.epsilon;
  const absoluteError = Math.abs(betaHat - expected);
  const tolerance = Math.max(0.025, Math.abs(expected) * 0.35);
  const conclusion = Number.isFinite(betaHat)
    ? absoluteError <= tolerance ? "supports" : "challenges"
    : "inconclusive";

  const resultByObservable: Record<string, ObservableResult> = {
    "OBS-DEFICIT": {
      id: `RES-${request.seed}-DEFICIT`, observableId: "OBS-DEFICIT",
      value: trajectory.deficits.at(-1) ?? Number.NaN, computationTimeMs: 1,
      metadata: { sampleCount: steps, terminalTime: trajectory.times.at(-1) ?? 0 },
    },
    "OBS-KL": {
      id: `RES-${request.seed}-KL`, observableId: "OBS-KL",
      value: trajectory.kls.at(-1) ?? Number.NaN, computationTimeMs: 1,
      metadata: { sampleCount: steps, terminalTime: trajectory.times.at(-1) ?? 0 },
    },
    "OBS-QUADRATIC": {
      id: `RES-${request.seed}-QUADRATIC`, observableId: "OBS-QUADRATIC",
      value: trajectory.quadratic.at(-1) ?? Number.NaN, computationTimeMs: 1,
      metadata: { sampleCount: steps, terminalTime: trajectory.times.at(-1) ?? 0 },
    },
    "OBS-LOG-SLOPE": {
      id: `RES-${request.seed}-LOG-SLOPE`, observableId: "OBS-LOG-SLOPE",
      value: betaHat, unit: "time^-1", confidence: Math.max(0, 1 - absoluteError / Math.max(tolerance * 2, 1e-9)), computationTimeMs: 1,
      metadata: { expected, absoluteError, tolerance, fitWindowEnd: request.fitWindowEnd },
    },
  };

  const observableResults = request.experiment.observableIds
    .map(id => resultByObservable[id])
    .filter((result): result is ObservableResult => Boolean(result));
  const completedAt = new Date().toISOString();
  const runId = `RUN-${request.experiment.id}-${request.seed}-${Date.now()}`;

  return {
    id: runId,
    experimentId: request.experiment.id,
    hypothesisId: request.experiment.hypothesisId,
    status: "completed",
    startedAt,
    completedAt,
    parameters: { epsilon: request.epsilon, fitWindowEnd: request.fitWindowEnd, steps, dt },
    randomSeed: request.seed,
    measurements: [
      { id: `${runId}-M-DEFICIT`, name: "Entropy deficit", values: trajectory.deficits, timestamps: trajectory.times, description: "H(eq) - H(x(t))" },
      { id: `${runId}-M-KL`, name: "KL divergence", values: trajectory.kls, timestamps: trajectory.times },
      { id: `${runId}-M-QUAD`, name: "Quadratic distance", values: trajectory.quadratic, timestamps: trajectory.times },
    ],
    observableResults,
    conclusion,
    conclusionRationale: Number.isFinite(betaHat)
      ? `Estimated beta=${betaHat.toFixed(4)} versus preregistered target 2epsilon=${expected.toFixed(4)}; absolute error ${absoluteError.toFixed(4)} with tolerance ${tolerance.toFixed(4)}.`
      : "The log-slope estimator did not return a finite value in the preregistered window.",
    notes: [
      "Deterministic local runner; identical parameters and seed reproduce the same trajectory.",
      "This run is computational evidence for the declared toy model only.",
    ],
    provenance: {
      engine: "entropy-studio-replicator-runner",
      engineVersion: "0.1.0",
      observableRegistryVersion: "0.1.0",
      sourceRevision: request.projectRevision,
      createdAt: completedAt,
      deterministic: true,
    },
    projectId: request.projectId,
  };
}
