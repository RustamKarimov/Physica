import type { RepresentationId, SceneId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { describe, expect, it } from "vitest";
import { createRenderFrame, renderItemId, rgba } from "@physica/renderer-core";
import { createThreeRenderPlan } from "../src";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Unexpected renderer failure.");
  return result.value;
}

describe("Three renderer plan", () => {
  it("builds exact 3D vector geometry and projected semantic picking", () => {
    const frame = unwrap(
      createRenderFrame({
        sceneId: "00000000-0000-4000-8000-000000009300" as SceneId,
        sourceRevision: 0,
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
              "00000000-0000-4000-8000-000000009301" as RepresentationId,
            backend: "three",
            layer: "world-3d",
            zIndex: 0,
            registrationSequence: 0,
            primitive: {
              kind: "vector-3d",
              origin: vec3(0, 0, 0),
              direction: vec3(3, 4, 0),
              color: rgba(1, 0.4, 0.2),
              shaftRadius: 0.05,
              headLength: 0.6,
              headRadius: 0.16,
            },
          },
        ],
      }),
    );
    const plan = unwrap(createThreeRenderPlan(frame));
    expect(plan.payload.vectors[0]).toMatchObject({
      end: { x: 3, y: 4, z: 0 },
      length: 5,
      headLength: 0.6,
    });
    expect(plan.pickRegions[0]).toMatchObject({
      kind: "segment",
      renderId: "example.three:vector",
    });
  });
});
