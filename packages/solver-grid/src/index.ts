import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/grid-v1",
  supportedStateTypes: ["scalar-grid", "complex-grid"],
  supportedDimensions: [1, 2, 3],
  determinismPolicy: "strict",
  checkpointCapability: "snapshot",
  workerCapability: "worker-compatible",
  precisionPolicy: "explicit grid spacing and stability diagnostics",
  inputSchema: "physica:grid-input-v1",
  outputSchema: "physica:grid-state-v1",
});
export type GridBoundary = "fixed" | "reflecting" | "periodic";
export interface ScalarGrid1D {
  readonly spacing: number;
  readonly values: readonly number[];
}
export interface ComplexCell {
  readonly real: number;
  readonly imaginary: number;
}
export interface ComplexGrid1D {
  readonly spacing: number;
  readonly values: readonly ComplexCell[];
}
export interface WaveGridState {
  readonly displacement: ScalarGrid1D;
  readonly previous: ScalarGrid1D;
  readonly timeSeconds: number;
}
export interface GridDiagnostic {
  readonly courantNumber: number;
  readonly stable: boolean;
  readonly energyProxy: number;
}
export function scalarGrid1D(
  values: readonly number[],
  spacing: number,
): ScalarGrid1D {
  if (
    values.length < 3 ||
    values.some((v) => !Number.isFinite(v)) ||
    !Number.isFinite(spacing) ||
    spacing <= 0
  )
    throw new RangeError(
      "Scalar grid requires finite values and positive spacing.",
    );
  return Object.freeze({ spacing, values: Object.freeze([...values]) });
}
export function complexGrid1D(
  values: readonly ComplexCell[],
  spacing: number,
): ComplexGrid1D {
  if (
    values.length < 3 ||
    values.some((v) => ![v.real, v.imaginary].every(Number.isFinite)) ||
    spacing <= 0
  )
    throw new RangeError("Complex grid is invalid.");
  return Object.freeze({
    spacing,
    values: Object.freeze(values.map((v) => Object.freeze({ ...v }))),
  });
}
export function stepWaveEquation1D(
  state: WaveGridState,
  waveSpeed: number,
  dt: number,
  boundary: GridBoundary,
) {
  if (![waveSpeed, dt].every(Number.isFinite) || waveSpeed < 0 || dt <= 0)
    throw new RangeError("Wave step parameters are invalid.");
  const current = state.displacement.values;
  const previous = state.previous.values;
  if (
    current.length !== previous.length ||
    state.displacement.spacing !== state.previous.spacing
  )
    throw new RangeError("Wave grid shapes do not match.");
  const c = (waveSpeed * dt) / state.displacement.spacing;
  if (c > 1)
    throw new RangeError(
      "Explicit wave step violates the Courant stability condition.",
    );
  const next = current.map((value, i) => {
    if (boundary === "fixed" && (i === 0 || i === current.length - 1)) return 0;
    const left =
      i === 0
        ? boundary === "periodic"
          ? current[current.length - 1]!
          : current[1]!
        : current[i - 1]!;
    const right =
      i === current.length - 1
        ? boundary === "periodic"
          ? current[0]!
          : current[current.length - 2]!
        : current[i + 1]!;
    return 2 * value - previous[i]! + c * c * (left - 2 * value + right);
  });
  const nextState = Object.freeze({
    displacement: scalarGrid1D(next, state.displacement.spacing),
    previous: state.displacement,
    timeSeconds: state.timeSeconds + dt,
  });
  const energyProxy = next.reduce(
    (sum, value, i) => sum + (value - current[i]!) ** 2,
    0,
  );
  return Object.freeze({
    state: nextState,
    diagnostic: Object.freeze({ courantNumber: c, stable: true, energyProxy }),
  });
}
