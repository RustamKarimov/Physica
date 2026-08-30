import type { Vec2 } from "@physica/renderer-core";

export interface SvgMorphError {
  readonly kind:
    "invalid-geometry" | "invalid-sample-count" | "invalid-progress";
  readonly message: string;
}

export type SvgMorphResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SvgMorphError };

export interface SvgMorphGeometry {
  readonly points: readonly Vec2[];
  readonly closed: boolean;
}

export interface NormalizedSvgMorphPaths {
  readonly source: readonly Vec2[];
  readonly destination: readonly Vec2[];
  readonly closed: boolean;
  readonly sampleCount: number;
}

export type SvgMorphPlan =
  | {
      readonly kind: "morph";
      readonly progress: number;
      readonly points: readonly Vec2[];
      readonly normalized: NormalizedSvgMorphPaths;
    }
  | {
      readonly kind: "replace";
      readonly progress: number;
      readonly sourceOpacity: number;
      readonly destinationOpacity: number;
      readonly reason: "topology-mismatch";
    };

interface ValidatedPath {
  readonly points: readonly Vec2[];
  readonly closed: boolean;
  readonly segmentLengths: readonly number[];
  readonly totalLength: number;
  readonly winding: number;
}

function failure(
  kind: SvgMorphError["kind"],
  message: string,
): SvgMorphResult<never> {
  return { ok: false, error: Object.freeze({ kind, message }) };
}

function freezePoint(point: Vec2): Vec2 {
  return Object.freeze({ x: point.x, y: point.y });
}

function samePoint(left: Vec2, right: Vec2): boolean {
  return left.x === right.x && left.y === right.y;
}

function signedArea(points: readonly Vec2[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function hasNonCollinearPoints(points: readonly Vec2[]): boolean {
  const origin = points[0]!;
  for (let leftIndex = 1; leftIndex < points.length - 1; leftIndex += 1) {
    const left = points[leftIndex]!;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < points.length;
      rightIndex += 1
    ) {
      const right = points[rightIndex]!;
      const cross =
        (left.x - origin.x) * (right.y - origin.y) -
        (left.y - origin.y) * (right.x - origin.x);
      if (cross !== 0) return true;
    }
  }
  return false;
}

function validateGeometry(
  geometry: SvgMorphGeometry,
): SvgMorphResult<ValidatedPath> {
  if (
    typeof geometry.closed !== "boolean" ||
    !Array.isArray(geometry.points) ||
    !geometry.points.every(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    )
  )
    return failure(
      "invalid-geometry",
      "Morph geometry must contain finite points and an explicit topology.",
    );
  const points = geometry.points.map(freezePoint);
  if (
    geometry.closed &&
    points.length > 1 &&
    samePoint(points[0]!, points.at(-1)!)
  )
    points.pop();
  const minimum = geometry.closed ? 3 : 2;
  if (points.length < minimum)
    return failure(
      "invalid-geometry",
      `A ${geometry.closed ? "closed" : "open"} morph path requires at least ${minimum} points.`,
    );
  if (geometry.closed && !hasNonCollinearPoints(points))
    return failure(
      "invalid-geometry",
      "A closed morph path requires non-collinear points.",
    );
  const segmentLengths: number[] = [];
  const segmentCount = geometry.closed ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const start = points[index]!;
    const end = points[(index + 1) % points.length]!;
    segmentLengths.push(Math.hypot(end.x - start.x, end.y - start.y));
  }
  const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0);
  if (!(totalLength > 0) || !Number.isFinite(totalLength))
    return failure(
      "invalid-geometry",
      "A morph path must have finite non-zero arc length.",
    );
  return {
    ok: true,
    value: Object.freeze({
      points: Object.freeze(points),
      closed: geometry.closed,
      segmentLengths: Object.freeze(segmentLengths),
      totalLength,
      winding: geometry.closed ? Math.sign(signedArea(points)) : 0,
    }),
  };
}

