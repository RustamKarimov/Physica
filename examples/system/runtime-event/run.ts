import {
  DeterministicIdFactory,
  registeredTypeId,
  type ClockId,
  type Result,
} from "@physica/core-model";
import {
  createClockRuntime,
  createDefaultClockDefinitions,
} from "@physica/clocks";
import { createRuntimeEvent, type RuntimeEvent } from "@physica/events";
import {
  createRuntimeScheduler,
  createRuntimeStateStore,
  runtimeTaskId,
  SCHEDULER_PHASES,
} from "@physica/runtime-scheduler";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

function event(
  clockDomain: ClockId,
  sequenceId: number,
  priority: number,
): RuntimeEvent {
  return unwrap(
    createRuntimeEvent({
      timestampSeconds: 1,
      clockDomain,
      sourceId: "example-source",
      eventType: registeredTypeId("physica:event/threshold-crossed"),
      sequenceId,
      priority,
      payload: { threshold: 1, sequenceId },
    }),
  );
}

export interface RuntimeEventResult {
  readonly firstCycleOrder: readonly number[];
  readonly firstCycleDeferred: readonly number[];
  readonly secondCycleOrder: readonly number[];
  readonly insertionOrderWasSemantic: boolean;
}

export function runRuntimeEvent(): RuntimeEventResult {
  const ids = new DeterministicIdFactory(7200);
  const clocks = createDefaultClockDefinitions(ids, true);
  const clockRuntime = unwrap(createClockRuntime(clocks));
  const runtimeState = unwrap(createRuntimeStateStore(ids.sceneId(), [], []));
  const scheduler = unwrap(
    createRuntimeScheduler({
      clockRuntime,
      simulationClockId: clocks[0].id,
      runtimeState,
      eventHandlers: [
        {
          id: unwrap(runtimeTaskId("example.handlers:threshold")),
          eventType: registeredTypeId("physica:event/threshold-crossed"),
          handle: ({ event: current }) => ({
            ok: true,
            value: {
              events:
                current.sequenceId === 2 ? [event(clocks[0].id, 4, 0)] : [],
            },
          }),
        },
      ],
    }),
  );
  const inserted = [3, 2, 1];
  unwrap(
    scheduler.enqueueEvent(
      event(clocks[0].id, 3, 0),
      SCHEDULER_PHASES.rendering,
    ),
  );
  unwrap(
    scheduler.enqueueEvent(
      event(clocks[0].id, 2, 1),
      SCHEDULER_PHASES.documentControl,
    ),
  );
  unwrap(
    scheduler.enqueueEvent(
      event(clocks[0].id, 1, -1),
      SCHEDULER_PHASES.documentControl,
    ),
  );
  const first = unwrap(scheduler.runCycle({ deltaSeconds: 0 }));
  const second = unwrap(scheduler.runCycle({ deltaSeconds: 0 }));
  const firstOrder = first.processedEvents.map(({ sequenceId }) => sequenceId);
  return {
    firstCycleOrder: firstOrder,
    firstCycleDeferred: first.deferredEvents.map(
      ({ sequenceId }) => sequenceId,
    ),
    secondCycleOrder: second.processedEvents.map(
      ({ sequenceId }) => sequenceId,
    ),
    insertionOrderWasSemantic:
      JSON.stringify(inserted) === JSON.stringify(firstOrder),
  };
}
