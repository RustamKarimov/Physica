import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/analytical-v1",
  supportedStateTypes: ["scalar", "vector", "record"],
  supportedDimensions: [1, 2, 3],
  determinismPolicy: "strict",
  checkpointCapability: "none",
  workerCapability: "main-thread",
  precisionPolicy: "IEEE-754 exact-expression evaluation",
  inputSchema: "physica:analytical-input-v1",
  outputSchema: "physica:analytical-output-v1",
});
export interface AnalyticalEvaluation<S, O> {
  readonly state: Readonly<S>;
  readonly observables: Readonly<O>;
  readonly timeSeconds: number;
}
export interface AnalyticalModel<P, S, O> {
  readonly solverTypeId: "physica:solver/analytical-v1";
  evaluate(parameters: Readonly<P>, timeSeconds: number): S;
  observe(state: Readonly<S>, parameters: Readonly<P>): O;
}
export function evaluateAnalytically<P, S, O>(
  model: AnalyticalModel<P, S, O>,
  parameters: Readonly<P>,
  timeSeconds: number,
): AnalyticalEvaluation<S, O> {
  if (!Number.isFinite(timeSeconds))
    throw new RangeError("Analytical evaluation time must be finite.");
  const state = model.evaluate(parameters, timeSeconds);
  return Object.freeze({
    state,
    observables: model.observe(state, parameters),
    timeSeconds,
  });
}
export function constantAcceleration1D(
  initialPosition: number,
  initialVelocity: number,
  acceleration: number,
  timeSeconds: number,
) {
  for (const [name, value] of Object.entries({
    initialPosition,
    initialVelocity,
    acceleration,
    timeSeconds,
  }))
    if (!Number.isFinite(value))
      throw new RangeError(name + " must be finite.");
  return Object.freeze({
    position:
      initialPosition +
      initialVelocity * timeSeconds +
      0.5 * acceleration * timeSeconds ** 2,
    velocity: initialVelocity + acceleration * timeSeconds,
    acceleration,
  });
}
