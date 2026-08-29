import {
  DeterministicIdFactory,
  stateChannelId,
  type Result,
  type StateChannelRef,
} from "@physica/core-model";
import {
  createClockRuntime,
  createDefaultClockDefinitions,
} from "@physica/clocks";
import {
  BUILT_IN_PHASE_ORDER,
  createRuntimeScheduler,
  createRuntimeStateStore,
  runtimeTaskId,
  type RuntimeTask,
  type ScheduledSystem,
  type SchedulerResult,
} from "@physica/runtime-scheduler";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

export interface SchedulerOrderTraceResult {
  readonly phaseOrder: readonly string[];
  readonly systemOrder: readonly string[];
  readonly clockChanges: number;
  readonly position: number;
  readonly sampledPosition: number;
}

export function runSchedulerOrderTrace(): SchedulerOrderTraceResult {
  const ids = new DeterministicIdFactory(7000);
  const clocks = createDefaultClockDefinitions(ids, false);
  const clockRuntime = unwrap(createClockRuntime(clocks));
  const sceneId = ids.sceneId();
  const entityId = ids.entityId();
  const dynamicsId = ids.systemId();
  const observerId = ids.systemId();
  const position: StateChannelRef = {
    scope: "entity",
    entityId,
    channel: stateChannelId("mechanics.position"),
  };
  const sample: StateChannelRef = {
    scope: "entity",
    entityId,
    channel: stateChannelId("data.positionSample"),
  };
  const runtimeState = unwrap(
    createRuntimeStateStore(
      sceneId,
      [
        { ref: position, writerId: dynamicsId },
        { ref: sample, writerId: observerId },
      ],
      [
        { ref: position, value: 0 },
        { ref: sample, value: 0 },
      ],
    ),
  );
  const systems: readonly ScheduledSystem[] = [
    {
      id: observerId,
      declaredInputs: [position],
      declaredOutputs: [sample],
      execute: ({ read }) => ({
        ok: true,
        value: { writes: [{ ref: sample, value: read(position)! }] },
      }),
    },
    {
      id: dynamicsId,
      declaredInputs: [position],
      declaredOutputs: [position],
      execute: ({ interval, read }) => ({
        ok: true,
        value: {
          writes: [
            {
              ref: position,
              value:
                (read(position) as number) +
                2 * (interval.timeSeconds - interval.previousTimeSeconds),
            },
          ],
        },
      }),
    },
  ];
  const tasks: RuntimeTask[] = BUILT_IN_PHASE_ORDER.map((phaseId) => ({
    id: unwrap(runtimeTaskId(`example.trace:${phaseId.split("/").at(-1)!}`)),
    phaseId,
    run: (): SchedulerResult<void> => ({ ok: true, value: undefined }),
  }));
  const scheduler = unwrap(
    createRuntimeScheduler({
      clockRuntime,
      simulationClockId: clocks[0].id,
      runtimeState,
      systems,
      tasks,
    }),
  );
  const result = unwrap(scheduler.runCycle({ deltaSeconds: 0.5 }));
  return {
    phaseOrder: result.trace
      .filter(({ kind }) => kind === "phase-start")
      .map(({ phaseId }) => phaseId!),
    systemOrder: result.trace
      .filter(({ kind }) => kind === "system-start")
      .map(({ subjectId }) => subjectId!),
    clockChanges: result.clockAdvance.changes.length,
    position: runtimeState.read(position) as number,
    sampledPosition: runtimeState.read(sample) as number,
  };
}
