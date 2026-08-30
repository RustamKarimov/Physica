import { DeterministicIdFactory } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { createRenderFrame, renderItemId, rgba } from "@physica/renderer-core";
import { createSvgRenderPlan } from "@physica/renderer-svg";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Hello Stage rendering failed.");
  return result.value;
}

export function runHelloStage() {
  const ids = new DeterministicIdFactory(100);
  const sceneId = ids.sceneId();
  const representationId = ids.representationId();
  const frame = unwrap(
    createRenderFrame({
      sceneId,
      sourceRevision: 0,
      camera: {
        kind: "orthographic",
        viewport: { width: 320, height: 180, devicePixelRatio: 1 },
        position: vec3(0, 0, 10),
        target: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        near: 0.1,
        far: 100,
        verticalSpan: 4,
      },
      items: [
        {
          renderId: unwrap(renderItemId("physica.example:hello-stage")),
          representationId,
          backend: "svg",
          layer: "world-vector",
          zIndex: 0,
          registrationSequence: 0,
          primitive: {
            kind: "circle-2d",
            center: vec3(0, 0, 0),
            radius: 0.8,
            fill: rgba(0.176, 0.761, 0.796),
            stroke: rgba(0.91, 0.95, 0.96),
            strokeWidth: 3,
          },
        },
      ],
    }),
  );
  const plan = unwrap(createSvgRenderPlan(frame));
  return {
    id: "hello-stage",
    sceneId,
    representationId,
    backend: plan.backend,
    width: plan.payload.width,
    height: plan.payload.height,
    elementCount: plan.payload.elementCount,
    semanticPickIds: plan.pickRegions.map(({ renderId }) => renderId),
    deterministic:
      plan.payload.markup === unwrap(createSvgRenderPlan(frame)).payload.markup,
  };
}
