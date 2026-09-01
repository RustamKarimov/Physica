import { traceInterfaces } from "@physica/solver-rays";
export function runExample() {
  const segments = traceInterfaces(
    { origin: { x: 0, y: 1 }, direction: { x: 0.5, y: -0.8660254037844386 } },
    [
      {
        id: "air-glass",
        point: { x: 0, y: 0 },
        normal: { x: 0, y: 1 },
        refractiveIndexBefore: 1,
        refractiveIndexAfter: 1.5,
      },
    ],
  );
  const segment = segments[0];
  if (!segment) throw new Error("No intersection.");
  return {
    interactions: segments.length,
    interaction: segment.interaction,
    hit: {
      x: Number(segment.to.x.toFixed(6)),
      y: Number(segment.to.y.toFixed(6)),
    },
    incidentAngleDegrees: 30,
    refractedAngleDegrees: Number(
      ((Math.asin(1 / 3) * 180) / Math.PI).toFixed(6),
    ),
  };
}
