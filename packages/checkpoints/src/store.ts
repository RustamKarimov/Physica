import type { ClockId, SceneId } from "@physica/core-model";
import { cloneAndFreeze, verifyCheckpointChecksum } from "./canonical";
import type { CheckpointResult } from "./errors";
import type {
  CheckpointCadencePolicy,
  RuntimeCheckpointId,
  RuntimeCheckpointV1,
} from "./types";

function clockTime(
  checkpoint: RuntimeCheckpointV1,
  clockId: ClockId,
): number | undefined {
  return checkpoint.clockSnapshot.states.find(
    (state) => state.clockId === clockId,
  )?.timeSeconds;
}

export class InMemoryCheckpointStore {
  private readonly checkpoints = new Map<
    RuntimeCheckpointId,
    RuntimeCheckpointV1
  >();

  private constructor(readonly policy: CheckpointCadencePolicy) {}

  static create(
    policy: CheckpointCadencePolicy,
  ): CheckpointResult<InMemoryCheckpointStore> {
    if (
      !Number.isFinite(policy.minimumClockIntervalSeconds) ||
      policy.minimumClockIntervalSeconds < 0 ||
      !Number.isSafeInteger(policy.maxCheckpointsPerScene) ||
      policy.maxCheckpointsPerScene < 1
    )
      return {
        ok: false,
        error: {
          kind: "invalid-checkpoint-policy",
          message:
            "Checkpoint cadence requires a finite non-negative interval and a positive safe capacity.",
        },
      };
    return {
      ok: true,
      value: new InMemoryCheckpointStore(cloneAndFreeze(policy)),
    };
  }

  add(checkpoint: RuntimeCheckpointV1): CheckpointResult<RuntimeCheckpointV1> {
    const integrity = verifyCheckpointChecksum(checkpoint);
    if (!integrity.ok) return integrity;
    if (this.checkpoints.has(checkpoint.checkpointId))
      return {
        ok: false,
        error: {
          kind: "duplicate-checkpoint",
          checkpointId: checkpoint.checkpointId,
        },
      };
    const frozen = cloneAndFreeze(checkpoint);
    this.checkpoints.set(frozen.checkpointId, frozen);
    const sceneEntries = this.list(frozen.sceneId);
    const excess = sceneEntries.length - this.policy.maxCheckpointsPerScene;
    if (excess > 0)
      sceneEntries
        .slice()
        .sort((left, right) => left.sequence - right.sequence)
        .slice(0, excess)
        .forEach((entry) => this.checkpoints.delete(entry.checkpointId));
    return { ok: true, value: frozen };
  }

  get(checkpointId: RuntimeCheckpointId): RuntimeCheckpointV1 | undefined {
    return this.checkpoints.get(checkpointId);
  }

  list(sceneId?: SceneId): readonly RuntimeCheckpointV1[] {
    return Object.freeze(
      [...this.checkpoints.values()]
        .filter(
          (checkpoint) =>
            sceneId === undefined || checkpoint.sceneId === sceneId,
        )
        .sort((left, right) => left.sequence - right.sequence),
    );
  }

  nearest(
    sceneId: SceneId,
    clockId: ClockId,
    targetTimeSeconds: number,
  ): CheckpointResult<RuntimeCheckpointV1> {
    const candidate = this.list(sceneId)
      .map((checkpoint) => ({
        checkpoint,
        time: clockTime(checkpoint, clockId),
      }))
      .filter(
        (entry): entry is { checkpoint: RuntimeCheckpointV1; time: number } =>
          entry.time !== undefined && entry.time <= targetTimeSeconds,
      )
      .sort(
        (left, right) =>
          right.time - left.time ||
          right.checkpoint.sequence - left.checkpoint.sequence,
      )[0];
    return candidate
      ? { ok: true, value: candidate.checkpoint }
      : {
          ok: false,
          error: {
            kind: "checkpoint-not-found",
            sceneId,
            clockId,
            targetTimeSeconds,
          },
        };
  }

  shouldCapture(
    sceneId: SceneId,
    clockId: ClockId,
    currentTimeSeconds: number,
  ): boolean {
    const latest = this.list(sceneId)
      .map((checkpoint) => clockTime(checkpoint, clockId))
      .filter((time): time is number => time !== undefined)
      .sort((left, right) => right - left)[0];
    return (
      latest === undefined ||
      currentTimeSeconds - latest >= this.policy.minimumClockIntervalSeconds
    );
  }

  clear(sceneId?: SceneId): void {
    if (sceneId === undefined) this.checkpoints.clear();
    else
      for (const checkpoint of this.list(sceneId))
        this.checkpoints.delete(checkpoint.checkpointId);
  }
}

export function createInMemoryCheckpointStore(
  policy: CheckpointCadencePolicy,
): CheckpointResult<InMemoryCheckpointStore> {
  return InMemoryCheckpointStore.create(policy);
}
