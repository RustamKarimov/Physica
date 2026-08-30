import type { ClockId, SceneId } from "@physica/core-model";
import {
  runtimeTaskId,
  SCHEDULER_PHASES,
  type RuntimeTask,
  type RuntimeTaskContext,
  type SchedulerResult,
} from "@physica/runtime-scheduler";
import { freezeCameraAnimation } from "./camera-animation-definitions";
import { evaluateCameraAnimationSchedule } from "./camera-animation-evaluator";
import {
  cameraAnimationError,
  type CameraAnimationResult,
} from "./camera-animation-errors";
import type {
  CameraAnimationSchedule,
  CameraAnimationStateSnapshot,
} from "./camera-animation-types";

export class CameraAnimationStateStore {
  private current: CameraAnimationStateSnapshot | undefined;
  private revision = 0;

  publish(
    sceneId: SceneId,
    presentationClockId: ClockId,
    frame: Omit<
      CameraAnimationStateSnapshot,
      "sceneId" | "presentationClockId" | "revision"
    >,
  ): CameraAnimationStateSnapshot {
    this.revision += 1;
    this.current = freezeCameraAnimation({
      ...frame,
      sceneId,
      presentationClockId,
      revision: this.revision,
    });
    return this.current;
  }

  snapshot(): CameraAnimationStateSnapshot | undefined {
    return this.current;
  }
}

export function evaluateCameraPresentationClock(
  schedule: CameraAnimationSchedule,
  sceneId: SceneId,
  presentationClockId: ClockId,
  clockStates: readonly {
    readonly clockId: ClockId;
    readonly timeSeconds: number;
  }[],
  store: CameraAnimationStateStore,
  reducedMotion = false,
): CameraAnimationResult<CameraAnimationStateSnapshot> {
  const mismatch = schedule.animations.find(
    (animation) => animation.target.sceneId !== sceneId,
  );
  if (mismatch)
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-target",
        "presentation-scene-mismatch",
        "The Camera-animation schedule contains a target from another Scene.",
        { relatedIds: [sceneId, mismatch.target.sceneId, mismatch.id] },
      ),
    };
  const clock = clockStates.find(
    (entry) => entry.clockId === presentationClockId,
  );
  if (!clock)
    return {
      ok: false,
      error: cameraAnimationError(
        "presentation-clock-missing",
        "presentation-clock-missing",
        "The configured presentation clock is unavailable.",
        { relatedIds: [presentationClockId] },
      ),
    };
  const evaluated = evaluateCameraAnimationSchedule(
    schedule,
    clock.timeSeconds,
    { reducedMotion },
  );
  return evaluated.ok
    ? {
        ok: true,
        value: store.publish(sceneId, presentationClockId, evaluated.value),
      }
    : evaluated;
}

export function createPresentationCameraTask(options: {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly schedule: CameraAnimationSchedule;
  readonly store: CameraAnimationStateStore;
  readonly reducedMotion?: () => boolean;
}): RuntimeTask {
  const taskId = runtimeTaskId(
    "physica:task/presentation-camera/" + options.sceneId.toLowerCase(),
  );
  if (!taskId.ok)
    throw new Error("Invalid built-in Camera-animation task identity.");
  const id = taskId.value;
  return Object.freeze({
    id,
    phaseId: SCHEDULER_PHASES.presentationAnimation,
    run(context: RuntimeTaskContext): SchedulerResult<void> {
      const result = evaluateCameraPresentationClock(
        options.schedule,
        options.sceneId,
        options.presentationClockId,
        context.clockStates,
        options.store,
        options.reducedMotion?.() === true,
      );
      return result.ok
        ? { ok: true, value: undefined }
        : {
            ok: false,
            error: {
              kind: "invalid-task",
              taskId: id,
              message: result.error.code,
            },
          };
    },
  });
}
