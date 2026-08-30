import { describe, expect, it } from "vitest";
import { DeterministicIdFactory, type SceneId } from "@physica/core-model";
import {
  compileAnimationComposition,
  compileAnimationSchedule,
  createAnimationEnvelope,
  createPresentationAnimationTask,
  evaluateAnimationSchedule,
  evaluateEasing,
  evaluatePresentationClock,
  parseAnimationEnvelope,
  PresentationStateStore,
  type AnimationDefinition,
} from "../src";

function fixture(
  overrides: Partial<AnimationDefinition> = {},
  seed = 120_000,
): AnimationDefinition {
  const ids = new DeterministicIdFactory(seed);
  return {
    id: ids.storyboardStepId(),
    name: "Move",
    target: {
      kind: "representation",
      sceneId: ids.sceneId(),
      id: ids.representationId(),
    },
    clockKey: "presentation",
    channel: "presentation.translation",
    startTimeSeconds: 0,
    durationSeconds: 2,
    easing: { kind: "named", id: "linear" },
    startValue: { kind: "vec3", x: 0, y: 0, z: 0 },
    endValue: { kind: "vec3", x: 10, y: 4, z: 0 },
    conflictPolicy: "replace",
    priority: 0,
    reversible: true,
    scrubbable: true,
    ...overrides,
  };
}

describe("animation definitions and easing", () => {
  it("round-trips a JSON-safe Storyboard animation envelope", () => {
    const definition = fixture();
    const envelope = createAnimationEnvelope(definition);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(parseAnimationEnvelope(envelope.value)).toEqual({
      ok: true,
      value: definition,
    });
  });

  it("evaluates named and cubic easing with exact endpoints", () => {
    expect(evaluateEasing({ kind: "named", id: "ease-in-out" }, 0)).toEqual({
      ok: true,
      value: 0,
    });
    expect(evaluateEasing({ kind: "named", id: "ease-in-out" }, 0.25)).toEqual({
      ok: true,
      value: 0.125,
    });
    expect(
      evaluateEasing(
        { kind: "cubic-bezier", x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
        1,
      ),
    ).toEqual({ ok: true, value: 1 });
  });
});

describe("animation scheduling and conflicts", () => {
  it("compiles Sequence, Parallel, Stagger and Wait deterministically", () => {
    const first = fixture({}, 121_000);
    const second = fixture(
      {
        id: new DeterministicIdFactory(122_000).storyboardStepId(),
        name: "Rotate",
        channel: "presentation.rotation",
        startValue: { kind: "scalar", value: 0 },
        endValue: { kind: "scalar", value: Math.PI },
      },
      121_000,
    );
    const compiled = compileAnimationComposition({
      kind: "sequence",
      children: [
        { kind: "clip", animation: first },
        { kind: "wait", durationSeconds: 1 },
        {
          kind: "stagger",
          intervalSeconds: 0.5,
          children: [
            { kind: "clip", animation: second },
            {
              kind: "parallel",
              children: [],
            },
          ],
        },
      ],
    });
    expect(compiled.ok).toBe(true);
    if (compiled.ok)
      expect(
        compiled.value.animations.map((entry) => entry.startTimeSeconds),
      ).toEqual([0, 3]);
  });

  it("rejects ambiguous overlaps and sequences explicit conflicts", () => {
    const first = fixture();
    const second = fixture(
      {
        id: new DeterministicIdFactory(123_000).storyboardStepId(),
        conflictPolicy: "reject",
        startTimeSeconds: 1,
      },
      120_000,
    );
    expect(compileAnimationSchedule([first, second])).toMatchObject({
      ok: false,
      error: { kind: "channel-conflict" },
    });
    const sequenced = compileAnimationSchedule([
      first,
      { ...second, conflictPolicy: "sequence" },
    ]);
    expect(sequenced.ok).toBe(true);
    if (sequenced.ok)
      expect(sequenced.value.animations[1]!.startTimeSeconds).toBe(2);
  });
});

describe("arbitrary-time animation evaluation", () => {
  it("produces equal frames after forward, reverse and repeated scrub", () => {
    const schedule = compileAnimationSchedule([fixture()]);
    expect(schedule.ok).toBe(true);
    if (!schedule.ok) return;
    const atOne = evaluateAnimationSchedule(schedule.value, 1);
    const atTwo = evaluateAnimationSchedule(schedule.value, 2);
    const backToOne = evaluateAnimationSchedule(schedule.value, 1);
    expect(atOne).toEqual(backToOne);
    expect(atOne).toMatchObject({
      ok: true,
      value: {
        targets: [
          {
            translation: { x: 5, y: 2, z: 0 },
            rotationRadians: 0,
            scale: { x: 1, y: 1, z: 1 },
          },
        ],
      },
    });
    expect(atTwo).toMatchObject({
      ok: true,
      value: { targets: [{ translation: { x: 10, y: 4, z: 0 } }] },
    });
  });

  it("resolves reduced motion to the final readable state", () => {
    const schedule = compileAnimationSchedule([fixture()]);
    if (!schedule.ok) return;
    expect(
      evaluateAnimationSchedule(schedule.value, 0, { reducedMotion: true }),
    ).toMatchObject({
      ok: true,
      value: { targets: [{ translation: { x: 10, y: 4, z: 0 } }] },
    });
  });

  it("remains deterministic over 10,000 arbitrary-time evaluations", () => {
    const schedule = compileAnimationSchedule([fixture()]);
    if (!schedule.ok) return;
    let final = evaluateAnimationSchedule(schedule.value, 0);
    for (let index = 0; index < 10_000; index += 1)
      final = evaluateAnimationSchedule(schedule.value, (index % 201) / 100);
    expect(final).toEqual(evaluateAnimationSchedule(schedule.value, 1.5));
  });
});

describe("presentation clock runtime boundary", () => {
  it("publishes transient frames and exposes the frozen scheduler phase", () => {
    const ids = new DeterministicIdFactory(130_000);
    const sceneId = ids.sceneId();
    const clockId = ids.clockId();
    const definition = fixture(
      {
        target: {
          kind: "representation",
          sceneId,
          id: ids.representationId(),
        },
      },
      131_000,
    );
    const schedule = compileAnimationSchedule([definition]);
    if (!schedule.ok) return;
    const store = new PresentationStateStore();
    const evaluated = evaluatePresentationClock(
      schedule.value,
      sceneId,
      clockId,
      [{ clockId, timeSeconds: 1 }],
      store,
    );
    expect(evaluated.ok).toBe(true);
    expect(store.snapshot()).toMatchObject({
      revision: 1,
      sceneId,
      presentationClockId: clockId,
    });
    const task = createPresentationAnimationTask({
      sceneId,
      presentationClockId: clockId,
      schedule: schedule.value,
      store,
    });
    expect(task.phaseId).toBe("physica:scheduler/presentation-animation");
  });

  it("rejects a missing presentation clock without publication", () => {
    const ids = new DeterministicIdFactory(140_000);
    const schedule = compileAnimationSchedule([fixture()]);
    if (!schedule.ok) return;
    const store = new PresentationStateStore();
    const result = evaluatePresentationClock(
      schedule.value,
      ids.sceneId() as SceneId,
      ids.clockId(),
      [],
      store,
    );
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "presentation-clock-missing" },
    });
    expect(store.snapshot()).toBeUndefined();
  });
});
