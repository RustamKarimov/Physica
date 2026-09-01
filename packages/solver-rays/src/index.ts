import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/rays-v1",
  supportedStateTypes: ["ray", "path-sequence"],
  supportedDimensions: [2],
  determinismPolicy: "strict",
  checkpointCapability: "none",
  workerCapability: "worker-compatible",
  precisionPolicy: "analytic intersection with finite epsilon",
  inputSchema: "physica:ray-scene-v1",
  outputSchema: "physica:ray-path-v1",
});
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}
export interface Ray2 {
  readonly origin: Vec2;
  readonly direction: Vec2;
}
export interface PlanarInterface {
  readonly id: string;
  readonly point: Vec2;
  readonly normal: Vec2;
  readonly refractiveIndexBefore: number;
  readonly refractiveIndexAfter: number;
}
export interface RaySegment {
  readonly from: Vec2;
  readonly to: Vec2;
  readonly mediumIndex: number;
  readonly interaction:
    "incident" | "reflected" | "refracted" | "total-internal-reflection";
  readonly surfaceId: string;
}
function unit(v: Vec2): Vec2 {
  const length = Math.hypot(v.x, v.y);
  if (!Number.isFinite(length) || length === 0)
    throw new RangeError("Ray vectors must be finite and non-zero.");
  return Object.freeze({ x: v.x / length, y: v.y / length });
}
function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}
export function intersectPlane(
  ray: Ray2,
  surface: PlanarInterface,
): number | undefined {
  const direction = unit(ray.direction);
  const normal = unit(surface.normal);
  const denominator = dot(direction, normal);
  if (Math.abs(denominator) < 1e-12) return undefined;
  const t =
    dot(
      { x: surface.point.x - ray.origin.x, y: surface.point.y - ray.origin.y },
      normal,
    ) / denominator;
  return t > 1e-10 ? t : undefined;
}
export function reflect(direction: Vec2, normal: Vec2): Vec2 {
  const d = unit(direction);
  let n = unit(normal);
  if (dot(d, n) > 0) n = { x: -n.x, y: -n.y };
  const projection = 2 * dot(d, n);
  return unit({ x: d.x - projection * n.x, y: d.y - projection * n.y });
}
export function refract(
  direction: Vec2,
  normal: Vec2,
  n1: number,
  n2: number,
): Vec2 | undefined {
  if (![n1, n2].every(Number.isFinite) || n1 <= 0 || n2 <= 0)
    throw new RangeError("Refractive indices must be positive.");
  const d = unit(direction);
  let n = unit(normal);
  if (dot(d, n) > 0) n = { x: -n.x, y: -n.y };
  const cosI = -dot(d, n);
  const eta = n1 / n2;
  const k = 1 - eta * eta * (1 - cosI * cosI);
  if (k < 0) return undefined;
  return unit({
    x: eta * d.x + (eta * cosI - Math.sqrt(k)) * n.x,
    y: eta * d.y + (eta * cosI - Math.sqrt(k)) * n.y,
  });
}
export function traceInterfaces(
  initial: Ray2,
  surfaces: readonly PlanarInterface[],
  maxInteractions = 16,
): readonly RaySegment[] {
  let ray = {
    origin: Object.freeze({ ...initial.origin }),
    direction: unit(initial.direction),
  };
  let medium = 1;
  const remaining = [...surfaces];
  const segments: RaySegment[] = [];
  for (let step = 0; step < maxInteractions; step += 1) {
    let hit: PlanarInterface | undefined;
    let distance = Infinity;
    for (const surface of remaining) {
      const candidate = intersectPlane(ray, surface);
      if (candidate !== undefined && candidate < distance) {
        distance = candidate;
        hit = surface;
      }
    }
    if (!hit) break;
    const point = Object.freeze({
      x: ray.origin.x + ray.direction.x * distance,
      y: ray.origin.y + ray.direction.y * distance,
    });
    const normal = unit(hit.normal);
    const entering = dot(ray.direction, normal) < 0;
    const n1 = entering ? hit.refractiveIndexBefore : hit.refractiveIndexAfter;
    const n2 = entering ? hit.refractiveIndexAfter : hit.refractiveIndexBefore;
    const transmitted = refract(
      ray.direction,
      entering ? normal : { x: -normal.x, y: -normal.y },
      n1,
      n2,
    );
    const interaction = transmitted ? "refracted" : "total-internal-reflection";
    segments.push(
      Object.freeze({
        from: ray.origin,
        to: point,
        mediumIndex: medium,
        interaction,
        surfaceId: hit.id,
      }),
    );
    ray = {
      origin: {
        x: point.x + (transmitted?.x ?? ray.direction.x) * 1e-9,
        y: point.y + (transmitted?.y ?? ray.direction.y) * 1e-9,
      },
      direction:
        transmitted ??
        reflect(
          ray.direction,
          entering ? normal : { x: -normal.x, y: -normal.y },
        ),
    };
    if (transmitted) medium = n2;
    const index = remaining.indexOf(hit);
    remaining.splice(index, 1);
  }
  return Object.freeze(segments);
}
