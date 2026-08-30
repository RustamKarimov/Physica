import {
  DeterministicIdFactory,
  type RepresentationId,
} from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import {
  createRenderFrame,
  renderItemId,
  resolveCameraPresentation,
  rgba,
  type CameraDefinition,
  type RenderItem,
} from "@physica/renderer-core";
import { createSvgRenderPlan } from "@physica/renderer-svg";
import {
  compileCameraAnimationSchedule,
  evaluateCameraAnimationSchedule,
  type CameraAnimationDefinition,
} from "@physica/storyboard";
import { DEMO_HEIGHT, DEMO_WIDTH } from "./rendering-demo";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("The Camera demonstration is invalid.");
  return result.value;
}

const ids = new DeterministicIdFactory(231_000);
const sceneId = ids.sceneId();
const projectileId = ids.representationId();
const pathId = ids.representationId();
const baseCamera: CameraDefinition = {
  kind: "orthographic",
  viewport: { width: DEMO_WIDTH, height: DEMO_HEIGHT, devicePixelRatio: 1 },
  position: vec3(0, 0, 12),
  target: vec3(0, 0.5, 0),
  up: vec3(0, 1, 0),
  near: 0.1,
  far: 100,
  verticalSpan: 8,
};
const common = {
  target: { kind: "scene" as const, sceneId },
  clockKey: "presentation" as const,
  easing: { kind: "named" as const, id: "ease-in-out" as const },
  reversible: true,
  scrubbable: true,
};
const definitions: readonly CameraAnimationDefinition[] = [
  {
    ...common,
    id: ids.storyboardStepId(),
    name: "Establishing pan",
    startTimeSeconds: 0,
    durationSeconds: 1.25,
    priority: 0,
    operation: {
      kind: "pan",
      startOffset: vec3(0, 0, 0),
      endOffset: vec3(1, 0.4, 0),
    },
  },
  {
    ...common,
    id: ids.storyboardStepId(),
    name: "Zoom into motion",
    startTimeSeconds: 0,
    durationSeconds: 4,
    priority: 1,
    operation: { kind: "zoom", startZoom: 1, endZoom: 1.8 },
  },
  {
    ...common,
    id: ids.storyboardStepId(),
    name: "Follow projectile",
    startTimeSeconds: 1.25,
    durationSeconds: 2.75,
    priority: 0,
    operation: {
      kind: "follow-target",
      representationId: projectileId,
      cameraOffset: vec3(0, 2.2, 10),
      lookAtOffset: vec3(0, 0, 0),
    },
  },
];
const compiled = compileCameraAnimationSchedule(definitions);
if (!compiled.ok) throw new Error(compiled.error.code);
const schedule = compiled.value;

function projectilePosition(timeSeconds: number) {
  const time = Math.min(4, Math.max(0, timeSeconds));
  return vec3(2 * time - 4, 2.2 - 0.55 * (time - 2) ** 2, 0);
}

const pathPoints = Object.freeze(
  Array.from({ length: 33 }, (_, index) =>
    projectilePosition((index / 32) * 4),
  ),
);

function item(
  renderId: string,
  representationId: RepresentationId,
  primitive: RenderItem["primitive"],
  registrationSequence: number,
): RenderItem {
  const id = renderItemId(renderId);
  if (!id.ok) throw new Error("Invalid Camera demo RenderItem ID.");
  return {
    renderId: id.value,
    representationId,
    backend: "svg",
    layer: "annotation",
    zIndex: registrationSequence,
    registrationSequence,
    primitive,
  };
}

export const desktopCameraDurationSeconds = schedule.durationSeconds;

export function evaluateDesktopCamera(
  presentationTimeSeconds: number,
  reducedMotion: boolean,
) {
  const frame = evaluateCameraAnimationSchedule(
    schedule,
    presentationTimeSeconds,
    { reducedMotion },
  );
  if (!frame.ok) throw new Error(frame.error.code);
  const subject = projectilePosition(presentationTimeSeconds);
  const camera = resolveCameraPresentation(baseCamera, frame.value.operations, [
    {
      representationId: projectileId,
      position: subject,
      bounds: {
        minimum: vec3(subject.x - 0.22, subject.y - 0.22, -0.22),
        maximum: vec3(subject.x + 0.22, subject.y + 0.22, 0.22),
      },
    },
  ]);
  if (!camera.ok) throw new Error(camera.error.kind);
  const renderFrame = unwrap(
    createRenderFrame({
      sceneId,
      sourceRevision: Math.round(presentationTimeSeconds * 100),
      camera: camera.value,
      items: [
        item(
          "physica.camera:path",
          pathId,
          {
            kind: "polyline-2d",
            points: pathPoints,
            stroke: rgba(0.42, 0.53, 0.57, 0.72),
            strokeWidth: 2,
            closed: false,
          },
          0,
        ),
        item(
          "physica.camera:projectile",
          projectileId,
          {
            kind: "circle-2d",
            center: subject,
            radius: 0.22,
            fill: rgba(0.96, 0.78, 0.26, 1),
            stroke: rgba(1, 0.93, 0.65, 1),
            strokeWidth: 2,
          },
          1,
        ),
      ],
    }),
  );
  const plan = unwrap(createSvgRenderPlan(renderFrame));
  const progress = (kind: string) =>
    frame.value.operations.find(({ operation }) => operation.kind === kind)
      ?.progress ?? 0;
  return Object.freeze({
    markup: plan.payload.markup,
    elementCount: plan.payload.elementCount,
    subject,
    cameraPosition: camera.value.position,
    cameraTarget: camera.value.target,
    verticalSpan:
      camera.value.kind === "orthographic" ? camera.value.verticalSpan : 0,
    panProgress: progress("pan"),
    zoomProgress: progress("zoom"),
    followProgress: progress("follow-target"),
  });
}
