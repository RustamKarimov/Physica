import type { RepresentationId, SceneId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { createRenderFrame, renderItemId, rgba } from "@physica/renderer-core";
import { createPixiRenderPlan } from "@physica/renderer-pixi";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Particle-cloud fixture failed.");
  return result.value;
}

export function runParticleCloud() {
  const positions = Object.freeze([
    vec3(-1, -1, 0),
    vec3(0, 0, 0),
    vec3(1, 1, 0),
    vec3(3, 0, 0),
    vec3(0, 3, 0),
    vec3(1, -1, 0),
  ]);
  const before = JSON.stringify(positions);
  const frame = unwrap(
    createRenderFrame({
      sceneId: "00000000-0000-4000-8000-000000009b00" as SceneId,
      sourceRevision: 1,
      camera: {
        kind: "orthographic",
        viewport: { width: 400, height: 400, devicePixelRatio: 1 },
        position: vec3(0, 0, 10),
        target: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        near: 0.1,
        far: 100,
        verticalSpan: 4,
      },
      items: [
        {
          renderId: unwrap(renderItemId("example.pixi:cloud")),
          representationId:
            "00000000-0000-4000-8000-000000009b01" as RepresentationId,
          backend: "pixi",
          layer: "world-raster",
          zIndex: 0,
          registrationSequence: 0,
          primitive: {
            kind: "particle-cloud",
            positions,
            radius: 3,
            fill: rgba(0.18, 0.76, 0.8),
            visualStride: 2,
          },
        },
      ],
    }),
  );
  const plan = unwrap(createPixiRenderPlan(frame));
  return {
    sourceParticleCount: plan.payload.sourceParticleCount,
    displayedParticleCount: plan.payload.displayedParticleCount,
    displayedCenters: plan.payload.particles.map(({ x, y }) => [x, y]),
    pickRegionCount: plan.pickRegions.length,
    sourceUnchanged: JSON.stringify(positions) === before,
  };
}
