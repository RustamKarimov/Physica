import type { RelationshipId } from "@physica/core-model";
import {
  deepFreezeRelationship,
  validateDependencyRelationship,
} from "./relationship-definitions";
import {
  computeRelationship,
  relationshipInputs,
  resolveRelationshipInput,
} from "./relationship-operations";
import type {
  CompiledRelationship,
  DependencyRelationshipV1,
  RelationshipEvaluation,
  RelationshipPlan,
  RelationshipResult,
  RelationshipValue,
} from "./relationship-types";

function fail(
  code: "duplicate-relationship" | "missing-input" | "relationship-cycle",
  message: string,
  relationshipId?: RelationshipId,
): RelationshipResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(relationshipId === undefined ? {} : { relationshipId }),
    },
  };
}

export function compileRelationshipPlan(
  definitions: readonly DependencyRelationshipV1[],
): RelationshipResult<RelationshipPlan> {
  const validatedDefinitions: DependencyRelationshipV1[] = [];
  for (const definition of definitions) {
    const validated = validateDependencyRelationship(definition);
    if (!validated.ok) return validated;
    validatedDefinitions.push(validated.value);
  }
  const byId = new Map(
    validatedDefinitions.map((definition) => [definition.id, definition]),
  );
  if (byId.size !== validatedDefinitions.length)
    return fail("duplicate-relationship", "Relationship IDs must be unique.");
  const declarationOrder = new Map(
    validatedDefinitions.map((definition, index) => [definition.id, index]),
  );
  const indegree = new Map<RelationshipId, number>();
  const dependants = new Map<RelationshipId, RelationshipId[]>();
  const compiled = new Map<RelationshipId, CompiledRelationship>();

  for (const definition of validatedDefinitions) {
    const inputs = relationshipInputs(definition);
    const dependencies = inputs
      .filter((input) => input.kind === "relationship")
      .map((input) => input.relationshipId);
    const externalKeys = inputs
      .filter((input) => input.kind === "external")
      .map((input) => input.key);
    for (const dependency of dependencies) {
      if (!byId.has(dependency))
        return fail(
          "missing-input",
          "A relationship dependency does not exist.",
          definition.id,
        );
      const targets = dependants.get(dependency) ?? [];
      targets.push(definition.id);
      dependants.set(dependency, targets);
    }
    indegree.set(definition.id, dependencies.length);
    compiled.set(
      definition.id,
      deepFreezeRelationship({
        definition,
        dependencies,
        externalKeys,
      }),
    );
  }

  const ready = validatedDefinitions
    .filter(({ id }) => indegree.get(id) === 0)
    .map(({ id }) => id);
  const ordered: CompiledRelationship[] = [];
  while (ready.length > 0) {
    ready.sort(
      (left, right) =>
        (declarationOrder.get(left) ?? 0) - (declarationOrder.get(right) ?? 0),
    );
    const id = ready.shift();
    if (id === undefined) break;
    ordered.push(compiled.get(id)!);
    for (const target of dependants.get(id) ?? []) {
      const next = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, next);
      if (next === 0) ready.push(target);
    }
  }
  if (ordered.length !== validatedDefinitions.length)
    return fail(
      "relationship-cycle",
      "Relationship dependency cycle detected.",
    );

  return {
    ok: true,
    value: Object.freeze({
      ordered: Object.freeze(ordered),
      dependants: Object.freeze(
        new Map(
          [...dependants].map(([id, values]) => [
            id,
            Object.freeze([...values]),
          ]),
        ),
      ),
    }),
  };
}

export class RelationshipStateStore {
  private readonly values = new Map<RelationshipId, RelationshipValue>();
  private readonly fingerprints = new Map<RelationshipId, string>();

  read(id: RelationshipId): RelationshipValue | undefined {
    return this.values.get(id);
  }

  snapshot(): ReadonlyMap<RelationshipId, RelationshipValue> {
    return Object.freeze(new Map(this.values));
  }

  inputFingerprint(id: RelationshipId): string | undefined {
    return this.fingerprints.get(id);
  }

  publish(
    id: RelationshipId,
    value: RelationshipValue,
    inputFingerprint: string,
  ): void {
    this.values.set(id, deepFreezeRelationship(value));
    this.fingerprints.set(id, inputFingerprint);
  }
}

function fingerprint(values: readonly RelationshipValue[]): string {
  return JSON.stringify(values);
}

export function evaluateRelationshipPlan(
  plan: RelationshipPlan,
  external: (key: string) => RelationshipValue | undefined,
  store = new RelationshipStateStore(),
): RelationshipResult<RelationshipEvaluation> {
  const recomputed: RelationshipId[] = [];
  for (const compiled of plan.ordered) {
    const inputValues: RelationshipValue[] = [];
    for (const input of relationshipInputs(compiled.definition)) {
      const resolved = resolveRelationshipInput(
        input,
        store.snapshot(),
        external,
      );
      if (!resolved.ok)
        return {
          ...resolved,
          error: {
            ...resolved.error,
            relationshipId: compiled.definition.id,
          },
        };
      inputValues.push(resolved.value);
    }
    const nextFingerprint = fingerprint(inputValues);
    if (store.inputFingerprint(compiled.definition.id) === nextFingerprint)
      continue;
    const result = computeRelationship(
      compiled.definition,
      store.snapshot(),
      external,
    );
    if (!result.ok)
      return {
        ...result,
        error: {
          ...result.error,
          relationshipId: compiled.definition.id,
        },
      };
    store.publish(compiled.definition.id, result.value, nextFingerprint);
    recomputed.push(compiled.definition.id);
  }
  return {
    ok: true,
    value: Object.freeze({
      values: store.snapshot(),
      recomputedIds: Object.freeze(recomputed),
    }),
  };
}
