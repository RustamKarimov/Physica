import type { ClockRuntime } from "@physica/clocks";
import type { ClockId, SceneId } from "@physica/core-model";
import { RuntimeEventSequence } from "@physica/events";
import type { RuntimeStateStore } from "@physica/runtime-scheduler";
import { sealCheckpoint, verifyCheckpointChecksum } from "./canonical";
import type { CheckpointError, CheckpointResult } from "./errors";
import type { CheckpointParticipantRegistry } from "./participants";
import type { InMemoryCheckpointStore } from "./store";
import type {
  AnalyticalScrubAdapter,
  AnalyticalScrubReport,
  ReplayDriver,
  ReplayReport,
  RestoreReport,
  RuntimeCheckpointV1,
  ScrubRequest,
} from "./types";
import { runtimeCheckpointId } from "./types";

export interface CheckpointReplayServiceConfiguration {
  readonly sceneId: SceneId;
  readonly primaryClockId: ClockId;
  readonly clockRuntime: ClockRuntime;
  readonly authoritativeState: RuntimeStateStore;
  readonly eventSequence: RuntimeEventSequence;
  readonly participants: CheckpointParticipantRegistry;
  readonly store: InMemoryCheckpointStore;
  readonly initialSequence?: number;
}

function validationFailure(message: string): CheckpointResult<never> {
  return {
    ok: false,
    error: { kind: "snapshot-validation-failed", message },
  };
}

function timeFor(
  checkpoint: RuntimeCheckpointV1,
  clockId: ClockId,
): number | undefined {
  return checkpoint.clockSnapshot.states.find(
    (state) => state.clockId === clockId,
  )?.timeSeconds;
}

export class CheckpointReplayService {
  private nextSequence: number;

  private constructor(
    private readonly configuration: CheckpointReplayServiceConfiguration,
    initialSequence: number,
  ) {
    this.nextSequence = initialSequence;
  }

  static create(
    configuration: CheckpointReplayServiceConfiguration,
  ): CheckpointResult<CheckpointReplayService> {
    const initialSequence = configuration.initialSequence ?? 0;
    if (!Number.isSafeInteger(initialSequence) || initialSequence < 0)
      return validationFailure(
        "Initial checkpoint sequence must be a non-negative safe integer.",
      );
    if (configuration.authoritativeState.sceneId !== configuration.sceneId)
      return validationFailure(
        "Checkpoint service scene and runtime state scene must match.",
      );
    if (!configuration.clockRuntime.getState(configuration.primaryClockId))
      return {
        ok: false,
        error: {
          kind: "clock-not-found",
          clockId: configuration.primaryClockId,
        },
      };
    return {
      ok: true,
      value: new CheckpointReplayService(configuration, initialSequence),
    };
  }

  capture(): CheckpointResult<RuntimeCheckpointV1> {
    if (this.nextSequence === Number.MAX_SAFE_INTEGER)
      return {
        ok: false,
        error: {
          kind: "checkpoint-sequence-exhausted",
          sequence: this.nextSequence,
        },
      };
    const participantSnapshots = this.configuration.participants.captureAll();
    if (!participantSnapshots.ok) return participantSnapshots;
    const parsedId = runtimeCheckpointId(
      `physica.checkpoint:${this.nextSequence.toString(36)}`,
    );
    if (!parsedId.ok) return parsedId;
    const checkpoint = sealCheckpoint({
      schemaVersion: 1,
      checkpointId: parsedId.value,
      sequence: this.nextSequence,
      sceneId: this.configuration.sceneId,
      primaryClockId: this.configuration.primaryClockId,
      clockSnapshot: this.configuration.clockRuntime.snapshot(),
      authoritativeStateSnapshot:
        this.configuration.authoritativeState.snapshot(),
      participantSnapshots: participantSnapshots.value,
      eventSequenceState: this.configuration.eventSequence.snapshot(),
    });
    const stored = this.configuration.store.add(checkpoint);
    if (!stored.ok) return stored;
    this.nextSequence += 1;
    return stored;
  }

  captureIfDue(): CheckpointResult<RuntimeCheckpointV1 | undefined> {
    const state = this.configuration.clockRuntime.getState(
      this.configuration.primaryClockId,
    );
    if (!state)
      return {
        ok: false,
        error: {
          kind: "clock-not-found",
          clockId: this.configuration.primaryClockId,
        },
      };
    return this.configuration.store.shouldCapture(
      this.configuration.sceneId,
      this.configuration.primaryClockId,
      state.timeSeconds,
    )
      ? this.capture()
      : { ok: true, value: undefined };
  }

