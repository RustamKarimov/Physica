import {
  registeredTypeId,
  type JsonObject,
  type RelationshipId,
  type RepresentationDefinition,
  type RepresentationId,
} from "@physica/core-model";
import {
  addVec2,
  magnitudeVec2,
  normalizeVec2,
  scaleVec2,
} from "@physica/mathematics";
import { deepFreezeRelationship } from "./relationship-definitions";
import type {
  RelationshipResult,
  RelationshipValue,
} from "./relationship-types";

export const PHYSICS_VECTOR_REPRESENTATION_TYPE_ID = registeredTypeId(
  "physica:representation/physics-vector-v1",
);

export interface PhysicsVectorStyle {
  readonly color: string;
  readonly lineWidth: number;
  readonly headSize: number;
}

export interface PhysicsVectorDefinitionV1 {
  readonly id: RepresentationId;
  readonly originRelationshipId: RelationshipId;
  readonly vectorRelationshipId: RelationshipId;
  readonly worldScale: number;
  readonly label: string;
  readonly unit?: string;
  readonly style: PhysicsVectorStyle;
}

export interface PhysicsVectorPlan {
  readonly tail: { readonly x: number; readonly y: number };
  readonly head: { readonly x: number; readonly y: number };
  readonly mathematicalVector: { readonly x: number; readonly y: number };
  readonly displayDisplacement: { readonly x: number; readonly y: number };
  readonly magnitude: number;
  readonly direction?: { readonly x: number; readonly y: number };
  readonly label: string;
  readonly unit?: string;
  readonly style: PhysicsVectorStyle;
  readonly accessibleSummary: string;
}

function invalid(message: string): RelationshipResult<never> {
  return {
    ok: false,
    error: { code: "invalid-definition", message },
  };
}

export function createPhysicsVectorRepresentation(
  definition: PhysicsVectorDefinitionV1,
): RelationshipResult<RepresentationDefinition> {
  if (
    !Number.isFinite(definition.worldScale) ||
    definition.worldScale < 0 ||
    !definition.label.trim() ||
    !definition.style.color.trim() ||
    !Number.isFinite(definition.style.lineWidth) ||
    definition.style.lineWidth <= 0 ||
    !Number.isFinite(definition.style.headSize) ||
    definition.style.headSize <= 0
  )
    return invalid("Physics vector representation configuration is invalid.");
  return {
    ok: true,
    value: deepFreezeRelationship({
      id: definition.id,
      representationTypeId: PHYSICS_VECTOR_REPRESENTATION_TYPE_ID,
      representationSchemaVersion: 1,
      sourceBindings: [],
      configuration: definition as unknown as JsonObject,
      layout: {},
      visual: {},
      relationshipRefs: [
        definition.originRelationshipId,
        definition.vectorRelationshipId,
      ],
      enabled: true,
    }),
  };
}

export function parsePhysicsVectorRepresentation(
  envelope: RepresentationDefinition,
): RelationshipResult<PhysicsVectorDefinitionV1> {
  if (
    envelope.representationTypeId !== PHYSICS_VECTOR_REPRESENTATION_TYPE_ID ||
    envelope.representationSchemaVersion !== 1
  )
    return invalid("Unsupported physics vector representation envelope.");
  const definition =
    envelope.configuration as unknown as PhysicsVectorDefinitionV1;
  const recreated = createPhysicsVectorRepresentation(definition);
  if (!recreated.ok) return recreated;
  if (definition.id !== envelope.id)
    return invalid("Physics vector IDs differ.");
  return { ok: true, value: deepFreezeRelationship(definition) };
}

export function resolvePhysicsVector(
  definition: PhysicsVectorDefinitionV1,
  read: (id: RelationshipId) => RelationshipValue | undefined,
): RelationshipResult<PhysicsVectorPlan> {
  const origin = read(definition.originRelationshipId);
  const vector = read(definition.vectorRelationshipId);
  if (origin?.kind !== "vec2" || vector?.kind !== "vec2")
    return {
      ok: false,
      error: {
        code: "type-mismatch",
        message:
          "Physics vectors require vec2 origin and vector relationships.",
      },
    };
  const magnitude = magnitudeVec2(vector);
  const displayDisplacement = scaleVec2(vector, definition.worldScale);
  const head = addVec2(origin, displayDisplacement);
  const normalized = normalizeVec2(vector);
  const unit = definition.unit ?? vector.unit;
  return {
    ok: true,
    value: deepFreezeRelationship({
      tail: { x: origin.x, y: origin.y },
      head,
      mathematicalVector: { x: vector.x, y: vector.y },
      displayDisplacement,
      magnitude,
      ...(normalized.ok ? { direction: normalized.value } : {}),
      label: definition.label,
      ...(unit === undefined ? {} : { unit }),
      style: definition.style,
      accessibleSummary:
        definition.label +
        ": (" +
        vector.x +
        ", " +
        vector.y +
        ")" +
        (unit === undefined ? "" : " " + unit) +
        "; magnitude " +
        magnitude,
    }),
  };
}
