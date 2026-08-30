import type { RepresentationId, SceneId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { describe, expect, it } from "vitest";
import {
  createRenderFrame,
  renderItemId,
  rgba,
  type RenderFrame,
} from "@physica/renderer-core";
import { createSvgRenderPlan } from "../src";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Unexpected renderer failure.");
  return result.value;
}

const SCENE = "00000000-0000-4000-8000-000000009100" as SceneId;
const REPRESENTATION =
  "00000000-0000-4000-8000-000000009101" as RepresentationId;

function frame(): RenderFrame {
  return unwrap(
    createRenderFrame({
      sceneId: SCENE,
      sourceRevision: 0,
      camera: {
        kind: "orthographic",
        viewport: { width: 400, height: 200, devicePixelRatio: 1 },
        position: vec3(0, 0, 10),
        target: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        near: 0.1,
        far: 100,
        verticalSpan: 4,
      },
      items: [
        {
          renderId: unwrap(renderItemId("example.svg:arrow")),
          representationId: REPRESENTATION,
          backend: "svg",
          layer: "world-vector",
          zIndex: 0,
          registrationSequence: 0,
          primitive: {
            kind: "arrow-2d",
            start: vec3(-2, 0, 0),
            end: vec3(2, 1, 0),
            stroke: rgba(0.2, 0.8, 0.7),
            strokeWidth: 3,
            headLength: 18,
            headWidth: 12,
          },
        },
      ],
    }),
  );
}

describe("SVG renderer", () => {
  it("produces stable projected markup and semantic picking", () => {
    const first = unwrap(createSvgRenderPlan(frame()));
    const second = unwrap(createSvgRenderPlan(frame()));
    expect(first).toEqual(second);
    expect(first.payload.markup).toContain(
      'x1="100" y1="100" x2="300" y2="50"',
    );
    expect(first.payload.markup).toContain("<polygon");
    expect(first.pickRegions[0]).toMatchObject({
      renderId: "example.svg:arrow",
      representationId: REPRESENTATION,
      kind: "segment",
    });
  });
});
