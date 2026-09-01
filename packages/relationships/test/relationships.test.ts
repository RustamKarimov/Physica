import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  type RelationshipId,
} from "@physica/core-model";
import { SCHEDULER_PHASES } from "@physica/runtime-scheduler";
import {
  compileRelationshipPlan,
  createDependencyRelationshipEnvelope,
  createPhysicsVectorRepresentation,
  createRelationshipTask,
  evaluateRelationshipPlan,
  parseDependencyRelationshipEnvelope,
  RelationshipStateStore,
  resolvePhysicsVector,
  type DependencyRelationshipV1,
  type RelationshipValue,
} from "../src";

function relationship(
  id: RelationshipId,
  operation: DependencyRelationshipV1["operation"],
  name = "Relationship",
): DependencyRelationshipV1 {
  return {
    id,
    name,
    operation,
    target: { kind: "derived", property: name.toLowerCase() },
  };
}

describe("dependency relationships", () => {
  it("round-trips the generic persisted envelope", () => {
    const ids = new DeterministicIdFactory(190_000);
    const definition = relationship(ids.relationshipId(), {
      kind: "bind",
      input: { kind: "external", key: "body.position" },
    });
    const envelope = createDependencyRelationshipEnvelope(definition);
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(parseDependencyRelationshipEnvelope(envelope.value)).toEqual({
      ok: true,
      value: definition,
    });
    expect(Object.isFrozen(envelope.value.configuration)).toBe(true);
  });

  it("evaluates bind, offset, attach/follow and derived vector operations", () => {
    const ids = new DeterministicIdFactory(190_010);
    const bind = ids.relationshipId();
    const offset = ids.relationshipId();
    const follow = ids.relationshipId();
    const magnitude = ids.relationshipId();
    const definitions = [
      relationship(bind, {
        kind: "bind",
        input: { kind: "external", key: "position" },
      }),
      relationship(offset, {
        kind: "offset",
        input: { kind: "relationship", relationshipId: bind },
        offset: { kind: "vec2", x: 1, y: -2, unit: "m" },
      }),
      relationship(follow, {
        kind: "follow",
        position: { kind: "relationship", relationshipId: offset },
        offset: { kind: "vec2", x: 0.5, y: 0.5, unit: "m" },
      }),
      relationship(magnitude, {
        kind: "derive",
        operator: "magnitude",
        inputs: [{ kind: "relationship", relationshipId: follow }],
      }),
    ];
    const plan = compileRelationshipPlan(definitions);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const result = evaluateRelationshipPlan(plan.value, (key) =>
      key === "position" ? { kind: "vec2", x: 3, y: 4, unit: "m" } : undefined,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.values.get(follow)).toEqual({
      kind: "vec2",
      x: 4.5,
      y: 2.5,
      unit: "m",
    });
    expect(result.value.values.get(magnitude)).toMatchObject({
      kind: "scalar",
      value: Math.hypot(4.5, 2.5),
      unit: "m",
    });
  });

  it("resolves piecewise tangent and normal directions", () => {
    const ids = new DeterministicIdFactory(190_030);
    const tangent = ids.relationshipId();
    const normal = ids.relationshipId();
    const curve: RelationshipValue = {
      kind: "curve2",
      samples: [
        { parameter: 0, point: { x: 0, y: 0 } },
        { parameter: 1, point: { x: 1, y: 1 } },
        { parameter: 2, point: { x: 2, y: 4 } },
      ],
    };
    const plan = compileRelationshipPlan([
      relationship(tangent, {
        kind: "tangent",
        curve: { kind: "external", key: "curve" },
        parameter: { kind: "external", key: "parameter" },
      }),
      relationship(normal, {
        kind: "normal",
        curve: { kind: "external", key: "curve" },
        parameter: { kind: "external", key: "parameter" },
      }),
    ]);
    if (!plan.ok) throw new Error(plan.error.message);
    const result = evaluateRelationshipPlan(plan.value, (key) =>
      key === "curve" ? curve : { kind: "scalar", value: 1 },
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.values.get(tangent)).toMatchObject({
      kind: "vec2",
      x: 1 / Math.sqrt(5),
      y: 2 / Math.sqrt(5),
    });
    expect(result.value.values.get(normal)).toMatchObject({
      kind: "vec2",
      x: -2 / Math.sqrt(5),
      y: 1 / Math.sqrt(5),
    });
  });

  it("rejects missing references and cycles, and recomputes only dirty branches", () => {
    const ids = new DeterministicIdFactory(190_050);
    const left = ids.relationshipId();
    const child = ids.relationshipId();
    const independent = ids.relationshipId();
    const missing = ids.relationshipId();
    expect(
      compileRelationshipPlan([
        relationship(left, {
          kind: "bind",
          input: { kind: "relationship", relationshipId: missing },
        }),
      ]),
    ).toMatchObject({ ok: false, error: { code: "missing-input" } });
    expect(
      compileRelationshipPlan([
        relationship(left, {
          kind: "bind",
          input: { kind: "relationship", relationshipId: child },
        }),
        relationship(child, {
          kind: "bind",
          input: { kind: "relationship", relationshipId: left },
        }),
      ]),
    ).toMatchObject({ ok: false, error: { code: "relationship-cycle" } });

    const plan = compileRelationshipPlan([
      relationship(left, {
        kind: "bind",
        input: { kind: "external", key: "left" },
      }),
      relationship(child, {
        kind: "offset",
        input: { kind: "relationship", relationshipId: left },
        offset: { kind: "scalar", value: 1 },
      }),
      relationship(independent, {
        kind: "bind",
        input: { kind: "external", key: "right" },
      }),
    ]);
    if (!plan.ok) throw new Error(plan.error.message);
    const source = new Map<string, RelationshipValue>([
      ["left", { kind: "scalar", value: 1 }],
      ["right", { kind: "scalar", value: 9 }],
    ]);
    const store = new RelationshipStateStore();
    const first = evaluateRelationshipPlan(
      plan.value,
      (key) => source.get(key),
      store,
    );
    expect(first.ok && first.value.recomputedIds).toEqual([
      left,
      child,
      independent,
    ]);
    source.set("left", { kind: "scalar", value: 2 });
    const second = evaluateRelationshipPlan(
      plan.value,
      (key) => source.get(key),
      store,
    );
    expect(second.ok && second.value.recomputedIds).toEqual([left, child]);
  });

  it("resolves mathematical vector observables without changing their magnitude", () => {
    const ids = new DeterministicIdFactory(190_080);
    const originId = ids.relationshipId();
    const vectorId = ids.relationshipId();
    const definition = {
      id: ids.representationId(),
      originRelationshipId: originId,
      vectorRelationshipId: vectorId,
      worldScale: 2,
      label: "Velocity",
      unit: "m/s",
      style: { color: "#38bdf8", lineWidth: 2, headSize: 8 },
    };
    expect(createPhysicsVectorRepresentation(definition).ok).toBe(true);
    const values = new Map<RelationshipId, RelationshipValue>([
      [originId, { kind: "vec2", x: 1, y: 2, unit: "m" }],
      [vectorId, { kind: "vec2", x: 3, y: 4, unit: "m/s" }],
    ]);
    const plan = resolvePhysicsVector(definition, (id) => values.get(id));
    expect(plan).toMatchObject({
      ok: true,
      value: {
        head: { x: 7, y: 10 },
        mathematicalVector: { x: 3, y: 4 },
        magnitude: 5,
        direction: { x: 0.6, y: 0.8 },
      },
    });
    expect(values.get(vectorId)).toEqual({
      kind: "vec2",
      x: 3,
      y: 4,
      unit: "m/s",
    });
  });

  it("rejects any attempted authoritative physical target", () => {
    const ids = new DeterministicIdFactory(190_070);
    const unsafe = {
      ...relationship(ids.relationshipId(), {
        kind: "bind",
        input: { kind: "external", key: "position" },
      }),
      target: { kind: "physical", property: "body.position" },
    } as unknown as DependencyRelationshipV1;
    expect(compileRelationshipPlan([unsafe])).toMatchObject({
      ok: false,
      error: { code: "forbidden-authority" },
    });
  });

  it("registers the runtime task in the relationship phase", () => {
    const plan = compileRelationshipPlan([]);
    if (!plan.ok) throw new Error(plan.error.message);
    const task = createRelationshipTask({
      key: "test",
      plan: plan.value,
      store: new RelationshipStateStore(),
      readExternal: () => undefined,
    });
    expect(task.phaseId).toBe(SCHEDULER_PHASES.relationships);
  });
});
