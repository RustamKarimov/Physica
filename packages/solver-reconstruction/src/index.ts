import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/reconstruction-v1",
  supportedStateTypes: ["scalar-image", "sinogram"],
  supportedDimensions: [2],
  determinismPolicy: "strict",
  checkpointCapability: "none",
  workerCapability: "worker-compatible",
  precisionPolicy: "discrete projection geometry and normalization",
  inputSchema: "physica:projection-input-v1",
  outputSchema: "physica:reconstruction-output-v1",
});
export interface ScalarImage {
  readonly width: number;
  readonly height: number;
  readonly pixels: readonly number[];
}
export interface ProjectionGeometry {
  readonly anglesRadians: readonly number[];
  readonly detectorCount: number;
}
export interface Sinogram {
  readonly anglesRadians: readonly number[];
  readonly detectorCount: number;
  readonly values: readonly number[];
}
export function scalarImage(
  width: number,
  height: number,
  pixels: readonly number[],
): ScalarImage {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    pixels.length !== width * height ||
    pixels.some((v) => !Number.isFinite(v))
  )
    throw new RangeError("Scalar image shape or pixels are invalid.");
  return Object.freeze({ width, height, pixels: Object.freeze([...pixels]) });
}
function detectorIndex(
  x: number,
  y: number,
  angle: number,
  count: number,
): number {
  const coordinate = x * Math.cos(angle) + y * Math.sin(angle);
  return Math.max(
    0,
    Math.min(
      count - 1,
      Math.floor(((coordinate + Math.SQRT2 / 2) * count) / Math.SQRT2),
    ),
  );
}
export function forwardProject(
  image: ScalarImage,
  geometry: ProjectionGeometry,
): Sinogram {
  if (
    !Number.isSafeInteger(geometry.detectorCount) ||
    geometry.detectorCount < 2 ||
    geometry.anglesRadians.length === 0 ||
    geometry.anglesRadians.some((a) => !Number.isFinite(a))
  )
    throw new RangeError("Projection geometry is invalid.");
  const values = Array(
    geometry.anglesRadians.length * geometry.detectorCount,
  ).fill(0) as number[];
  geometry.anglesRadians.forEach((angle, a) => {
    for (let row = 0; row < image.height; row += 1)
      for (let col = 0; col < image.width; col += 1) {
        const x = (col + 0.5) / image.width - 0.5;
        const y = (row + 0.5) / image.height - 0.5;
        values[
          a * geometry.detectorCount +
            detectorIndex(x, y, angle, geometry.detectorCount)
        ]! +=
          image.pixels[row * image.width + col]! /
          Math.max(image.width, image.height);
      }
  });
  return Object.freeze({
    anglesRadians: Object.freeze([...geometry.anglesRadians]),
    detectorCount: geometry.detectorCount,
    values: Object.freeze(values),
  });
}
export function backProject(
  sinogram: Sinogram,
  width: number,
  height: number,
): ScalarImage {
  if (
    sinogram.values.length !==
    sinogram.anglesRadians.length * sinogram.detectorCount
  )
    throw new RangeError("Sinogram shape is invalid.");
  const pixels = Array(width * height).fill(0) as number[];
  for (let row = 0; row < height; row += 1)
    for (let col = 0; col < width; col += 1) {
      const x = (col + 0.5) / width - 0.5;
      const y = (row + 0.5) / height - 0.5;
      let sum = 0;
      sinogram.anglesRadians.forEach(
        (angle, a) =>
          (sum +=
            sinogram.values[
              a * sinogram.detectorCount +
                detectorIndex(x, y, angle, sinogram.detectorCount)
            ]!),
      );
      pixels[row * width + col] = sum / sinogram.anglesRadians.length;
    }
  return scalarImage(width, height, pixels);
}
