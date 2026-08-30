import type { RepresentationId } from "@physica/core-model";
import { describe, expect, it } from "vitest";
import { renderItemId, type PickRegion } from "@physica/renderer-core";
import { createPickingService } from "../src";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Unexpected renderer failure.");
  return result.value;
}

const REPRESENTATION =
  "00000000-0000-4000-8000-000000009401" as RepresentationId;

function region(
  backend: "svg" | "pixi" | "three",
  layer: PickRegion["layer"],
  zIndex: number,
): PickRegion {
  return {
    kind: "circle",
    center: { x: 100, y: 100 },
    radius: 20,
    renderId: unwrap(renderItemId(`test.pick:${backend}`)),
    representationId: REPRESENTATION,
    backend,
    layer,
    zIndex,
    registrationSequence: zIndex + 10,
  };
}

describe("shared picking", () => {
  it("orders overlapping renderer hits independently of provider order", () => {
    const svg = region("svg", "world-vector", 3);
    const pixi = region("pixi", "world-raster", 99);
    const three = region("three", "world-3d", 999);
    const first = unwrap(createPickingService([pixi, svg, three])).pick({
      x: 100,
      y: 100,
    });
    const second = unwrap(createPickingService([three, pixi, svg])).pick({
      x: 100,
      y: 100,
    });
    expect(first.map(({ backend }) => backend)).toEqual([
      "svg",
      "pixi",
      "three",
    ]);
    expect(second).toEqual(first);
    expect(Object.keys(first[0]!)).not.toContain("object3D");
  });

  it("supports segment, rectangle and polygon boundaries", () => {
    const base = {
      renderId: unwrap(renderItemId("test.pick:geometry")),
      representationId: REPRESENTATION,
      backend: "svg" as const,
      layer: "overlay" as const,
      zIndex: 0,
      registrationSequence: 0,
    };
    const service = unwrap(
      createPickingService([
        {
          ...base,
          kind: "segment",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          tolerance: 2,
        },
        {
          ...base,
          renderId: unwrap(renderItemId("test.pick:rectangle")),
          kind: "rectangle",
          minimum: { x: 20, y: 20 },
          maximum: { x: 30, y: 30 },
        },
        {
          ...base,
          renderId: unwrap(renderItemId("test.pick:polygon")),
          kind: "polygon",
          points: [
            { x: 40, y: 40 },
            { x: 50, y: 40 },
            { x: 45, y: 50 },
          ],
        },
      ]),
    );
    expect(service.pick({ x: 5, y: 1 })).toHaveLength(1);
    expect(service.pick({ x: 25, y: 25 })).toHaveLength(1);
    expect(service.pick({ x: 45, y: 45 })).toHaveLength(1);
  });
});
