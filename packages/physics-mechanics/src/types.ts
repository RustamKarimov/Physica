export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export interface MechanicsIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export type MechanicsResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly issues: readonly MechanicsIssue[] };

export function mechanicsIssue(
  code: string,
  message: string,
  path?: string,
): MechanicsIssue {
  return Object.freeze({
    severity: "error" as const,
    code,
    message,
    ...(path === undefined ? {} : { path }),
  });
}

export function mechanicsWarning(
  code: string,
  message: string,
  path?: string,
): MechanicsIssue {
  return Object.freeze({
    severity: "warning" as const,
    code,
    message,
    ...(path === undefined ? {} : { path }),
  });
}

export function valid<T>(value: T): MechanicsResult<T> {
  return { ok: true, value: deepFreeze(value) };
}

export function invalid<T = never>(
  ...issues: readonly MechanicsIssue[]
): MechanicsResult<T> {
  return { ok: false, issues: Object.freeze([...issues]) };
}

export function validateFinite(
  values: Readonly<Record<string, number>>,
): MechanicsIssue[] {
  return Object.entries(values)
    .filter(([, value]) => !Number.isFinite(value))
    .map(([path]) =>
      mechanicsIssue(
        "mechanics.non-finite",
        `${path} must be a finite number.`,
        path,
      ),
    );
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
  }
  return value;
}

export function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}

export function scale(vector: Vector2, factor: number): Vector2 {
  return Object.freeze({ x: vector.x * factor, y: vector.y * factor });
}

export function add(vectors: readonly Vector2[]): Vector2 {
  return Object.freeze(
    vectors.reduce(
      (sum, vector) => ({ x: sum.x + vector.x, y: sum.y + vector.y }),
      { x: 0, y: 0 },
    ),
  );
}
