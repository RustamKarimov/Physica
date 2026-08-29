import { isJsonValue } from "@physica/core-model";
import { cloneAndFreeze } from "./canonical";
import type { CheckpointResult } from "./errors";
import type {
  CheckpointParticipant,
  CheckpointParticipantId,
  CheckpointParticipantSnapshot,
} from "./types";
import { checkpointParticipantId } from "./types";

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Participant callback failed.";
}

export class CheckpointParticipantRegistry {
  private constructor(
    private readonly participants: ReadonlyMap<
      CheckpointParticipantId,
      CheckpointParticipant
    >,
    private readonly ordered: readonly CheckpointParticipant[],
  ) {}

  static create(
    participants: readonly CheckpointParticipant[],
  ): CheckpointResult<CheckpointParticipantRegistry> {
    const byId = new Map<CheckpointParticipantId, CheckpointParticipant>();
    for (const participant of participants) {
      const parsed = checkpointParticipantId(participant.participantId);
      if (!parsed.ok) return parsed;
      if (byId.has(participant.participantId))
        return {
          ok: false,
          error: {
            kind: "duplicate-participant",
            participantId: participant.participantId,
          },
        };
      if (
        !Number.isSafeInteger(participant.schemaVersion) ||
        participant.schemaVersion < 1
      )
        return {
          ok: false,
          error: {
            kind: "invalid-checkpoint",
            message:
              "Participant schema versions must be positive safe integers.",
          },
        };
      byId.set(participant.participantId, participant);
    }
    const ordered = Object.freeze(
      [...byId.values()].sort((left, right) =>
        left.participantId.localeCompare(right.participantId),
      ),
    );
    return {
      ok: true,
      value: new CheckpointParticipantRegistry(byId, ordered),
    };
  }

  captureAll(): CheckpointResult<readonly CheckpointParticipantSnapshot[]> {
    const snapshots: CheckpointParticipantSnapshot[] = [];
    for (const participant of this.ordered) {
      let captured;
      try {
        captured = participant.capture();
      } catch (error) {
        return {
          ok: false,
          error: {
            kind: "participant-capture-failed",
            participantId: participant.participantId,
            message: message(error),
          },
        };
      }
      if (!captured.ok) return captured;
      if (!isJsonValue(captured.value))
        return {
          ok: false,
          error: {
            kind: "participant-capture-failed",
            participantId: participant.participantId,
            message: "Participant state must be a finite JSON value.",
          },
        };
      snapshots.push(
        cloneAndFreeze({
          participantId: participant.participantId,
          kind: participant.kind,
          schemaVersion: participant.schemaVersion,
          state: captured.value,
        }),
      );
    }
    return { ok: true, value: Object.freeze(snapshots) };
  }

  validateAll(
    snapshots: readonly CheckpointParticipantSnapshot[],
  ): CheckpointResult<void> {
    if (snapshots.length !== this.ordered.length)
      return {
        ok: false,
        error: {
          kind: "snapshot-validation-failed",
          message: "Checkpoint participant set does not match the runtime.",
        },
      };
    const seen = new Set<CheckpointParticipantId>();
    for (const snapshot of snapshots) {
      const participant = this.participants.get(snapshot.participantId);
      if (!participant)
        return {
          ok: false,
          error: {
            kind: "participant-not-found",
            participantId: snapshot.participantId,
          },
        };
      if (seen.has(snapshot.participantId))
        return {
          ok: false,
          error: {
            kind: "duplicate-participant",
            participantId: snapshot.participantId,
          },
        };
      seen.add(snapshot.participantId);
      if (
        snapshot.kind !== participant.kind ||
        snapshot.schemaVersion !== participant.schemaVersion ||
        !isJsonValue(snapshot.state)
      )
        return {
          ok: false,
          error: {
            kind: "snapshot-validation-failed",
            message: `Checkpoint participant metadata is invalid for ${snapshot.participantId}.`,
          },
        };
      let validation;
      try {
        validation = participant.validate(snapshot);
      } catch (error) {
        return {
          ok: false,
          error: {
            kind: "snapshot-validation-failed",
            message: message(error),
          },
        };
      }
      if (!validation.ok) return validation;
    }
    return { ok: true, value: undefined };
  }

  restoreAll(
    snapshots: readonly CheckpointParticipantSnapshot[],
  ): CheckpointResult<void> {
    const validation = this.validateAll(snapshots);
    if (!validation.ok) return validation;
    const byId = new Map(
      snapshots.map((snapshot) => [snapshot.participantId, snapshot]),
    );
    for (const participant of this.ordered) {
      const snapshot = byId.get(participant.participantId)!;
      try {
        const restored = participant.restore(snapshot);
        if (!restored.ok) return restored;
      } catch (error) {
        return {
          ok: false,
          error: {
            kind: "participant-restore-failed",
            participantId: participant.participantId,
            message: message(error),
          },
        };
      }
    }
    return { ok: true, value: undefined };
  }
}

export function createCheckpointParticipantRegistry(
  participants: readonly CheckpointParticipant[],
): CheckpointResult<CheckpointParticipantRegistry> {
  return CheckpointParticipantRegistry.create(participants);
}
