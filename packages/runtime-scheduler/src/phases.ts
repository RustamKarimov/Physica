import { REGISTERED_TYPE_ID_PATTERN, type Brand } from "@physica/core-model";
import type { SchedulerResult } from "./errors";

export type SchedulerPhaseId = Brand<string, "SchedulerPhaseId">;
export type RuntimeTaskId = Brand<string, "RuntimeTaskId">;

function phaseId(value: string): SchedulerPhaseId {
  return value as SchedulerPhaseId;
}

export const SCHEDULER_PHASES = Object.freeze({
  documentControl: phaseId("physica:scheduler/document-control"),
  clockAdvancement: phaseId("physica:scheduler/clock-advancement"),
  authoritativePhysics: phaseId("physica:scheduler/authoritative-physics"),
  eventOrdering: phaseId("physica:scheduler/event-ordering"),
  physicalEventProcessing: phaseId(
    "physica:scheduler/physical-event-processing",
  ),
  observables: phaseId("physica:scheduler/observables"),
  relationships: phaseId("physica:scheduler/relationships"),
  acquisition: phaseId("physica:scheduler/acquisition"),
  storyboard: phaseId("physica:scheduler/storyboard"),
  presentationAnimation: phaseId("physica:scheduler/presentation-animation"),
  representationLayout: phaseId("physica:scheduler/representation-layout"),
  rendering: phaseId("physica:scheduler/rendering"),
  audioOutput: phaseId("physica:scheduler/audio-output"),
});

export const BUILT_IN_PHASE_ORDER: readonly SchedulerPhaseId[] = Object.freeze([
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

const BUILT_INS = new Set<string>(BUILT_IN_PHASE_ORDER);

export function schedulerPhaseId(
  value: string,
): SchedulerResult<SchedulerPhaseId> {
  return REGISTERED_TYPE_ID_PATTERN.test(value)
    ? { ok: true, value: value as SchedulerPhaseId }
    : { ok: false, error: { kind: "invalid-phase-id", phaseId: value } };
}

export function runtimeTaskId(value: string): SchedulerResult<RuntimeTaskId> {
  return REGISTERED_TYPE_ID_PATTERN.test(value)
    ? { ok: true, value: value as RuntimeTaskId }
    : {
        ok: false,
        error: {
          kind: "invalid-task",
          taskId: value,
          message: "Runtime task ID must be namespaced.",
        },
      };
}

export interface SpecializedPhaseDefinition {
  readonly id: SchedulerPhaseId;
  readonly anchor: SchedulerPhaseId;
  readonly placement: "before" | "after";
  readonly priority: number;
}

interface RegisteredSpecializedPhase extends SpecializedPhaseDefinition {
  readonly registrationSequence: number;
}

export interface SchedulerPhaseEntry {
  readonly id: SchedulerPhaseId;
  readonly builtIn: boolean;
  readonly ordinal: number;
}

export class SchedulerPlan {
  private constructor(
    private readonly specialized: readonly RegisteredSpecializedPhase[],
  ) {}

  static builtIn(): SchedulerPlan {
    return new SchedulerPlan([]);
  }

  register(
    definition: SpecializedPhaseDefinition,
  ): SchedulerResult<SchedulerPlan> {
    if (!REGISTERED_TYPE_ID_PATTERN.test(definition.id))
      return {
        ok: false,
        error: { kind: "invalid-phase-id", phaseId: definition.id },
      };
    if (
      BUILT_INS.has(definition.id) ||
      this.specialized.some(({ id }) => id === definition.id)
    )
      return {
        ok: false,
        error: { kind: "duplicate-phase", phaseId: definition.id },
      };
    if (!BUILT_INS.has(definition.anchor))
      return {
        ok: false,
        error: { kind: "invalid-phase-anchor", phaseId: definition.anchor },
      };
    if (!Number.isSafeInteger(definition.priority))
      return {
        ok: false,
        error: { kind: "invalid-phase-id", phaseId: definition.id },
      };
    return {
      ok: true,
      value: new SchedulerPlan(
        Object.freeze([
          ...this.specialized,
          Object.freeze({
            ...definition,
            registrationSequence: this.specialized.length,
          }),
        ]),
      ),
    };
  }

  entries(): readonly SchedulerPhaseEntry[] {
    const result: SchedulerPhaseId[] = [];
    for (const builtIn of BUILT_IN_PHASE_ORDER) {
      const matching = this.specialized
        .filter(({ anchor }) => anchor === builtIn)
        .sort(
          (a, b) =>
            (a.placement === b.placement
              ? 0
              : a.placement === "before"
                ? -1
                : 1) ||
            a.priority - b.priority ||
            a.registrationSequence - b.registrationSequence ||
            a.id.localeCompare(b.id),
        );
      result.push(
        ...matching
          .filter(({ placement }) => placement === "before")
          .map(({ id }) => id),
        builtIn,
        ...matching
          .filter(({ placement }) => placement === "after")
          .map(({ id }) => id),
      );
    }
    return Object.freeze(
      result.map((id, ordinal) =>
        Object.freeze({ id, builtIn: BUILT_INS.has(id), ordinal }),
      ),
    );
  }

  ordinal(phase: SchedulerPhaseId): number | undefined {
    return this.entries().find(({ id }) => id === phase)?.ordinal;
  }
}
