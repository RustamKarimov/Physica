import type { RepresentationId } from "@physica/core-model";
import { createPickingService } from "@physica/picking";
import { renderItemId, type PickRegion } from "@physica/renderer-core";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Mixed-renderer selection fixture failed.");
  return result.value;
}

const representation = (suffix: string) =>
  `00000000-0000-4000-8000-000000009d${suffix}` as RepresentationId;

export function runMixedRendererSelection() {
  const shuffled: readonly PickRegion[] = [
    {
      kind: "rectangle",
      minimum: { x: 88, y: 88 },
      maximum: { x: 112, y: 112 },
      renderId: unwrap(renderItemId("example.three:vector")),
      representationId: representation("03"),
      backend: "three",
      layer: "world-3d",
      zIndex: 99,
      registrationSequence: 2,
    },
    {
      kind: "segment",
      start: { x: 80, y: 100 },
      end: { x: 120, y: 100 },
      tolerance: 5,
      renderId: unwrap(renderItemId("example.svg:annotation")),
      representationId: representation("01"),
      backend: "svg",
      layer: "annotation",
      zIndex: 0,
      registrationSequence: 0,
    },
    {
      kind: "circle",
      center: { x: 100, y: 100 },
      radius: 14,
      renderId: unwrap(renderItemId("example.pixi:particle")),
      representationId: representation("02"),
      backend: "pixi",
      layer: "world-raster",
      zIndex: 99,
      registrationSequence: 1,
    },
  ];
  const hits = unwrap(createPickingService(shuffled)).pick({ x: 100, y: 100 });
  return {
    renderOrder: hits.map(({ renderId }) => renderId),
    backendOrder: hits.map(({ backend }) => backend),
    semanticIdsOnly: hits.every(
      (hit) => !("object3D" in hit) && !("displayObject" in hit),
    ),
  };
}
