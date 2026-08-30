import type { ClockId, SceneId } from "@physica/core-model";
import {
  runtimeTaskId,
  SCHEDULER_PHASES,
  type RuntimeTask,
  type RuntimeTaskContext,
  type SchedulerResult,
} from "@physica/runtime-scheduler";
import { animationError, type AnimationResult } from "./animation-errors";
import { evaluateAnimationSchedule } from "./animation-evaluator";
import type {
  AnimationSchedule,
  PresentationStateSnapshot,
} from "./animation-types";

function freeze<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze)) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, freeze(entry)]),
      ),
    ) as T;
  return value;
}

export class PresentationStateStore {
  private current: PresentationStateSnapshot | undefined;
  private revision = 0;

  publish(
    sceneId: SceneId,
    presentationClockId: ClockId,
    frame: Omit<
      PresentationStateSnapshot,
      "sceneId" | "presentationClockId" | "revision"
    >,
  ): PresentationStateSnapshot {
    this.revision += 1;
    this.current = freeze({
      ...frame,
      sceneId,
      presentationClockId,
      revision: this.revision,
    });
    return this.current;
  }

  snapshot(): PresentationStateSnapshot | undefined {
    return this.current;
  }
}

export function evaluatePresentationClock(
  schedule: AnimationSchedule,
  sceneId: SceneId,
  presentationClockId: ClockId,
  clockStates: readonly {
    readonly clockId: ClockId;
    readonly timeSeconds: number;
  }[],
  store: PresentationStateStore,
  reducedMotion = false,
): AnimationResult<PresentationStateSnapshot> {
  const clock = clockStates.find(
    (entry) => entry.clockId === presentationClockId,
  );
  if (!clock)
    return {
      ok: false,
      error: animationError(
        "presentation-clock-missing",
        "presentation-clock-missing",
        "The configured presentation clock is unavailable.",
        { relatedIds: [presentationClockId] },
      ),
    };
  const evaluated = evaluateAnimationSchedule(schedule, clock.timeSeconds, {
    reducedMotion,
  });
  return evaluated.ok
    ? {
        ok: true,
        value: store.publish(sceneId, presentationClockId, evaluated.value),
      }
    : evaluated;
}

const TASK_ID_RESULT = runtimeTaskId("physica:task/presentation-animation");
if (!TASK_ID_RESULT.ok)
  throw new Error("Invalid built-in presentation task ID.");
const PRESENTATION_TASK_ID = TASK_ID_RESULT.value;

export function createPresentationAnimationTask(options: {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly schedule: AnimationSchedule;
  readonly store: PresentationStateStore;
  readonly reducedMotion?: () => boolean;
}): RuntimeTask {
  return Object.freeze({
    id: PRESENTATION_TASK_ID,
    phaseId: SCHEDULER_PHASES.presentationAnimation,
    run(context: RuntimeTaskContext): SchedulerResult<void> {
      const result = evaluatePresentationClock(
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
              taskId: PRESENTATION_TASK_ID,
              message: result.error.code,
            },
          };
    },
  });
}
