import { DeterministicIdFactory } from "@physica/core-model";
import {
  resolveCameraPresentation,
  type CameraDefinition,
  type CameraSubjectSnapshot,
} from "@physica/renderer-core";
import {
  compileCameraAnimationSchedule,
  evaluateCameraAnimationSchedule,
  type CameraAnimationDefinition,
} from "@physica/storyboard";

function vec3(x: number, y: number, z: number) {
  return Object.freeze({ x, y, z });
}

function rounded(value: number): number {
  const result = Number(value.toFixed(6));
  return Object.is(result, -0) ? 0 : result;
}

function point(timeSeconds: number) {
  return vec3(2 * timeSeconds - 4, 2 - 0.5 * (timeSeconds - 2) ** 2, 0);
}

export function runCameraFollow() {
  const ids = new DeterministicIdFactory(230_000);
  const sceneId = ids.sceneId();
  const representationId = ids.representationId();
  const baseCamera: CameraDefinition = {
    kind: "orthographic",
    viewport: { width: 800, height: 400, devicePixelRatio: 1 },
    position: vec3(0, 0, 12),
    target: vec3(0, 0, 0),
    up: vec3(0, 1, 0),
    near: 0.1,
    far: 100,
    verticalSpan: 8,
  };
  const common = {
    target: { kind: "scene" as const, sceneId },
    clockKey: "presentation" as const,
    startTimeSeconds: 0,
    durationSeconds: 4,
    easing: { kind: "named" as const, id: "linear" as const },
    reversible: true,
    scrubbable: true,
  };
  const definitions: readonly CameraAnimationDefinition[] = [
    {
      ...common,
      id: ids.storyboardStepId(),
      name: "Follow projectile",
      priority: 0,
      operation: {
        kind: "follow-target",
        representationId,
        cameraOffset: vec3(0, 2, 10),
        lookAtOffset: vec3(0, 0, 0),
      },
    },
    {
      ...common,
      id: ids.storyboardStepId(),
      name: "Zoom toward projectile",
      priority: 1,
      operation: { kind: "zoom", startZoom: 1, endZoom: 2 },
    },
  ];
  const schedule = compileCameraAnimationSchedule(definitions);
  if (!schedule.ok) throw new Error(schedule.error.code);
  const worldTrajectory = [0, 2, 4].map((timeSeconds) => ({
    timeSeconds,
    position: point(timeSeconds),
  }));
  const trajectoryBefore = JSON.stringify(worldTrajectory);
  const sample = (timeSeconds: number) => {
    const frame = evaluateCameraAnimationSchedule(schedule.value, timeSeconds);
    if (!frame.ok) throw new Error(frame.error.code);
    const position = point(timeSeconds);
    const subject: CameraSubjectSnapshot = {
      representationId,
      position,
      bounds: {
        minimum: vec3(position.x - 0.2, position.y - 0.2, -0.2),
        maximum: vec3(position.x + 0.2, position.y + 0.2, 0.2),
      },
    };
    const camera = resolveCameraPresentation(
      baseCamera,
      frame.value.operations,
      [subject],
    );
    if (!camera.ok) throw new Error(camera.error.kind);
    if (camera.value.kind !== "orthographic")
      throw new Error("Expected the orthographic Camera kind to be preserved.");
    return {
      timeSeconds,
      followProgress: frame.value.operations[0]!.progress,
      zoomProgress: frame.value.operations[1]!.progress,
      subjectPosition: position,
      cameraPosition: {
        x: rounded(camera.value.position.x),
        y: rounded(camera.value.position.y),
        z: rounded(camera.value.position.z),
      },
      cameraTarget: {
        x: rounded(camera.value.target.x),
        y: rounded(camera.value.target.y),
        z: rounded(camera.value.target.z),
      },
      verticalSpan: rounded(camera.value.verticalSpan),
    };
  };
  const atHalf = sample(2);
  const samples = [sample(0), atHalf, sample(4)];
  return {
    id: "camera-follow",
    samples,
    equalTimeDeterministic:
      JSON.stringify(sample(2)) === JSON.stringify(atHalf),
    worldTrajectory,
    worldTrajectoryUnchanged:
      JSON.stringify(worldTrajectory) === trajectoryBefore,
    projectionKindPreserved: samples.every((entry) =>
      Number.isFinite(entry.verticalSpan),
    ),
  };
}
