import {
  runtimeTaskId,
  SCHEDULER_PHASES,
  type RuntimeTask,
} from "@physica/runtime-scheduler";
import { deepFreezeControl } from "./control-definitions";
import type { ControlAction, ControlValue } from "./control-types";

export class ControlInputStore {
  private readonly queued: ControlAction[] = [];
  private readonly values = new Map<string, ControlValue>();

  enqueue(action: ControlAction): void {
    if (action.route !== "live-runtime-input")
      throw new TypeError("Only live-runtime actions enter ControlInputStore.");
    this.queued.push(deepFreezeControl(action));
  }

  applyQueued(): number {
    const count = this.queued.length;
    for (const action of this.queued)
      this.values.set(action.target, deepFreezeControl(action.value));
    this.queued.length = 0;
    return count;
  }

  read(key: string): ControlValue | undefined {
    return this.values.get(key);
  }

  snapshot(): ReadonlyMap<string, ControlValue> {
    return new Map(this.values);
  }
}

export function createControlInputTask(options: {
  readonly key: string;
  readonly store: ControlInputStore;
}): RuntimeTask {
  const parsed = runtimeTaskId("physica:task/document-control/" + options.key);
  if (!parsed.ok)
    throw new TypeError("Control task key must be namespaced-safe.");
  return Object.freeze({
    id: parsed.value,
    phaseId: SCHEDULER_PHASES.documentControl,
    run() {
      options.store.applyQueued();
      return { ok: true as const, value: undefined };
    },
  });
}
