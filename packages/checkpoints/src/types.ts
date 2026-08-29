import {
  REGISTERED_TYPE_ID_PATTERN,
  type Brand,
  type ClockId,
  type JsonValue,
  type SceneId,
} from "@physica/core-model";
import type { ClockRuntimeSnapshot } from "@physica/clocks";
import type { RuntimeStateSnapshot } from "@physica/runtime-scheduler";
import type { CheckpointResult } from "./errors";

export type RuntimeCheckpointId = Brand<string, "RuntimeCheckpointId">;
export type CheckpointParticipantId = Brand<string, "CheckpointParticipantId">;

export type CheckpointParticipantKind =
  "solver" | "random-source" | "acquisition" | "runtime-continuation";

export interface CheckpointParticipantSnapshot {
  readonly participantId: CheckpointParticipantId;
  readonly kind: CheckpointParticipantKind;
  readonly schemaVersion: number;
  readonly state: JsonValue;
}

export interface RuntimeCheckpointBodyV1 {
  readonly schemaVersion: 1;
  readonly checkpointId: RuntimeCheckpointId;
  readonly sequence: number;
  readonly sceneId: SceneId;
  readonly primaryClockId: ClockId;
  readonly clockSnapshot: ClockRuntimeSnapshot;
  readonly authoritativeStateSnapshot: RuntimeStateSnapshot;
  readonly participantSnapshots: readonly CheckpointParticipantSnapshot[];
  readonly eventSequenceState: number;
}

export interface RuntimeCheckpointV1 extends RuntimeCheckpointBodyV1 {
  readonly checksum: string;
}

export interface CheckpointParticipant {
  readonly participantId: CheckpointParticipantId;
  readonly kind: CheckpointParticipantKind;
  readonly schemaVersion: number;
  capture(): CheckpointResult<JsonValue>;
  validate(snapshot: CheckpointParticipantSnapshot): CheckpointResult<void>;
  restore(snapshot: CheckpointParticipantSnapshot): CheckpointResult<void>;
}

export interface CheckpointCadencePolicy {
  readonly minimumClockIntervalSeconds: number;
  readonly maxCheckpointsPerScene: number;
}

export interface ReplayStepRequest {
  readonly clockId: ClockId;
  readonly fromTimeSeconds: number;
  readonly toTimeSeconds: number;
}

export interface ReplayDriver {
  replayStep(request: ReplayStepRequest): CheckpointResult<void>;
  regenerateDerived(): CheckpointResult<void>;
}

export interface ScrubRequest {
  readonly sceneId: SceneId;
  readonly clockId: ClockId;
  readonly targetTimeSeconds: number;
  readonly maximumStepSeconds: number;
}

export interface ReplayReport {
  readonly checkpointId: RuntimeCheckpointId;
  readonly restoredTimeSeconds: number;
  readonly targetTimeSeconds: number;
  readonly replaySteps: number;
  readonly clockSnapshot: ClockRuntimeSnapshot;
  readonly authoritativeStateSnapshot: RuntimeStateSnapshot;
  readonly eventSequenceState: number;
}

export interface RestoreReport {
  readonly checkpointId: RuntimeCheckpointId;
  readonly clockSnapshot: ClockRuntimeSnapshot;
  readonly authoritativeStateSnapshot: RuntimeStateSnapshot;
  readonly eventSequenceState: number;
}

export interface AnalyticalScrubAdapter {
  evaluateAt(
    clockId: ClockId,
    targetTimeSeconds: number,
  ): CheckpointResult<void>;
  regenerateDerived(): CheckpointResult<void>;
}

export interface AnalyticalScrubReport {
  readonly clockId: ClockId;
  readonly targetTimeSeconds: number;
  readonly clockSnapshot: ClockRuntimeSnapshot;
}

export function checkpointParticipantId(
  value: string,
): CheckpointResult<CheckpointParticipantId> {
  return REGISTERED_TYPE_ID_PATTERN.test(value)
    ? { ok: true, value: value as CheckpointParticipantId }
    : {
        ok: false,
        error: {
          kind: "invalid-checkpoint",
          message: "Checkpoint participant ID must be namespaced.",
        },
      };
}

export function runtimeCheckpointId(
  value: string,
): CheckpointResult<RuntimeCheckpointId> {
  return REGISTERED_TYPE_ID_PATTERN.test(value)
    ? { ok: true, value: value as RuntimeCheckpointId }
    : {
        ok: false,
        error: {
          kind: "invalid-checkpoint",
          message: "Runtime checkpoint ID must be namespaced.",
        },
      };
}
