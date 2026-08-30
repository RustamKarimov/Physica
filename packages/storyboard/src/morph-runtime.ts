import type { ClockId, SceneId } from "@physica/core-model";
import {
  runtimeTaskId,
  SCHEDULER_PHASES,
  type RuntimeTask,
  type RuntimeTaskContext,
  type SchedulerResult,
} from "@physica/runtime-scheduler";
import { freezeMorph } from "./morph-definitions";
import { evaluateMorphSchedule } from "./morph-evaluator";
import { morphError, type MorphResult } from "./morph-errors";
import type { MorphSchedule, MorphStateSnapshot } from "./morph-types";

export class MorphStateStore {
  private current: MorphStateSnapshot | undefined;
  private revision = 0;

  publish(
    sceneId: SceneId,
    presentationClockId: ClockId,
    frame: Omit<
      MorphStateSnapshot,
      "sceneId" | "presentationClockId" | "revision"
    >,
  ): MorphStateSnapshot {
    this.revision += 1;
    this.current = freezeMorph({
      ...frame,
      sceneId,
      presentationClockId,
      revision: this.revision,
    });
    return this.current;
  }

  snapshot(): MorphStateSnapshot | undefined {
    return this.current;
  }
}

export function evaluateMorphPresentationClock(
  schedule: MorphSchedule,
  sceneId: SceneId,
  presentationClockId: ClockId,
  clockStates: readonly {
    readonly clockId: ClockId;
    readonly timeSeconds: number;
  }[],
  store: MorphStateStore,
  reducedMotion = false,
): MorphResult<MorphStateSnapshot> {
  const mismatch = schedule.morphs.find(
    (morph) =>
      morph.source.sceneId !== sceneId || morph.destination.sceneId !== sceneId,
  );
  if (mismatch)
    return {
      ok: false,
      error: morphError(
        "invalid-target",
        "presentation-scene-mismatch",
        "The morph schedule contains a target from another Scene.",
        { relatedIds: [sceneId, mismatch.id] },
      ),
    };
  const clock = clockStates.find(
    (entry) => entry.clockId === presentationClockId,
  );
  if (!clock)
    return {
      ok: false,
      error: morphError(
        "presentation-clock-missing",
        "presentation-clock-missing",
        "The configured presentation clock is unavailable.",
        { relatedIds: [presentationClockId] },
      ),
    };
  const evaluated = evaluateMorphSchedule(schedule, clock.timeSeconds, {
    reducedMotion,
  });
  return evaluated.ok
    ? {
        ok: true,
        value: store.publish(sceneId, presentationClockId, evaluated.value),
      }
    : evaluated;
}

export function createPresentationMorphTask(options: {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly schedule: MorphSchedule;
  readonly store: MorphStateStore;
  readonly reducedMotion?: () => boolean;
}): RuntimeTask {
  const taskId = runtimeTaskId(
    "physica:task/presentation-morph/" + options.sceneId.toLowerCase(),
  );
  if (!taskId.ok) throw new Error("Invalid built-in morph task identity.");
  const id = taskId.value;
  return Object.freeze({
    id,
    phaseId: SCHEDULER_PHASES.presentationAnimation,
    run(context: RuntimeTaskContext): SchedulerResult<void> {
      const result = evaluateMorphPresentationClock(
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
