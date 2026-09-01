import { DeterministicIdFactory } from "@physica/core-model";
import {
  compileRelationshipPlan,
  evaluateRelationshipPlan,
  type DependencyRelationshipV1,
  type RelationshipValue,
} from "@physica/relationships";

export function runTangentFollower() {
  const ids = new DeterministicIdFactory(2_300_000);
  const followerId = ids.relationshipId();
  const tangentId = ids.relationshipId();
  const normalId = ids.relationshipId();
  const base = {
    target: { kind: "representation", property: "transform" },
  } as const;
  const definitions: readonly DependencyRelationshipV1[] = [
    {
      ...base,
      id: followerId,
      name: "Curve follower",
      operation: {
        kind: "follow",
        position: { kind: "external", key: "curve-point" },
        offset: { kind: "vec2", x: 0, y: 0.25, unit: "m" },
      },
    },
    {
      ...base,
      id: tangentId,
      name: "Tangent",
      operation: {
        kind: "tangent",
        curve: { kind: "external", key: "curve" },
        parameter: { kind: "external", key: "parameter" },
      },
    },
    {
      ...base,
      id: normalId,
      name: "Normal",
      operation: {
        kind: "normal",
        curve: { kind: "external", key: "curve" },
        parameter: { kind: "external", key: "parameter" },
      },
    },
  ];
  const plan = compileRelationshipPlan(definitions);
  if (!plan.ok) throw new Error(plan.error.message);
  const source = new Map<string, RelationshipValue>([
    ["curve-point", { kind: "vec2", x: 1, y: 1, unit: "m" }],
    ["parameter", { kind: "scalar", value: 1, unit: "s" }],
    [
      "curve",
      {
        kind: "curve2",
        samples: [
          { parameter: 0, point: { x: 0, y: 0 } },
          { parameter: 1, point: { x: 1, y: 1 } },
          { parameter: 2, point: { x: 2, y: 4 } },
        ],
        parameterUnit: "s",
        pointUnit: "m",
      },
    ],
  ]);
  const result = evaluateRelationshipPlan(plan.value, (key) => source.get(key));
  if (!result.ok) throw new Error(result.error.message);
  return {
    id: "tangent-follower",
    follower: result.value.values.get(followerId),
    tangent: result.value.values.get(tangentId),
    normal: result.value.values.get(normalId),
    recomputedCount: result.value.recomputedIds.length,
    authority: "derived-only",
  };
}
