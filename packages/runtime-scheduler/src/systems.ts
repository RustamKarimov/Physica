import type {
  ClockId,
  JsonValue,
  StateChannelRef,
  SystemId,
} from "@physica/core-model";
import type { RuntimeEvent } from "@physica/events";
import type { SchedulerResult } from "./errors";
import {
  stateChannelKey,
  type RuntimeStateStore,
  type RuntimeStateWrite,
} from "./runtime-state";

export interface SystemClockInterval {
  readonly clockId: ClockId;
  readonly previousTimeSeconds: number;
  readonly timeSeconds: number;
}

export interface ScheduledSystemContext {
  readonly interval: SystemClockInterval;
  read(ref: StateChannelRef): JsonValue | undefined;
}

export interface ScheduledSystemOutput {
  readonly writes?: readonly RuntimeStateWrite[];
  readonly events?: readonly RuntimeEvent[];
}

export interface ScheduledSystem {
  readonly id: SystemId;
  readonly clockId?: ClockId;
  readonly declaredInputs: readonly StateChannelRef[];
  readonly declaredOutputs: readonly StateChannelRef[];
  execute(
    context: ScheduledSystemContext,
  ): SchedulerResult<ScheduledSystemOutput>;
}

export interface ScheduledSystemPlan {
  readonly systems: readonly ScheduledSystem[];
  readonly simulationClockId: ClockId;
}

function duplicateRef(
  systemId: SystemId,
  refs: readonly StateChannelRef[],
): SchedulerResult<void> {
  const seen = new Set<string>();
  for (const ref of refs) {
    const key = stateChannelKey(ref);
    if (seen.has(key))
      return {
        ok: false,
        error: { kind: "duplicate-state-ref", systemId, channelKey: key },
      };
    seen.add(key);
  }
  return { ok: true, value: undefined };
}

export function buildScheduledSystemPlan(
  systems: readonly ScheduledSystem[],
  availableClockIds: readonly ClockId[],
  simulationClockId: ClockId,
): SchedulerResult<ScheduledSystemPlan> {
  const clocks = new Set(availableClockIds);
  if (!clocks.has(simulationClockId))
    return {
      ok: false,
      error: { kind: "clock-not-found", clockId: simulationClockId },
    };

  const byId = new Map<SystemId, ScheduledSystem>();
  const writerByChannel = new Map<string, SystemId>();
  for (const system of systems) {
    if (byId.has(system.id))
      return {
        ok: false,
        error: { kind: "duplicate-system", systemId: system.id },
      };
    byId.set(system.id, system);
    const inputCheck = duplicateRef(system.id, system.declaredInputs);
    if (!inputCheck.ok) return inputCheck;
    const outputCheck = duplicateRef(system.id, system.declaredOutputs);
    if (!outputCheck.ok) return outputCheck;
    const clockId = system.clockId ?? simulationClockId;
    if (!clocks.has(clockId))
      return {
        ok: false,
        error: { kind: "clock-not-found", clockId, systemId: system.id },
      };
    for (const output of system.declaredOutputs) {
      const key = stateChannelKey(output);
      const writer = writerByChannel.get(key);
      if (writer !== undefined && writer !== system.id)
        return {
          ok: false,
          error: {
            kind: "state-writer-conflict",
            channelKey: key,
            writerIds: Object.freeze([writer, system.id].sort()),
          },
        };
      writerByChannel.set(key, system.id);
    }
  }

  const outgoing = new Map<SystemId, Set<SystemId>>(
    systems.map(({ id }) => [id, new Set<SystemId>()]),
  );
  const indegree = new Map<SystemId, number>(systems.map(({ id }) => [id, 0]));
  for (const consumer of systems) {
    for (const input of consumer.declaredInputs) {
      const producer = writerByChannel.get(stateChannelKey(input));
      if (producer === undefined || producer === consumer.id) continue;
      const targets = outgoing.get(producer)!;
      if (!targets.has(consumer.id)) {
        targets.add(consumer.id);
        indegree.set(consumer.id, indegree.get(consumer.id)! + 1);
      }
    }
  }

  const ready = systems
    .filter(({ id }) => indegree.get(id) === 0)
    .map(({ id }) => id)
    .sort();
  const ordered: ScheduledSystem[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    ordered.push(byId.get(id)!);
    for (const target of [...outgoing.get(id)!].sort()) {
      const next = indegree.get(target)! - 1;
      indegree.set(target, next);
      if (next === 0) {
        ready.push(target);
        ready.sort();
      }
    }
  }
  if (ordered.length !== systems.length) {
    const cycle = systems
      .map(({ id }) => id)
      .filter((id) => indegree.get(id)! > 0)
      .sort();
    return {
      ok: false,
      error: {
        kind: "coupled-system-required",
        systemIds: Object.freeze(cycle),
      },
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      systems: Object.freeze(ordered),
      simulationClockId,
    }),
  };
}

export function executeScheduledSystem(
  system: ScheduledSystem,
  interval: SystemClockInterval,
  state: RuntimeStateStore,
): SchedulerResult<ScheduledSystemOutput> {
  try {
    const result = system.execute({
      interval,
      read: (ref) => state.read(ref),
    });
    if (!result.ok)
      return {
        ok: false,
        error: {
          kind: "system-failed",
          systemId: system.id,
          message: result.error.kind,
        },
      };
    const writes = result.value.writes ?? [];
    const declaredOutputs = new Set(
      system.declaredOutputs.map(stateChannelKey),
    );
    const undeclared = writes.find(
      ({ ref }) => !declaredOutputs.has(stateChannelKey(ref)),
    );
    if (undeclared)
      return {
        ok: false,
        error: {
          kind: "unauthorized-state-write",
          channelKey: stateChannelKey(undeclared.ref),
          writerId: system.id,
        },
      };
    const committed = state.commit(system.id, writes);
    if (!committed.ok) return committed;
    return result;
  } catch {
    return {
      ok: false,
      error: {
        kind: "system-failed",
        systemId: system.id,
        message: "System callback threw an exception.",
      },
    };
  }
}
