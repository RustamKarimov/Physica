import {
  DeterministicIdFactory,
  type RepresentationId,
  type SceneId,
} from "@physica/core-model";
import { vec2, vec3 } from "@physica/mathematics";
import { describe, expect, it } from "vitest";
import {
  createCameraService,
  createRenderFrame,
  diffRenderFrames,
  renderItemId,
  rgba,
  type CameraDefinition,
  type RenderItem,
} from "../src";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Unexpected renderer failure.");
  return result.value;
}

const SCENE = "00000000-0000-4000-8000-000000009000" as SceneId;
const REPRESENTATION =
  "00000000-0000-4000-8000-000000009001" as RepresentationId;

function camera(
  kind: "orthographic" | "perspective" = "orthographic",
): CameraDefinition {
  const base = {
    viewport: { width: 800, height: 400, devicePixelRatio: 1 },
    position: vec3(0, 0, 10),
    target: vec3(0, 0, 0),
    up: vec3(0, 1, 0),
    near: 0.1,
    far: 100,
  };
  return kind === "orthographic"
    ? { ...base, kind, verticalSpan: 4 }
    : { ...base, kind, verticalFieldOfViewRadians: Math.PI / 2 };
}

function line(id: string, zIndex = 0, sequence = 0): RenderItem {
  return {
    renderId: unwrap(renderItemId(id)),
    representationId: REPRESENTATION,
    backend: "svg",
    layer: "world-vector",
    zIndex,
    registrationSequence: sequence,
    primitive: {
      kind: "line-2d",
      start: vec3(-1, 0, 0),
      end: vec3(1, 0, 0),
      stroke: rgba(1, 1, 1),
      strokeWidth: 2,
    },
  };
}

describe("shared camera", () => {
  it("projects right-handed +y upward into screen y downward and round-trips", () => {
    const service = unwrap(createCameraService(camera()));
    const projected = unwrap(service.project(vec3(0, 1, 0)));
    expect(projected.screen).toEqual(vec2(400, 100));
    expect(projected.visible).toBe(true);
    const restored = unwrap(
      service.unprojectOrthographic(projected.screen, projected.depth),
    );
    expect(restored.x).toBeCloseTo(0, 12);
    expect(restored.y).toBeCloseTo(1, 12);
    expect(restored.z).toBeCloseTo(0, 12);
  });

  it("constructs a centered perspective ray and rejects degenerate bases", () => {
    const service = unwrap(createCameraService(camera("perspective")));
    const ray = unwrap(service.screenRay(vec2(400, 200)));
    expect(ray.direction).toEqual(vec3(0, 0, -1));
    expect(
      createCameraService({ ...camera(), up: vec3(0, 0, -1) }),
    ).toMatchObject({ ok: false, error: { kind: "invalid-camera" } });
  });

  it("applies presentation transforms without mutating physical input", () => {
    const world = vec3(0, 0, 0);
    const service = unwrap(
      createCameraService({
        ...camera(),
        presentationTransform: {
          translation: vec2(20, -10),
          rotationRadians: 0,
          scale: vec2(1, 1),
        },
      }),
    );
    expect(unwrap(service.project(world)).screen).toEqual(vec2(420, 190));
    expect(world).toEqual(vec3(0, 0, 0));
  });
});

describe("deterministic render frames", () => {
  it("sorts layers/items, rejects duplicates and remains immutable", () => {
    const ids = new DeterministicIdFactory(9000);
    const background: RenderItem = {
      renderId: unwrap(renderItemId("test.render:background")),
      representationId: ids.representationId(),
      backend: "svg",
      layer: "background",
      zIndex: 99,
      registrationSequence: 0,
      primitive: { kind: "background", color: rgba(0, 0, 0) },
    };
    const first = line("test.render:b", 0, 2);
    const second = line("test.render:a", 0, 1);
    const frame = unwrap(
      createRenderFrame({
        sceneId: SCENE,
        sourceRevision: 1,
        camera: camera(),
        items: [first, second, background],
      }),
    );
    expect(frame.items.map(({ renderId }) => renderId)).toEqual([
      "test.render:background",
      "test.render:a",
      "test.render:b",
    ]);
    expect(Object.isFrozen(frame.items)).toBe(true);
    expect(
      createRenderFrame({
        sceneId: SCENE,
        sourceRevision: 1,
        camera: camera(),
        items: [first, first],
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "duplicate-render-item" },
    });
  });

  it("reports deterministic dirty-frame changes", () => {
    const before = unwrap(
      createRenderFrame({
        sceneId: SCENE,
        sourceRevision: 1,
        camera: camera(),
        items: [line("test.diff:stable"), line("test.diff:removed")],
      }),
    );
    const after = unwrap(
      createRenderFrame({
        sceneId: SCENE,
        sourceRevision: 2,
        camera: camera(),
        items: [line("test.diff:stable"), line("test.diff:added", 1)],
      }),
    );
    expect(diffRenderFrames(before, after)).toEqual({
      added: ["test.diff:added"],
      changed: [],
      unchanged: ["test.diff:stable"],
      removed: ["test.diff:removed"],
    });
  });
});
