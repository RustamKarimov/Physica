import {
  DeterministicIdFactory,
  registeredTypeId,
  stateChannelId,
  type ClockId,
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
import { createRuntimeEvent, type RuntimeEvent } from "@physica/events";
import { describe, expect, it } from "vitest";
import {
  BUILT_IN_PHASE_ORDER,
  collectOrderedWorkerResults,
  createRuntimeScheduler,
  createRuntimeStateStore,
  orderScheduledRuntimeEvents,
  runtimeTaskId,
  schedulerPhaseId,
  SCHEDULER_PHASES,
  SchedulerPlan,
  stateChannelKey,
  buildScheduledSystemPlan,
  type RuntimeStateClaim,
  type RuntimeStateInitialValue,
  type RuntimeTask,
  type ScheduledSystem,
  type SchedulerResult,
} from "../src";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

function clocks(): {
  readonly runtime: ClockRuntime;
  readonly simulationClockId: ClockId;
  readonly presentationClockId: ClockId;
} {
  const factory = new DeterministicIdFactory(1);
  const definitions = createDefaultClockDefinitions(factory, false);
  return {
    runtime: unwrap(createClockRuntime(definitions)),
    simulationClockId: definitions[0].id,
    presentationClockId: definitions[1].id,
  };
}

const SCENE = "00000000-0000-4000-8000-000000000100" as SceneId;
const ENTITY = "00000000-0000-4000-8000-000000000101" as EntityId;
const SYSTEM_A = "00000000-0000-4000-8000-000000000102" as SystemId;
const SYSTEM_B = "00000000-0000-4000-8000-000000000103" as SystemId;
const POSITION: StateChannelRef = {
  scope: "entity",
  entityId: ENTITY,
  channel: stateChannelId("mechanics.position"),
};
const VELOCITY: StateChannelRef = {
  scope: "entity",
  entityId: ENTITY,
  channel: stateChannelId("mechanics.velocity"),
};

function state(
  claims: readonly RuntimeStateClaim[] = [],
  initial: readonly RuntimeStateInitialValue[] = [],
) {
  return unwrap(createRuntimeStateStore(SCENE, claims, initial));
}

function event(
  sequenceId: number,
  priority = 0,
  timestampSeconds = 1,
): RuntimeEvent {
  return unwrap(
    createRuntimeEvent({
      timestampSeconds,
      clockDomain: "00000000-0000-4000-8000-000000000001" as ClockId,
      sourceId: "source",
      eventType: registeredTypeId("physica:event/test"),
      sequenceId,
      priority,
      payload: { sequenceId },
    }),
  );
}

const success = <T>(value: T): SchedulerResult<T> => ({ ok: true, value });

describe("scheduler phases and tasks", () => {
  it("preserves the exact frozen 13-stage order", () => {
    expect(BUILT_IN_PHASE_ORDER).toEqual([
      SCHEDULER_PHASES.documentControl,
      SCHEDULER_PHASES.clockAdvancement,
      SCHEDULER_PHASES.authoritativePhysics,
      SCHEDULER_PHASES.eventOrdering,
      SCHEDULER_PHASES.physicalEventProcessing,
      SCHEDULER_PHASES.observables,
      SCHEDULER_PHASES.relationships,
      SCHEDULER_PHASES.acquisition,
      SCHEDULER_PHASES.storyboard,
      SCHEDULER_PHASES.presentationAnimation,
      SCHEDULER_PHASES.representationLayout,
      SCHEDULER_PHASES.rendering,
      SCHEDULER_PHASES.audioOutput,
    ]);
    expect(Object.isFrozen(BUILT_IN_PHASE_ORDER)).toBe(true);
  });

  it("orders specialized phases by anchor, placement, priority and registration", () => {
    const before = unwrap(schedulerPhaseId("plugin.example:before-render"));
    const after = unwrap(schedulerPhaseId("plugin.example:after-render"));
    let plan = SchedulerPlan.builtIn();
    plan = unwrap(
      plan.register({
        id: after,
        anchor: SCHEDULER_PHASES.rendering,
        placement: "after",
        priority: 0,
      }),
    );
    plan = unwrap(
      plan.register({
        id: before,
        anchor: SCHEDULER_PHASES.rendering,
        placement: "before",
        priority: -1,
      }),
    );
    const ids = plan.entries().map(({ id }) => id);
    const render = ids.indexOf(SCHEDULER_PHASES.rendering);
    expect(ids.slice(render - 1, render + 2)).toEqual([
      before,
      SCHEDULER_PHASES.rendering,
      after,
    ]);
    expect(
      plan.register({
        id: before,
        anchor: SCHEDULER_PHASES.rendering,
        placement: "before",
        priority: 0,
      }),
    ).toMatchObject({ ok: false, error: { kind: "duplicate-phase" } });
  });

  it("runs every phase deterministically and advances both named clocks once", () => {
    const clock = clocks();
    const observed: string[] = [];
    const tasks: RuntimeTask[] = [...BUILT_IN_PHASE_ORDER]
      .reverse()
      .map((phaseId) => ({
        id: unwrap(runtimeTaskId(`test.tasks:${phaseId.split("/").at(-1)!}`)),
        phaseId,
        run: () => {
          observed.push(phaseId);
          return success(undefined);
        },
      }));
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime: clock.runtime,
        simulationClockId: clock.simulationClockId,
        runtimeState: state(),
        tasks,
      }),
    );
    const result = unwrap(scheduler.runCycle({ deltaSeconds: 0.25 }));
    expect(observed).toEqual(BUILT_IN_PHASE_ORDER);
    expect(result.clockAdvance.changes).toHaveLength(2);
    expect(
      result.trace
        .filter(({ kind }) => kind === "phase-start")
        .map(({ phaseId }) => phaseId),
    ).toEqual(BUILT_IN_PHASE_ORDER);
  });

  it("orders same-phase tasks by priority and stable registration sequence", () => {
    const clock = clocks();
    const observed: string[] = [];
    const task = (id: string, priority: number): RuntimeTask => ({
      id: unwrap(runtimeTaskId(`test.priority:${id}`)),
      phaseId: SCHEDULER_PHASES.observables,
      priority,
      run: () => {
        observed.push(id);
        return success(undefined);
      },
    });
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime: clock.runtime,
        simulationClockId: clock.simulationClockId,
        runtimeState: state(),
        tasks: [task("late", 1), task("first", -1), task("second", -1)],
      }),
    );
    unwrap(scheduler.runCycle({ deltaSeconds: 0 }));
    expect(observed).toEqual(["first", "second", "late"]);
  });

  it("retains a deterministic partial trace when a task fails", () => {
    const clock = clocks();
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime: clock.runtime,
        simulationClockId: clock.simulationClockId,
        runtimeState: state(),
        tasks: [
          {
            id: unwrap(runtimeTaskId("test.failure:task")),
            phaseId: SCHEDULER_PHASES.observables,
            run: () => {
              throw new Error("nondeterministic implementation detail");
            },
          },
        ],
      }),
    );
    expect(scheduler.runCycle({ deltaSeconds: 0 })).toMatchObject({
      ok: false,
      error: {
        kind: "task-failed",
        message: "Task callback threw an exception.",
      },
    });
    expect(scheduler.getLastTrace().at(-1)).toMatchObject({
      kind: "task-start",
      subjectId: "test.failure:task",
    });
  });
});

