import type { ClockId, SceneId } from "@physica/core-model";
import {
  runtimeTaskId,
  SCHEDULER_PHASES,
  type RuntimeTask,
  type RuntimeTaskContext,
  type SchedulerResult,
} from "@physica/runtime-scheduler";
import { freezeReveal } from "./reveal-definitions";
import { evaluateRevealSchedule } from "./reveal-evaluator";
import { revealError, type RevealResult } from "./reveal-errors";
import type { RevealSchedule, RevealStateSnapshot } from "./reveal-types";

export class RevealStateStore {
  private current: RevealStateSnapshot | undefined;
  private revision = 0;

  publish(
    sceneId: SceneId,
    presentationClockId: ClockId,
    frame: Omit<
      RevealStateSnapshot,
      "sceneId" | "presentationClockId" | "revision"
    >,
  ): RevealStateSnapshot {
    this.revision += 1;
    this.current = freezeReveal({
      ...frame,
      sceneId,
      presentationClockId,
      revision: this.revision,
    });
    return this.current;
  }

  snapshot(): RevealStateSnapshot | undefined {
    return this.current;
  }
}

export function evaluateRevealPresentationClock(
  schedule: RevealSchedule,
  sceneId: SceneId,
  presentationClockId: ClockId,
  clockStates: readonly {
    readonly clockId: ClockId;
    readonly timeSeconds: number;
  }[],
  store: RevealStateStore,
  reducedMotion = false,
): RevealResult<RevealStateSnapshot> {
  const mismatch = schedule.reveals.find(
    (reveal) => reveal.target.sceneId !== sceneId,
  );
  if (mismatch)
    return {
      ok: false,
      error: revealError(
        "invalid-target",
        "presentation-scene-mismatch",
        "The reveal schedule contains a target from another scene.",
        { relatedIds: [sceneId, mismatch.target.sceneId, mismatch.id] },
      ),
    };
  const clock = clockStates.find(
    (entry) => entry.clockId === presentationClockId,
  );
  if (!clock)
    return {
      ok: false,
      error: revealError(
        "presentation-clock-missing",
        "presentation-clock-missing",
        "The configured presentation clock is unavailable.",
        { relatedIds: [presentationClockId] },
      ),
    };
  const evaluated = evaluateRevealSchedule(schedule, clock.timeSeconds, {
    reducedMotion,
  });
  return evaluated.ok
    ? {
        ok: true,
        value: store.publish(sceneId, presentationClockId, evaluated.value),
      }
    : evaluated;
}

export function createPresentationRevealTask(options: {
  readonly sceneId: SceneId;
  readonly presentationClockId: ClockId;
  readonly schedule: RevealSchedule;
  readonly store: RevealStateStore;
  readonly reducedMotion?: () => boolean;
}): RuntimeTask {
  const taskId = runtimeTaskId(
    "physica:task/presentation-reveal/" + options.sceneId.toLowerCase(),
  );
  if (!taskId.ok) throw new Error("Invalid built-in reveal task identity.");
  const id = taskId.value;
  return Object.freeze({
    id,
    phaseId: SCHEDULER_PHASES.presentationAnimation,
    run(context: RuntimeTaskContext): SchedulerResult<void> {
      const result = evaluateRevealPresentationClock(
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
