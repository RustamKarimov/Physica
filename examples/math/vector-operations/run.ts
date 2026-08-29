import {
  addVec3,
  crossVec3,
  dotVec3,
  matrix,
  multiplyMatrixVec3,
  normalizeVec3,
  quaternionFromAxisAngle,
  rotateVec3ByQuaternion,
  vec3,
} from "@physica/mathematics";

const array = (value: { x: number; y: number; z: number }) =>
  [value.x, value.y, value.z].map((entry) =>
    Math.abs(entry) < 1e-12 ? 0 : entry,
  );

export function runVectorOperations() {
  const x = vec3(1, 0, 0);
  const y = vec3(0, 1, 0);
  const normalized = normalizeVec3(vec3(3, 4, 0));
  const transformed = multiplyMatrixVec3(
    matrix(3, 3, [2, 0, 0, 0, 3, 0, 0, 0, 4]),
    vec3(1, 1, 1),
  );
  const rotation = quaternionFromAxisAngle(vec3(0, 0, 1), Math.PI / 2);
  if (!normalized.ok || !transformed.ok || !rotation.ok)
    throw new Error("Example fixture failed.");
  const rotated = rotateVec3ByQuaternion(x, rotation.value);
  if (!rotated.ok) throw new Error("Rotation failed.");
  return {
    sum: array(addVec3(x, y)),
    dot: dotVec3(x, y),
    cross: array(crossVec3(x, y)),
    normalized: array(normalized.value),
    matrixResult: array(transformed.value),
    rotated: array(rotated.value),
  };
}
