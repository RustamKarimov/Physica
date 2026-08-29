export interface NumericsPolicy {
  readonly absoluteTolerance: number;
  readonly relativeTolerance: number;
  readonly zeroThreshold: number;
  readonly singularityThreshold: number;
  readonly maxIterations: number;
}

export const DEFAULT_NUMERICS_POLICY: NumericsPolicy = Object.freeze({
  absoluteTolerance: 1e-12,
  relativeTolerance: 1e-10,
  zeroThreshold: 1e-14,
  singularityThreshold: 1e-12,
  maxIterations: 1_000,
});

export function requireFinite(value: number, label = "value"): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }
  return value;
}

export function validateNumericsPolicy(policy: NumericsPolicy): NumericsPolicy {
  for (const [key, value] of Object.entries(policy)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${key} must be a finite non-negative number.`);
    }
  }
  if (!Number.isSafeInteger(policy.maxIterations) || policy.maxIterations < 1) {
    throw new RangeError("maxIterations must be a positive safe integer.");
  }
  return Object.freeze({ ...policy });
}

export function approximatelyEqual(
  a: number,
  b: number,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const difference = Math.abs(a - b);
  return (
    difference <=
    Math.max(
      policy.absoluteTolerance,
      policy.relativeTolerance * Math.max(Math.abs(a), Math.abs(b)),
    )
  );
}

export function approximatelyZero(
  value: number,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  return Number.isFinite(value) && Math.abs(value) <= policy.zeroThreshold;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
