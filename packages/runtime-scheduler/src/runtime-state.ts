import {
  isJsonValue,
  type JsonValue,
  type SceneId,
  type StateChannelRef,
  type SystemId,
} from "@physica/core-model";
import type { SchedulerResult } from "./errors";

export interface RuntimeStateClaim {
  readonly ref: StateChannelRef;
  readonly writerId: SystemId;
}

export interface RuntimeStateInitialValue {
  readonly ref: StateChannelRef;
  readonly value: JsonValue;
}

export interface RuntimeStateWrite {
  readonly ref: StateChannelRef;
  readonly value: JsonValue;
}

export interface RuntimeStateEntry extends RuntimeStateInitialValue {
  readonly revision: number;
}

export interface RuntimeStateSnapshot {
  readonly sceneId: SceneId;
  readonly entries: readonly RuntimeStateEntry[];
  readonly revision: number;
}

function cloneJson<T extends JsonValue>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((entry) => cloneJson(entry))) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, cloneJson(entry)]),
      ),
    ) as T;
  return value;
}

function canonicalJson(value: JsonValue): string {
  return JSON.stringify(cloneJson(value));
}

function freezeRef(ref: StateChannelRef): StateChannelRef {
  return Object.freeze({ ...ref });
}

export function stateChannelKey(ref: StateChannelRef): string {
  return ref.scope === "entity"
    ? `entity:${ref.entityId}:${ref.channel}`
    : `system:${ref.systemId}:${ref.channel}`;
}

function freezeEntry(entry: RuntimeStateEntry): RuntimeStateEntry {
  return Object.freeze({
    ref: freezeRef(entry.ref),
    value: cloneJson(entry.value),
    revision: entry.revision,
  });
}

export class RuntimeStateStore {
  private entries: Map<string, RuntimeStateEntry>;
  private readonly initialEntries: ReadonlyMap<string, RuntimeStateEntry>;
  private readonly writers: ReadonlyMap<string, SystemId>;
  private storeRevision = 0;

  constructor(
    readonly sceneId: SceneId,
    writers: ReadonlyMap<string, SystemId>,
    initialEntries: ReadonlyMap<string, RuntimeStateEntry>,
  ) {
    this.writers = new Map(writers);
    this.initialEntries = new Map(initialEntries);
    this.entries = new Map(initialEntries);
  }

  read(ref: StateChannelRef): JsonValue | undefined {
    return this.entries.get(stateChannelKey(ref))?.value;
  }

  writer(ref: StateChannelRef): SystemId | undefined {
    return this.writers.get(stateChannelKey(ref));
  }

  commit(
    writerId: SystemId,
    writes: readonly RuntimeStateWrite[],
  ): SchedulerResult<RuntimeStateSnapshot> {
    const seen = new Set<string>();
    for (const write of writes) {
      const key = stateChannelKey(write.ref);
      if (seen.has(key))
        return {
          ok: false,
          error: {
            kind: "invalid-runtime-state",
            message: "A runtime transaction writes one channel more than once.",
            relatedIds: [writerId, key],
          },
        };
      seen.add(key);
      if (this.writers.get(key) !== writerId)
        return {
          ok: false,
          error: {
            kind: "unauthorized-state-write",
            channelKey: key,
            writerId,
          },
        };
      if (!isJsonValue(write.value))
        return {
          ok: false,
          error: {
            kind: "invalid-runtime-state",
            message: "Runtime state values must be finite JSON values.",
            relatedIds: [writerId, key],
          },
        };
    }

    const changed = writes.filter((write) => {
      const previous = this.entries.get(stateChannelKey(write.ref));
      return (
        previous === undefined ||
        canonicalJson(previous.value) !== canonicalJson(write.value)
      );
    });
    if (changed.length === 0) return { ok: true, value: this.snapshot() };

    const next = new Map(this.entries);
    for (const write of changed) {
      const key = stateChannelKey(write.ref);
      const previous = next.get(key);
      next.set(
        key,
        freezeEntry({
          ref: write.ref,
          value: write.value,
          revision: (previous?.revision ?? -1) + 1,
        }),
      );
    }
    this.entries = next;
    this.storeRevision += 1;
    return { ok: true, value: this.snapshot() };
  }

