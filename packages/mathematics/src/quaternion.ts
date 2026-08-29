import { fail, ok, type MathResult } from "./errors";
import { matrix, type Matrix } from "./matrix";
import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyEqual,
  requireFinite,
  type NumericsPolicy,
} from "./numerics";
import { scaleVec3, vec3, type Vec3 } from "./vector";

export interface Quaternion {
  readonly w: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const QUATERNION_IDENTITY: Quaternion = Object.freeze({
  w: 1,
  x: 0,
  y: 0,
  z: 0,
});

export function quaternion(
  w: number,
  x: number,
  y: number,
  z: number,
): Quaternion {
  return Object.freeze({
    w: requireFinite(w, "w"),
    x: requireFinite(x, "x"),
    y: requireFinite(y, "y"),
    z: requireFinite(z, "z"),
  });
}

export function magnitudeQuaternion(value: Quaternion): number {
  return Math.hypot(value.w, value.x, value.y, value.z);
}

export function normalizeQuaternion(
  value: Quaternion,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Quaternion> {
  const magnitude = magnitudeQuaternion(value);
  return magnitude <= policy.singularityThreshold
    ? fail({ kind: "zero-vector", operation: "normalizeQuaternion" })
    : ok(
        quaternion(
          value.w / magnitude,
          value.x / magnitude,
          value.y / magnitude,
          value.z / magnitude,
        ),
      );
}

export function conjugateQuaternion(value: Quaternion): Quaternion {
  return quaternion(value.w, -value.x, -value.y, -value.z);
}

export function multiplyQuaternion(a: Quaternion, b: Quaternion): Quaternion {
  return quaternion(
    a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  );
}

export function quaternionFromAxisAngle(
  axis: Vec3,
  angleRadians: number,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Quaternion> {
  requireFinite(angleRadians, "angleRadians");
  const magnitude = Math.hypot(axis.x, axis.y, axis.z);
  if (magnitude <= policy.singularityThreshold) {
    return fail({ kind: "zero-vector", operation: "quaternionFromAxisAngle" });
  }
  const half = angleRadians / 2;
  const scaled = scaleVec3(axis, Math.sin(half) / magnitude);
  return ok(quaternion(Math.cos(half), scaled.x, scaled.y, scaled.z));
}

export function rotateVec3ByQuaternion(
  value: Vec3,
  rotation: Quaternion,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Vec3> {
  const normalized = normalizeQuaternion(rotation, policy);
  if (!normalized.ok) return normalized;
  const vectorQuaternion = quaternion(0, value.x, value.y, value.z);
  const rotated = multiplyQuaternion(
    multiplyQuaternion(normalized.value, vectorQuaternion),
    conjugateQuaternion(normalized.value),
  );
  return ok(vec3(rotated.x, rotated.y, rotated.z));
}

export function quaternionToMatrix3(
  rotation: Quaternion,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Matrix> {
  const normalized = normalizeQuaternion(rotation, policy);
  if (!normalized.ok) return normalized;
  const { w, x, y, z } = normalized.value;
  return ok(
    matrix(3, 3, [
      1 - 2 * (y * y + z * z),
      2 * (x * y - z * w),
      2 * (x * z + y * w),
      2 * (x * y + z * w),
      1 - 2 * (x * x + z * z),
      2 * (y * z - x * w),
      2 * (x * z - y * w),
      2 * (y * z + x * w),
      1 - 2 * (x * x + y * y),
    ]),
  );
}

export function approximatelyEqualQuaternion(
  a: Quaternion,
  b: Quaternion,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  const direct =
    approximatelyEqual(a.w, b.w, policy) &&
    approximatelyEqual(a.x, b.x, policy) &&
    approximatelyEqual(a.y, b.y, policy) &&
    approximatelyEqual(a.z, b.z, policy);
  const negated =
    approximatelyEqual(a.w, -b.w, policy) &&
    approximatelyEqual(a.x, -b.x, policy) &&
    approximatelyEqual(a.y, -b.y, policy) &&
    approximatelyEqual(a.z, -b.z, policy);
  return direct || negated;
}
