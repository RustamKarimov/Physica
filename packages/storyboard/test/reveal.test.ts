import {
  createClockRuntime,
  createDefaultClockDefinitions,
} from "@physica/clocks";
import {
  createEmptyScene,
  DeterministicIdFactory,
  registeredTypeId,
  type Result,
} from "@physica/core-model";
import {
  createRuntimeScheduler,
  createRuntimeStateStore,
  SCHEDULER_PHASES,
} from "@physica/runtime-scheduler";
import { parseProjectJson, serializeProjectJson } from "@physica/serialization";
import { describe, expect, it } from "vitest";
import {
  compileRevealSchedule,
  createPresentationRevealTask,
  createRevealEnvelope,
  evaluateRevealSchedule,
  parseRevealEnvelope,
  RevealStateStore,
  type RevealDefinition,
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
  overrides: Partial<RevealDefinition> = {},
  seed = 180_000,
): RevealDefinition {
  const ids = new DeterministicIdFactory(seed);
  return {
    id: ids.storyboardStepId(),
    name: "Draw vector",
    target: {
      kind: "representation",
      sceneId: ids.sceneId(),
      id: ids.representationId(),
    },
    clockKey: "presentation",
    startTimeSeconds: 0,
    durationSeconds: 2,
    easing: { kind: "named", id: "linear" },
    priority: 0,
    reversible: true,
    scrubbable: true,
    operation: {
      kind: "draw-path",
      direction: "forward",
      startProgress: 0,
      endProgress: 1,
    },
    ...overrides,
  };
}