  snapshot(): RuntimeStateSnapshot {
    return Object.freeze({
      sceneId: this.sceneId,
      entries: Object.freeze(
        [...this.entries.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, entry]) => freezeEntry(entry)),
      ),
      revision: this.storeRevision,
    });
  }

  reset(): RuntimeStateSnapshot {
    const current = this.snapshot().entries;
    const initial = [...this.initialEntries.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, entry]) => freezeEntry(entry));
    const differs =
      current.length !== initial.length ||
      current.some((entry, index) => {
        const expected = initial[index];
        return (
          expected === undefined ||
          stateChannelKey(entry.ref) !== stateChannelKey(expected.ref) ||
          canonicalJson(entry.value) !== canonicalJson(expected.value) ||
          entry.revision !== expected.revision
        );
      });
    if (differs) {
      this.entries = new Map(this.initialEntries);
      this.storeRevision += 1;
    }
    return this.snapshot();
  }

  restore(
    snapshot: RuntimeStateSnapshot,
  ): SchedulerResult<RuntimeStateSnapshot> {
    if (snapshot.sceneId !== this.sceneId)
      return {
        ok: false,
        error: {
          kind: "runtime-state-mismatch",
          message: "Runtime snapshot belongs to a different scene.",
        },
      };
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0)
      return {
        ok: false,
        error: {
          kind: "runtime-state-mismatch",
          message: "Runtime snapshot revision is invalid.",
        },
      };
    const next = new Map<string, RuntimeStateEntry>();
    for (const entry of snapshot.entries) {
      const key = stateChannelKey(entry.ref);
      if (
        next.has(key) ||
        !this.writers.has(key) ||
        !isJsonValue(entry.value) ||
        !Number.isSafeInteger(entry.revision) ||
        entry.revision < 0
      )
        return {
          ok: false,
          error: {
            kind: "runtime-state-mismatch",
            message: "Runtime snapshot channels or values are invalid.",
          },
        };
      next.set(key, freezeEntry(entry));
    }
    if (next.size !== this.initialEntries.size)
      return {
        ok: false,
        error: {
          kind: "runtime-state-mismatch",
          message: "Runtime snapshot channel set does not match the store.",
        },
      };
    this.entries = next;
    this.storeRevision = snapshot.revision;
    return { ok: true, value: this.snapshot() };
  }
}

export function createRuntimeStateStore(
  sceneId: SceneId,
  claims: readonly RuntimeStateClaim[],
  initialValues: readonly RuntimeStateInitialValue[],
): SchedulerResult<RuntimeStateStore> {
  const writers = new Map<string, SystemId>();
  for (const claim of claims) {
    const key = stateChannelKey(claim.ref);
    const previous = writers.get(key);
    if (previous !== undefined && previous !== claim.writerId)
      return {
        ok: false,
        error: {
          kind: "state-writer-conflict",
          channelKey: key,
          writerIds: Object.freeze([previous, claim.writerId].sort()),
        },
      };
    writers.set(key, claim.writerId);
  }
  const entries = new Map<string, RuntimeStateEntry>();
  for (const initial of initialValues) {
    const key = stateChannelKey(initial.ref);
    if (entries.has(key) || !writers.has(key) || !isJsonValue(initial.value))
      return {
        ok: false,
        error: {
          kind: "invalid-runtime-state",
          message:
            "Initial runtime values must be unique, JSON-safe and have an authoritative writer.",
          relatedIds: [key],
        },
      };
    entries.set(
      key,
      freezeEntry({ ref: initial.ref, value: initial.value, revision: 0 }),
    );
  }
  if (entries.size !== writers.size)
    return {
      ok: false,
      error: {
        kind: "invalid-runtime-state",
        message:
          "Every authoritative runtime channel requires an initial value.",
        relatedIds: [],
      },
    };
  return {
    ok: true,
    value: new RuntimeStateStore(sceneId, writers, entries),
  };
}
