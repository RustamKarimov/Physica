import type {
  ClockId,
  JsonValue,
  RegisteredTypeId,
  StateChannelRef,
  SystemId,
} from "@physica/core-model";
import { REGISTERED_TYPE_ID_PATTERN } from "@physica/core-model";
import type {
  ClockAdvanceResult,
  ClockRuntime,
  ClockState,
} from "@physica/clocks";
import type { RuntimeEvent } from "@physica/events";
import type { SchedulerError, SchedulerResult } from "./errors";
import {
  SCHEDULER_PHASES,
  SchedulerPlan,
  type RuntimeTaskId,
  type SchedulerPhaseId,
} from "./phases";
import {
  stateChannelKey,
  type RuntimeStateSnapshot,
  type RuntimeStateStore,
  type RuntimeStateWrite,
} from "./runtime-state";
import {
  orderScheduledRuntimeEvents,
  type ScheduledRuntimeEvent,
} from "./scheduled-events";
import {
  buildScheduledSystemPlan,
  executeScheduledSystem,
  type ScheduledSystem,
  type ScheduledSystemPlan,
} from "./systems";

export interface RuntimeTaskContext {
  readonly phaseId: SchedulerPhaseId;
  readonly clockStates: readonly ClockState[];
  readState(ref: StateChannelRef): JsonValue | undefined;
  enqueueEvent(event: RuntimeEvent): void;
}

export interface RuntimeTask {
  readonly id: RuntimeTaskId;
  readonly phaseId: SchedulerPhaseId;
  readonly priority?: number;
  run(context: RuntimeTaskContext): SchedulerResult<void>;
}

interface RegisteredRuntimeTask extends RuntimeTask {
  readonly registrationSequence: number;
}

export interface RuntimeEventHandlerContext {
  readonly event: RuntimeEvent;
  readonly clockStates: readonly ClockState[];
  readState(ref: StateChannelRef): JsonValue | undefined;
}

export interface RuntimeEventHandlerOutput {
  readonly writes?: readonly RuntimeStateWrite[];
  readonly events?: readonly RuntimeEvent[];
}

export interface RuntimeEventHandler {
  readonly id: RuntimeTaskId;
  readonly eventType: RegisteredTypeId;
  readonly priority?: number;
  readonly writerId?: SystemId;
  handle(
    context: RuntimeEventHandlerContext,
  ): SchedulerResult<RuntimeEventHandlerOutput>;
}

interface RegisteredRuntimeEventHandler extends RuntimeEventHandler {
  readonly registrationSequence: number;
}

export interface SchedulerTraceRecord {
  readonly index: number;
  readonly kind:
    | "cycle-start"
    | "cycle-end"
    | "phase-start"
    | "phase-end"
    | "clock-change"
    | "task-start"
    | "task-end"
    | "system-start"
    | "system-end"
    | "system-skip"
    | "event-ordered"
    | "event-handler-start"
    | "event-handler-end";
  readonly phaseId?: SchedulerPhaseId;
  readonly subjectId?: string;
  readonly sequenceId?: number;
  readonly previousTimeSeconds?: number;
  readonly timeSeconds?: number;
}

export interface SchedulerCycleRequest {
  readonly deltaSeconds: number;
  readonly clockConditions?: Readonly<Record<string, boolean>>;
}

export interface SchedulerCycleResult {
  readonly clockAdvance: ClockAdvanceResult;
  readonly runtimeState: RuntimeStateSnapshot;
  readonly processedEvents: readonly RuntimeEvent[];
  readonly deferredEvents: readonly RuntimeEvent[];
  readonly trace: readonly SchedulerTraceRecord[];
}

export interface RuntimeSchedulerConfiguration {
  readonly clockRuntime: ClockRuntime;
  readonly simulationClockId: ClockId;
  readonly runtimeState: RuntimeStateStore;
  readonly plan?: SchedulerPlan;
  readonly systems?: readonly ScheduledSystem[];
  readonly tasks?: readonly RuntimeTask[];
  readonly eventHandlers?: readonly RuntimeEventHandler[];
}

