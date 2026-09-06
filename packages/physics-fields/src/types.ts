export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface FieldIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export type FieldResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly FieldIssue[] };

export const vec3 = (x: number, y: number, z = 0): Vec3 =>
  Object.freeze({ x, y, z });

export function add3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function subtract3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scale3(a: Vec3, factor: number): Vec3 {
  return vec3(a.x * factor, a.y * factor, a.z * factor);
}

export function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

export function magnitude3(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function fieldIssue(
  code: string,
  message: string,
  path?: string,
): FieldIssue {
  return Object.freeze({
    severity: "error",
    code,
    message,
    ...(path === undefined ? {} : { path }),
  });
}

export function validField<T>(value: T): FieldResult<T> {
  return { ok: true, value: deepFreeze(value) as T };
}

export function invalidField<T = never>(
  ...issues: FieldIssue[]
): FieldResult<T> {
  return { ok: false, issues: Object.freeze(issues) };
}

export function finiteIssue(
  values: Readonly<Record<string, number>>,
): FieldIssue | undefined {
  const invalid = Object.entries(values).find(
    ([, value]) => !Number.isFinite(value),
  );
  return invalid
    ? fieldIssue(
        "fields.non-finite",
        invalid[0] + " must be finite.",
        invalid[0],
      )
    : undefined;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
  }
  return value;
}
