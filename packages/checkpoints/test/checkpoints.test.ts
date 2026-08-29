import {
  DeterministicIdFactory,
  stateChannelId,
  type EntityId,
  type JsonValue,
  type Result,
  type SceneId,
  type StateChannelRef,
  type SystemId,
} from "@physica/core-model";
import {
  createClockRuntime,
  createDefaultClockDefinitions,
  type ClockRuntime,
} from "@physica/clocks";
import {
  createRuntimeEventSequence,
  type RuntimeEventSequence,
} from "@physica/events";
import {
  createRuntimeStateStore,
  type RuntimeStateStore,
} from "@physica/runtime-scheduler";
import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  checkpointParticipantId,
  createCheckpointParticipantRegistry,
  createCheckpointReplayService,
  createInMemoryCheckpointStore,
  verifyCheckpointChecksum,
  type CheckpointParticipant,
  type CheckpointParticipantRegistry,
  type CheckpointResult,
  type CheckpointReplayService,
  type InMemoryCheckpointStore,
  type ReplayDriver,
  type RuntimeCheckpointV1,
} from "../src";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

const SCENE = "00000000-0000-4000-8000-000000000800" as SceneId;
const ENTITY = "00000000-0000-4000-8000-000000000801" as EntityId;
const SYSTEM = "00000000-0000-4000-8000-000000000802" as SystemId;
const POSITION: StateChannelRef = {
  scope: "entity",
  entityId: ENTITY,
  channel: stateChannelId("mechanics.position"),
};

function success<T>(value: T): CheckpointResult<T> {
  return { ok: true, value };
}

interface MutableParticipant {
  readonly participant: CheckpointParticipant;
  get(): JsonValue;
  set(value: JsonValue): void;
  failOn(value: JsonValue | undefined): void;
}

function mutableParticipant(
  id: string,
  initial: JsonValue,
  kind: CheckpointParticipant["kind"] = "solver",
): MutableParticipant {
  let value = initial;
  let restoreFailure: JsonValue | undefined;
  const participantId = unwrap(checkpointParticipantId(id));
  return {
    participant: {
      participantId,
      kind,
      schemaVersion: 1,
      capture: () => success(value),
      validate: (snapshot) =>
        snapshot.state === null ||
        ["string", "number", "boolean", "object"].includes(
          typeof snapshot.state,
        )
          ? success(undefined)
          : {
              ok: false,
              error: {
                kind: "snapshot-validation-failed",
                message: "Unsupported participant state.",
              },
            },
      restore: (snapshot) => {
        if (
          restoreFailure !== undefined &&
          canonicalJson(snapshot.state) === canonicalJson(restoreFailure)
        )
          return {
            ok: false,
            error: {
              kind: "participant-restore-failed",
              participantId,
              message: "Intentional restore failure.",
            },
          };
        value = snapshot.state;
        return success(undefined);
      },
    },
    get: () => value,
    set: (next) => {
      value = next;
    },
    failOn: (next) => {
      restoreFailure = next;
    },
  };
}

interface Harness {
  readonly clocks: ClockRuntime;
  readonly clockId: ReturnType<ClockRuntime["getStates"]>[number]["clockId"];
  readonly state: RuntimeStateStore;
  readonly sequence: RuntimeEventSequence;
  readonly participants: CheckpointParticipantRegistry;
  readonly store: InMemoryCheckpointStore;
  readonly service: CheckpointReplayService;
}

function harness(
  participants: readonly CheckpointParticipant[] = [],
  maxCheckpointsPerScene = 16,
): Harness {
  const ids = new DeterministicIdFactory(800);
  const definitions = createDefaultClockDefinitions(ids, false);
  const clocks = unwrap(createClockRuntime(definitions));
  const state = unwrap(
    createRuntimeStateStore(
      SCENE,
      [{ ref: POSITION, writerId: SYSTEM }],
      [{ ref: POSITION, value: 0 }],
    ),
  );
  const sequence = unwrap(createRuntimeEventSequence());
  const registry = unwrap(createCheckpointParticipantRegistry(participants));
  const store = unwrap(
    createInMemoryCheckpointStore({
      minimumClockIntervalSeconds: 1,
      maxCheckpointsPerScene,
    }),
  );
  const service = unwrap(
    createCheckpointReplayService({
      sceneId: SCENE,
      primaryClockId: definitions[0].id,
      clockRuntime: clocks,
      authoritativeState: state,
      eventSequence: sequence,
      participants: registry,
      store,
    }),
  );
  return {
    clocks,
    clockId: definitions[0].id,
    state,
    sequence,
    participants: registry,
    store,
    service,
  };
}

