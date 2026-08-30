import type { JsonValue } from "@physica/core-model";
import { magnitudeVec3, type Vec2, type Vec3 } from "@physica/mathematics";
import { createCameraService } from "./camera";
import type { RenderResult } from "./errors";
import {
  RENDER_LAYER_ORDER,
  type PickRegion,
  type RenderFrame,
  type RenderFrameInput,
  type RenderItem,
  type RenderItemId,
  type RenderPrimitive,
  type RendererBackend,
  type RenderLayer,
  type RgbaColor,
  type Viewport,
} from "./types";

function finiteVec2(value: Vec2): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

function finiteVec3(value: Vec3): boolean {
  return (
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  );
}

export function validColor(color: RgbaColor): boolean {
  return [color.red, color.green, color.blue, color.alpha].every(
    (component) =>
      Number.isFinite(component) && component >= 0 && component <= 1,
  );
}

function compatible(backend: RendererBackend, layer: RenderLayer): boolean {
  return (
    (backend === "svg" &&
      ["background", "world-vector", "annotation", "overlay"].includes(
        layer,
      )) ||
    (backend === "pixi" && layer === "world-raster") ||
    (backend === "three" && layer === "world-3d")
  );
}

function validPrimitive(primitive: RenderPrimitive): boolean {
  if (primitive.kind === "background") return validColor(primitive.color);
  if (primitive.kind === "line-2d")
    return (
      finiteVec3(primitive.start) &&
      finiteVec3(primitive.end) &&
      magnitudeVec3({
        x: primitive.end.x - primitive.start.x,
        y: primitive.end.y - primitive.start.y,
        z: primitive.end.z - primitive.start.z,
      }) > 0 &&
      validColor(primitive.stroke) &&
      Number.isFinite(primitive.strokeWidth) &&
      primitive.strokeWidth >= 0
    );
  if (primitive.kind === "arrow-2d")
    return (
      finiteVec3(primitive.start) &&
      finiteVec3(primitive.end) &&
      magnitudeVec3({
        x: primitive.end.x - primitive.start.x,
        y: primitive.end.y - primitive.start.y,
        z: primitive.end.z - primitive.start.z,
      }) > 0 &&
      validColor(primitive.stroke) &&
      [primitive.strokeWidth, primitive.headLength, primitive.headWidth].every(
        (value) => Number.isFinite(value) && value >= 0,
      )
    );
  if (primitive.kind === "circle-2d")
    return (
      finiteVec3(primitive.center) &&
      Number.isFinite(primitive.radius) &&
      primitive.radius >= 0 &&
      validColor(primitive.fill) &&
      (primitive.stroke === undefined || validColor(primitive.stroke)) &&
      (primitive.strokeWidth === undefined ||
        (Number.isFinite(primitive.strokeWidth) && primitive.strokeWidth >= 0))
    );
  if (primitive.kind === "polyline-2d")
    return (
      primitive.points.length >= 2 &&
      primitive.points.every(finiteVec3) &&
      validColor(primitive.stroke) &&
      Number.isFinite(primitive.strokeWidth) &&
      primitive.strokeWidth >= 0
    );
  if (primitive.kind === "particle-cloud")
    return (
      primitive.positions.every(finiteVec3) &&
      Number.isFinite(primitive.radius) &&
      primitive.radius >= 0 &&
      validColor(primitive.fill) &&
      (primitive.visualStride === undefined ||
        (Number.isSafeInteger(primitive.visualStride) &&
          primitive.visualStride >= 1))
    );
  return (
    finiteVec3(primitive.origin) &&
    finiteVec3(primitive.direction) &&
    magnitudeVec3(primitive.direction) > 0 &&
    validColor(primitive.color) &&
    [primitive.shaftRadius, primitive.headLength, primitive.headRadius].every(
      (value) => Number.isFinite(value) && value >= 0,
    )
  );
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze)) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, deepFreeze(entry)]),
      ),
    ) as T;
  return value;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value as JsonValue);
}

export function compareRenderItems(
  left: RenderItem,
  right: RenderItem,
): number {
  return (
    RENDER_LAYER_ORDER[left.layer] - RENDER_LAYER_ORDER[right.layer] ||
    left.zIndex - right.zIndex ||
    left.renderId.localeCompare(right.renderId) ||
    left.registrationSequence - right.registrationSequence
  );
}

