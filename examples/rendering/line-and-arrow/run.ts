import type { RepresentationId, SceneId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { createRenderFrame, renderItemId, rgba } from "@physica/renderer-core";
import { createSvgRenderPlan } from "@physica/renderer-svg";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Line-and-arrow fixture failed.");
  return result.value;
}

export function runLineAndArrow() {
  const frame = unwrap(
    createRenderFrame({
      sceneId: "00000000-0000-4000-8000-000000009a00" as SceneId,
      sourceRevision: 1,
      camera: {
        kind: "orthographic",
        viewport: { width: 400, height: 240, devicePixelRatio: 1 },
        position: vec3(0, 0, 10),
        target: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        near: 0.1,
        far: 100,
        verticalSpan: 4,
      },
      items: [
        {
          renderId: unwrap(renderItemId("example.svg:line")),
          representationId:
            "00000000-0000-4000-8000-000000009a01" as RepresentationId,
          backend: "svg",
          layer: "world-vector",
          zIndex: 0,
          registrationSequence: 0,
          primitive: {
            kind: "line-2d",
            start: vec3(-2, 0, 0),
            end: vec3(2, 0, 0),
            stroke: rgba(0.25, 0.7, 0.8),
            strokeWidth: 2,
          },
        },
        {
          renderId: unwrap(renderItemId("example.svg:arrow")),
          representationId:
            "00000000-0000-4000-8000-000000009a02" as RepresentationId,
          backend: "svg",
          layer: "annotation",
          zIndex: 1,
          registrationSequence: 1,
          primitive: {
            kind: "arrow-2d",
            start: vec3(0, -1, 0),
            end: vec3(2, 1, 0),
            stroke: rgba(1, 0.5, 0.2),
            strokeWidth: 3,
            headLength: 18,
            headWidth: 12,
          },
        },
      ],
    }),
  );
  const plan = unwrap(createSvgRenderPlan(frame));
  return {
    elementCount: plan.payload.elementCount,
    markup: plan.payload.markup,
    pickIds: plan.pickRegions.map(({ renderId }) => renderId),
  };
}