function contextualFailure(
  kind: "task-failed" | "event-handler-failed",
  id: string,
  message: string,
  phaseId: SchedulerPhaseId,
  sequenceId?: number,
): SchedulerError {
  return kind === "task-failed"
    ? { kind, taskId: id, phaseId, message }
    : {
        kind,
        handlerId: id,
        sequenceId: sequenceId!,
        message,
      };
}

export class RuntimeScheduler {
  private pendingEvents: ScheduledRuntimeEvent[] = [];
  private cycleIndex = 0;
  private lastTrace: readonly SchedulerTraceRecord[] = Object.freeze([]);

  constructor(
    private readonly clockRuntime: ClockRuntime,
    readonly simulationClockId: ClockId,
    private readonly runtimeState: RuntimeStateStore,
    readonly plan: SchedulerPlan,
    private readonly systemPlan: ScheduledSystemPlan,
    private readonly tasks: readonly RegisteredRuntimeTask[],
    private readonly handlers: readonly RegisteredRuntimeEventHandler[],
  ) {}

  enqueueEvent(
    event: RuntimeEvent,
    phaseId: SchedulerPhaseId,
  ): SchedulerResult<void> {
    if (this.plan.ordinal(phaseId) === undefined)
      return {
        ok: false,
        error: { kind: "unknown-phase", phaseId },
      };
    this.pendingEvents.push(Object.freeze({ event, phaseId }));
    return { ok: true, value: undefined };
  }

  getLastTrace(): readonly SchedulerTraceRecord[] {
    return Object.freeze([...this.lastTrace]);
  }

