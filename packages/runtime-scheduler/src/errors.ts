import type { Result } from "@physica/core-model";

export type SchedulerError =
  | { readonly kind: "invalid-phase-id"; readonly phaseId: string }
  | { readonly kind: "duplicate-phase"; readonly phaseId: string }
  | { readonly kind: "invalid-phase-anchor"; readonly phaseId: string }
  | {
      readonly kind: "invalid-task";
      readonly taskId: string;
      readonly message: string;
    }
  | { readonly kind: "duplicate-task"; readonly taskId: string }
  | { readonly kind: "unknown-phase"; readonly phaseId: string }
  | { readonly kind: "duplicate-event-sequence"; readonly sequenceId: number }
  | {
      readonly kind: "invalid-runtime-state";
      readonly message: string;
      readonly relatedIds: readonly string[];
    }
  | {
      readonly kind: "state-writer-conflict";
      readonly channelKey: string;
      readonly writerIds: readonly string[];
    }
  | {
      readonly kind: "unauthorized-state-write";
      readonly channelKey: string;
      readonly writerId: string;
    }
  | { readonly kind: "runtime-state-mismatch"; readonly message: string }
  | { readonly kind: "duplicate-system"; readonly systemId: string }
  | {
      readonly kind: "duplicate-state-ref";
      readonly systemId: string;
      readonly channelKey: string;
    }
  | {
      readonly kind: "clock-not-found";
      readonly clockId: string;
      readonly systemId?: string;
    }
  | {
      readonly kind: "coupled-system-required";
      readonly systemIds: readonly string[];
    }
  | { readonly kind: "clock-advance-failed"; readonly message: string }
  | {
      readonly kind: "task-failed";
      readonly taskId: string;
      readonly phaseId: string;
      readonly message: string;
    }
  | {
      readonly kind: "system-failed";
      readonly systemId: string;
      readonly message: string;
    }
  | {
      readonly kind: "event-handler-failed";
      readonly handlerId: string;
      readonly sequenceId: number;
      readonly message: string;
    }
  | { readonly kind: "invalid-worker-result-order"; readonly order: number };

export type SchedulerResult<T> = Result<T, SchedulerError>;
