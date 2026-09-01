import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/ode-v1",
  supportedStateTypes: ["numeric-vector"],
  supportedDimensions: [1, 2, 3],
  determinismPolicy: "strict",
  checkpointCapability: "snapshot",
  workerCapability: "worker-compatible",
  precisionPolicy: "fixed or adaptive explicit tolerance",
  inputSchema: "physica:ode-input-v1",
  outputSchema: "physica:ode-step-result-v1",
});
export type OdeState = readonly number[];
export type Derivative = (timeSeconds: number, state: OdeState) => OdeState;
export type Acceleration = (
  timeSeconds: number,
  position: OdeState,
  velocity: OdeState,
) => OdeState;
export interface OdeStepResult {
  readonly timeSeconds: number;
  readonly state: OdeState;
  readonly acceptedSteps: number;
  readonly rejectedSteps: number;
  readonly errorEstimate: number;
  readonly converged: boolean;
}
function check(state: OdeState, label = "state"): number[] {
  if (state.length === 0 || state.some((value) => !Number.isFinite(value)))
    throw new RangeError(label + " must be a non-empty finite vector.");
  return [...state];
}
function add(a: OdeState, b: OdeState, scale: number): number[] {
  if (a.length !== b.length)
    throw new RangeError("ODE vector dimensions do not match.");
  return a.map((value, i) => value + scale * b[i]!);
}
export function semiImplicitEuler(
  position: OdeState,
  velocity: OdeState,
  acceleration: Acceleration,
  timeSeconds: number,
  stepSeconds: number,
) {
  const p = check(position, "position");
  const v = check(velocity, "velocity");
  if (
    p.length !== v.length ||
    !Number.isFinite(stepSeconds) ||
    stepSeconds <= 0
  )
    throw new RangeError("Euler step input is invalid.");
  const nextVelocity = add(
    v,
    check(acceleration(timeSeconds, p, v), "acceleration"),
    stepSeconds,
  );
  return Object.freeze({
    position: Object.freeze(add(p, nextVelocity, stepSeconds)),
    velocity: Object.freeze(nextVelocity),
  });
}
export function velocityVerlet(
  position: OdeState,
  velocity: OdeState,
  acceleration: Acceleration,
  timeSeconds: number,
  stepSeconds: number,
) {
  const p = check(position, "position");
  const v = check(velocity, "velocity");
  const a0 = check(acceleration(timeSeconds, p, v), "acceleration");
  if (p.length !== v.length || a0.length !== p.length || stepSeconds <= 0)
    throw new RangeError("Verlet step input is invalid.");
  const nextPosition = p.map(
    (value, i) => value + v[i]! * stepSeconds + 0.5 * a0[i]! * stepSeconds ** 2,
  );
  const predictedVelocity = add(v, a0, stepSeconds);
  const a1 = check(
    acceleration(timeSeconds + stepSeconds, nextPosition, predictedVelocity),
    "acceleration",
  );
  const nextVelocity = v.map(
    (value, i) => value + 0.5 * (a0[i]! + a1[i]!) * stepSeconds,
  );
  return Object.freeze({
    position: Object.freeze(nextPosition),
    velocity: Object.freeze(nextVelocity),
  });
}
export function rk4(
  derivative: Derivative,
  state: OdeState,
  timeSeconds: number,
  stepSeconds: number,
): OdeStepResult {
  const y = check(state);
  if (
    !Number.isFinite(timeSeconds) ||
    !Number.isFinite(stepSeconds) ||
    stepSeconds <= 0
  )
    throw new RangeError("RK4 step input is invalid.");
  const k1 = check(derivative(timeSeconds, y), "derivative");
  const k2 = check(
    derivative(timeSeconds + stepSeconds / 2, add(y, k1, stepSeconds / 2)),
    "derivative",
  );
  const k3 = check(
    derivative(timeSeconds + stepSeconds / 2, add(y, k2, stepSeconds / 2)),
    "derivative",
  );
  const k4 = check(
    derivative(timeSeconds + stepSeconds, add(y, k3, stepSeconds)),
    "derivative",
  );
  if ([k1, k2, k3, k4].some((k) => k.length !== y.length))
    throw new RangeError("Derivative dimension does not match state.");
  const next = y.map(
    (value, i) =>
      value + (stepSeconds * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!)) / 6,
  );
  return Object.freeze({
    timeSeconds: timeSeconds + stepSeconds,
    state: Object.freeze(next),
    acceptedSteps: 1,
    rejectedSteps: 0,
    errorEstimate: 0,
    converged: true,
  });
}
export interface AdaptiveOptions {
  readonly absoluteTolerance?: number;
  readonly relativeTolerance?: number;
  readonly initialStepSeconds?: number;
  readonly minimumStepSeconds?: number;
  readonly maximumStepSeconds?: number;
  readonly maxSteps?: number;
}
function combine(
  base: OdeState,
  step: number,
  terms: readonly (readonly [number, OdeState])[],
): number[] {
  return base.map(
    (value, i) =>
      value +
      step *
        terms.reduce(
          (sum, [coefficient, vector]) => sum + coefficient * vector[i]!,
          0,
        ),
  );
}
export function rk45Adaptive(
  derivative: Derivative,
  initialState: OdeState,
  fromTimeSeconds: number,
  toTimeSeconds: number,
  options: AdaptiveOptions = {},
): OdeStepResult {
  let y = check(initialState);
  if (
    ![fromTimeSeconds, toTimeSeconds].every(Number.isFinite) ||
    toTimeSeconds < fromTimeSeconds
  )
    throw new RangeError("RK45 interval is invalid.");
  const atol = options.absoluteTolerance ?? 1e-9;
  const rtol = options.relativeTolerance ?? 1e-7;
  const minStep = options.minimumStepSeconds ?? 1e-8;
  const maxStep =
    options.maximumStepSeconds ??
    Math.max(minStep, toTimeSeconds - fromTimeSeconds || minStep);
  const maxSteps = options.maxSteps ?? 100_000;
  let h = Math.min(options.initialStepSeconds ?? maxStep / 10, maxStep);
  if (
    ![atol, rtol, minStep, maxStep, h].every(Number.isFinite) ||
    atol <= 0 ||
    rtol <= 0 ||
    minStep <= 0 ||
    maxStep < minStep ||
    h <= 0 ||
    !Number.isSafeInteger(maxSteps) ||
    maxSteps < 1
  )
    throw new RangeError("RK45 tolerance or step policy is invalid.");
  let time = fromTimeSeconds;
  let accepted = 0;
  let rejected = 0;
  let lastError = 0;
  while (time < toTimeSeconds && accepted + rejected < maxSteps) {
    h = Math.min(h, toTimeSeconds - time);
    const k1 = check(derivative(time, y));
    const k2 = check(derivative(time + h / 5, combine(y, h, [[1 / 5, k1]])));
    const k3 = check(
      derivative(
        time + (3 * h) / 10,
        combine(y, h, [
          [3 / 40, k1],
          [9 / 40, k2],
        ]),
      ),
    );
    const k4 = check(
      derivative(
        time + (4 * h) / 5,
        combine(y, h, [
          [44 / 45, k1],
          [-56 / 15, k2],
          [32 / 9, k3],
        ]),
      ),
    );
    const k5 = check(
      derivative(
        time + (8 * h) / 9,
        combine(y, h, [
          [19372 / 6561, k1],
          [-25360 / 2187, k2],
          [64448 / 6561, k3],
          [-212 / 729, k4],
        ]),
      ),
    );
    const k6 = check(
      derivative(
        time + h,
        combine(y, h, [
          [9017 / 3168, k1],
          [-355 / 33, k2],
          [46732 / 5247, k3],
          [49 / 176, k4],
          [-5103 / 18656, k5],
        ]),
      ),
    );
    const k7 = check(
      derivative(
        time + h,
        combine(y, h, [
          [35 / 384, k1],
          [500 / 1113, k3],
          [125 / 192, k4],
          [-2187 / 6784, k5],
          [11 / 84, k6],
        ]),
      ),
    );
    const fifth = combine(y, h, [
      [35 / 384, k1],
      [500 / 1113, k3],
      [125 / 192, k4],
      [-2187 / 6784, k5],
      [11 / 84, k6],
    ]);
    const fourth = combine(y, h, [
      [5179 / 57600, k1],
      [7571 / 16695, k3],
      [393 / 640, k4],
      [-92097 / 339200, k5],
      [187 / 2100, k6],
      [1 / 40, k7],
    ]);
    lastError = Math.max(
      ...fifth.map(
        (value, i) =>
          Math.abs(value - fourth[i]!) /
          (atol + rtol * Math.max(Math.abs(y[i]!), Math.abs(value))),
      ),
    );
    if (lastError <= 1 || h <= minStep) {
      y = fifth;
      time += h;
      accepted += 1;
    } else rejected += 1;
    const factor =
      lastError === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * lastError ** -0.2));
    h = Math.min(maxStep, Math.max(minStep, h * factor));
  }
  return Object.freeze({
    timeSeconds: time,
    state: Object.freeze(y),
    acceptedSteps: accepted,
    rejectedSteps: rejected,
    errorEstimate: lastError,
    converged: time >= toTimeSeconds,
  });
}