  restore(checkpoint: RuntimeCheckpointV1): CheckpointResult<RestoreReport> {
    const integrity = verifyCheckpointChecksum(checkpoint);
    if (!integrity.ok) return integrity;
    if (checkpoint.schemaVersion !== 1)
      return validationFailure("Unsupported checkpoint schema version.");
    if (
      !Number.isSafeInteger(checkpoint.sequence) ||
      checkpoint.sequence < 0 ||
      !runtimeCheckpointId(checkpoint.checkpointId).ok
    )
      return validationFailure("Checkpoint identity or sequence is invalid.");
    if (checkpoint.sceneId !== this.configuration.sceneId)
      return {
        ok: false,
        error: {
          kind: "scene-mismatch",
          expected: this.configuration.sceneId,
          actual: checkpoint.sceneId,
        },
      };
    if (checkpoint.primaryClockId !== this.configuration.primaryClockId)
      return validationFailure(
        "Checkpoint primary clock does not match the replay service.",
      );
    const clockValidation = this.configuration.clockRuntime.validateSnapshot(
      checkpoint.clockSnapshot,
    );
    if (!clockValidation.ok)
      return validationFailure(clockValidation.error.kind);
    const stateValidation =
      this.configuration.authoritativeState.validateSnapshot(
        checkpoint.authoritativeStateSnapshot,
      );
    if (!stateValidation.ok)
      return validationFailure(stateValidation.error.kind);
    const sequenceValidation = RuntimeEventSequence.validatePosition(
      checkpoint.eventSequenceState,
    );
    if (!sequenceValidation.ok)
      return validationFailure(sequenceValidation.error.kind);
    const participantValidation = this.configuration.participants.validateAll(
      checkpoint.participantSnapshots,
    );
    if (!participantValidation.ok) return participantValidation;

    const rollbackClocks = this.configuration.clockRuntime.snapshot();
    const rollbackState = this.configuration.authoritativeState.snapshot();
    const rollbackSequence = this.configuration.eventSequence.snapshot();
    const rollbackParticipants = this.configuration.participants.captureAll();
    if (!rollbackParticipants.ok) return rollbackParticipants;

    const restoreFailure = (
      failure: CheckpointError,
    ): CheckpointResult<RestoreReport> => {
      const outcomes = [
        this.configuration.clockRuntime.restore(rollbackClocks).ok,
        this.configuration.authoritativeState.restore(rollbackState).ok,
        this.configuration.eventSequence.restore(rollbackSequence).ok,
        this.configuration.participants.restoreAll(rollbackParticipants.value)
          .ok,
      ];
      return outcomes.every(Boolean)
        ? { ok: false, error: failure }
        : {
            ok: false,
            error: {
              kind: "restore-rollback-failed",
              message: "Checkpoint restore failed and rollback was incomplete.",
            },
          };
    };

    if (!this.configuration.clockRuntime.restore(checkpoint.clockSnapshot).ok)
      return restoreFailure({
        kind: "snapshot-validation-failed",
        message: "Validated clock snapshot could not be restored.",
      });
    if (
      !this.configuration.authoritativeState.restore(
        checkpoint.authoritativeStateSnapshot,
      ).ok
    )
      return restoreFailure({
        kind: "snapshot-validation-failed",
        message: "Validated authoritative state could not be restored.",
      });
    if (
      !this.configuration.eventSequence.restore(checkpoint.eventSequenceState)
        .ok
    )
      return restoreFailure({
        kind: "snapshot-validation-failed",
        message: "Validated event sequence could not be restored.",
      });
    const restoredParticipants = this.configuration.participants.restoreAll(
      checkpoint.participantSnapshots,
    );
    if (!restoredParticipants.ok)
      return restoreFailure(restoredParticipants.error);

    return {
      ok: true,
      value: Object.freeze({
        checkpointId: checkpoint.checkpointId,
        clockSnapshot: this.configuration.clockRuntime.snapshot(),
        authoritativeStateSnapshot:
          this.configuration.authoritativeState.snapshot(),
        eventSequenceState: this.configuration.eventSequence.snapshot(),
      }),
    };
  }

