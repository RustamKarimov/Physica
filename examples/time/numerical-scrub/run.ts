import {
  checkpointParticipantId,
  createCheckpointParticipantRegistry,
  createCheckpointReplayService,
  createInMemoryCheckpointStore,
  type CheckpointParticipant,
  type CheckpointResult,
  type ReplayDriver,
} from "@physica/checkpoints";
import {
  createClockRuntime,
  createDefaultClockDefinitions,
} from "@physica/clocks";
import {
  DeterministicIdFactory,
  stateChannelId,
  type EntityId,
  type JsonObject,
  type JsonValue,
  type Result,
  type SceneId,
  type StateChannelRef,
  type SystemId,
} from "@physica/core-model";
import { createRuntimeEventSequence } from "@physica/events";
import { createRuntimeStateStore } from "@physica/runtime-scheduler";

const SCENE = "00000000-0000-4000-8000-000000008000" as SceneId;
const BODY = "00000000-0000-4000-8000-000000008001" as EntityId;
const SYSTEM = "00000000-0000-4000-8000-000000008002" as SystemId;
const POSITION: StateChannelRef = {
  scope: "entity",
  entityId: BODY,
  channel: stateChannelId("mechanics.position"),
};

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

function success<T>(value: T): CheckpointResult<T> {
  return { ok: true, value };
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function runNumericalScrub() {
  const definitions = createDefaultClockDefinitions(
    new DeterministicIdFactory(8000),
    false,
  );
  const clockId = definitions[0].id;
  const clocks = unwrap(createClockRuntime(definitions));
  const state = unwrap(
    createRuntimeStateStore(
      SCENE,
      [{ ref: POSITION, writerId: SYSTEM }],
      [{ ref: POSITION, value: 0 }],
    ),
  );
  const eventSequence = unwrap(createRuntimeEventSequence());
  let velocity = 0;
  const participantId = unwrap(
    checkpointParticipantId("physica.solver:falling-body"),
  );
  const solver: CheckpointParticipant = {
    participantId,
    kind: "solver",
    schemaVersion: 1,
    capture: () => success({ velocity }),
    validate: (snapshot) =>
      isJsonObject(snapshot.state) &&
      typeof snapshot.state.velocity === "number"
        ? success(undefined)
        : {
            ok: false,
            error: {
              kind: "snapshot-validation-failed",
              message: "Falling-body velocity is missing.",
            },
          },
    restore: (snapshot) => {
      if (
        !isJsonObject(snapshot.state) ||
        typeof snapshot.state.velocity !== "number"
      )
        return {
          ok: false,
          error: {
            kind: "participant-restore-failed",
            participantId,
            message: "Falling-body velocity is invalid.",
          },
        };
      velocity = snapshot.state.velocity;
      return success(undefined);
    },
  };
  const participants = unwrap(createCheckpointParticipantRegistry([solver]));
  const store = unwrap(
    createInMemoryCheckpointStore({
      minimumClockIntervalSeconds: 0,
      maxCheckpointsPerScene: 8,
    }),
  );
  const service = unwrap(
    createCheckpointReplayService({
      sceneId: SCENE,
      primaryClockId: clockId,
      clockRuntime: clocks,
      authoritativeState: state,
      eventSequence,
      participants,
      store,
    }),
  );
  let regenerations = 0;
  const driver: ReplayDriver = {
    replayStep: ({
      clockId: selectedClock,
      fromTimeSeconds,
      toTimeSeconds,
    }) => {
      const position = state.read(POSITION);
      if (typeof position !== "number")
        throw new Error("Falling-body position is not numeric.");
      const delta = toTimeSeconds - fromTimeSeconds;
      velocity += -9.8 * delta;
      unwrap(
        clocks.applyControl({
          kind: "scrub",
          clockId: selectedClock,
          timeSeconds: toTimeSeconds,
        }),
      );
      unwrap(
        state.commit(SYSTEM, [
          { ref: POSITION, value: position + velocity * delta },
        ]),
      );
      unwrap(eventSequence.next());
      return success(undefined);
    },
    regenerateDerived: () => {
      regenerations += 1;
      return success(undefined);
    },
  };
  const advanceTo = (targetTimeSeconds: number): void => {
    let current = clocks.getState(clockId)!.timeSeconds;
    while (current < targetTimeSeconds) {
      const next = Math.min(targetTimeSeconds, current + 0.25);
      unwrap(
        driver.replayStep({
          clockId,
          fromTimeSeconds: current,
          toTimeSeconds: next,
        }),
      );
      current = next;
    }
  };
  const stateAt = () => ({
    timeSeconds: clocks.getState(clockId)!.timeSeconds,
    positionMetres: rounded(state.read(POSITION) as number),
    velocityMetresPerSecond: rounded(velocity),
    eventSequence: eventSequence.snapshot(),
  });

  unwrap(service.capture());
  advanceTo(2);
  const checkpoint = unwrap(service.capture());
  advanceTo(4);
  const uninterruptedAtFour = stateAt();
  const backwardReport = unwrap(
    service.scrub(
      {
        sceneId: SCENE,
        clockId,
        targetTimeSeconds: 3,
        maximumStepSeconds: 0.25,
      },
      driver,
    ),
  );
  const afterBackwardScrub = stateAt();
  const forwardReport = unwrap(
    service.scrub(
      {
        sceneId: SCENE,
        clockId,
        targetTimeSeconds: 4,
        maximumStepSeconds: 0.25,
      },
      driver,
    ),
  );
  const replayedAtFour = stateAt();

  return {
    checkpoint: {
      id: checkpoint.checkpointId,
      timeSeconds: 2,
      solverVelocity: -19.6,
    },
    afterBackwardScrub,
    backwardReplaySteps: backwardReport.replaySteps,
    uninterruptedAtFour,
    replayedAtFour,
    forwardReplaySteps: forwardReport.replaySteps,
    deterministicMatch:
      JSON.stringify(uninterruptedAtFour) === JSON.stringify(replayedAtFour),
    derivedRegenerations: regenerations,
  };
}
