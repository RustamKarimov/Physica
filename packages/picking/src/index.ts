import type { EntityId, RepresentationId } from "@physica/core-model";
import {
  RENDER_LAYER_ORDER,
  validatePickRegion,
  type PickRegion,
  type RenderItemId,
  type RendererBackend,
  type RenderLayer,
  type RenderResult,
  type Vec2,
  type Vec3,
} from "@physica/renderer-core";

export interface PickResult {
  readonly renderId: RenderItemId;
  readonly representationId: RepresentationId;
  readonly entityId?: EntityId;
  readonly backend: RendererBackend;
  readonly layer: RenderLayer;
  readonly screenPoint: Vec2;
  readonly worldPoint?: Vec3;
  readonly depth?: number;
  readonly hitDistance: number;
  readonly zIndex: number;
  readonly registrationSequence: number;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const amount = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  );
  return distance(point, {
    x: start.x + dx * amount,
    y: start.y + dy * amount,
  });
}

function insidePolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const currentPoint = polygon[index]!;
    const previousPoint = polygon[previous]!;
    if (
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    )
      inside = !inside;
  }
  return inside;
}

function hitDistance(region: PickRegion, point: Vec2): number | undefined {
  if (region.kind === "circle") {
    const result = distance(point, region.center);
    return result <= region.radius ? result : undefined;
  }
  if (region.kind === "segment") {
    const result = segmentDistance(point, region.start, region.end);
    return result <= region.tolerance ? result : undefined;
  }
  if (region.kind === "rectangle")
    return point.x >= region.minimum.x &&
      point.x <= region.maximum.x &&
      point.y >= region.minimum.y &&
      point.y <= region.maximum.y
      ? 0
      : undefined;
  return insidePolygon(point, region.points) ? 0 : undefined;
}

function freezeRegion(region: PickRegion): PickRegion {
  return Object.freeze({
    ...region,
    ...(region.kind === "polygon"
      ? {
          points: Object.freeze(
            region.points.map((point) => Object.freeze({ ...point })),
          ),
        }
      : {}),
  });
}

export class PickingService {
  private constructor(private readonly regions: readonly PickRegion[]) {}

  static create(regions: readonly PickRegion[]): RenderResult<PickingService> {
    for (const region of regions) {
      const validation = validatePickRegion(region);
      if (!validation.ok) return validation;
    }
    return {
      ok: true,
      value: new PickingService(
        Object.freeze(regions.map((region) => freezeRegion(region))),
      ),
    };
  }

  pick(screenPoint: Vec2): readonly PickResult[] {
    if (!Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y))
      return Object.freeze([]);
    const results = this.regions.flatMap((region) => {
      const hit = hitDistance(region, screenPoint);
      return hit === undefined
        ? []
        : [
            Object.freeze({
              renderId: region.renderId,
              representationId: region.representationId,
              ...(region.entityId ? { entityId: region.entityId } : {}),
              backend: region.backend,
              layer: region.layer,
              screenPoint: Object.freeze({ ...screenPoint }),
              ...(region.worldPoint
                ? { worldPoint: Object.freeze({ ...region.worldPoint }) }
                : {}),
              ...(region.depth === undefined ? {} : { depth: region.depth }),
              hitDistance: hit,
              zIndex: region.zIndex,
              registrationSequence: region.registrationSequence,
            }),
          ];
    });
    return Object.freeze(
      results.sort(
        (left, right) =>
          RENDER_LAYER_ORDER[right.layer] - RENDER_LAYER_ORDER[left.layer] ||
          right.zIndex - left.zIndex ||
          left.hitDistance - right.hitDistance ||
          left.renderId.localeCompare(right.renderId) ||
          left.registrationSequence - right.registrationSequence,
      ),
    );
  }
}

export function createPickingService(
  regions: readonly PickRegion[],
): RenderResult<PickingService> {
  return PickingService.create(regions);
}
