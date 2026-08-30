import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  DeterministicIdFactory,
  registeredTypeId,
  type Result,
} from "@physica/core-model";
import {
  createClockRuntime,
  createDefaultClockDefinitions,
} from "@physica/clocks";
import {
  createRuntimeScheduler,
  createRuntimeStateStore,
  SCHEDULER_PHASES,
} from "@physica/runtime-scheduler";
import { parseProjectJson, serializeProjectJson } from "@physica/serialization";
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
  validateAnimationEnvelope,
  type AnimationDefinition,
} from "../src";
import {
  createFixtureProject,
  representation,
  withScene,
} from "../../../tests/helpers/model-fixtures";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

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
    expect(validateAnimationEnvelope(envelope.value)).toEqual(envelope);
    expect(Object.isFrozen(envelope.value)).toBe(true);
    expect(Object.isFrozen(envelope.value.configuration)).toBe(true);
    expect(Object.isFrozen(envelope.value.configuration.target as object)).toBe(
      true,
    );
    expect(Object.isFrozen(definition.target)).toBe(false);
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
    const cubic = {
      kind: "cubic-bezier" as const,
      x1: 0.42,
      y1: 0,
      x2: 0.58,
      y2: 1,
    };
    expect(evaluateEasing(cubic, 1)).toEqual({ ok: true, value: 1 });
    const interior = evaluateEasing(cubic, 0.25);
    expect(interior.ok).toBe(true);
    if (interior.ok) expect(interior.value).toBeCloseTo(0.1291619, 6);
    expect(evaluateEasing(cubic, 0.25)).toEqual(interior);
  });

  it("returns typed errors for malformed, non-presentation and non-JSON definitions", () => {
    const envelope = createAnimationEnvelope(fixture());
    if (!envelope.ok) return;
    expect(
      parseAnimationEnvelope({
        ...envelope.value,
        configuration: {},
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-target" },
    });
    expect(
      createAnimationEnvelope({
        ...fixture({}, 120_100),
        clockKey: "simulation" as "presentation",
      }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "presentation-clock-mismatch",
        code: "presentation-clock-required",
      },
    });
    expect(
      createAnimationEnvelope({
        ...fixture({}, 120_200),
        metadata: { invalid: Number.NaN },
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-definition" },
    });
    expect(evaluateEasing(null as never, 0.5)).toMatchObject({
      ok: false,
      error: { kind: "invalid-easing" },
    });
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

  it("combines overlapping additive translation and rotation exactly", () => {
    const base = fixture({ conflictPolicy: "additive" }, 124_000);
    const ids = new DeterministicIdFactory(125_000);
    const schedule = compileAnimationSchedule([
      base,
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Translation offset",
        startValue: { kind: "vec3", x: 2, y: -2, z: 1 },
        endValue: { kind: "vec3", x: 6, y: 2, z: 3 },
        priority: 1,
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Rotate clockwise",
        channel: "presentation.rotation",
        startValue: { kind: "scalar", value: 0 },
        endValue: { kind: "scalar", value: Math.PI },
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Rotate offset",
        channel: "presentation.rotation",
        startValue: { kind: "scalar", value: 0 },
        endValue: { kind: "scalar", value: Math.PI / 2 },
        priority: 1,
      },
    ]);
    expect(schedule.ok).toBe(true);
    if (!schedule.ok) return;
    expect(evaluateAnimationSchedule(schedule.value, 1)).toMatchObject({
      ok: true,
      value: {
        targets: [
          {
            translation: { x: 9, y: 2, z: 2 },
            rotationRadians: (3 * Math.PI) / 4,
          },
        ],
      },
    });
  });

  it("combines overlapping multiplicative scale and opacity exactly", () => {
    const base = fixture(
      {
        name: "Scale",
        channel: "presentation.scale",
        startValue: { kind: "vec3", x: 1, y: 1, z: 1 },
        endValue: { kind: "vec3", x: 3, y: 5, z: 7 },
        conflictPolicy: "multiplicative",
      },
      126_000,
    );
    const ids = new DeterministicIdFactory(127_000);
    const schedule = compileAnimationSchedule([
      base,
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Scale multiplier",
        endValue: { kind: "vec3", x: 5, y: 3, z: 1 },
        priority: 1,
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Fade",
        channel: "presentation.opacity",
        startValue: { kind: "scalar", value: 1 },
        endValue: { kind: "scalar", value: 0.5 },
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Fade multiplier",
        channel: "presentation.opacity",
        startValue: { kind: "scalar", value: 1 },
        endValue: { kind: "scalar", value: 0.8 },
        priority: 1,
      },
    ]);
    expect(schedule.ok).toBe(true);
    if (!schedule.ok) return;
    expect(evaluateAnimationSchedule(schedule.value, 1)).toMatchObject({
      ok: true,
      value: {
        targets: [
          {
            scale: { x: 6, y: 6, z: 4 },
            opacity: 0.675,
          },
        ],
      },
    });
    const overshoot = compileAnimationSchedule([
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Overshooting fade",
        channel: "presentation.opacity",
        easing: {
          kind: "cubic-bezier",
          x1: 1 / 3,
          y1: 2,
          x2: 2 / 3,
          y2: 2,
        },
        startValue: { kind: "scalar", value: 0 },
        endValue: { kind: "scalar", value: 1 },
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        name: "Constant half opacity",
        channel: "presentation.opacity",
        easing: { kind: "named", id: "linear" },
        startValue: { kind: "scalar", value: 0.5 },
        endValue: { kind: "scalar", value: 0.5 },
        priority: 1,
      },
    ]);
    expect(overshoot.ok).toBe(true);
    if (!overshoot.ok) return;
    const composed = evaluateAnimationSchedule(overshoot.value, 1);
    expect(composed.ok).toBe(true);
    if (composed.ok)
      expect(composed.value.targets[0]!.opacity).toBeCloseTo(0.8125, 6);
  });

  it("rejects mixed overlap policies and policies on incompatible channels", () => {
    const base = fixture({ conflictPolicy: "additive" }, 128_000);
    const ids = new DeterministicIdFactory(129_000);
    expect(
      compileAnimationSchedule([
        base,
        {
          ...base,
          id: ids.storyboardStepId(),
          conflictPolicy: "replace",
        },
      ]),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "channel-conflict",
        code: "overlapping-channel-conflict",
      },
    });
    expect(
      compileAnimationSchedule([
        fixture({ conflictPolicy: "multiplicative" }, 129_500),
      ]),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "unsupported-conflict-policy",
        code: "channel-policy-mismatch",
      },
    });
    expect(
      compileAnimationSchedule([
        fixture(
          { conflictPolicy: "blend" as AnimationDefinition["conflictPolicy"] },
          129_550,
        ),
      ]),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "unsupported-conflict-policy",
        code: "unknown-conflict-policy",
      },
    });
  });

  it("resolves replacement overlap by priority independently of input order", () => {
    const low = fixture({ priority: -1 }, 129_600);
    const high = {
      ...low,
      id: new DeterministicIdFactory(129_700).storyboardStepId(),
      name: "High priority move",
      startValue: { kind: "vec3" as const, x: 100, y: 100, z: 100 },
      endValue: { kind: "vec3" as const, x: 200, y: 200, z: 200 },
      priority: 10,
    };
    const first = compileAnimationSchedule([low, high]);
    const second = compileAnimationSchedule([high, low]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(evaluateAnimationSchedule(first.value, 1)).toEqual(
      evaluateAnimationSchedule(second.value, 1),
    );
    expect(evaluateAnimationSchedule(first.value, 1)).toMatchObject({
      ok: true,
      value: { targets: [{ translation: { x: 150, y: 150, z: 150 } }] },
    });
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

  it("applies zero-duration steps exactly at their start and freezes outputs", () => {
    const definition = fixture(
      {
        startTimeSeconds: 1,
        durationSeconds: 0,
        endValue: { kind: "vec3", x: 3, y: -2, z: 1 },
      },
      132_000,
    );
    const schedule = compileAnimationSchedule([definition]);
    expect(schedule.ok).toBe(true);
    if (!schedule.ok) return;
    expect(Object.isFrozen(definition.target)).toBe(false);
    expect(Object.isFrozen(schedule.value)).toBe(true);
    expect(Object.isFrozen(schedule.value.animations[0]!.target)).toBe(true);
    expect(evaluateAnimationSchedule(schedule.value, 0.999)).toEqual({
      ok: true,
      value: { presentationTimeSeconds: 0.999, targets: [] },
    });
    const atStart = evaluateAnimationSchedule(schedule.value, 1);
    expect(atStart).toMatchObject({
      ok: true,
      value: { targets: [{ translation: { x: 3, y: -2, z: 1 } }] },
    });
    if (atStart.ok) {
      expect(Object.isFrozen(atStart.value)).toBe(true);
      expect(
        Object.isFrozen(
          atStart.value.targets[0]!.sourceAnimationIds.translation,
        ),
      ).toBe(true);
    }
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
    expect(task.id).toBe(`physica:task/presentation-animation/${sceneId}`);
  });

  it("rejects a missing presentation clock without publication", () => {
    const ids = new DeterministicIdFactory(140_000);
    const definition = fixture({}, 140_100);
    const schedule = compileAnimationSchedule([definition]);
    if (!schedule.ok) return;
    const store = new PresentationStateStore();
    const result = evaluatePresentationClock(
      schedule.value,
      definition.target.sceneId,
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

  it("rejects a schedule containing targets from another scene", () => {
    const ids = new DeterministicIdFactory(145_000);
    const schedule = compileAnimationSchedule([fixture({}, 145_100)]);
    if (!schedule.ok) return;
    const sceneId = ids.sceneId();
    const clockId = ids.clockId();
    const store = new PresentationStateStore();
    expect(
      evaluatePresentationClock(
        schedule.value,
        sceneId,
        clockId,
        [{ clockId, timeSeconds: 1 }],
        store,
      ),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "invalid-target",
        code: "presentation-scene-mismatch",
      },
    });
    expect(store.snapshot()).toBeUndefined();
  });

  it("evaluates in a complete Runtime Scheduler cycle after clock advancement", () => {
    const ids = new DeterministicIdFactory(150_000);
    const sceneId = ids.sceneId();
    const clocks = createDefaultClockDefinitions(ids, false);
    const clockRuntime = unwrap(createClockRuntime(clocks));
    const presentationClockId = clocks[1].id;
    const definition = fixture(
      {
        target: {
          kind: "representation",
          sceneId,
          id: ids.representationId(),
        },
      },
      151_000,
    );
    const schedule = compileAnimationSchedule([definition]);
    if (!schedule.ok) return;
    const store = new PresentationStateStore();
    const runtimeState = unwrap(createRuntimeStateStore(sceneId, [], []));
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime,
        simulationClockId: clocks[0].id,
        runtimeState,
        tasks: [
          createPresentationAnimationTask({
            sceneId,
            presentationClockId,
            schedule: schedule.value,
            store,
          }),
        ],
      }),
    );
    const cycle = unwrap(scheduler.runCycle({ deltaSeconds: 1 }));
    expect(store.snapshot()).toMatchObject({
      presentationTimeSeconds: 1,
      sceneId,
      presentationClockId,
      revision: 1,
      targets: [{ translation: { x: 5, y: 2, z: 0 } }],
    });
    const taskStart = cycle.trace.find(
      ({ kind, subjectId }) =>
        kind === "task-start" &&
        subjectId === `physica:task/presentation-animation/${sceneId}`,
    );
    expect(taskStart?.phaseId).toBe(SCHEDULER_PHASES.presentationAnimation);
    expect(
      cycle.trace.findIndex(
        ({ kind, phaseId }) =>
          kind === "phase-start" && phaseId === SCHEDULER_PHASES.storyboard,
      ),
    ).toBeLessThan(taskStart?.index ?? -1);
    expect(taskStart?.index ?? -1).toBeLessThan(
      cycle.trace.findIndex(
        ({ kind, phaseId }) =>
          kind === "phase-start" &&
          phaseId === SCHEDULER_PHASES.representationLayout,
      ),
    );
    expect(runtimeState.snapshot()).toEqual(cycle.runtimeState);
  });
});

