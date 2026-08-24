export interface EcaRun {
  rule: number;
  width: number;
  steps: number;
  initial: number[];
  trajectory: number[][];
}

export function validateEcaRule(rule: number) {
  if (!Number.isInteger(rule) || rule < 0 || rule > 255) throw new Error("ECA rule must be an integer from 0 through 255.");
}

export function ecaNextState(state: number[], rule: number): number[] {
  validateEcaRule(rule);
  if (!state.length) return [];
  return state.map((_, index) => {
    const left = state[(index - 1 + state.length) % state.length] ? 1 : 0;
    const center = state[index] ? 1 : 0;
    const right = state[(index + 1) % state.length] ? 1 : 0;
    const neighborhood = (left << 2) | (center << 1) | right;
    return (rule >> neighborhood) & 1;
  });
}

export function runElementaryCA(rule: number, initial: number[], steps: number): EcaRun {
  validateEcaRule(rule);
  const normalized: number[] = initial.map(value => value ? 1 : 0);
  const trajectory = [normalized];
  for (let step = 1; step < steps; step += 1) trajectory.push(ecaNextState(trajectory.at(-1) ?? [], rule));
  return { rule, width: normalized.length, steps, initial: normalized, trajectory };
}

export function binaryEntropy(state: number[]): number {
  if (!state.length) return 0;
  const p = state.reduce((sum, value) => sum + (value ? 1 : 0), 0) / state.length;
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log(p) - (1 - p) * Math.log(1 - p);
}

export function normalizedHamming(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let different = 0;
  for (let i = 0; i < n; i += 1) if ((a[i] ? 1 : 0) !== (b[i] ? 1 : 0)) different += 1;
  return different / n;
}

export function singleCellPerturbation(initial: number[], index = Math.floor(initial.length / 2)): number[] {
  const perturbed = initial.map(value => value ? 1 : 0);
  if (perturbed.length) perturbed[((index % perturbed.length) + perturbed.length) % perturbed.length] ^= 1;
  return perturbed;
}

export function ecaInstabilitySignature(rule: number, initial: number[], steps: number) {
  const base = runElementaryCA(rule, initial, steps);
  const perturbed = runElementaryCA(rule, singleCellPerturbation(initial), steps);
  const entropySeries = base.trajectory.map(binaryEntropy);
  const hammingSeries = base.trajectory.map((state, index) => normalizedHamming(state, perturbed.trajectory[index] ?? []));
  const tailStart = Math.max(0, Math.floor(steps * 0.75));
  const tail = <T,>(values: T[]) => values.slice(tailStart);
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return {
    rule,
    meanEntropy: mean(tail(entropySeries)),
    terminalEntropy: entropySeries.at(-1) ?? 0,
    meanPerturbationDistance: mean(tail(hammingSeries)),
    terminalPerturbationDistance: hammingSeries.at(-1) ?? 0,
    entropySeries,
    hammingSeries,
  };
}

/** Hamming distance between the two 8-bit ECA transition tables, normalized to [0, 1]. */
export function ecaRuleTableDistance(a: number, b: number): number {
  validateEcaRule(a);
  validateEcaRule(b);
  let difference = (a ^ b) & 0xff;
  let bits = 0;
  while (difference) {
    bits += difference & 1;
    difference >>>= 1;
  }
  return bits / 8;
}

/** The eight ECA rules reachable by flipping exactly one transition-table output bit. */
export function ecaOneBitNeighbors(rule: number): number[] {
  validateEcaRule(rule);
  return Array.from({ length: 8 }, (_, bit) => rule ^ (1 << bit));
}

/**
 * Fixed binary run-length codec used only as a transparent compression proxy.
 * The ratio is encoded-symbol count / raw-symbol count and may exceed 1.
 */
export function binaryRunLengthCompressionRatio(trajectory: number[][]): number {
  const symbols = trajectory.flat();
  if (!symbols.length) return 0;
  let runs = 1;
  for (let index = 1; index < symbols.length; index += 1) {
    if ((symbols[index] ? 1 : 0) !== (symbols[index - 1] ? 1 : 0)) runs += 1;
  }
  return (2 * runs) / symbols.length;
}