describe("reveal definitions and scheduling", () => {
  it("round-trips canonical envelopes without mutating input", () => {
    const definition = fixture();
    const envelope = createRevealEnvelope(definition);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(parseRevealEnvelope(envelope.value)).toEqual({
      ok: true,
      value: definition,
    });
    expect(Object.isFrozen(envelope.value.configuration)).toBe(true);
    expect(Object.isFrozen(definition.target)).toBe(false);
  });

  it("rejects malformed operations, duplicate IDs and same-channel overlap", () => {
    expect(
      createRevealEnvelope(
        fixture({
          operation: {
            kind: "draw-path",
            direction: "forward",
            startProgress: -1,
            endProgress: 1,
          },
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-operation" },
    });
    const first = fixture();
    expect(compileRevealSchedule([first, first])).toMatchObject({
      ok: false,
      error: { kind: "duplicate-reveal" },
    });
    const second = fixture(
      {
        id: new DeterministicIdFactory(181_000).storyboardStepId(),
        startTimeSeconds: 1,
      },
      180_000,
    );
    expect(compileRevealSchedule([second, first])).toMatchObject({
      ok: false,
      error: { kind: "channel-conflict" },
    });
  });

  it("permits parallel channels and sorts shuffled input stably", () => {
    const base = fixture();
    const label = fixture(
      {
        id: new DeterministicIdFactory(182_000).storyboardStepId(),
        name: "Write label",
        operation: {
          kind: "write-label",
          startProgress: 0,
          endProgress: 1,
        },
      },
      180_000,
    );
    const first = compileRevealSchedule([label, base]);
    const second = compileRevealSchedule([base, label]);
    expect(first).toEqual(second);
  });
});

describe("arbitrary-time reveal evaluation", () => {
  it("evaluates exact frames under forward, reverse and scrub orders", () => {
    const schedule = unwrap(compileRevealSchedule([fixture()]));
    const atHalf = evaluateRevealSchedule(schedule, 1);
    expect(atHalf).toMatchObject({
      ok: true,
      value: {
        presentationTimeSeconds: 1,
        targets: [{ path: { value: { progress: 0.5 } } }],
      },
    });
    expect(evaluateRevealSchedule(schedule, 2)).toMatchObject({
      ok: true,
      value: { targets: [{ path: { value: { progress: 1 } } }] },
    });
    expect(evaluateRevealSchedule(schedule, 1)).toEqual(atHalf);
  });

  it("handles zero duration, reduced motion and every operation family", () => {
    const ids = new DeterministicIdFactory(183_100);
    const base = fixture({ durationSeconds: 0 }, 183_000);
    const operations: RevealDefinition[] = [
      base,
      {
        ...base,
        id: ids.storyboardStepId(),
        operation: {
          kind: "mask",
          axis: "horizontal",
          edge: "end",
          feather: 2,
          startProgress: 0,
          endProgress: 1,
        },
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        operation: {
          kind: "opacity",
          startOpacity: 0,
          endOpacity: 0.8,
        },
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        operation: {
          kind: "write-label",
          startProgress: 0,
          endProgress: 1,
        },
      },
      {
        ...base,
        id: ids.storyboardStepId(),
        operation: {
          kind: "emphasis",
          mode: "highlight",
          startIntensity: 0,
          endIntensity: 1,
        },
      },
    ];
    const schedule = unwrap(compileRevealSchedule(operations));
    expect(evaluateRevealSchedule(schedule, 0)).toMatchObject({
      ok: true,
      value: {
        targets: [
          {
            path: { value: { progress: 1 } },
            mask: { value: { progress: 1 } },
            opacity: { value: 0.8 },
            label: { value: 1 },
            emphasis: { value: { mode: "highlight", intensity: 1 } },
          },
        ],
      },
    });
    const moving = unwrap(compileRevealSchedule([fixture()]));
    expect(
      evaluateRevealSchedule(moving, 0, { reducedMotion: true }),
    ).toMatchObject({
      ok: true,
      value: { targets: [{ path: { value: { progress: 1 } } }] },
    });
  });

  it("is frozen and stable for 10,000 arbitrary evaluations", () => {
    const schedule = unwrap(compileRevealSchedule([fixture()]));
    let final = evaluateRevealSchedule(schedule, 0);
    for (let index = 0; index < 10_000; index += 1)
      final = evaluateRevealSchedule(schedule, (index % 201) / 100);
    expect(final).toEqual(evaluateRevealSchedule(schedule, 1.5));
    if (final.ok) {
      expect(Object.isFrozen(final.value)).toBe(true);
      expect(Object.isFrozen(final.value.targets)).toBe(true);
    }
  });
});

describe("reveal runtime boundary", () => {
  it("runs in the shared presentation phase without touching physics state", () => {
    const ids = new DeterministicIdFactory(184_000);
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
      185_000,
    );
    const schedule = unwrap(compileRevealSchedule([definition]));
    const store = new RevealStateStore();
    const runtimeState = unwrap(createRuntimeStateStore(sceneId, [], []));
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime,
        simulationClockId: clocks[0].id,
        runtimeState,
        tasks: [
          createPresentationRevealTask({
            sceneId,
            presentationClockId,
            schedule,
            store,
          }),
        ],
      }),
    );
    const before = runtimeState.snapshot();
    const cycle = unwrap(scheduler.runCycle({ deltaSeconds: 1 }));
    expect(store.snapshot()).toMatchObject({
      presentationTimeSeconds: 1,
      revision: 1,
      targets: [{ path: { value: { progress: 0.5 } } }],
    });
    expect(runtimeState.snapshot()).toEqual(before);
    expect(
      cycle.trace.find(
        ({ kind, subjectId }) =>
          kind === "task-start" &&
          subjectId === "physica:task/presentation-reveal/" + sceneId,
      )?.phaseId,
    ).toBe(SCHEDULER_PHASES.presentationAnimation);
  });
});

describe("reveal persistence boundary", () => {
  it("round-trips reveal envelopes while preserving unknown steps and excluding runtime state", () => {
    const { ids, document } = createFixtureProject(186_000);
    const scene = createEmptyScene(ids, "Reveal explanation");
    const target = representation(ids, "force-vector");
    const definition = fixture(
      {
        target: {
          kind: "representation",
          sceneId: scene.id,
          id: target.id,
        },
      },
      187_000,
    );
    const envelope = createRevealEnvelope(definition);
    if (!envelope.ok) throw new Error(envelope.error.code);
    const unknown = {
      id: ids.storyboardStepId(),
      typeId: registeredTypeId("org.example:storyboard/future-reveal"),
      schemaVersion: 9,
      configuration: { opaque: [1, 2, 3] },
      enabled: true,
    };
    const project = withScene(document, {
      ...scene,
      representations: [target],
      storyboard: {
        ...scene.storyboard,
        steps: [unknown, envelope.value],
      },
    });
    const serialized = unwrap(serializeProjectJson(project));
    const parsed = unwrap(parseProjectJson(serialized));
    expect(parsed.document.scenes[0]!.storyboard.steps).toEqual([
      unknown,
      envelope.value,
    ]);
    expect(serializeProjectJson(parsed.document)).toEqual({
      ok: true,
      value: serialized,
    });
    expect(serialized).not.toContain("presentationTimeSeconds");
    expect(serialized).not.toContain("presentationClockId");
  });
});