function reverseClosed(path: ValidatedPath): ValidatedPath {
  const reversed = [...path.points].reverse();
  const segmentLengths = reversed.map((point, index) => {
    const next = reversed[(index + 1) % reversed.length]!;
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
  return {
    ...path,
    points: Object.freeze(reversed),
    segmentLengths: Object.freeze(segmentLengths),
    winding: -path.winding,
  };
}

function pointAt(path: ValidatedPath, progress: number): Vec2 {
  if (!path.closed && progress === 1) return path.points.at(-1)!;
  const target = path.totalLength * progress;
  let traversed = 0;
  for (let index = 0; index < path.segmentLengths.length; index += 1) {
    const segmentLength = path.segmentLengths[index]!;
    if (segmentLength === 0) continue;
    if (traversed + segmentLength >= target) {
      const start = path.points[index]!;
      const end = path.points[(index + 1) % path.points.length]!;
      if (
        Math.abs(traversed + segmentLength - target) <=
        Number.EPSILON * Math.max(1, path.totalLength)
      )
        return end;
      const amount = (target - traversed) / segmentLength;
      return freezePoint({
        x: start.x + (end.x - start.x) * amount,
        y: start.y + (end.y - start.y) * amount,
      });
    }
    traversed += segmentLength;
  }
  return path.points.at(-1)!;
}

function resample(path: ValidatedPath, sampleCount: number): readonly Vec2[] {
  return Object.freeze(
    Array.from({ length: sampleCount }, (_, index) =>
      pointAt(
        path,
        path.closed ? index / sampleCount : index / (sampleCount - 1),
      ),
    ),
  );
}

function alignClosedDestination(
  source: readonly Vec2[],
  destination: readonly Vec2[],
): readonly Vec2[] {
  let bestOffset = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < destination.length; offset += 1) {
    let distance = 0;
    for (let index = 0; index < source.length; index += 1) {
      const left = source[index]!;
      const right = destination[(index + offset) % destination.length]!;
      const dx = left.x - right.x;
      const dy = left.y - right.y;
      distance += dx * dx + dy * dy;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = offset;
    }
  }
  return Object.freeze(
    source.map(
      (_, index) => destination[(index + bestOffset) % destination.length]!,
    ),
  );
}

function validSampleCount(sampleCount: number, closed: boolean): boolean {
  return (
    Number.isSafeInteger(sampleCount) &&
    sampleCount >= (closed ? 3 : 2) &&
    sampleCount <= 4096
  );
}

export function normalizeSvgMorphPaths(
  sourceGeometry: SvgMorphGeometry,
  destinationGeometry: SvgMorphGeometry,
  sampleCount = 64,
): SvgMorphResult<NormalizedSvgMorphPaths> {
  const source = validateGeometry(sourceGeometry);
  if (!source.ok) return source;
  const destinationResult = validateGeometry(destinationGeometry);
  if (!destinationResult.ok) return destinationResult;
  if (source.value.closed !== destinationResult.value.closed)
    return failure(
      "invalid-geometry",
      "Only paths with matching open or closed topology can be normalized.",
    );
  if (!validSampleCount(sampleCount, source.value.closed))
    return failure(
      "invalid-sample-count",
      `Sample count must be a safe integer from ${source.value.closed ? 3 : 2} to 4096.`,
    );
  let destination = destinationResult.value;
  if (
    source.value.closed &&
    source.value.winding !== 0 &&
    destination.winding !== 0 &&
    source.value.winding !== destination.winding
  )
    destination = reverseClosed(destination);
  const sourcePoints = resample(source.value, sampleCount);
  const sampledDestination = resample(destination, sampleCount);
  const destinationPoints = source.value.closed
    ? alignClosedDestination(sourcePoints, sampledDestination)
    : sampledDestination;
  return {
    ok: true,
    value: Object.freeze({
      source: sourcePoints,
      destination: destinationPoints,
      closed: source.value.closed,
      sampleCount,
    }),
  };
}

export function interpolateSvgMorphPaths(
  normalized: NormalizedSvgMorphPaths,
  progress: number,
): SvgMorphResult<readonly Vec2[]> {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    return failure("invalid-progress", "Morph progress must be in [0, 1].");
  if (
    normalized.source.length !== normalized.destination.length ||
    normalized.source.length !== normalized.sampleCount
  )
    return failure(
      "invalid-geometry",
      "Normalized morph paths must have equal declared cardinality.",
    );
  if (progress === 0) return { ok: true, value: normalized.source };
  if (progress === 1) return { ok: true, value: normalized.destination };
  return {
    ok: true,
    value: Object.freeze(
      normalized.source.map((source, index) => {
        const destination = normalized.destination[index]!;
        return freezePoint({
          x: source.x + (destination.x - source.x) * progress,
          y: source.y + (destination.y - source.y) * progress,
        });
      }),
    ),
  };
}

export function createSvgMorphPlan(
  sourceGeometry: SvgMorphGeometry,
  destinationGeometry: SvgMorphGeometry,
  progress: number,
  sampleCount = 64,
): SvgMorphResult<SvgMorphPlan> {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    return failure("invalid-progress", "Morph progress must be in [0, 1].");
  const source = validateGeometry(sourceGeometry);
  if (!source.ok) return source;
  const destination = validateGeometry(destinationGeometry);
  if (!destination.ok) return destination;
  if (source.value.closed !== destination.value.closed)
    return {
      ok: true,
      value: Object.freeze({
        kind: "replace",
        progress,
        sourceOpacity: 1 - progress,
        destinationOpacity: progress,
        reason: "topology-mismatch",
      }),
    };
  const normalized = normalizeSvgMorphPaths(
    sourceGeometry,
    destinationGeometry,
    sampleCount,
  );
  if (!normalized.ok) return normalized;
  const points = interpolateSvgMorphPaths(normalized.value, progress);
  return points.ok
    ? {
        ok: true,
        value: Object.freeze({
          kind: "morph",
          progress,
          points: points.value,
          normalized: normalized.value,
        }),
      }
    : points;
}
