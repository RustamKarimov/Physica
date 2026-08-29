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

const INITIAL_SEED = 0x12345678;
const SCENE = "00000000-0000-4000-8000-000000008100" as SceneId;
const DETECTOR = "00000000-0000-4000-8000-000000008101" as EntityId;
const SYSTEM = "00000000-0000-4000-8000-000000008102" as SystemId;
const SAMPLE: StateChannelRef = {
  scope: "entity",
  entityId: DETECTOR,
  channel: stateChannelId("measurement.sample"),
};

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

function success<T>(value: T): CheckpointResult<T> {
  return { ok: true, value };
}

function nextXorshift32(state: number): number {
  let next = state >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function runStochasticScrub() {
  const definitions = createDefaultClockDefinitions(
    new DeterministicIdFactory(8100),
    false,
  );
  const clockId = definitions[0].id;
  const clocks = unwrap(createClockRuntime(definitions));
  const state = unwrap(
    createRuntimeStateStore(
      SCENE,
      [{ ref: SAMPLE, writerId: SYSTEM }],
      [{ ref: SAMPLE, value: INITIAL_SEED }],
    ),
  );
  const eventSequence = unwrap(createRuntimeEventSequence());
  let randomState = INITIAL_SEED;
  const participantId = unwrap(
    checkpointParticipantId("physica.random:xorshift32-example"),
  );
  const randomSource: CheckpointParticipant = {
    participantId,
    kind: "random-source",
    schemaVersion: 1,
    capture: () => success({ state: randomState }),
    validate: (snapshot) =>
      isJsonObject(snapshot.state) &&
      Number.isSafeInteger(snapshot.state.state) &&
      typeof snapshot.state.state === "number" &&
      snapshot.state.state >= 0 &&
      snapshot.state.state <= 0xffffffff
        ? success(undefined)
        : {
            ok: false,
            error: {
              kind: "snapshot-validation-failed",
              message: "xorshift32 state must be an unsigned 32-bit integer.",
            },
          },
    restore: (snapshot) => {
      if (
        !isJsonObject(snapshot.state) ||
        typeof snapshot.state.state !== "number"
      )
        return {
          ok: false,
          error: {
            kind: "participant-restore-failed",
            participantId,
            message: "xorshift32 state is invalid.",
          },
        };
      randomState = snapshot.state.state >>> 0;
      return success(undefined);
    },
  };
  const participants = unwrap(
    createCheckpointParticipantRegistry([randomSource]),
  );
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
  const samples: number[] = [];
  const driver: ReplayDriver = {
    replayStep: ({ clockId: selectedClock, toTimeSeconds }) => {
      randomState = nextXorshift32(randomState);
      samples.push(randomState);
      unwrap(
        clocks.applyControl({
          kind: "scrub",
          clockId: selectedClock,
          timeSeconds: toTimeSeconds,
        }),
      );
      unwrap(state.commit(SYSTEM, [{ ref: SAMPLE, value: randomState }]));
      unwrap(eventSequence.next());
      return success(undefined);
    },
    regenerateDerived: () => success(undefined),
  };
  const advanceTo = (targetTimeSeconds: number): void => {
    let current = clocks.getState(clockId)!.timeSeconds;
    while (current < targetTimeSeconds) {
      const next = Math.min(targetTimeSeconds, current + 0.5);
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

  unwrap(service.capture());
  advanceTo(2);
  const checkpoint = unwrap(service.capture());
  const checkpointGeneratorState = randomState;
  samples.length = 0;
  advanceTo(4);
  const uninterruptedTail = [...samples];
  const uninterruptedEventSequence = eventSequence.snapshot();
  samples.length = 0;
  const report = unwrap(
    service.scrub(
      {
        sceneId: SCENE,
        clockId,
        targetTimeSeconds: 4,
        maximumStepSeconds: 0.5,
      },
      driver,
    ),
  );
  const replayedTail = [...samples];

  return {
    checkpoint: {
      id: checkpoint.checkpointId,
      timeSeconds: 2,
      generatorState: checkpointGeneratorState,
      eventSequence: 4,
    },
    seedOnlyNextSample: nextXorshift32(INITIAL_SEED),
    requiredNextSample: uninterruptedTail[0],
    uninterruptedTail,
    replayedTail,
    replaySteps: report.replaySteps,
    finalGeneratorState: randomState,
    finalEventSequence: eventSequence.snapshot(),
    uninterruptedEventSequence,
    deterministicMatch:
      JSON.stringify(uninterruptedTail) === JSON.stringify(replayedTail) &&
      eventSequence.snapshot() === uninterruptedEventSequence,
  };
}
