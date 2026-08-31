import { readFileSync } from "node:fs";
import {
  DeterministicIdFactory,
  type RepresentationId,
  type SceneId,
} from "@physica/core-model";
import {
  createRenderFrame,
  renderItemId,
  resolveCameraPresentation,
  rgba,
  type RenderItem,
} from "@physica/renderer-core";
import { createPixiRenderPlan } from "@physica/renderer-pixi";
import { createSvgRenderPlan } from "@physica/renderer-svg";
import { createThreeRenderPlan } from "@physica/renderer-three";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runCameraFollow } from "./run";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Camera renderer integration failed.");
  return result.value;
}

function vec3(x: number, y: number, z: number) {
  return Object.freeze({ x, y, z });
}

describe("camera-follow example", () => {
  it("produces deterministic Camera motion without changing world motion", () => {
    expect(runCameraFollow()).toEqual(expected);
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain("Camera follows, physics does not move");
    expect(preview).toContain('role="img"');
  });

  it("projects one world point identically through SVG, Pixi and Three", () => {
    const ids = new DeterministicIdFactory(232_000);
    const sceneId = ids.sceneId() as SceneId;
    const worldPoint = vec3(2, 0, 0);
    const before = JSON.stringify(worldPoint);
    const camera = unwrap(
      resolveCameraPresentation(
        {
          kind: "orthographic",
          viewport: { width: 800, height: 400, devicePixelRatio: 1 },
          position: vec3(0, 0, 10),
          target: vec3(0, 0, 0),
          up: vec3(0, 1, 0),
          near: 0.1,
          far: 100,
          verticalSpan: 4,
        },
        [
          {
            sourceId: "shared-pan",
            operation: {
              kind: "pan",
              startOffset: vec3(0, 0, 0),
              endOffset: vec3(1, 0, 0),
            },
            progress: 1,
          },
          {
            sourceId: "shared-zoom",
            operation: { kind: "zoom", startZoom: 1, endZoom: 2 },
            progress: 1,
          },
        ],
      ),
    );
    const item = (
      backend: RenderItem["backend"],
      primitive: RenderItem["primitive"],
      sequence: number,
    ): RenderItem => ({
      renderId: unwrap(renderItemId("example.camera:" + backend)),
      representationId: ids.representationId() as RepresentationId,
      backend,
      layer:
        backend === "three"
          ? "world-3d"
          : backend === "pixi"
            ? "world-raster"
            : "world-vector",
      zIndex: sequence,
      registrationSequence: sequence,
      primitive,
    });
    const frame = unwrap(
      createRenderFrame({
        sceneId,
        sourceRevision: 1,
        camera,
        items: [
          item(
            "svg",
            {
              kind: "circle-2d",
              center: worldPoint,
              radius: 0.1,
              fill: rgba(1, 1, 1),
            },
            0,
          ),
          item(
            "pixi",
            {
              kind: "particle-cloud",
              positions: [worldPoint],
              radius: 2,
              fill: rgba(1, 1, 1),
            },
            1,
          ),
          item(
            "three",
            {
              kind: "vector-3d",
              origin: worldPoint,
              direction: vec3(0, 0.5, 0),
              color: rgba(1, 1, 1),
              shaftRadius: 0.02,
              headLength: 0.1,
              headRadius: 0.04,
            },
            2,
          ),
        ],
      }),
    );
    const svg = unwrap(createSvgRenderPlan(frame));
    const pixi = unwrap(createPixiRenderPlan(frame));
    const three = unwrap(createThreeRenderPlan(frame));
    const svgCenter =
      svg.pickRegions[0]?.kind === "circle"
        ? svg.pickRegions[0].center
        : undefined;
    const threeStart =
      three.pickRegions[0]?.kind === "segment"
        ? three.pickRegions[0].start
        : undefined;
    expect(svgCenter).toEqual({ x: 600, y: 200 });
    expect(pixi.payload.particles[0]).toMatchObject({ x: 600, y: 200 });
    expect(threeStart).toEqual({ x: 600, y: 200 });
    expect(three.payload.camera).toEqual(camera);
    expect(JSON.stringify(worldPoint)).toBe(before);
  });
});
