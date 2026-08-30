import type { RepresentationId, SceneId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { createPickingService } from "@physica/picking";
import {
  createRenderFrame,
  renderItemId,
  rgba,
  type RenderFrame,
  type RenderItemId,
} from "@physica/renderer-core";
import { createPixiRenderPlan } from "@physica/renderer-pixi";
import { createSvgRenderPlan } from "@physica/renderer-svg";
import { createThreeRenderPlan } from "@physica/renderer-three";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("The rendering demonstration is invalid.");
  return result.value;
}

function id(value: string): RenderItemId {
  return unwrap(renderItemId(value));
}

function particlePositions(count: number) {
  let state = 0x51f15e;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
  return Object.freeze(
    Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * 3.2;
      return vec3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.58,
        (random() - 0.5) * 1.4,
      );
    }),
  );
}

const SCENE = "00000000-0000-4000-8000-000000009900" as SceneId;
const REPRESENTATIONS = {
  particles: "00000000-0000-4000-8000-000000009901" as RepresentationId,
  vector: "00000000-0000-4000-8000-000000009902" as RepresentationId,
  axis: "00000000-0000-4000-8000-000000009903" as RepresentationId,
  force: "00000000-0000-4000-8000-000000009904" as RepresentationId,
};

export const DEMO_WIDTH = 720;
export const DEMO_HEIGHT = 440;

export const renderingFrame: RenderFrame = unwrap(
  createRenderFrame({
    sceneId: SCENE,
    sourceRevision: 9,
    camera: {
      kind: "perspective",
      viewport: { width: DEMO_WIDTH, height: DEMO_HEIGHT, devicePixelRatio: 1 },
      position: vec3(0, 0.4, 11),
      target: vec3(0, 0, 0),
      up: vec3(0, 1, 0),
      near: 0.1,
      far: 100,
      verticalFieldOfViewRadians: Math.PI / 3.1,
    },
    items: [
      {
        renderId: id("physica.svg:axis"),
        representationId: REPRESENTATIONS.axis,
        backend: "svg",
        layer: "world-vector",
        zIndex: 0,
        registrationSequence: 0,
        primitive: {
          kind: "line-2d",
          start: vec3(-4.6, -1.7, 0),
          end: vec3(4.6, -1.7, 0),
          stroke: rgba(0.32, 0.42, 0.5, 0.72),
          strokeWidth: 1.4,
        },
      },
      {
        renderId: id("physica.three:vector"),
        representationId: REPRESENTATIONS.vector,
        backend: "three",
        layer: "world-3d",
        zIndex: 1,
        registrationSequence: 1,
        primitive: {
          kind: "vector-3d",
          origin: vec3(-1.6, -0.7, 0.2),
          direction: vec3(3.4, 2.35, 0.8),
          color: rgba(0.95, 0.37, 0.22),
          shaftRadius: 0.07,
          headLength: 0.55,
          headRadius: 0.19,
        },
      },
      {
        renderId: id("physica.pixi:particles"),
        representationId: REPRESENTATIONS.particles,
        backend: "pixi",
        layer: "world-raster",
        zIndex: 2,
        registrationSequence: 2,
        primitive: {
          kind: "particle-cloud",
          positions: particlePositions(220),
          radius: 2.6,
          fill: rgba(0.18, 0.76, 0.8, 0.82),
        },
      },
      {
        renderId: id("physica.svg:force"),
        representationId: REPRESENTATIONS.force,
        backend: "svg",
        layer: "annotation",
        zIndex: 3,
        registrationSequence: 3,
        primitive: {
          kind: "arrow-2d",
          start: vec3(-2.5, 1.25, 0),
          end: vec3(-0.65, 2.05, 0),
          stroke: rgba(0.98, 0.78, 0.25),
          strokeWidth: 3,
          headLength: 18,
          headWidth: 12,
        },
      },
    ],
  }),
);

export const svgPlan = unwrap(createSvgRenderPlan(renderingFrame));
export const pixiPlan = unwrap(createPixiRenderPlan(renderingFrame));
export const threePlan = unwrap(createThreeRenderPlan(renderingFrame));
export const pickingService = unwrap(
  createPickingService([
    ...threePlan.pickRegions,
    ...pixiPlan.pickRegions,
    ...svgPlan.pickRegions,
  ]),
);
