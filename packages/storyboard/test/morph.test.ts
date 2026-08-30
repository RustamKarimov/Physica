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
  compileMorphSchedule,
  createMatchedTransformPlan,
  createMorphEnvelope,
  createPresentationMorphTask,
  evaluateMorphSchedule,
  MorphStateStore,
  parseMorphEnvelope,
  type MatchedTransformElement,
  type MorphDefinition,
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
  overrides: Partial<MorphDefinition> = {},
  seed = 200_000,
): MorphDefinition {
  const ids = new DeterministicIdFactory(seed);
  const sceneId = ids.sceneId();
  return {
    id: ids.storyboardStepId(),
    name: "Circle to ellipse",
    source: { kind: "representation", sceneId, id: ids.representationId() },
    destination: {
      kind: "representation",
      sceneId,
      id: ids.representationId(),
    },
    clockKey: "presentation",
    startTimeSeconds: 0,
    durationSeconds: 2,
    easing: { kind: "named", id: "linear" },
    priority: 0,
    reversible: true,
    scrubbable: true,
    operation: { kind: "shape-morph", topology: "closed", sampleCount: 64 },
    ...overrides,
  };
}

describe("morph definitions and scheduling", () => {
  it("round-trips a canonical V1 Storyboard envelope", () => {
    const definition = fixture();
    const envelope = createMorphEnvelope(definition);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(parseMorphEnvelope(envelope.value)).toEqual({
      ok: true,
      value: definition,
    });
    expect(Object.isFrozen(envelope.value.configuration)).toBe(true);
    expect(Object.isFrozen(definition.source)).toBe(false);
  });

  it("rejects malformed operations, duplicates, cross-scene targets and target overlap", () => {
    expect(
      createMorphEnvelope(
        fixture({
          operation: {
            kind: "matched-transform",
            semanticId: "force",
            sourceCompatibilityKey: "path",
            destinationCompatibilityKey: "text",
            strategy: "morph",
          },
        }),
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-operation" } });
    const first = fixture();
    expect(compileMorphSchedule([first, first])).toMatchObject({
      ok: false,
      error: { kind: "duplicate-morph" },
    });
    const ids = new DeterministicIdFactory(201_000);
    expect(
      createMorphEnvelope(
        fixture({
          destination: {
            kind: "representation",
            sceneId: ids.sceneId(),
            id: ids.representationId(),
          },
        }),
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-target" } });
    const second = fixture({ id: ids.storyboardStepId(), startTimeSeconds: 1 });
    expect(compileMorphSchedule([second, first])).toMatchObject({
      ok: false,
      error: { kind: "target-conflict" },
    });
  });

  it("sorts independent shuffled transitions deterministically", () => {
    const first = fixture({}, 202_000);
    const second = fixture({ startTimeSeconds: 3 }, 203_000);
    expect(compileMorphSchedule([second, first])).toEqual(
      compileMorphSchedule([first, second]),
    );
  });
});

describe("ID-based matched transform planning", () => {
  function element(
    semanticId: string,
    compatibilityKey: string,
    seed: number,
  ): MatchedTransformElement {
    const ids = new DeterministicIdFactory(seed);
    return {
      semanticId,
      compatibilityKey,
      target: {
        kind: "representation",
        sceneId: ids.sceneId(),
        id: ids.representationId(),
      },
    };
  }

  it("matches only stable semantic IDs and classifies replacement/entry/exit", () => {
    const source = [
      element("velocity", "path", 204_000),
      element("force", "path", 205_000),
      element("exiting-label", "text", 206_000),
    ];
    const destination = [
      element("entering-label", "text", 207_000),
      element("force", "text", 208_000),
      element("velocity", "path", 209_000),
    ];
    const plan = createMatchedTransformPlan(source, destination);
    expect(plan).toMatchObject({
      ok: true,
      value: {
        matches: [
          { semanticId: "force", strategy: "replace" },
          { semanticId: "velocity", strategy: "morph" },
        ],
        exits: [{ semanticId: "exiting-label" }],
        entries: [{ semanticId: "entering-label" }],
      },
    });
    expect(
      createMatchedTransformPlan([...source].reverse(), destination),
    ).toEqual(plan);
  });

  it("rejects ambiguous duplicate semantic IDs", () => {
    const duplicate = element("force", "path", 210_000);
    expect(
      createMatchedTransformPlan([duplicate, duplicate], []),
    ).toMatchObject({
      ok: false,
      error: { kind: "duplicate-semantic-id" },
    });
  });
});

describe("arbitrary-time morph evaluation", () => {
  it("is exact for forward, reverse, scrub, zero-duration and reduced motion", () => {
    const schedule = unwrap(compileMorphSchedule([fixture()]));
    const half = evaluateMorphSchedule(schedule, 1);
    expect(half).toMatchObject({
      ok: true,
      value: {
        presentationTimeSeconds: 1,
        transitions: [
          { progress: 0.5, sourceOpacity: 0.5, destinationOpacity: 0.5 },
        ],
      },
    });
    expect(evaluateMorphSchedule(schedule, 2)).toMatchObject({
      ok: true,
      value: {
        transitions: [{ progress: 1, sourceOpacity: 0, destinationOpacity: 1 }],
      },
    });
    expect(evaluateMorphSchedule(schedule, 1)).toEqual(half);
    const immediate = unwrap(
      compileMorphSchedule([fixture({ durationSeconds: 0 })]),
    );
    expect(evaluateMorphSchedule(immediate, 0)).toMatchObject({
      ok: true,
      value: { transitions: [{ progress: 1 }] },
    });
    expect(
      evaluateMorphSchedule(schedule, 0, { reducedMotion: true }),
    ).toMatchObject({ ok: true, value: { transitions: [{ progress: 1 }] } });
  });

  it("is deeply frozen and stable for 10,000 arbitrary evaluations", () => {
    const schedule = unwrap(compileMorphSchedule([fixture()]));
    let final = evaluateMorphSchedule(schedule, 0);
    for (let index = 0; index < 10_000; index += 1)
      final = evaluateMorphSchedule(schedule, (index % 201) / 100);
    expect(final).toEqual(evaluateMorphSchedule(schedule, 1.5));
    if (final.ok) {
      expect(Object.isFrozen(final.value)).toBe(true);
      expect(Object.isFrozen(final.value.transitions)).toBe(true);
    }
  });
});

describe("morph runtime and persistence boundaries", () => {
  it("runs in the shared presentation phase without touching physics state", () => {
    const ids = new DeterministicIdFactory(211_000);
    const sceneId = ids.sceneId();
    const clocks = createDefaultClockDefinitions(ids, false);
    const clockRuntime = unwrap(createClockRuntime(clocks));
    const presentationClockId = clocks[1].id;
    const definition = fixture(
      {
        source: {
          kind: "representation",
          sceneId,
          id: ids.representationId(),
        },
        destination: {
          kind: "representation",
          sceneId,
          id: ids.representationId(),
        },
      },
      212_000,
    );
    const schedule = unwrap(compileMorphSchedule([definition]));
    const store = new MorphStateStore();
    const runtimeState = unwrap(createRuntimeStateStore(sceneId, [], []));
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime,
        simulationClockId: clocks[0].id,
        runtimeState,
        tasks: [
          createPresentationMorphTask({
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
      transitions: [{ progress: 0.5 }],
    });
    expect(runtimeState.snapshot()).toEqual(before);
    expect(
      cycle.trace.find(
        ({ kind, subjectId }) =>
          kind === "task-start" &&
          subjectId === "physica:task/presentation-morph/" + sceneId,
      )?.phaseId,
    ).toBe(SCHEDULER_PHASES.presentationAnimation);
  });

  it("round-trips morph envelopes and excludes transient state", () => {
    const { ids, document } = createFixtureProject(213_000);
    const scene = createEmptyScene(ids, "Morph explanation");
    const source = representation(ids, "circle");
    const destination = representation(ids, "ellipse");
    const envelope = createMorphEnvelope(
      fixture({
        source: { kind: "representation", sceneId: scene.id, id: source.id },
        destination: {
          kind: "representation",
          sceneId: scene.id,
          id: destination.id,
        },
      }),
    );
    if (!envelope.ok) throw new Error(envelope.error.code);
    const unknown = {
      id: ids.storyboardStepId(),
      typeId: registeredTypeId("org.example:storyboard/future-morph"),
      schemaVersion: 9,
      configuration: { opaque: [1, 2, 3] },
      enabled: true,
    };
    const project = withScene(document, {
      ...scene,
      representations: [source, destination],
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
    expect(serialized).not.toContain("sourceOpacity");
  });
});