function numericalDriver(runtime: Harness): ReplayDriver {
  return {
    replayStep: ({ clockId, fromTimeSeconds, toTimeSeconds }) => {
      const previous = runtime.state.read(POSITION);
      if (typeof previous !== "number")
        return {
          ok: false,
          error: {
            kind: "replay-step-failed",
            message: "Position state is not numeric.",
            fromTimeSeconds,
            toTimeSeconds,
          },
        };
      const clock = runtime.clocks.applyControl({
        kind: "scrub",
        clockId,
        timeSeconds: toTimeSeconds,
      });
      if (!clock.ok)
        return {
          ok: false,
          error: {
            kind: "replay-step-failed",
            message: clock.error.kind,
            fromTimeSeconds,
            toTimeSeconds,
          },
        };
      const committed = runtime.state.commit(SYSTEM, [
        {
          ref: POSITION,
          value:
            previous +
            (toTimeSeconds - fromTimeSeconds) * (1 + fromTimeSeconds),
        },
      ]);
      return committed.ok
        ? success(undefined)
        : {
            ok: false,
            error: {
              kind: "replay-step-failed",
              message: committed.error.kind,
              fromTimeSeconds,
              toTimeSeconds,
            },
          };
    },
    regenerateDerived: () => success(undefined),
  };
}

function advance(
  runtime: Harness,
  driver: ReplayDriver,
  target: number,
  step = 0.25,
): void {
  let current = runtime.clocks.getState(runtime.clockId)!.timeSeconds;
  while (current < target) {
    const next = Math.min(target, current + step);
    unwrap(
      driver.replayStep({
        clockId: runtime.clockId,
        fromTimeSeconds: current,
        toTimeSeconds: next,
      }),
    );
    current = next;
  }
}

describe("checkpoint integrity and participants", () => {
  it("canonicalizes object keys and detects corrupted checkpoint bodies", () => {
    expect(canonicalJson({ z: 1, nested: { b: 2, a: "✓" } })).toBe(
      canonicalJson({ nested: { a: "✓", b: 2 }, z: 1 }),
    );
    const runtime = harness();
    const checkpoint = unwrap(runtime.service.capture());
    const corrupted = {
      ...checkpoint,
      eventSequenceState: 9,
    } as RuntimeCheckpointV1;
    expect(verifyCheckpointChecksum(corrupted)).toMatchObject({
      ok: false,
      error: { kind: "checksum-mismatch" },
    });
  });

  it("captures participant state immutably in lexical ID order", () => {
    const later = mutableParticipant("test.participant:z", { value: 2 });
    const earlier = mutableParticipant("test.participant:a", { value: 1 });
    const registry = unwrap(
      createCheckpointParticipantRegistry([
        later.participant,
        earlier.participant,
      ]),
    );
    const captured = unwrap(registry.captureAll());
    earlier.set({ value: 99 });
    expect(captured.map(({ participantId }) => participantId)).toEqual([
      "test.participant:a",
      "test.participant:z",
    ]);
    expect(captured[0]!.state).toEqual({ value: 1 });
    expect(Object.isFrozen(captured[0]!.state)).toBe(true);
    expect(
      createCheckpointParticipantRegistry([
        earlier.participant,
        earlier.participant,
      ]),
    ).toMatchObject({ ok: false, error: { kind: "duplicate-participant" } });
  });
});