  scrub(
    request: ScrubRequest,
    driver: ReplayDriver,
  ): CheckpointResult<ReplayReport> {
    if (!Number.isFinite(request.targetTimeSeconds))
      return {
        ok: false,
        error: {
          kind: "invalid-scrub-target",
          targetTimeSeconds: request.targetTimeSeconds,
        },
      };
    if (
      !Number.isFinite(request.maximumStepSeconds) ||
      request.maximumStepSeconds <= 0
    )
      return {
        ok: false,
        error: {
          kind: "invalid-replay-step",
          maximumStepSeconds: request.maximumStepSeconds,
        },
      };
    const nearest = this.configuration.store.nearest(
      request.sceneId,
      request.clockId,
      request.targetTimeSeconds,
    );
    if (!nearest.ok) return nearest;
    const restored = this.restore(nearest.value);
    if (!restored.ok) return restored;
    const restoredTime = timeFor(nearest.value, request.clockId);
    if (restoredTime === undefined)
      return {
        ok: false,
        error: { kind: "clock-not-found", clockId: request.clockId },
      };

    let current = restoredTime;
    let replaySteps = 0;
    while (current < request.targetTimeSeconds) {
      const next = Math.min(
        request.targetTimeSeconds,
        current + request.maximumStepSeconds,
      );
      if (next <= current)
        return {
          ok: false,
          error: {
            kind: "invalid-replay-step",
            maximumStepSeconds: request.maximumStepSeconds,
          },
        };
      let step: CheckpointResult<void>;
      try {
        step = driver.replayStep({
          clockId: request.clockId,
          fromTimeSeconds: current,
          toTimeSeconds: next,
        });
      } catch {
        return {
          ok: false,
          error: {
            kind: "replay-step-failed",
            message: "Replay driver threw an exception.",
            fromTimeSeconds: current,
            toTimeSeconds: next,
          },
        };
      }
      if (!step.ok) return step;
      const actual = this.configuration.clockRuntime.getState(
        request.clockId,
      )?.timeSeconds;
      if (actual === undefined)
        return {
          ok: false,
          error: { kind: "clock-not-found", clockId: request.clockId },
        };
      if (actual !== next)
        return {
          ok: false,
          error: {
            kind: "replay-clock-diverged",
            clockId: request.clockId,
            expectedTimeSeconds: next,
            actualTimeSeconds: actual,
          },
        };
      current = next;
      replaySteps += 1;
    }
    let regenerated: CheckpointResult<void>;
    try {
      regenerated = driver.regenerateDerived();
    } catch {
      return {
        ok: false,
        error: {
          kind: "derived-regeneration-failed",
          message: "Derived-state regeneration threw an exception.",
        },
      };
    }
    if (!regenerated.ok) return regenerated;
    return {
      ok: true,
      value: Object.freeze({
        checkpointId: nearest.value.checkpointId,
        restoredTimeSeconds: restoredTime,
        targetTimeSeconds: request.targetTimeSeconds,
        replaySteps,
        clockSnapshot: this.configuration.clockRuntime.snapshot(),
        authoritativeStateSnapshot:
          this.configuration.authoritativeState.snapshot(),
        eventSequenceState: this.configuration.eventSequence.snapshot(),
      }),
    };
  }

  scrubAnalytical(
    clockId: ClockId,
    targetTimeSeconds: number,
    adapter: AnalyticalScrubAdapter,
  ): CheckpointResult<AnalyticalScrubReport> {
    if (!Number.isFinite(targetTimeSeconds))
      return {
        ok: false,
        error: { kind: "invalid-scrub-target", targetTimeSeconds },
      };
    let evaluated: CheckpointResult<void>;
    try {
      evaluated = adapter.evaluateAt(clockId, targetTimeSeconds);
    } catch {
      return {
        ok: false,
        error: {
          kind: "analytical-evaluation-failed",
          message: "Analytical evaluation threw an exception.",
        },
      };
    }
    if (!evaluated.ok) return evaluated;
    const actual =
      this.configuration.clockRuntime.getState(clockId)?.timeSeconds;
    if (actual === undefined)
      return { ok: false, error: { kind: "clock-not-found", clockId } };
    if (actual !== targetTimeSeconds)
      return {
        ok: false,
        error: {
          kind: "replay-clock-diverged",
          clockId,
          expectedTimeSeconds: targetTimeSeconds,
          actualTimeSeconds: actual,
        },
      };
    let regenerated: CheckpointResult<void>;
    try {
      regenerated = adapter.regenerateDerived();
    } catch {
      return {
        ok: false,
        error: {
          kind: "derived-regeneration-failed",
          message: "Derived-state regeneration threw an exception.",
        },
      };
    }
    if (!regenerated.ok) return regenerated;
    return {
      ok: true,
      value: Object.freeze({
        clockId,
        targetTimeSeconds,
        clockSnapshot: this.configuration.clockRuntime.snapshot(),
      }),
    };
  }
}

export function createCheckpointReplayService(
  configuration: CheckpointReplayServiceConfiguration,
): CheckpointResult<CheckpointReplayService> {
  return CheckpointReplayService.create(configuration);
}
