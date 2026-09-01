import type { ClockId, StoryboardStepId } from "@physica/core-model";
import {
  runtimeTaskId,
  SCHEDULER_PHASES,
  type RuntimeTask,
  type RuntimeTaskContext,
} from "@physica/runtime-scheduler";
import { deepFreezeLesson } from "./lesson-definitions";
import type {
  LessonAdvanceRule,
  LessonAction,
  LessonResult,
  LessonSchedule,
  StoryboardDirective,
  StoryboardObservableValue,
  StoryboardSnapshot,
} from "./lesson-types";

function compareObservable(
  actual: StoryboardObservableValue,
  expected: StoryboardObservableValue,
  operator: Extract<LessonAdvanceRule, { kind: "condition" }>["operator"],
): LessonResult<boolean> {
  if (actual.kind !== expected.kind)
    return {
      ok: false,
      error: {
        code: "condition-type-mismatch",
        message: "Storyboard condition value kinds differ.",
      },
    };
  if (operator === "equals")
    return { ok: true, value: actual.value === expected.value };
  if (operator === "not-equals")
    return { ok: true, value: actual.value !== expected.value };
  if (actual.kind !== "scalar" || expected.kind !== "scalar")
    return {
      ok: false,
      error: {
        code: "condition-type-mismatch",
        message: "Ordered storyboard comparisons require scalar values.",
      },
    };
  if (operator === "greater-than")
    return { ok: true, value: actual.value > expected.value };
  if (operator === "greater-than-or-equal")
    return { ok: true, value: actual.value >= expected.value };
  if (operator === "less-than")
    return { ok: true, value: actual.value < expected.value };
  return { ok: true, value: actual.value <= expected.value };
}

export class StoryboardStateStore {
  private index = 0;
  private status: StoryboardSnapshot["status"] = "idle";
  private entered = false;
  private enteredAtSeconds = 0;
  private manualAdvance = false;
  private readonly resumedInteractions = new Set<string>();
  private latest: readonly StoryboardDirective[] = Object.freeze([]);
  private readonly history: StoryboardDirective[] = [];

  requestAdvance(): void {
    this.manualAdvance = true;
  }

  resumeInteraction(key: string): void {
    this.resumedInteractions.add(key);
  }

  beginCycle(): void {
    this.latest = Object.freeze([]);
  }

  enter(
    stepId: StoryboardStepId,
    actions: readonly LessonAction[],
    timeSeconds: number,
  ): void {
    const directives = actions.map((action) =>
      deepFreezeLesson({ ...action, stepId } as StoryboardDirective),
    );
    this.latest = Object.freeze(directives);
    this.history.push(...directives);
    this.enteredAtSeconds = timeSeconds;
    this.entered = true;
    this.status = "active";
  }

  hasEntered(): boolean {
    return this.entered;
  }

  entryTimeSeconds(): number {
    return this.enteredAtSeconds;
  }

  takeManualAdvance(): boolean {
    const requested = this.manualAdvance;
    this.manualAdvance = false;
    return requested;
  }

  takeInteraction(key: string): boolean {
    const resumed = this.resumedInteractions.has(key);
    this.resumedInteractions.delete(key);
    return resumed;
  }

  setWaiting(): void {
    this.status = "waiting";
  }

  advance(stepCount: number): void {
    this.index += 1;
    this.entered = false;
    this.manualAdvance = false;
    this.status = this.index >= stepCount ? "complete" : "active";
  }

  currentIndex(): number {
    return this.index;
  }

  snapshot(schedule: LessonSchedule): StoryboardSnapshot {
    const step = schedule.steps[this.index];
    return deepFreezeLesson({
      currentStepIndex: this.index,
      ...(step === undefined ? {} : { currentStepId: step.id }),
      status: this.status,
      latestDirectives: this.latest,
      directiveHistory: this.history,
    });
  }
}

function shouldAdvance(
  advance: LessonAdvanceRule,
  timeSeconds: number,
  store: StoryboardStateStore,
  readObservable: (key: string) => StoryboardObservableValue | undefined,
): LessonResult<boolean> {
  if (advance.kind === "manual") {
    store.setWaiting();
    return { ok: true, value: store.takeManualAdvance() };
  }
  if (advance.kind === "after-duration")
    return {
      ok: true,
      value: timeSeconds - store.entryTimeSeconds() >= advance.durationSeconds,
    };
  if (advance.kind === "interaction-pause") {
    store.setWaiting();
    return {
      ok: true,
      value: store.takeInteraction(advance.interactionKey),
    };
  }
  const actual = readObservable(advance.sourceKey);
  if (actual === undefined)
    return {
      ok: false,
      error: {
        code: "missing-observable",
        message: "Storyboard condition observable is unavailable.",
      },
    };
  return compareObservable(actual, advance.value, advance.operator);
}

export function evaluateLessonSchedule(
  schedule: LessonSchedule,
  timeSeconds: number,
  store: StoryboardStateStore,
  readObservable: (key: string) => StoryboardObservableValue | undefined,
): LessonResult<StoryboardSnapshot> {
  store.beginCycle();
  const step = schedule.steps[store.currentIndex()];
  if (step === undefined) return { ok: true, value: store.snapshot(schedule) };
  if (!store.hasEntered()) store.enter(step.id, step.actions, timeSeconds);
  const advance = shouldAdvance(
    step.advance,
    timeSeconds,
    store,
    readObservable,
  );
  if (!advance.ok)
    return {
      ...advance,
      error: { ...advance.error, stepId: step.id },
    };
  if (advance.value) store.advance(schedule.steps.length);
  return { ok: true, value: store.snapshot(schedule) };
}

export function createStoryboardTask(options: {
  readonly key: string;
  readonly presentationClockId: ClockId;
  readonly schedule: LessonSchedule;
  readonly store: StoryboardStateStore;
  readonly readObservable: (
    key: string,
    context: RuntimeTaskContext,
  ) => StoryboardObservableValue | undefined;
}): RuntimeTask {
  const parsed = runtimeTaskId("physica:task/storyboard/" + options.key);
  if (!parsed.ok)
    throw new TypeError("Storyboard task key must be namespaced-safe.");
  const id = parsed.value;
  return Object.freeze({
    id,
    phaseId: SCHEDULER_PHASES.storyboard,
    run(context: RuntimeTaskContext) {
      const clock = context.clockStates.find(
        (state) => state.clockId === options.presentationClockId,
      );
      if (clock === undefined)
        return {
          ok: false as const,
          error: {
            kind: "invalid-task" as const,
            taskId: id,
            message: "Storyboard presentation clock is unavailable.",
          },
        };
      const result = evaluateLessonSchedule(
        options.schedule,
        clock.timeSeconds,
        options.store,
        (key) => options.readObservable(key, context),
      );
      return result.ok
        ? { ok: true as const, value: undefined }
        : {
            ok: false as const,
            error: {
              kind: "invalid-task" as const,
              taskId: id,
              message: result.error.message,
            },
          };
    },
  });
}
