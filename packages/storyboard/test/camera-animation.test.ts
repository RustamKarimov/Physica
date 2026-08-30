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
import { resolveCameraPresentation } from "@physica/renderer-core";
import {
  createRuntimeScheduler,
  createRuntimeStateStore,
  SCHEDULER_PHASES,
} from "@physica/runtime-scheduler";
import { parseProjectJson, serializeProjectJson } from "@physica/serialization";
import { describe, expect, it } from "vitest";
import {
  CameraAnimationStateStore,
  compileCameraAnimationSchedule,
  createCameraAnimationEnvelope,
  createPresentationCameraTask,
  evaluateCameraAnimationSchedule,
  parseCameraAnimationEnvelope,
  type CameraAnimationDefinition,
} from "../src";
import {
  createFixtureProject,
  withScene,
} from "../../../tests/helpers/model-fixtures";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

function vec3(x: number, y: number, z: number) {
  return Object.freeze({ x, y, z });
}

function fixture(
  overrides: Partial<CameraAnimationDefinition> = {},
  seed = 300_000,
): CameraAnimationDefinition {
  const ids = new DeterministicIdFactory(seed);
  return {
    id: ids.storyboardStepId(),
    name: "Follow projectile",
    target: { kind: "scene", sceneId: ids.sceneId() },
    clockKey: "presentation",
    startTimeSeconds: 0,
    durationSeconds: 2,
    easing: { kind: "named", id: "linear" },
    priority: 0,
    reversible: true,
    scrubbable: true,
    operation: {
      kind: "follow-target",
      representationId: ids.representationId(),
      cameraOffset: vec3(0, 2, 8),
      lookAtOffset: vec3(0, 0, 0),
    },
    ...overrides,
  };
}

