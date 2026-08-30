import type { RepresentationId, SceneId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { createRenderFrame, renderItemId, rgba } from "@physica/renderer-core";
import { createThreeRenderPlan } from "@physica/renderer-three";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("3D-vector fixture failed.");
  return result.value;
}

export function run3dVectorScene() {
  const clean = (value: number) => Number(value.toFixed(12));
  const frame = unwrap(
    createRenderFrame({
      sceneId: "00000000-0000-4000-8000-000000009c00" as SceneId,
      sourceRevision: 1,
      camera: {
        kind: "perspective",
        viewport: { width: 600, height: 400, devicePixelRatio: 1 },
        position: vec3(0, 0, 10),
        target: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        near: 0.1,
        far: 100,
        verticalFieldOfViewRadians: Math.PI / 2,
      },
      items: [
        {
          renderId: unwrap(renderItemId("example.three:vector")),
          representationId:
            "00000000-0000-4000-8000-000000009c01" as RepresentationId,
          backend: "three",
          layer: "world-3d",
          zIndex: 0,
          registrationSequence: 0,
          primitive: {
            kind: "vector-3d",
            origin: vec3(0, 0, 0),
            direction: vec3(3, 4, 0),
            color: rgba(0.95, 0.37, 0.22),
            shaftRadius: 0.05,
            headLength: 0.6,
            headRadius: 0.16,
          },
        },
      ],
    }),
  );
  const plan = unwrap(createThreeRenderPlan(frame));
  const vector = plan.payload.vectors[0]!;
  const region = plan.pickRegions[0];
  if (!region || region.kind !== "segment")
    throw new Error("Expected projected vector segment.");
  return {
    origin: [vector.origin.x, vector.origin.y, vector.origin.z],
    end: [vector.end.x, vector.end.y, vector.end.z],
    length: vector.length,
    projectedStart: [clean(region.start.x), clean(region.start.y)],
    projectedEnd: [clean(region.end.x), clean(region.end.y)],
    headLength: vector.headLength,
  };
}