export function createRenderFrame(
  input: RenderFrameInput,
): RenderResult<RenderFrame> {
  if (!Number.isSafeInteger(input.sourceRevision) || input.sourceRevision < 0)
    return {
      ok: false,
      error: {
        kind: "invalid-render-frame",
        message: "Source revision must be a non-negative safe integer.",
      },
    };
  const camera = createCameraService(input.camera);
  if (!camera.ok) return camera;
  const seen = new Set<RenderItemId>();
  for (const item of input.items) {
    if (seen.has(item.renderId))
      return {
        ok: false,
        error: { kind: "duplicate-render-item", renderId: item.renderId },
      };
    seen.add(item.renderId);
    if (
      !Number.isSafeInteger(item.registrationSequence) ||
      item.registrationSequence < 0 ||
      !Number.isFinite(item.zIndex)
    )
      return {
        ok: false,
        error: {
          kind: "invalid-primitive",
          renderId: item.renderId,
          message: "Ordering metadata is invalid.",
        },
      };
    if (!compatible(item.backend, item.layer))
      return {
        ok: false,
        error: {
          kind: "invalid-layer-backend",
          renderId: item.renderId,
          backend: item.backend,
          layer: item.layer,
        },
      };
    if (!validPrimitive(item.primitive))
      return {
        ok: false,
        error: {
          kind: "invalid-primitive",
          renderId: item.renderId,
          message: "Primitive contains invalid or degenerate geometry.",
        },
      };
  }
  return {
    ok: true,
    value: deepFreeze({
      schemaVersion: 1,
      sceneId: input.sceneId,
      sourceRevision: input.sourceRevision,
      camera: camera.value.definition,
      items: [...input.items].sort(compareRenderItems),
    }),
  };
}

export interface RenderFrameDiff {
  readonly added: readonly RenderItemId[];
  readonly changed: readonly RenderItemId[];
  readonly unchanged: readonly RenderItemId[];
  readonly removed: readonly RenderItemId[];
}

export function diffRenderFrames(
  previous: RenderFrame,
  next: RenderFrame,
): RenderFrameDiff {
  const before = new Map(previous.items.map((item) => [item.renderId, item]));
  const after = new Map(next.items.map((item) => [item.renderId, item]));
  const added: RenderItemId[] = [];
  const changed: RenderItemId[] = [];
  const unchanged: RenderItemId[] = [];
  for (const item of next.items) {
    const old = before.get(item.renderId);
    if (!old) added.push(item.renderId);
    else if (canonical(old) === canonical(item)) unchanged.push(item.renderId);
    else changed.push(item.renderId);
  }
  const removed = previous.items
    .filter((item) => !after.has(item.renderId))
    .map((item) => item.renderId);
  return deepFreeze({ added, changed, unchanged, removed });
}

export function pointInViewport(
  point: Vec2,
  viewport: Viewport,
  margin = 0,
): boolean {
  return (
    Number.isFinite(margin) &&
    point.x >= -margin &&
    point.y >= -margin &&
    point.x <= viewport.width + margin &&
    point.y <= viewport.height + margin
  );
}

export function validatePickRegion(region: PickRegion): RenderResult<void> {
  let valid =
    Number.isFinite(region.zIndex) &&
    Number.isSafeInteger(region.registrationSequence) &&
    region.registrationSequence >= 0;
  if (region.kind === "circle")
    valid =
      valid &&
      finiteVec2(region.center) &&
      Number.isFinite(region.radius) &&
      region.radius >= 0;
  if (region.kind === "segment")
    valid =
      valid &&
      finiteVec2(region.start) &&
      finiteVec2(region.end) &&
      Number.isFinite(region.tolerance) &&
      region.tolerance >= 0;
  if (region.kind === "rectangle")
    valid =
      valid &&
      finiteVec2(region.minimum) &&
      finiteVec2(region.maximum) &&
      region.minimum.x <= region.maximum.x &&
      region.minimum.y <= region.maximum.y;
  if (region.kind === "polygon")
    valid =
      valid && region.points.length >= 3 && region.points.every(finiteVec2);
  return valid
    ? { ok: true, value: undefined }
    : {
        ok: false,
        error: {
          kind: "invalid-pick-region",
          renderId: region.renderId,
          message: "Pick region geometry or ordering metadata is invalid.",
        },
      };
}