  runCycle(
    request: SchedulerCycleRequest,
  ): SchedulerResult<SchedulerCycleResult> {
    const trace: SchedulerTraceRecord[] = [];
    const record = (entry: Omit<SchedulerTraceRecord, "index">): void => {
      trace.push(Object.freeze({ index: trace.length, ...entry }));
      this.lastTrace = trace;
    };
    record({ kind: "cycle-start", subjectId: String(this.cycleIndex) });
    let clockAdvance: ClockAdvanceResult = Object.freeze({
      states: this.clockRuntime.getStates(),
      changes: Object.freeze([]),
    });
    let orderedEvents: readonly ScheduledRuntimeEvent[] = Object.freeze([]);
    const processedEvents: RuntimeEvent[] = [];

    for (const phase of this.plan.entries()) {
      record({ kind: "phase-start", phaseId: phase.id });

      if (phase.id === SCHEDULER_PHASES.clockAdvancement) {
        const advanced = this.clockRuntime.advance(
          request.deltaSeconds,
          request.clockConditions ?? {},
        );
        if (!advanced.ok)
          return {
            ok: false,
            error: {
              kind: "clock-advance-failed",
              message: advanced.error.kind,
            },
          };
        clockAdvance = advanced.value;
        for (const change of clockAdvance.changes)
          record({
            kind: "clock-change",
            phaseId: phase.id,
            subjectId: change.clockId,
            previousTimeSeconds: change.previousTimeSeconds,
            timeSeconds: change.timeSeconds,
          });
      }

      if (phase.id === SCHEDULER_PHASES.authoritativePhysics) {
        const changes = new Map(
          clockAdvance.changes.map((change) => [change.clockId, change]),
        );
        for (const system of this.systemPlan.systems) {
          const clockId = system.clockId ?? this.simulationClockId;
          const interval = changes.get(clockId);
          if (!interval) {
            record({
              kind: "system-skip",
              phaseId: phase.id,
              subjectId: system.id,
            });
            continue;
          }
          record({
            kind: "system-start",
            phaseId: phase.id,
            subjectId: system.id,
          });
          const executed = executeScheduledSystem(
            system,
            {
              clockId,
              previousTimeSeconds: interval.previousTimeSeconds,
              timeSeconds: interval.timeSeconds,
            },
            this.runtimeState,
          );
          if (!executed.ok) return executed;
          for (const event of executed.value.events ?? [])
            this.pendingEvents.push(
              Object.freeze({ event, phaseId: phase.id }),
            );
          record({
            kind: "system-end",
            phaseId: phase.id,
            subjectId: system.id,
          });
        }
      }

      const tasks = this.tasks.filter(({ phaseId }) => phaseId === phase.id);
      for (const task of tasks) {
        record({
          kind: "task-start",
          phaseId: phase.id,
          subjectId: task.id,
        });
        try {
          const result = task.run({
            phaseId: phase.id,
            clockStates: this.clockRuntime.getStates(),
            readState: (ref) => this.runtimeState.read(ref),
            enqueueEvent: (event) => {
              this.pendingEvents.push(
                Object.freeze({ event, phaseId: phase.id }),
              );
            },
          });
          if (!result.ok)
            return {
              ok: false,
              error: contextualFailure(
                "task-failed",
                task.id,
                result.error.kind,
                phase.id,
              ),
            };
        } catch {
          return {
            ok: false,
            error: contextualFailure(
              "task-failed",
              task.id,
              "Task callback threw an exception.",
              phase.id,
            ),
          };
        }
        record({
          kind: "task-end",
          phaseId: phase.id,
          subjectId: task.id,
        });
      }

      if (phase.id === SCHEDULER_PHASES.eventOrdering) {
        const ordering = orderScheduledRuntimeEvents(
          this.pendingEvents,
          this.plan,
        );
        if (!ordering.ok) return ordering;
        orderedEvents = ordering.value;
        this.pendingEvents = [];
        for (const scheduled of orderedEvents)
          record({
            kind: "event-ordered",
            phaseId: phase.id,
            subjectId: scheduled.event.eventType,
            sequenceId: scheduled.event.sequenceId,
          });
      }

      if (phase.id === SCHEDULER_PHASES.physicalEventProcessing) {
        for (const { event } of orderedEvents) {
          processedEvents.push(event);
          const handlers = this.handlers.filter(
            ({ eventType }) => eventType === event.eventType,
          );
          for (const handler of handlers) {
            record({
              kind: "event-handler-start",
              phaseId: phase.id,
              subjectId: handler.id,
              sequenceId: event.sequenceId,
            });
            let result: SchedulerResult<RuntimeEventHandlerOutput>;
            try {
              result = handler.handle({
                event,
                clockStates: this.clockRuntime.getStates(),
                readState: (ref) => this.runtimeState.read(ref),
              });
            } catch {
              return {
                ok: false,
                error: contextualFailure(
                  "event-handler-failed",
                  handler.id,
                  "Event handler threw an exception.",
                  phase.id,
                  event.sequenceId,
                ),
              };
            }
            if (!result.ok)
              return {
                ok: false,
                error: contextualFailure(
                  "event-handler-failed",
                  handler.id,
                  result.error.kind,
                  phase.id,
                  event.sequenceId,
                ),
              };
            const writes = result.value.writes ?? [];
            if (writes.length > 0) {
              if (!handler.writerId)
                return {
                  ok: false,
                  error: contextualFailure(
                    "event-handler-failed",
                    handler.id,
                    "Handler has no authoritative writer identity.",
                    phase.id,
                    event.sequenceId,
                  ),
                };
              const committed = this.runtimeState.commit(
                handler.writerId,
                writes,
              );
              if (!committed.ok) return committed;
            }
            for (const emitted of result.value.events ?? [])
              this.pendingEvents.push(
                Object.freeze({ event: emitted, phaseId: phase.id }),
              );
            record({
              kind: "event-handler-end",
              phaseId: phase.id,
              subjectId: handler.id,
              sequenceId: event.sequenceId,
            });
          }
        }
      }

      record({ kind: "phase-end", phaseId: phase.id });
    }
    record({ kind: "cycle-end", subjectId: String(this.cycleIndex) });
    this.cycleIndex += 1;
    return {
      ok: true,
      value: Object.freeze({
        clockAdvance,
        runtimeState: this.runtimeState.snapshot(),
        processedEvents: Object.freeze(processedEvents),
        deferredEvents: Object.freeze(
          this.pendingEvents.map(({ event }) => event),
        ),
        trace: Object.freeze(trace),
      }),
    };
  }
}

