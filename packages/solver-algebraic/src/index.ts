import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/algebraic-v1",
  supportedStateTypes: ["scalar", "vector", "matrix"],
  supportedDimensions: [1, 2, 3],
  determinismPolicy: "strict",
  checkpointCapability: "none",
  workerCapability: "worker-compatible",
  precisionPolicy: "explicit tolerance and residual",
  inputSchema: "physica:algebraic-input-v1",
  outputSchema: "physica:numerical-solution-v1",
});
export interface NumericalDiagnostic {
  readonly converged: boolean;
  readonly iterations: number;
  readonly residual: number;
  readonly message: string;
}
export interface NumericalSolution<T> {
  readonly value: T;
  readonly diagnostic: NumericalDiagnostic;
}
export interface RootOptions {
  readonly absoluteTolerance?: number;
  readonly maxIterations?: number;
}
export function findBracketedRoot(
  fn: (x: number) => number,
  lower: number,
  upper: number,
  options: RootOptions = {},
): NumericalSolution<number> {
  const tolerance = options.absoluteTolerance ?? 1e-12;
  const maxIterations = options.maxIterations ?? 100;
  if (
    ![lower, upper, tolerance].every(Number.isFinite) ||
    lower >= upper ||
    tolerance <= 0
  )
    throw new RangeError("Root bracket and tolerance are invalid.");
  let a = lower;
  let b = upper;
  let fa = fn(a);
  const fb = fn(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0)
    throw new RangeError(
      "Root function must be finite and change sign across the bracket.",
    );
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const midpoint = (a + b) / 2;
    const fm = fn(midpoint);
    if (!Number.isFinite(fm))
      throw new RangeError("Root function returned a non-finite value.");
    if (Math.abs(fm) <= tolerance || (b - a) / 2 <= tolerance)
      return Object.freeze({
        value: midpoint,
        diagnostic: Object.freeze({
          converged: true,
          iterations: iteration + 1,
          residual: Math.abs(fm),
          message: "Bracketed root converged.",
        }),
      });
    if (fa * fm <= 0) b = midpoint;
    else {
      a = midpoint;
      fa = fm;
    }
  }
  const value = (a + b) / 2;
  return Object.freeze({
    value,
    diagnostic: Object.freeze({
      converged: false,
      iterations: maxIterations,
      residual: Math.abs(fn(value)),
      message: "Maximum iterations reached.",
    }),
  });
}
export function solveQuadraticReal(
  a: number,
  b: number,
  c: number,
): readonly number[] {
  if (![a, b, c].every(Number.isFinite) || a === 0)
    throw new RangeError(
      "A quadratic requires finite coefficients and non-zero a.",
    );
  const d = b * b - 4 * a * c;
  if (d < 0) return Object.freeze([]);
  if (d === 0) return Object.freeze([-b / (2 * a)]);
  const root = Math.sqrt(d);
  const q = -0.5 * (b + Math.sign(b || 1) * root);
  return Object.freeze([q / a, c / q].sort((x, y) => x - y));
}
export function solveLinearSystem(
  matrix: readonly (readonly number[])[],
  rhs: readonly number[],
): NumericalSolution<readonly number[]> {
  const size = matrix.length;
  if (
    size === 0 ||
    rhs.length !== size ||
    matrix.some((row) => row.length !== size)
  )
    throw new RangeError(
      "Linear system must be square and match the right-hand side.",
    );
  const work = matrix.map((row, i) => [...row, rhs[i]!]);
  if (work.flat().some((value) => !Number.isFinite(value)))
    throw new RangeError("Linear system values must be finite.");
  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < size; row += 1)
      if (Math.abs(work[row]![col]!) > Math.abs(work[pivot]![col]!))
        pivot = row;
    if (Math.abs(work[pivot]![col]!) <= 1e-14)
      throw new RangeError("Linear system is singular.");
    [work[col], work[pivot]] = [work[pivot]!, work[col]!];
    const divisor = work[col]![col]!;
    for (let j = col; j <= size; j += 1)
      work[col]![j] = work[col]![j]! / divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = work[row]![col]!;
      for (let j = col; j <= size; j += 1)
        work[row]![j] = work[row]![j]! - factor * work[col]![j]!;
    }
  }
  const value = Object.freeze(work.map((row) => row[size]!));
  const residual = Math.max(
    ...matrix.map((row, i) =>
      Math.abs(
        row.reduce((sum, coefficient, j) => sum + coefficient * value[j]!, 0) -
          rhs[i]!,
      ),
    ),
  );
  return Object.freeze({
    value,
    diagnostic: Object.freeze({
      converged: true,
      iterations: size,
      residual,
      message: "Pivoted elimination converged.",
    }),
  });
}
export function interpolateLinear(
  xs: readonly number[],
  ys: readonly number[],
  x: number,
): number {
  if (xs.length < 2 || xs.length !== ys.length || !Number.isFinite(x))
    throw new RangeError("Interpolation data are invalid.");
  let index = xs.findIndex((value) => value >= x);
  if (index <= 0) index = 1;
  if (index >= xs.length) index = xs.length - 1;
  const x0 = xs[index - 1]!;
  const x1 = xs[index]!;
  if (!(x1 > x0))
    throw new RangeError("Interpolation x values must be strictly increasing.");
  return (
    ys[index - 1]! + ((x - x0) / (x1 - x0)) * (ys[index]! - ys[index - 1]!)
  );
}
export function differentiateCentral(
  fn: (x: number) => number,
  x: number,
  step = 1e-5,
): number {
  if (![x, step].every(Number.isFinite) || step <= 0)
    throw new RangeError("Differentiation input is invalid.");
  return (fn(x + step) - fn(x - step)) / (2 * step);
}
export function integrateSimpson(
  fn: (x: number) => number,
  lower: number,
  upper: number,
  intervals = 100,
): number {
  if (
    ![lower, upper].every(Number.isFinite) ||
    !Number.isSafeInteger(intervals) ||
    intervals < 2 ||
    intervals % 2 !== 0
  )
    throw new RangeError(
      "Simpson integration requires finite bounds and a positive even interval count.",
    );
  const h = (upper - lower) / intervals;
  let total = fn(lower) + fn(upper);
  for (let i = 1; i < intervals; i += 1)
    total += (i % 2 === 0 ? 2 : 4) * fn(lower + i * h);
  return (total * h) / 3;
}