describe("checkpoint storage and restoration", () => {
  it("applies cadence, nearest-before selection and bounded eviction", () => {
    const runtime = harness([], 2);
    const first = unwrap(runtime.service.captureIfDue());
    expect(first?.sequence).toBe(0);
    unwrap(
      runtime.clocks.applyControl({
        kind: "scrub",
        clockId: runtime.clockId,
        timeSeconds: 0.5,
      }),
    );
    expect(unwrap(runtime.service.captureIfDue())).toBeUndefined();
    for (const time of [1, 2]) {
      unwrap(
        runtime.clocks.applyControl({
          kind: "scrub",
          clockId: runtime.clockId,
          timeSeconds: time,
        }),
      );
      unwrap(runtime.service.captureIfDue());
    }
    expect(runtime.store.list(SCENE).map(({ sequence }) => sequence)).toEqual([
      1, 2,
    ]);
    expect(
      unwrap(runtime.store.nearest(SCENE, runtime.clockId, 1.5)).sequence,
    ).toBe(1);
  });

  it("restores clocks, authoritative state, event sequence and participants", () => {
    const solver = mutableParticipant("physica.solver:toy", { velocity: 3 });
    const runtime = harness([solver.participant]);
    const checkpoint = unwrap(runtime.service.capture());
    unwrap(runtime.clocks.advance(4));
    unwrap(runtime.state.commit(SYSTEM, [{ ref: POSITION, value: 12 }]));
    unwrap(runtime.sequence.next());
    solver.set({ velocity: 8 });
    expect(runtime.service.restore(checkpoint).ok).toBe(true);
    expect(runtime.clocks.snapshot()).toEqual(checkpoint.clockSnapshot);
    expect(runtime.state.snapshot()).toEqual(
      checkpoint.authoritativeStateSnapshot,
    );
    expect(runtime.sequence.snapshot()).toBe(0);
    expect(solver.get()).toEqual({ velocity: 3 });
  });

  it("rolls every runtime component back if a participant restore fails", () => {
    const solver = mutableParticipant("physica.solver:rollback", 1);
    const runtime = harness([solver.participant]);
    const checkpoint = unwrap(runtime.service.capture());
    unwrap(runtime.clocks.advance(2));
    unwrap(runtime.state.commit(SYSTEM, [{ ref: POSITION, value: 2 }]));
    unwrap(runtime.sequence.next());
    solver.set(2);
    solver.failOn(1);
    const before = {
      clocks: runtime.clocks.snapshot(),
      state: runtime.state.snapshot(),
      sequence: runtime.sequence.snapshot(),
      participant: solver.get(),
    };
    expect(runtime.service.restore(checkpoint).ok).toBe(false);
    expect(runtime.clocks.snapshot()).toEqual(before.clocks);
    expect(runtime.state.snapshot()).toEqual(before.state);
    expect(runtime.sequence.snapshot()).toBe(before.sequence);
    expect(solver.get()).toEqual(before.participant);
  });

  it("preflights invalid snapshots without mutating runtimes", () => {
    const runtime = harness();
    const clocksBefore = runtime.clocks.snapshot();
    const invalidClockSnapshot = {
      states: [clocksBefore.states[0]!, clocksBefore.states[0]!],
    };
    expect(runtime.clocks.validateSnapshot(invalidClockSnapshot).ok).toBe(
      false,
    );
    expect(runtime.clocks.snapshot()).toEqual(clocksBefore);
    const stateBefore = runtime.state.snapshot();
    expect(
      runtime.state.validateSnapshot({
        ...stateBefore,
        sceneId: "other" as SceneId,
      }).ok,
    ).toBe(false);
    expect(runtime.state.snapshot()).toEqual(stateBefore);
    expect(runtime.sequence.restore(7)).toEqual({ ok: true, value: 7 });
  });
});

