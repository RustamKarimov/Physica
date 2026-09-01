import {
  DeterministicIdFactory,
  type RelationshipId,
} from "@physica/core-model";
import {
  createPhysicsVectorRepresentation,
  resolvePhysicsVector,
  type RelationshipValue,
} from "@physica/relationships";

export function runVelocityVector() {
  const ids = new DeterministicIdFactory(2_310_000);
  const originId = ids.relationshipId();
  const vectorId = ids.relationshipId();
  const definition = {
    id: ids.representationId(),
    originRelationshipId: originId,
    vectorRelationshipId: vectorId,
    worldScale: 0.5,
    label: "Velocity",
    unit: "m/s",
    style: { color: "#38d6c8", lineWidth: 3, headSize: 10 },
  };
  const envelope = createPhysicsVectorRepresentation(definition);
  if (!envelope.ok) throw new Error(envelope.error.message);
  const values = new Map<RelationshipId, RelationshipValue>([
    [originId, { kind: "vec2", x: 2, y: 1, unit: "m" }],
    [vectorId, { kind: "vec2", x: 3, y: 4, unit: "m/s" }],
  ]);
  const plan = resolvePhysicsVector(definition, (id) => values.get(id));
  if (!plan.ok) throw new Error(plan.error.message);
  return {
    id: "velocity-vector",
    tail: plan.value.tail,
    head: plan.value.head,
    vector: plan.value.mathematicalVector,
    magnitude: plan.value.magnitude,
    direction: plan.value.direction,
    unit: plan.value.unit,
    representationTypeId: envelope.value.representationTypeId,
  };
}
