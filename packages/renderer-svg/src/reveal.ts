import type { Vec2 } from "@physica/renderer-core";

export interface SvgRevealError {
  readonly kind:
    "invalid-path" | "invalid-progress" | "invalid-bounds" | "invalid-emphasis";
  readonly message: string;
}

export type SvgRevealResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SvgRevealError };

export interface SvgPathMetrics {
  readonly points: readonly Vec2[];
  readonly segmentLengths: readonly number[];
  readonly totalLength: number;
}

export interface SvgPathSlice extends SvgPathMetrics {
  readonly progress: number;
  readonly direction: "forward" | "reverse";
  readonly visiblePoints: readonly Vec2[];
  readonly visibleLength: number;
}

export interface SvgStrokeDrawPlan extends SvgPathSlice {
  readonly dashArray: number;
  readonly dashOffset: number;
  readonly arrowHeadVisible: boolean;
}

export interface SvgBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SvgMaskPlan {
  readonly clip: SvgBounds;
  readonly feather: number;
}

export interface SvgEmphasisStyle {
  readonly opacityMultiplier: number;
  readonly accentIntensity: number;
  readonly isolated: boolean;
}

function failure(
  kind: SvgRevealError["kind"],
  message: string,
): SvgRevealResult<never> {
  return { ok: false, error: Object.freeze({ kind, message }) };
}

function finitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function freezePoint(point: Vec2): Vec2 {
  return Object.freeze({ x: point.x, y: point.y });
}

export function measureSvgPath(
  points: readonly Vec2[],
): SvgRevealResult<SvgPathMetrics> {
  if (points.length < 2 || !points.every(finitePoint))
    return failure(
      "invalid-path",
      "A reveal path requires at least two finite points.",
    );
  const frozenPoints = points.map(freezePoint);
  const segmentLengths: number[] = [];
  for (let index = 1; index < frozenPoints.length; index += 1) {
    const start = frozenPoints[index - 1]!;
    const end = frozenPoints[index]!;
    segmentLengths.push(Math.hypot(end.x - start.x, end.y - start.y));
  }
  const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0);
  if (!(totalLength > 0) || !Number.isFinite(totalLength))
    return failure("invalid-path", "A reveal path must have non-zero length.");
  return {
    ok: true,
    value: Object.freeze({
      points: Object.freeze(frozenPoints),
      segmentLengths: Object.freeze(segmentLengths),
      totalLength,
    }),
  };
}

function forwardSlice(
  metrics: SvgPathMetrics,
  progress: number,
): readonly Vec2[] {
  if (progress === 0) return Object.freeze([]);
  if (progress === 1) return metrics.points;
  const targetLength = metrics.totalLength * progress;
  let traversed = 0;
  const visible: Vec2[] = [metrics.points[0]!];
  for (let index = 0; index < metrics.segmentLengths.length; index += 1) {
    const length = metrics.segmentLengths[index]!;
    const start = metrics.points[index]!;
    const end = metrics.points[index + 1]!;
    if (traversed + length <= targetLength) {
      visible.push(end);
      traversed += length;
      continue;
    }
    const amount = (targetLength - traversed) / length;
    visible.push(
      freezePoint({
        x: start.x + (end.x - start.x) * amount,
        y: start.y + (end.y - start.y) * amount,
      }),
    );
    break;
  }
  return Object.freeze(visible);
}

export function sliceSvgPath(
  points: readonly Vec2[],
  progress: number,
  direction: "forward" | "reverse" = "forward",
): SvgRevealResult<SvgPathSlice> {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    return failure("invalid-progress", "Path progress must be in [0, 1].");
  if (direction !== "forward" && direction !== "reverse")
    return failure("invalid-progress", "Path direction is invalid.");
  const metrics = measureSvgPath(points);
  if (!metrics.ok) return metrics;
  const source =
    direction === "forward"
      ? metrics.value
      : {
          ...metrics.value,
          points: Object.freeze([...metrics.value.points].reverse()),
          segmentLengths: Object.freeze(
            [...metrics.value.segmentLengths].reverse(),
          ),
        };
  return {
    ok: true,
    value: Object.freeze({
      ...metrics.value,
      progress,
      direction,
      visiblePoints: forwardSlice(source, progress),
      visibleLength: metrics.value.totalLength * progress,
    }),
  };
}

export function createSvgStrokeDrawPlan(
  points: readonly Vec2[],
  progress: number,
  direction: "forward" | "reverse" = "forward",
): SvgRevealResult<SvgStrokeDrawPlan> {
  const sliced = sliceSvgPath(points, progress, direction);
  return sliced.ok
    ? {
        ok: true,
        value: Object.freeze({
          ...sliced.value,
          dashArray: sliced.value.totalLength,
          dashOffset:
            (direction === "forward" ? 1 - progress : progress - 1) *
            sliced.value.totalLength,
          arrowHeadVisible: progress === 1,
        }),
      }
    : sliced;
}

export function createSvgMaskPlan(
  bounds: SvgBounds,
  progress: number,
  axis: "horizontal" | "vertical",
  edge: "start" | "end",
  feather = 0,
): SvgRevealResult<SvgMaskPlan> {
  if (
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    bounds.width < 0 ||
    bounds.height < 0
  )
    return failure(
      "invalid-bounds",
      "Mask bounds must be finite and non-negative.",
    );
  if (
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 1 ||
    !Number.isFinite(feather) ||
    feather < 0 ||
    !["horizontal", "vertical"].includes(axis) ||
    !["start", "end"].includes(edge)
  )
    return failure("invalid-progress", "Mask reveal options are invalid.");
  const width = axis === "horizontal" ? bounds.width * progress : bounds.width;
  const height = axis === "vertical" ? bounds.height * progress : bounds.height;
  const x =
    axis === "horizontal" && edge === "end"
      ? bounds.x + bounds.width - width
      : bounds.x;
  const y =
    axis === "vertical" && edge === "end"
      ? bounds.y + bounds.height - height
      : bounds.y;
  return {
    ok: true,
    value: Object.freeze({
      clip: Object.freeze({ x, y, width, height }),
      feather,
    }),
  };
}

export function resolveSvgEmphasis(
  mode: "highlight" | "dim" | "isolate",
  intensity: number,
  dimMinimum = 0.2,
): SvgRevealResult<SvgEmphasisStyle> {
  if (
    !["highlight", "dim", "isolate"].includes(mode) ||
    !Number.isFinite(intensity) ||
    intensity < 0 ||
    intensity > 1 ||
    !Number.isFinite(dimMinimum) ||
    dimMinimum < 0 ||
    dimMinimum > 1
  )
    return failure("invalid-emphasis", "Emphasis values must be in [0, 1].");
  return {
    ok: true,
    value: Object.freeze({
      opacityMultiplier: mode === "dim" ? 1 - intensity * (1 - dimMinimum) : 1,
      accentIntensity: mode === "highlight" ? intensity : 0,
      isolated: mode === "isolate" && intensity > 0,
    }),
  };
}