describe("runtime state and system authority", () => {
  it("commits scoped writes atomically, ignores equal writes and resets", () => {
    const store = state(
      [{ ref: POSITION, writerId: SYSTEM_A }],
      [{ ref: POSITION, value: [0, 0, 0] }],
    );
    expect(
      unwrap(store.commit(SYSTEM_A, [{ ref: POSITION, value: [1, 2, 3] }]))
        .revision,
    ).toBe(1);
    expect(
      unwrap(store.commit(SYSTEM_A, [{ ref: POSITION, value: [1, 2, 3] }]))
        .revision,
    ).toBe(1);
    expect(store.reset()).toMatchObject({
      revision: 2,
      entries: [{ value: [0, 0, 0], revision: 0 }],
    });
  });

  it("rejects writer conflicts and unauthorized writes without partial commit", () => {
    expect(
      createRuntimeStateStore(
        SCENE,
        [
          { ref: POSITION, writerId: SYSTEM_A },
          { ref: POSITION, writerId: SYSTEM_B },
        ],
        [{ ref: POSITION, value: 0 }],
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "state-writer-conflict" },
    });
    const store = state(
      [{ ref: POSITION, writerId: SYSTEM_A }],
      [{ ref: POSITION, value: 0 }],
    );
    expect(store.commit(SYSTEM_B, [{ ref: POSITION, value: 1 }])).toMatchObject(
      { ok: false, error: { kind: "unauthorized-state-write" } },
    );
    expect(store.read(POSITION)).toBe(0);
  });

  it("builds producer-consumer order and rejects coupled cycles", () => {
    const clock = clocks();
    const a: ScheduledSystem = {
      id: SYSTEM_A,
      declaredInputs: [],
      declaredOutputs: [POSITION],
      execute: () => success({}),
    };
    const b: ScheduledSystem = {
      id: SYSTEM_B,
      declaredInputs: [POSITION],
      declaredOutputs: [VELOCITY],
      execute: () => success({}),
    };
    expect(
      unwrap(
        buildScheduledSystemPlan(
          [b, a],
          [clock.simulationClockId],
          clock.simulationClockId,
        ),
      ).systems.map(({ id }) => id),
    ).toEqual([SYSTEM_A, SYSTEM_B]);

    const cyclicA = { ...a, declaredInputs: [VELOCITY] };
    expect(
      buildScheduledSystemPlan(
        [cyclicA, b],
        [clock.simulationClockId],
        clock.simulationClockId,
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "coupled-system-required" },
    });
  });

  it("runs dependent systems only for an advanced authoritative clock", () => {
    const clock = clocks();
    const store = state(
      [
        { ref: POSITION, writerId: SYSTEM_A },
        { ref: VELOCITY, writerId: SYSTEM_B },
      ],
      [
        { ref: POSITION, value: 0 },
        { ref: VELOCITY, value: 0 },
      ],
    );
    const calls: string[] = [];
    const systems: ScheduledSystem[] = [
      {
        id: SYSTEM_B,
        declaredInputs: [POSITION],
        declaredOutputs: [VELOCITY],
        execute: ({ read }) => {
          calls.push("b");
          return success({
            writes: [{ ref: VELOCITY, value: read(POSITION)! }],
          });
        },
      },
      {
        id: SYSTEM_A,
        declaredInputs: [POSITION],
        declaredOutputs: [POSITION],
        execute: ({ interval, read }) => {
          calls.push("a");
          return success({
            writes: [
              {
                ref: POSITION,
                value:
                  (read(POSITION) as number) +
                  interval.timeSeconds -
                  interval.previousTimeSeconds,
              },
            ],
          });
        },
      },
    ];
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime: clock.runtime,
        simulationClockId: clock.simulationClockId,
        runtimeState: store,
        systems,
      }),
    );
    unwrap(scheduler.runCycle({ deltaSeconds: 0.5 }));
    expect(calls).toEqual(["a", "b"]);
    expect(store.read(POSITION)).toBe(0.5);
    expect(store.read(VELOCITY)).toBe(0.5);
  });

  it("rejects writes outside a system's declared output set atomically", () => {
    const clock = clocks();
    const store = state(
      [
        { ref: POSITION, writerId: SYSTEM_A },
        { ref: VELOCITY, writerId: SYSTEM_A },
      ],
      [
        { ref: POSITION, value: 0 },
        { ref: VELOCITY, value: 0 },
      ],
    );
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime: clock.runtime,
        simulationClockId: clock.simulationClockId,
        runtimeState: store,
        systems: [
          {
            id: SYSTEM_A,
            declaredInputs: [],
            declaredOutputs: [POSITION],
            execute: () =>
              success({
                writes: [
                  { ref: POSITION, value: 1 },
                  { ref: VELOCITY, value: 1 },
                ],
              }),
          },
        ],
      }),
    );
    expect(scheduler.runCycle({ deltaSeconds: 1 })).toMatchObject({
      ok: false,
      error: { kind: "unauthorized-state-write" },
    });
    expect(store.read(POSITION)).toBe(0);
    expect(store.read(VELOCITY)).toBe(0);
  });
});