describe("deterministic replay", () => {
  it("matches uninterrupted numerical execution across forward and backward scrubs", () => {
    const baseline = harness();
    const baselineDriver = numericalDriver(baseline);
    advance(baseline, baselineDriver, 3);

    const replayed = harness();
    const replayedDriver = numericalDriver(replayed);
    unwrap(replayed.service.capture());
    advance(replayed, replayedDriver, 2);
    const atTwo = unwrap(replayed.service.capture());
    advance(replayed, replayedDriver, 5);
    const backwards = unwrap(
      replayed.service.scrub(
        {
          sceneId: SCENE,
          clockId: replayed.clockId,
          targetTimeSeconds: 3,
          maximumStepSeconds: 0.25,
        },
        replayedDriver,
      ),
    );
    expect(backwards.checkpointId).toBe(atTwo.checkpointId);
    expect(backwards.replaySteps).toBe(4);
    expect(replayed.state.read(POSITION)).toBe(baseline.state.read(POSITION));

    const forwards = unwrap(
      replayed.service.scrub(
        {
          sceneId: SCENE,
          clockId: replayed.clockId,
          targetTimeSeconds: 4,
          maximumStepSeconds: 0.25,
        },
        replayedDriver,
      ),
    );
    expect(forwards.restoredTimeSeconds).toBe(2);
    expect(forwards.replaySteps).toBe(8);
  });

  it("restores full stochastic generator state and event sequence position", () => {
    let randomState = 0x12345678;
    const random = mutableParticipant(
      "physica.random:xorshift32",
      randomState,
      "random-source",
    );
    const runtime = harness([random.participant]);
    const samples: number[] = [];
    const driver: ReplayDriver = {
      replayStep: ({ clockId, fromTimeSeconds, toTimeSeconds }) => {
        randomState = Number(random.get()) >>> 0;
        randomState ^= randomState << 13;
        randomState ^= randomState >>> 17;
        randomState ^= randomState << 5;
        randomState >>>= 0;
        random.set(randomState);
        samples.push(randomState);
        unwrap(runtime.sequence.next());
        unwrap(
          runtime.clocks.applyControl({
            kind: "scrub",
            clockId,
            timeSeconds: toTimeSeconds,
          }),
        );
        unwrap(
          runtime.state.commit(SYSTEM, [
            { ref: POSITION, value: randomState / 0x1_0000_0000 },
          ]),
        );
        return fromTimeSeconds <= toTimeSeconds
          ? success(undefined)
          : {
              ok: false,
              error: {
                kind: "replay-step-failed",
                message: "Time reversed inside a replay step.",
                fromTimeSeconds,
                toTimeSeconds,
              },
            };
      },
      regenerateDerived: () => success(undefined),
    };
    unwrap(runtime.service.capture());
    advance(runtime, driver, 2, 0.5);
    unwrap(runtime.service.capture());
    samples.length = 0;
    advance(runtime, driver, 4, 0.5);
    const uninterrupted = [...samples];
    const uninterruptedSequence = runtime.sequence.snapshot();
    samples.length = 0;
    unwrap(
      runtime.service.scrub(
        {
          sceneId: SCENE,
          clockId: runtime.clockId,
          targetTimeSeconds: 4,
          maximumStepSeconds: 0.5,
        },
        driver,
      ),
    );
    expect(samples).toEqual(uninterrupted);
    expect(runtime.sequence.snapshot()).toBe(uninterruptedSequence);
  });

  it("supports direct analytical scrubbing and stable repeated selection", () => {
    const runtime = harness();
    unwrap(runtime.service.capture());
    let regenerations = 0;
    const report = unwrap(
      runtime.service.scrubAnalytical(runtime.clockId, 2.5, {
        evaluateAt: (clockId, targetTimeSeconds) => {
          unwrap(
            runtime.clocks.applyControl({
              kind: "scrub",
              clockId,
              timeSeconds: targetTimeSeconds,
            }),
          );
          return success(undefined);
        },
        regenerateDerived: () => {
          regenerations += 1;
          return success(undefined);
        },
      }),
    );
    expect(report.targetTimeSeconds).toBe(2.5);
    expect(regenerations).toBe(1);
    for (let index = 0; index < 10_000; index += 1)
      expect(
        unwrap(runtime.store.nearest(SCENE, runtime.clockId, 1)).sequence,
      ).toBe(0);
  });

  it("turns replay callback exceptions into stable typed failures", () => {
    const runtime = harness();
    unwrap(runtime.service.capture());
    const result = runtime.service.scrub(
      {
        sceneId: SCENE,
        clockId: runtime.clockId,
        targetTimeSeconds: 1,
        maximumStepSeconds: 0.25,
      },
      {
        replayStep: () => {
          throw new Error("host-specific text must not escape");
        },
        regenerateDerived: () => success(undefined),
      },
    );
    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: "replay-step-failed",
        message: "Replay driver threw an exception.",
      },
    });
  });
});
