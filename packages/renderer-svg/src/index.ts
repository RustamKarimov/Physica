import {
  createCameraService,
  pointInViewport,
  type Arrow2DPrimitive,
  type PickRegion,
  type RenderFrame,
  type RenderItem,
  type RenderPlan,
  type RenderResult,
  type RgbaColor,
  type Vec2,
  type Vec3,
} from "@physica/renderer-core";

export interface SvgPlanPayload {
  readonly width: number;
  readonly height: number;
  readonly markup: string;
  readonly elementCount: number;
}

export type SvgRenderPlan = RenderPlan<SvgPlanPayload> & {
  readonly backend: "svg";
};

function number(value: number): string {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(3).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "");
}

function color(value: RgbaColor): string {
  return `rgba(${Math.round(value.red * 255)},${Math.round(value.green * 255)},${Math.round(value.blue * 255)},${number(value.alpha)})`;
}

function semantic(region: PickRegion, item: RenderItem): PickRegion {
  return Object.freeze({
    ...region,
    renderId: item.renderId,
    representationId: item.representationId,
    ...(item.entityId ? { entityId: item.entityId } : {}),
    backend: item.backend,
    layer: item.layer,
    zIndex: item.zIndex,
    registrationSequence: item.registrationSequence,
  });
}

function arrowHead(
  start: Vec2,
  end: Vec2,
  primitive: Arrow2DPrimitive,
): readonly [Vec2, Vec2, Vec2] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const base = {
    x: end.x - ux * primitive.headLength,
    y: end.y - uy * primitive.headLength,
  };
  const halfWidth = primitive.headWidth / 2;
  return Object.freeze([
    end,
    Object.freeze({ x: base.x - uy * halfWidth, y: base.y + ux * halfWidth }),
    Object.freeze({ x: base.x + uy * halfWidth, y: base.y - ux * halfWidth }),
  ]);
}

function projectPoint(
  camera: ReturnType<typeof createCameraService> extends RenderResult<infer T>
    ? T
    : never,
  point: Vec3,
): RenderResult<Vec2> {
  const projected = camera.project(point);
  return projected.ok ? { ok: true, value: projected.value.screen } : projected;
}

export function createSvgRenderPlan(
  frame: RenderFrame,
): RenderResult<SvgRenderPlan> {
  const cameraResult = createCameraService(frame.camera);
  if (!cameraResult.ok) return cameraResult;
  const camera = cameraResult.value;
  const elements: string[] = [];
  const regions: PickRegion[] = [];
  for (const item of frame.items.filter(({ backend }) => backend === "svg")) {
    const primitive = item.primitive;
    if (primitive.kind === "background") {
      elements.push(
        `<rect data-render-id="${item.renderId}" x="0" y="0" width="${number(frame.camera.viewport.width)}" height="${number(frame.camera.viewport.height)}" fill="${color(primitive.color)}"/>`,
      );
      regions.push(
        semantic(
          {
            kind: "rectangle",
            minimum: { x: 0, y: 0 },
            maximum: {
              x: frame.camera.viewport.width,
              y: frame.camera.viewport.height,
            },
          } as PickRegion,
          item,
        ),
      );
      continue;
    }
    if (primitive.kind === "particle-cloud" || primitive.kind === "vector-3d")
      return {
        ok: false,
        error: {
          kind: "unsupported-primitive",
          renderId: item.renderId,
          backend: "svg",
          primitive: primitive.kind,
        },
      };
    if (primitive.kind === "line-2d" || primitive.kind === "arrow-2d") {
      const start = projectPoint(camera, primitive.start);
      const end = projectPoint(camera, primitive.end);
      if (!start.ok) return start;
      if (!end.ok) return end;
      elements.push(
        `<line data-render-id="${item.renderId}" x1="${number(start.value.x)}" y1="${number(start.value.y)}" x2="${number(end.value.x)}" y2="${number(end.value.y)}" stroke="${color(primitive.stroke)}" stroke-width="${number(primitive.strokeWidth)}" stroke-linecap="round"/>`,
      );
      regions.push(
        semantic(
          {
            kind: "segment",
            start: start.value,
            end: end.value,
            tolerance: Math.max(4, primitive.strokeWidth / 2),
          } as PickRegion,
          item,
        ),
      );
      if (primitive.kind === "arrow-2d") {
        const head = arrowHead(start.value, end.value, primitive);
        elements.push(
          `<polygon data-render-id="${item.renderId}:head" points="${head.map((point) => `${number(point.x)},${number(point.y)}`).join(" ")}" fill="${color(primitive.stroke)}"/>`,
        );
      }
      continue;
    }
    if (primitive.kind === "circle-2d") {
      const center = projectPoint(camera, primitive.center);
      const edge = projectPoint(camera, {
        x: primitive.center.x + primitive.radius,
        y: primitive.center.y,
        z: primitive.center.z,
      });
      if (!center.ok) return center;
      if (!edge.ok) return edge;
      const radius = Math.hypot(
        edge.value.x - center.value.x,
        edge.value.y - center.value.y,
      );
      if (!pointInViewport(center.value, frame.camera.viewport, radius))
        continue;
      elements.push(
        `<circle data-render-id="${item.renderId}" cx="${number(center.value.x)}" cy="${number(center.value.y)}" r="${number(radius)}" fill="${color(primitive.fill)}"${primitive.stroke ? ` stroke="${color(primitive.stroke)}"` : ""}${primitive.strokeWidth === undefined ? "" : ` stroke-width="${number(primitive.strokeWidth)}"`}/>`,
      );
      regions.push(
        semantic(
          { kind: "circle", center: center.value, radius } as PickRegion,
          item,
        ),
      );
      continue;
    }
    const points: Vec2[] = [];
    for (const point of primitive.points) {
      const projected = projectPoint(camera, point);
      if (!projected.ok) return projected;
      points.push(projected.value);
    }
    elements.push(
      `<polyline data-render-id="${item.renderId}" points="${points.map((point) => `${number(point.x)},${number(point.y)}`).join(" ")}" fill="${primitive.closed ? color({ ...primitive.stroke, alpha: primitive.stroke.alpha * 0.12 }) : "none"}" stroke="${color(primitive.stroke)}" stroke-width="${number(primitive.strokeWidth)}" stroke-linejoin="round"${primitive.closed ? "" : ' stroke-linecap="round"'}/>`,
    );
    regions.push(
      semantic(
        {
          kind: primitive.closed ? "polygon" : "segment",
          ...(primitive.closed
            ? { points }
            : {
                start: points[0]!,
                end: points.at(-1)!,
                tolerance: Math.max(4, primitive.strokeWidth / 2),
              }),
        } as PickRegion,
        item,
      ),
    );
  }
  const width = frame.camera.viewport.width;
  const height = frame.camera.viewport.height;
  return {
    ok: true,
    value: Object.freeze({
      backend: "svg",
      payload: Object.freeze({
        width,
        height,
        elementCount: elements.length,
        markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}" height="${number(height)}" viewBox="0 0 ${number(width)} ${number(height)}" role="img">${elements.join("")}</svg>`,
      }),
      pickRegions: Object.freeze(regions),
    }),
  };
}

export * from "./morph";
export * from "./reveal";
