import {
  runtimeTaskId,
  SCHEDULER_PHASES,
  type RuntimeTask,
  type RuntimeTaskContext,
} from "@physica/runtime-scheduler";
import {
  evaluateRelationshipPlan,
  type RelationshipStateStore,
} from "./relationship-engine";
import type { RelationshipPlan, RelationshipValue } from "./relationship-types";

export function createRelationshipTask(options: {
  readonly key: string;
  readonly plan: RelationshipPlan;
  readonly store: RelationshipStateStore;
  readonly readExternal: (
    key: string,
    context: RuntimeTaskContext,
  ) => RelationshipValue | undefined;
}): RuntimeTask {
  const parsed = runtimeTaskId("physica:task/relationships/" + options.key);
  if (!parsed.ok)
    throw new TypeError("Relationship task key must be namespaced-safe.");
  const id = parsed.value;
  return Object.freeze({
    id,
    phaseId: SCHEDULER_PHASES.relationships,
    run(context: RuntimeTaskContext) {
      const evaluated = evaluateRelationshipPlan(
        options.plan,
        (key) => options.readExternal(key, context),
        options.store,
      );
      return evaluated.ok
        ? { ok: true as const, value: undefined }
        : {
            ok: false as const,
            error: {
              kind: "invalid-task" as const,
              taskId: id,
              message: evaluated.error.message,
            },
          };
    },
  });
}
