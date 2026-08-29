import { fail, ok, type MathResult } from "./errors";
import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyEqual,
  requireFinite,
  type NumericsPolicy,
} from "./numerics";

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const VEC2_ZERO: Vec2 = Object.freeze({ x: 0, y: 0 });
export const VEC3_ZERO: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 });

export function vec2(x: number, y: number): Vec2 {
  return Object.freeze({ x: requireFinite(x, "x"), y: requireFinite(y, "y") });
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return Object.freeze({
    x: requireFinite(x, "x"),
    y: requireFinite(y, "y"),
    z: requireFinite(z, "z"),
  });
}

export function addVec2(a: Vec2, b: Vec2): Vec2 {
  return vec2(a.x + b.x, a.y + b.y);
}

export function subtractVec2(a: Vec2, b: Vec2): Vec2 {
  return vec2(a.x - b.x, a.y - b.y);
}

export function scaleVec2(value: Vec2, scalar: number): Vec2 {
  requireFinite(scalar, "scalar");
  return vec2(value.x * scalar, value.y * scalar);
}

export function divideVec2(value: Vec2, scalar: number): MathResult<Vec2> {
  if (!Number.isFinite(scalar) || scalar === 0) {
    return fail({ kind: "division-by-zero", operation: "divideVec2" });
  }
  return ok(scaleVec2(value, 1 / scalar));
}

export function dotVec2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function magnitudeSquaredVec2(value: Vec2): number {
  return dotVec2(value, value);
}

export function magnitudeVec2(value: Vec2): number {
  return Math.hypot(value.x, value.y);
}

export function distanceVec2(a: Vec2, b: Vec2): number {
  return magnitudeVec2(subtractVec2(a, b));
}

export function normalizeVec2(
  value: Vec2,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Vec2> {
  const magnitude = magnitudeVec2(value);
  return magnitude <= policy.singularityThreshold
    ? fail({ kind: "zero-vector", operation: "normalizeVec2" })
    : ok(vec2(value.x / magnitude, value.y / magnitude));
}

export function lerpVec2(a: Vec2, b: Vec2, amount: number): Vec2 {
  requireFinite(amount, "amount");
  return vec2(a.x + (b.x - a.x) * amount, a.y + (b.y - a.y) * amount);
}

export function mapVec2(
  value: Vec2,
  mapper: (component: number, axis: "x" | "y") => number,
): Vec2 {
  return vec2(mapper(value.x, "x"), mapper(value.y, "y"));
}

export function approximatelyEqualVec2(
  a: Vec2,
  b: Vec2,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  return (
    approximatelyEqual(a.x, b.x, policy) && approximatelyEqual(a.y, b.y, policy)
  );
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scaleVec3(value: Vec3, scalar: number): Vec3 {
  requireFinite(scalar, "scalar");
  return vec3(value.x * scalar, value.y * scalar, value.z * scalar);
}

export function divideVec3(value: Vec3, scalar: number): MathResult<Vec3> {
  if (!Number.isFinite(scalar) || scalar === 0) {
    return fail({ kind: "division-by-zero", operation: "divideVec3" });
  }
  return ok(scaleVec3(value, 1 / scalar));
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

export function magnitudeSquaredVec3(value: Vec3): number {
  return dotVec3(value, value);
}

export function magnitudeVec3(value: Vec3): number {
  return Math.hypot(value.x, value.y, value.z);
}

export function distanceVec3(a: Vec3, b: Vec3): number {
  return magnitudeVec3(subtractVec3(a, b));
}

export function normalizeVec3(
  value: Vec3,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Vec3> {
  const magnitude = magnitudeVec3(value);
  return magnitude <= policy.singularityThreshold
    ? fail({ kind: "zero-vector", operation: "normalizeVec3" })
    : ok(vec3(value.x / magnitude, value.y / magnitude, value.z / magnitude));
}

export function lerpVec3(a: Vec3, b: Vec3, amount: number): Vec3 {
  requireFinite(amount, "amount");
  return vec3(
    a.x + (b.x - a.x) * amount,
    a.y + (b.y - a.y) * amount,
    a.z + (b.z - a.z) * amount,
  );
}

export function mapVec3(
  value: Vec3,
  mapper: (component: number, axis: "x" | "y" | "z") => number,
): Vec3 {
  return vec3(mapper(value.x, "x"), mapper(value.y, "y"), mapper(value.z, "z"));
}

export function approximatelyEqualVec3(
  a: Vec3,
  b: Vec3,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  return (
    approximatelyEqual(a.x, b.x, policy) &&
    approximatelyEqual(a.y, b.y, policy) &&
    approximatelyEqual(a.z, b.z, policy)
  );
}

export function projectVec3(
  value: Vec3,
  onto: Vec3,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Vec3> {
  const denominator = magnitudeSquaredVec3(onto);
  if (
    denominator <=
    policy.singularityThreshold * policy.singularityThreshold
  ) {
    return fail({ kind: "zero-vector", operation: "projectVec3" });
  }
  return ok(scaleVec3(onto, dotVec3(value, onto) / denominator));
}

export function rejectVec3(
  value: Vec3,
  from: Vec3,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Vec3> {
  const projection = projectVec3(value, from, policy);
  return projection.ok ? ok(subtractVec3(value, projection.value)) : projection;
}

export function angleBetweenVec3(
  a: Vec3,
  b: Vec3,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<number> {
  const product = magnitudeVec3(a) * magnitudeVec3(b);
  if (product <= policy.singularityThreshold * policy.singularityThreshold) {
    return fail({ kind: "zero-vector", operation: "angleBetweenVec3" });
  }
  return ok(Math.acos(Math.max(-1, Math.min(1, dotVec3(a, b) / product))));
}