describe("Camera-animation definitions and scheduling", () => {
  it("round-trips a deeply frozen canonical V1 Storyboard envelope", () => {
    const definition = fixture();
    const envelope = unwrap(createCameraAnimationEnvelope(definition));
    expect(parseCameraAnimationEnvelope(envelope)).toEqual({
      ok: true,
      value: definition,
    });
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.configuration)).toBe(true);
    expect(Object.isFrozen(envelope.configuration.operation)).toBe(true);
    expect(Object.isFrozen(definition.operation)).toBe(false);
  });

  it("rejects malformed operations, timing, clock and duplicate IDs", () => {
    expect(
      createCameraAnimationEnvelope(
        fixture({
          operation: {
            kind: "zoom",
            startZoom: 1,
            endZoom: 0,
          },
        }),
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-operation" } });
    expect(
      createCameraAnimationEnvelope(
        fixture({
          durationSeconds: -1,
        }),
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-time" } });
    expect(
      createCameraAnimationEnvelope(
        fixture({
          clockKey: "simulation" as "presentation",
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "presentation-clock-mismatch" },
    });
    const first = fixture();
    expect(compileCameraAnimationSchedule([first, first])).toMatchObject({
      ok: false,
      error: { kind: "duplicate-camera-animation" },
    });
  });

  it("allows parallel pose/projection and rejects same-channel overlap", () => {
    const pan = fixture(
      {
        operation: {
          kind: "pan",
          startOffset: vec3(0, 0, 0),
          endOffset: vec3(2, 0, 0),
        },
      },
      301_000,
    );
    const zoom = fixture(
      {
        target: pan.target,
        startTimeSeconds: 1,
        operation: { kind: "zoom", startZoom: 1, endZoom: 2 },
      },
      302_000,
    );
    expect(compileCameraAnimationSchedule([zoom, pan])).toMatchObject({
      ok: true,
      value: { durationSeconds: 3 },
    });
    const follow = fixture(
      { target: pan.target, startTimeSeconds: 1 },
      303_000,
    );
    expect(compileCameraAnimationSchedule([follow, pan])).toMatchObject({
      ok: false,
      error: { kind: "channel-conflict" },
    });
    const fit = fixture(
      {
        target: pan.target,
        startTimeSeconds: 1,
        operation: {
          kind: "fit-object",
          representationId: new DeterministicIdFactory(
            304_000,
          ).representationId(),
          padding: 0.1,
        },
      },
      304_100,
    );
    expect(compileCameraAnimationSchedule([fit, zoom])).toMatchObject({
      ok: false,
      error: { kind: "channel-conflict" },
    });
  });

  it("sorts shuffled independent transitions deterministically", () => {
    const first = fixture({}, 305_000);
    const second = fixture(
      { startTimeSeconds: 3, target: first.target },
      306_000,
    );
    expect(compileCameraAnimationSchedule([second, first])).toEqual(
      compileCameraAnimationSchedule([first, second]),
    );
  });
});

describe("arbitrary-time Camera-animation evaluation", () => {
  it("is exact for start, middle, end, reverse, zero-duration and reduced motion", () => {
    const schedule = unwrap(compileCameraAnimationSchedule([fixture()]));
    expect(evaluateCameraAnimationSchedule(schedule, -1)).toMatchObject({
      ok: true,
      value: { presentationTimeSeconds: -1, operations: [] },
    });
    const half = evaluateCameraAnimationSchedule(schedule, 1);
    expect(half).toMatchObject({
      ok: true,
      value: { operations: [{ progress: 0.5 }] },
    });
    expect(evaluateCameraAnimationSchedule(schedule, 2)).toMatchObject({
      ok: true,
      value: { operations: [{ progress: 1 }] },
    });
    expect(evaluateCameraAnimationSchedule(schedule, 1)).toEqual(half);
    const immediate = unwrap(
      compileCameraAnimationSchedule([
        fixture({ durationSeconds: 0 }, 307_000),
      ]),
    );
    expect(evaluateCameraAnimationSchedule(immediate, 0)).toMatchObject({
      ok: true,
      value: { operations: [{ progress: 1 }] },
    });
    expect(
      evaluateCameraAnimationSchedule(schedule, 0, { reducedMotion: true }),
    ).toMatchObject({ ok: true, value: { operations: [{ progress: 1 }] } });
  });

  it("retains completed operations for sequential accumulation", () => {
    const first = fixture(
      {
        durationSeconds: 1,
        operation: {
          kind: "pan",
          startOffset: vec3(0, 0, 0),
          endOffset: vec3(2, 0, 0),
        },
      },
      308_000,
    );
    const second = fixture(
      {
        target: first.target,
        startTimeSeconds: 1,
        operation: {
          kind: "pan",
          startOffset: vec3(0, 0, 0),
          endOffset: vec3(3, 0, 0),
        },
      },
      309_000,
    );
    const frame = unwrap(
      evaluateCameraAnimationSchedule(
        unwrap(compileCameraAnimationSchedule([first, second])),
        2,
      ),
    );
    expect(frame.operations.map(({ progress }) => progress)).toEqual([1, 0.5]);
    const resolved = unwrap(
      resolveCameraPresentation(
        {
          kind: "orthographic",
          viewport: { width: 800, height: 400, devicePixelRatio: 1 },
          position: vec3(0, 0, 10),
          target: vec3(0, 0, 0),
          up: vec3(0, 1, 0),
          near: 0.1,
          far: 100,
          verticalSpan: 4,
        },
        frame.operations,
      ),
    );
    expect(resolved.target).toEqual(vec3(3.5, 0, 0));
  });

  it("is deeply frozen and stable for 10,000 arbitrary evaluations", () => {
    const schedule = unwrap(compileCameraAnimationSchedule([fixture()]));
    let final = evaluateCameraAnimationSchedule(schedule, 0);
    for (let index = 0; index < 10_000; index += 1)
      final = evaluateCameraAnimationSchedule(schedule, (index % 201) / 100);
    expect(final).toEqual(evaluateCameraAnimationSchedule(schedule, 1.5));
    if (final.ok) {
      expect(Object.isFrozen(final.value)).toBe(true);
      expect(Object.isFrozen(final.value.operations)).toBe(true);
    }
  });
});

describe("Camera-animation runtime and persistence boundaries", () => {
  it("runs in the presentation phase without touching physics state", () => {
    const ids = new DeterministicIdFactory(310_000);
    const sceneId = ids.sceneId();
    const clocks = createDefaultClockDefinitions(ids, false);
    const clockRuntime = unwrap(createClockRuntime(clocks));
    const presentationClockId = clocks[1].id;
    const schedule = unwrap(
      compileCameraAnimationSchedule([
        fixture({ target: { kind: "scene", sceneId } }, 311_000),
      ]),
    );
    const store = new CameraAnimationStateStore();
    const runtimeState = unwrap(createRuntimeStateStore(sceneId, [], []));
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime,
        simulationClockId: clocks[0].id,
        runtimeState,
        tasks: [
          createPresentationCameraTask({
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
      operations: [{ progress: 0.5 }],
    });
    expect(runtimeState.snapshot()).toEqual(before);
    expect(
      cycle.trace.find(
        ({ kind, subjectId }) =>
          kind === "task-start" &&
          subjectId === "physica:task/presentation-camera/" + sceneId,
      )?.phaseId,
    ).toBe(SCHEDULER_PHASES.presentationAnimation);
  });

  it("round-trips Camera envelopes, preserves unknown steps and excludes transient state", () => {
    const { ids, document } = createFixtureProject(312_000);
    const scene = createEmptyScene(ids, "Camera follow");
    const envelope = unwrap(
      createCameraAnimationEnvelope(
        fixture({ target: { kind: "scene", sceneId: scene.id } }, 313_000),
      ),
    );
    const unknown = {
      id: ids.storyboardStepId(),
      typeId: registeredTypeId("org.example:storyboard/future-camera"),
      schemaVersion: 9,
      configuration: { opaque: [1, 2, 3] },
      enabled: true,
    };
    const project = withScene(document, {
      ...scene,
      storyboard: {
        ...scene.storyboard,
        steps: [unknown, envelope],
      },
    });
    const serialized = unwrap(serializeProjectJson(project));
    const parsed = unwrap(parseProjectJson(serialized));
    expect(parsed.document.scenes[0]!.storyboard.steps).toEqual([
      unknown,
      envelope,
    ]);
    expect(serializeProjectJson(parsed.document)).toEqual({
      ok: true,
      value: serialized,
    });
    expect(serialized).not.toContain("presentationTimeSeconds");
    expect(serialized).not.toContain("operations");
    expect(serialized).not.toContain("revision");
  });
});
