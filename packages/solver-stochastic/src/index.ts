import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/stochastic-v1",
  supportedStateTypes: ["random-source", "event-schedule", "sample"],
  supportedDimensions: [1, 2, 3],
  determinismPolicy: "seeded",
  checkpointCapability: "snapshot",
  workerCapability: "worker-compatible",
  precisionPolicy: "seeded pseudo-random stream with statistical diagnostics",
  inputSchema: "physica:stochastic-input-v1",
  outputSchema: "physica:stochastic-output-v1",
});
export interface RandomSnapshot {
  readonly state: number;
  readonly draws: number;
}
export class SeededRandom {
  private state: number;
  private drawsValue = 0;
  constructor(seed: number) {
    if (!Number.isSafeInteger(seed))
      throw new RangeError("Random seed must be a safe integer.");
    this.state = seed >>> 0 || 0x6d2b79f5;
  }
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    this.drawsValue += 1;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  snapshot(): RandomSnapshot {
    return Object.freeze({ state: this.state >>> 0, draws: this.drawsValue });
  }
  restore(snapshot: RandomSnapshot): void {
    if (
      !Number.isSafeInteger(snapshot.state) ||
      !Number.isSafeInteger(snapshot.draws) ||
      snapshot.draws < 0
    )
      throw new RangeError("Random snapshot is invalid.");
    this.state = snapshot.state >>> 0;
    this.drawsValue = snapshot.draws;
  }
}
export interface ScheduledRandomEvent {
  readonly sequenceId: number;
  readonly timeSeconds: number;
}
export function scheduleExponentialEvents(
  ratePerSecond: number,
  count: number,
  random: SeededRandom,
  startTimeSeconds = 0,
): readonly ScheduledRandomEvent[] {
  if (
    !Number.isFinite(ratePerSecond) ||
    ratePerSecond <= 0 ||
    !Number.isSafeInteger(count) ||
    count < 0 ||
    !Number.isFinite(startTimeSeconds)
  )
    throw new RangeError("Event schedule parameters are invalid.");
  let time = startTimeSeconds;
  const events: ScheduledRandomEvent[] = [];
  for (let i = 0; i < count; i += 1) {
    time += -Math.log(1 - random.next()) / ratePerSecond;
    events.push(Object.freeze({ sequenceId: i, timeSeconds: time }));
  }
  return Object.freeze(events);
}
export interface MonteCarloSummary {
  readonly samples: number;
  readonly mean: number;
  readonly sampleVariance: number;
  readonly standardError: number;
}
export function monteCarlo(
  samples: number,
  sample: () => number,
): MonteCarloSummary {
  if (!Number.isSafeInteger(samples) || samples < 2)
    throw new RangeError("Monte Carlo requires at least two samples.");
  let mean = 0;
  let m2 = 0;
  for (let i = 1; i <= samples; i += 1) {
    const value = sample();
    if (!Number.isFinite(value))
      throw new RangeError("Monte Carlo sample must be finite.");
    const delta = value - mean;
    mean += delta / i;
    m2 += delta * (value - mean);
  }
  const sampleVariance = m2 / (samples - 1);
  return Object.freeze({
    samples,
    mean,
    sampleVariance,
    standardError: Math.sqrt(sampleVariance / samples),
  });
}
