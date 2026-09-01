import {
  backProject,
  forwardProject,
  scalarImage,
} from "@physica/solver-reconstruction";
export function runExample() {
  const pixels = Array(64).fill(0) as number[];
  pixels[18] = 1;
  pixels[45] = 0.7;
  const image = scalarImage(8, 8, pixels);
  const sinogram = forwardProject(image, {
    anglesRadians: [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4],
    detectorCount: 8,
  });
  const reconstruction = backProject(sinogram, 8, 8);
  return {
    angles: sinogram.anglesRadians.length,
    detectors: sinogram.detectorCount,
    projectionSum: Number(
      sinogram.values.reduce((a, b) => a + b, 0).toFixed(6),
    ),
    reconstructionPeak: Number(Math.max(...reconstruction.pixels).toFixed(6)),
    finite: reconstruction.pixels.every(Number.isFinite),
  };
}