describe("runtime event ordering", () => {
  it("uses timestamp, phase, priority, sequence and stable textual keys", () => {
    const plan = SchedulerPlan.builtIn();
    const ordered = unwrap(
      orderScheduledRuntimeEvents(
        [
          { event: event(3, 0), phaseId: SCHEDULER_PHASES.rendering },
          { event: event(2, 1), phaseId: SCHEDULER_PHASES.documentControl },
          { event: event(1, -1), phaseId: SCHEDULER_PHASES.documentControl },
          { event: event(0, 0, 0), phaseId: SCHEDULER_PHASES.rendering },
        ],
        plan,
      ),
    );
    expect(ordered.map(({ event: item }) => item.sequenceId)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it("rejects duplicate sequence IDs instead of falling back to insertion order", () => {
    expect(
      orderScheduledRuntimeEvents(
        [
          { event: event(1), phaseId: SCHEDULER_PHASES.rendering },
          { event: event(1), phaseId: SCHEDULER_PHASES.documentControl },
        ],
        SchedulerPlan.builtIn(),
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "duplicate-event-sequence", sequenceId: 1 },
    });
  });

  it("defers handler-emitted events until the next cycle", () => {
    const clock = clocks();
    const scheduler = unwrap(
      createRuntimeScheduler({
        clockRuntime: clock.runtime,
        simulationClockId: clock.simulationClockId,
        runtimeState: state(),
        eventHandlers: [
          {
            id: unwrap(runtimeTaskId("test.handlers:echo")),
            eventType: registeredTypeId("physica:event/test"),
            handle: ({ event: current }) =>
              success({ events: [event(current.sequenceId + 1)] }),
          },
        ],
      }),
    );
    unwrap(
      scheduler.enqueueEvent(event(0), SCHEDULER_PHASES.authoritativePhysics),
    );
    const first = unwrap(scheduler.runCycle({ deltaSeconds: 0 }));
    expect(first.processedEvents.map(({ sequenceId }) => sequenceId)).toEqual([
      0,
    ]);
    expect(first.deferredEvents.map(({ sequenceId }) => sequenceId)).toEqual([
      1,
    ]);
    const second = unwrap(scheduler.runCycle({ deltaSeconds: 0 }));
    expect(second.processedEvents.map(({ sequenceId }) => sequenceId)).toEqual([
      1,
    ]);
  });

  it("produces identical event order for 10,000 shuffled equivalent inputs", () => {
    const plan = SchedulerPlan.builtIn();
    let seed = 0x5eed1234;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const expected = [0, 1, 2, 3, 4, 5, 6, 7];
    const base = expected.map((sequenceId) => ({
      event: event(sequenceId),
      phaseId: SCHEDULER_PHASES.authoritativePhysics,
    }));
    for (let run = 0; run < 10_000; run += 1) {
      const shuffled = [...base].sort(() => random() - 0.5);
      const actual = unwrap(orderScheduledRuntimeEvents(shuffled, plan)).map(
        ({ event: item }) => item.sequenceId,
      );
      if (actual.some((sequenceId, index) => sequenceId !== expected[index]))
        throw new Error(`Event order diverged on deterministic run ${run}.`);
    }
  });
});

describe("worker result ordering", () => {
  it("returns declared order when asynchronous work completes out of order", async () => {
    const result = await collectOrderedWorkerResults(
      [
        { order: 2, input: "slow" },
        { order: 0, input: "fast" },
        { order: 1, input: "medium" },
      ],
      async ({ order, input }) => {
        await new Promise((resolve) => setTimeout(resolve, (2 - order) * 2));
        return { order, output: input as JsonValue };
      },
    );
    expect(unwrap(result).map(({ order }) => order)).toEqual([0, 1, 2]);
  });

  it("rejects duplicate declared orders", async () => {
    const result = await collectOrderedWorkerResults(
      [
        { order: 0, input: "a" },
        { order: 0, input: "b" },
      ],
      async ({ order, input }) => ({ order, output: input }),
    );
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "invalid-worker-result-order", order: 0 },
    });
  });
});

describe("stable state-channel identity", () => {
  it("keys entity and system channels without object iteration", () => {
    expect(stateChannelKey(POSITION)).toBe(
      `entity:${ENTITY}:mechanics.position`,
    );
  });
});
