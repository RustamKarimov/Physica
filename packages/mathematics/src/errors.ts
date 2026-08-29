export type MathResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: MathematicsError };

export type MathematicsError =
  | {
      readonly kind: "invalid-number";
      readonly operation: string;
      readonly value: number;
    }
  | { readonly kind: "dimension-mismatch"; readonly operation: string }
  | { readonly kind: "zero-vector"; readonly operation: string }
  | { readonly kind: "division-by-zero"; readonly operation: string }
  | { readonly kind: "singular-matrix"; readonly operation: string }
  | {
      readonly kind: "shape-mismatch";
      readonly operation: string;
      readonly left: readonly number[];
      readonly right: readonly number[];
    }
  | {
      readonly kind: "invalid-interval";
      readonly minimum: number;
      readonly maximum: number;
    }
  | { readonly kind: "invalid-series"; readonly index: number };

export function ok<T>(value: T): MathResult<T> {
  return { ok: true, value };
}

export function fail<T>(error: MathematicsError): MathResult<T> {
  return { ok: false, error };
}
