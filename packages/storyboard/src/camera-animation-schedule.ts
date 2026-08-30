import { cameraOperationChannels } from "@physica/renderer-core";
import {
  freezeCameraAnimation,
  validateCameraAnimationDefinition,
} from "./camera-animation-definitions";
import {
  cameraAnimationError,
  type CameraAnimationResult,
} from "./camera-animation-errors";
import type {
  CameraAnimationDefinition,
  CameraAnimationSchedule,
  ScheduledCameraAnimation,
} from "./camera-animation-types";

function order(
  left: ScheduledCameraAnimation,
  right: ScheduledCameraAnimation,
): number {
  return (
    left.startTimeSeconds - right.startTimeSeconds ||
    left.priority - right.priority ||
    left.id.localeCompare(right.id)
  );
}

function overlaps(
  left: ScheduledCameraAnimation,
  right: ScheduledCameraAnimation,
): boolean {
  if (left.durationSeconds === 0 || right.durationSeconds === 0)
    return left.startTimeSeconds === right.startTimeSeconds;
  return (
    left.startTimeSeconds < right.endTimeSeconds &&
    right.startTimeSeconds < left.endTimeSeconds
  );
}

export function compileCameraAnimationSchedule(
  definitions: readonly CameraAnimationDefinition[],
): CameraAnimationResult<CameraAnimationSchedule> {
  const ids = new Set<string>();
  const animations: ScheduledCameraAnimation[] = [];
  for (const definition of definitions) {
    const validated = validateCameraAnimationDefinition(definition);
    if (!validated.ok) return validated;
    if (ids.has(validated.value.id))
      return {
        ok: false,
        error: cameraAnimationError(
          "duplicate-camera-animation",
          "duplicate-camera-animation-id",
          "Camera-animation IDs must be unique.",
          { relatedIds: [validated.value.id] },
        ),
      };
    ids.add(validated.value.id);
    animations.push({
      ...validated.value,
      endTimeSeconds:
        validated.value.startTimeSeconds + validated.value.durationSeconds,
    });
  }
  animations.sort(order);
  for (let leftIndex = 0; leftIndex < animations.length; leftIndex += 1) {
    const left = animations[leftIndex]!;
    const channels = new Set(cameraOperationChannels(left.operation));
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < animations.length;
      rightIndex += 1
    ) {
      const right = animations[rightIndex]!;
      if (
        left.target.sceneId !== right.target.sceneId ||
        !overlaps(left, right) ||
        !cameraOperationChannels(right.operation).some((channel) =>
          channels.has(channel),
        )
      )
        continue;
      return {
        ok: false,
        error: cameraAnimationError(
          "channel-conflict",
          "overlapping-camera-channel",
          "Camera animations cannot overlap on an owned Camera channel.",
          { relatedIds: [left.id, right.id] },
        ),
      };
    }
  }
  return {
    ok: true,
    value: freezeCameraAnimation({
      animations,
      durationSeconds: animations.reduce(
        (maximum, animation) => Math.max(maximum, animation.endTimeSeconds),
        0,
      ),
    }),
  };
}