describe("canonical ProjectDocument persistence", () => {
  it("round-trips an animation envelope without persisting presentation state", () => {
    const { ids, document } = createFixtureProject(160_000);
    const scene = createEmptyScene(ids, "Animated explanation");
    const target = representation(ids, "animated-object");
    const definition = fixture(
      {
        target: {
          kind: "representation",
          sceneId: scene.id,
          id: target.id,
        },
        metadata: { teachingPurpose: "Reveal the vector construction" },
      },
      161_000,
    );
    const envelope = createAnimationEnvelope(definition);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    const unknownStep = {
      id: ids.storyboardStepId(),
      typeId: registeredTypeId("org.example.plugin:storyboard/future-step"),
      schemaVersion: 7,
      configuration: {
        future: { opaque: true },
        values: [3, 2, 1],
      },
      enabled: true,
    };
    const project = withScene(document, {
      ...scene,
      representations: [target],
      storyboard: {
        ...scene.storyboard,
        steps: [unknownStep, envelope.value],
        extensions: {
          "org.example.plugin:storyboard": { retained: "unchanged" },
        },
      },
    });
    const first = serializeProjectJson(project);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const parsed = parseProjectJson(first.value);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const persistedStoryboard = parsed.value.document.scenes[0]!.storyboard;
    expect(persistedStoryboard.steps[0]).toEqual(unknownStep);
    expect(persistedStoryboard.extensions).toEqual({
      "org.example.plugin:storyboard": { retained: "unchanged" },
    });
    const persisted = persistedStoryboard.steps[1]!;
    expect(persisted).toEqual(envelope.value);
    expect(validateAnimationEnvelope(persisted)).toEqual(envelope);
    expect(parseAnimationEnvelope(persisted)).toEqual({
      ok: true,
      value: definition,
    });
    expect(serializeProjectJson(parsed.value.document)).toEqual(first);
    expect(first.value).not.toContain("presentationTimeSeconds");
    expect(first.value).not.toContain("presentationClockId");
    expect(first.value).not.toContain('"revision"');
  });
});
