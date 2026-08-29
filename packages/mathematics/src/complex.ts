import { fail, ok, type MathResult } from "./errors";
import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyEqual,
  requireFinite,
  type NumericsPolicy,
} from "./numerics";

export interface Complex {
  readonly real: number;
  readonly imaginary: number;
}

export const COMPLEX_ZERO: Complex = Object.freeze({ real: 0, imaginary: 0 });
export const COMPLEX_ONE: Complex = Object.freeze({ real: 1, imaginary: 0 });
export const COMPLEX_I: Complex = Object.freeze({ real: 0, imaginary: 1 });

export function complex(real: number, imaginary = 0): Complex {
  return Object.freeze({
    real: requireFinite(real, "real"),
    imaginary: requireFinite(imaginary, "imaginary"),
  });
}

export function addComplex(a: Complex, b: Complex): Complex {
  return complex(a.real + b.real, a.imaginary + b.imaginary);
}

export function subtractComplex(a: Complex, b: Complex): Complex {
  return complex(a.real - b.real, a.imaginary - b.imaginary);
}

export function multiplyComplex(a: Complex, b: Complex): Complex {
  return complex(
    a.real * b.real - a.imaginary * b.imaginary,
    a.real * b.imaginary + a.imaginary * b.real,
  );
}

export function divideComplex(
  a: Complex,
  b: Complex,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Complex> {
  const denominator = b.real * b.real + b.imaginary * b.imaginary;
  if (
    denominator <=
    policy.singularityThreshold * policy.singularityThreshold
  ) {
    return fail({ kind: "division-by-zero", operation: "divideComplex" });
  }
  return ok(
    complex(
      (a.real * b.real + a.imaginary * b.imaginary) / denominator,
      (a.imaginary * b.real - a.real * b.imaginary) / denominator,
    ),
  );
}

export function conjugateComplex(value: Complex): Complex {
  return complex(value.real, -value.imaginary);
}

export function magnitudeComplex(value: Complex): number {
  return Math.hypot(value.real, value.imaginary);
}

export function argumentComplex(value: Complex): number {
  return Math.atan2(value.imaginary, value.real);
}

export function complexFromPolar(
  magnitude: number,
  angleRadians: number,
): Complex {
  requireFinite(magnitude, "magnitude");
  requireFinite(angleRadians, "angleRadians");
  if (magnitude < 0) throw new RangeError("magnitude must be non-negative.");
  return complex(
    magnitude * Math.cos(angleRadians),
    magnitude * Math.sin(angleRadians),
  );
}

export function expComplex(value: Complex): Complex {
  const factor = Math.exp(value.real);
  return complex(
    factor * Math.cos(value.imaginary),
    factor * Math.sin(value.imaginary),
  );
}

export function approximatelyEqualComplex(
  a: Complex,
  b: Complex,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  return (
    approximatelyEqual(a.real, b.real, policy) &&
    approximatelyEqual(a.imaginary, b.imaginary, policy)
  );
}