export function createRuntimeScheduler(
  configuration: RuntimeSchedulerConfiguration,
): SchedulerResult<RuntimeScheduler> {
  const plan = configuration.plan ?? SchedulerPlan.builtIn();
  const clockIds = configuration.clockRuntime
    .getStates()
    .map(({ clockId }) => clockId);
  const systemPlan = buildScheduledSystemPlan(
    configuration.systems ?? [],
    clockIds,
    configuration.simulationClockId,
  );
  if (!systemPlan.ok) return systemPlan;
  for (const system of systemPlan.value.systems) {
    for (const output of system.declaredOutputs) {
      if (configuration.runtimeState.writer(output) !== system.id)
        return {
          ok: false,
          error: {
            kind: "unauthorized-state-write",
            channelKey: stateChannelKey(output),
            writerId: system.id,
          },
        };
    }
  }

  const taskIds = new Set<string>();
  const tasks: RegisteredRuntimeTask[] = [];
  for (const [registrationSequence, task] of (
    configuration.tasks ?? []
  ).entries()) {
    if (!REGISTERED_TYPE_ID_PATTERN.test(task.id))
      return {
        ok: false,
        error: {
          kind: "invalid-task",
          taskId: task.id,
          message: "Runtime task ID must be namespaced.",
        },
      };
    if (taskIds.has(task.id))
      return {
        ok: false,
        error: { kind: "duplicate-task", taskId: task.id },
      };
    taskIds.add(task.id);
    if (plan.ordinal(task.phaseId) === undefined)
      return {
        ok: false,
        error: { kind: "unknown-phase", phaseId: task.phaseId },
      };
    if (!Number.isSafeInteger(task.priority ?? 0))
      return {
        ok: false,
        error: {
          kind: "invalid-task",
          taskId: task.id,
          message: "Task priority must be a safe integer.",
        },
      };
    tasks.push(Object.freeze({ ...task, registrationSequence }));
  }
  tasks.sort(
    (a, b) =>
      plan.ordinal(a.phaseId)! - plan.ordinal(b.phaseId)! ||
      (a.priority ?? 0) - (b.priority ?? 0) ||
      a.registrationSequence - b.registrationSequence ||
      a.id.localeCompare(b.id),
  );

  const handlerIds = new Set<string>();
  const handlers: RegisteredRuntimeEventHandler[] = [];
  for (const [registrationSequence, handler] of (
    configuration.eventHandlers ?? []
  ).entries()) {
    if (!REGISTERED_TYPE_ID_PATTERN.test(handler.id))
      return {
        ok: false,
        error: {
          kind: "invalid-task",
          taskId: handler.id,
          message: "Event-handler ID must be namespaced.",
        },
      };
    if (handlerIds.has(handler.id))
      return {
        ok: false,
        error: { kind: "duplicate-task", taskId: handler.id },
      };
    handlerIds.add(handler.id);
    if (!Number.isSafeInteger(handler.priority ?? 0))
      return {
        ok: false,
        error: {
          kind: "invalid-task",
          taskId: handler.id,
          message: "Event-handler priority must be a safe integer.",
        },
      };
    handlers.push(Object.freeze({ ...handler, registrationSequence }));
  }
  handlers.sort(
    (a, b) =>
      (a.priority ?? 0) - (b.priority ?? 0) ||
      a.registrationSequence - b.registrationSequence ||
      a.id.localeCompare(b.id),
  );

  return {
    ok: true,
    value: new RuntimeScheduler(
      configuration.clockRuntime,
      configuration.simulationClockId,
      configuration.runtimeState,
      plan,
      systemPlan.value,
      Object.freeze(tasks),
      Object.freeze(handlers),
    ),
  };
}
