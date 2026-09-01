import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  type PresentationFlow,
} from "@physica/core-model";
import { SCHEDULER_PHASES } from "@physica/runtime-scheduler";
import {
  StoryboardStateStore,
  compileLessonSchedule,
  createLessonStepEnvelope,
  createStoryboardTask,
  evaluateLessonSchedule,
  parseLessonStepEnvelope,
  resolvePresentationFlowTrigger,
  type LessonStepV1,
  type StoryboardObservableValue,
} from "../src";

function steps(seed = 220_000): readonly LessonStepV1[] {
  const ids = new DeterministicIdFactory(seed);
  return [
    {
      id: ids.storyboardStepId(),
      name: "Explain launch",
      actions: [
        { kind: "simulation", command: "pause" },
        {
          kind: "presentation",
          target: "velocity-vector",
          property: "highlight",
          value: true,
        },
        {
          kind: "note",
          text: "Resolve the initial velocity into components.",
          audience: "all",
        },
      ],
      advance: { kind: "manual" },
    },
    {
      id: ids.storyboardStepId(),
      name: "Wait for annotation",
      actions: [{ kind: "camera", cue: "frame-projectile" }],
      advance: { kind: "after-duration", durationSeconds: 2 },
    },
    {
      id: ids.storyboardStepId(),
      name: "Detect apex",
      actions: [{ kind: "simulation", command: "play" }],
      advance: {
        kind: "condition",
        sourceKey: "projectile.vertical-velocity",
        operator: "less-than-or-equal",
        value: { kind: "scalar", value: 0 },
      },
    },
    {
      id: ids.storyboardStepId(),
      name: "Ask learner",
      actions: [
        {
          kind: "note",
          text: "Choose when to continue.",
          audience: "learner",
        },
      ],
      advance: {
        kind: "interaction-pause",
        interactionKey: "continue-projectile",
        prompt: "Continue to the conclusion",
      },
    },
  ];
}

function compile(input: readonly LessonStepV1[]) {
  const envelopes = input.map((step) => {
    const envelope = createLessonStepEnvelope(step);
    if (!envelope.ok) throw new Error(envelope.error.message);
    return envelope.value;
  });
  const schedule = compileLessonSchedule(envelopes);
  if (!schedule.ok) throw new Error(schedule.error.message);
  return schedule.value;
}

describe("lesson storyboard orchestration", () => {
  it("round-trips lesson envelopes and compiles declared order", () => {
    const step = steps()[0]!;
    const envelope = createLessonStepEnvelope(step);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(parseLessonStepEnvelope(envelope.value)).toEqual({
      ok: true,
      value: step,
    });
    expect(compileLessonSchedule([envelope.value])).toMatchObject({
      ok: true,
      value: { steps: [step] },
    });
    expect(Object.isFrozen(envelope.value.configuration)).toBe(true);
  });

  it("emits entry actions once and advances manually and by duration", () => {
    const schedule = compile(steps().slice(0, 2));
    const store = new StoryboardStateStore();
    const first = evaluateLessonSchedule(schedule, 0, store, () => undefined);
    expect(first).toMatchObject({
      ok: true,
      value: {
        currentStepIndex: 0,
        status: "waiting",
        latestDirectives: [
          { kind: "simulation", command: "pause" },
          { kind: "presentation", property: "highlight" },
          { kind: "note" },
        ],
      },
    });
    const repeated = evaluateLessonSchedule(
      schedule,
      0.5,
      store,
      () => undefined,
    );
    expect(repeated.ok && repeated.value.latestDirectives).toEqual([]);
    store.requestAdvance();
    const advanced = evaluateLessonSchedule(
      schedule,
      0.5,
      store,
      () => undefined,
    );
    expect(advanced).toMatchObject({
      ok: true,
      value: { currentStepIndex: 1 },
    });
    const enteredSecond = evaluateLessonSchedule(
      schedule,
      1,
      store,
      () => undefined,
    );
    expect(enteredSecond).toMatchObject({
      ok: true,
      value: { latestDirectives: [{ kind: "camera" }] },
    });
    const complete = evaluateLessonSchedule(
      schedule,
      3,
      store,
      () => undefined,
    );
    expect(complete).toMatchObject({
      ok: true,
      value: { currentStepIndex: 2, status: "complete" },
    });
  });

  it("advances from typed conditions and exact interaction resumptions", () => {
    const schedule = compile(steps().slice(2));
    const store = new StoryboardStateStore();
    let verticalVelocity = 1;
    const read = (key: string): StoryboardObservableValue | undefined =>
      key === "projectile.vertical-velocity"
        ? { kind: "scalar", value: verticalVelocity }
        : undefined;
    const running = evaluateLessonSchedule(schedule, 0, store, read);
    expect(running).toMatchObject({
      ok: true,
      value: { currentStepIndex: 0 },
    });
    verticalVelocity = 0;
    const apex = evaluateLessonSchedule(schedule, 1, store, read);
    expect(apex).toMatchObject({
      ok: true,
      value: { currentStepIndex: 1 },
    });
    const paused = evaluateLessonSchedule(schedule, 1, store, read);
    expect(paused).toMatchObject({
      ok: true,
      value: { status: "waiting" },
    });
    store.resumeInteraction("wrong-key");
    expect(evaluateLessonSchedule(schedule, 1, store, read)).toMatchObject({
      ok: true,
      value: { currentStepIndex: 1 },
    });
    store.resumeInteraction("continue-projectile");
    expect(evaluateLessonSchedule(schedule, 1, store, read)).toMatchObject({
      ok: true,
      value: { currentStepIndex: 2, status: "complete" },
    });
  });

  it("resolves presentation flow by priority then stable identity", () => {
    const ids = new DeterministicIdFactory(220_100);
    const from = ids.sceneId();
    const lowTarget = ids.sceneId();
    const highTarget = ids.sceneId();
    const low = {
      id: ids.presentationTransitionId(),
      fromSceneId: from,
      toSceneId: lowTarget,
      trigger: { kind: "next" as const },
      priority: 1,
    };
    const high = {
      id: ids.presentationTransitionId(),
      fromSceneId: from,
      toSceneId: highTarget,
      trigger: { kind: "next" as const },
      priority: 10,
    };
    const flow: PresentationFlow = {
      entrySceneId: from,
      sceneOrder: [from, lowTarget, highTarget],
      transitions: [low, high],
    };
    expect(
      resolvePresentationFlowTrigger(flow, from, { kind: "next" }),
    ).toMatchObject({
      ok: true,
      value: { transition: { toSceneId: highTarget } },
    });
  });

  it("uses the storyboard phase and leaves persisted project data unchanged", () => {
    const ids = new DeterministicIdFactory(220_200);
    const schedule = compile([]);
    const project = Object.freeze({ scenes: Object.freeze([]) });
    const task = createStoryboardTask({
      key: "test",
      presentationClockId: ids.clockId(),
      schedule,
      store: new StoryboardStateStore(),
      readObservable: () => undefined,
    });
    expect(task.phaseId).toBe(SCHEDULER_PHASES.storyboard);
    expect(project).toEqual({ scenes: [] });
  });
});
