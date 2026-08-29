import type { RuntimeEvent } from "@physica/events";
import type { SchedulerResult } from "./errors";
import type { SchedulerPhaseId, SchedulerPlan } from "./phases";

export interface ScheduledRuntimeEvent {
  readonly event: RuntimeEvent;
  readonly phaseId: SchedulerPhaseId;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compareScheduledRuntimeEvents(
  a: ScheduledRuntimeEvent,
  b: ScheduledRuntimeEvent,
  plan: SchedulerPlan,
): number {
  return (
    a.event.timestampSeconds - b.event.timestampSeconds ||
    plan.ordinal(a.phaseId)! - plan.ordinal(b.phaseId)! ||
    a.event.priority - b.event.priority ||
    a.event.sequenceId - b.event.sequenceId ||
    compareText(a.event.clockDomain, b.event.clockDomain) ||
    compareText(a.event.sourceId, b.event.sourceId) ||
    compareText(a.event.eventType, b.event.eventType)
  );
}

export function orderScheduledRuntimeEvents(
  events: readonly ScheduledRuntimeEvent[],
  plan: SchedulerPlan,
): SchedulerResult<readonly ScheduledRuntimeEvent[]> {
  const sequences = new Set<number>();
  for (const { event, phaseId } of events) {
    if (plan.ordinal(phaseId) === undefined)
      return {
        ok: false,
        error: { kind: "unknown-phase", phaseId },
      };
    if (sequences.has(event.sequenceId))
      return {
        ok: false,
        error: {
          kind: "duplicate-event-sequence",
          sequenceId: event.sequenceId,
        },
      };
    sequences.add(event.sequenceId);
  }
  return {
    ok: true,
    value: Object.freeze(
      [...events].sort((a, b) => compareScheduledRuntimeEvents(a, b, plan)),
    ),
  };
}
