import {
  DeterministicIdFactory,
  createEmptyProject,
  stateChannelId,
  type Result,
  type StateChannelRef,
} from "@physica/core-model";
import {
  createRuntimeStateStore,
  type RuntimeStateSnapshot,
} from "@physica/runtime-scheduler";
import { canonicalStringify } from "@physica/serialization";

function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

export interface RuntimeStateResetResult {
  readonly initialValues: readonly unknown[];
  readonly advancedValues: readonly unknown[];
  readonly resetValues: readonly unknown[];
  readonly resetRevision: number;
  readonly projectUnchanged: boolean;
}

function values(snapshot: RuntimeStateSnapshot): readonly unknown[] {
  return snapshot.entries.map(({ value }) => value);
}

export function runRuntimeStateReset(): RuntimeStateResetResult {
  const ids = new DeterministicIdFactory(7100);
  const project = createEmptyProject(ids, {
    title: "Runtime state reset",
    tags: ["example", "runtime"],
    createdAt: "2026-08-29T00:00:00.000Z",
  });
  const projectBefore = unwrap(canonicalStringify(project));
  const sceneId = ids.sceneId();
  const entityId = ids.entityId();
  const writerId = ids.systemId();
  const position: StateChannelRef = {
    scope: "entity",
    entityId,
    channel: stateChannelId("mechanics.position"),
  };
  const velocity: StateChannelRef = {
    scope: "entity",
    entityId,
    channel: stateChannelId("mechanics.velocity"),
  };
  const store = unwrap(
    createRuntimeStateStore(
      sceneId,
      [
        { ref: position, writerId },
        { ref: velocity, writerId },
      ],
      [
        { ref: position, value: [0, 0] },
        { ref: velocity, value: [2, 0] },
      ],
    ),
  );
  const initial = store.snapshot();
  const advanced = unwrap(
    store.commit(writerId, [
      { ref: position, value: [1, 0] },
      { ref: velocity, value: [2, 0] },
    ]),
  );
  const reset = store.reset();
  return {
    initialValues: values(initial),
    advancedValues: values(advanced),
    resetValues: values(reset),
    resetRevision: reset.revision,
    projectUnchanged: unwrap(canonicalStringify(project)) === projectBefore,
  };
}
