import type { RepresentationId, SceneId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { describe, expect, it } from "vitest";
import { createRenderFrame, renderItemId, rgba } from "@physica/renderer-core";
import { createPixiRenderPlan } from "../src";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Unexpected renderer failure.");
  return result.value;
}

describe("Pixi renderer plan", () => {
  it("selects and culls 10,000 particles without mutating source state", () => {
    const positions = Object.freeze(
      Array.from({ length: 10_000 }, (_, index) =>
        vec3((index % 100) / 25 - 2, Math.floor(index / 100) / 25 - 2, 0),
      ),
    );
    const before = JSON.stringify(positions);
    const frame = unwrap(
      createRenderFrame({
        sceneId: "00000000-0000-4000-8000-000000009200" as SceneId,
        sourceRevision: 0,
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
              "00000000-0000-4000-8000-000000009201" as RepresentationId,
            backend: "pixi",
            layer: "world-raster",
            zIndex: 0,
            registrationSequence: 0,
            primitive: {
              kind: "particle-cloud",
              positions,
              radius: 2,
              fill: rgba(0.4, 0.8, 1),
              visualStride: 10,
            },
          },
        ],
      }),
    );
    const plan = unwrap(createPixiRenderPlan(frame));
    expect(plan.payload.sourceParticleCount).toBe(10_000);
    expect(plan.payload.displayedParticleCount).toBeGreaterThan(0);
    expect(plan.payload.displayedParticleCount).toBeLessThanOrEqual(1_000);
    expect(plan.payload.displayedParticleCount).toBe(plan.pickRegions.length);
    expect(JSON.stringify(positions)).toBe(before);
  });
});
