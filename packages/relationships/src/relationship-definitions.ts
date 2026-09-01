import {
  isJsonValue,
  registeredTypeId,
  type JsonObject,
  type RelationshipDefinition,
} from "@physica/core-model";
import type {
  DependencyRelationshipV1,
  RelationshipError,
  RelationshipInput,
  RelationshipOperation,
  RelationshipResult,
  RelationshipValue,
} from "./relationship-types";

export const DEPENDENCY_RELATIONSHIP_TYPE_ID = registeredTypeId(
  "physica:relationship/dependency-v1",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function deepFreezeRelationship<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(
      value.map((entry) => deepFreezeRelationship(entry)),
    ) as T;
  if (isRecord(value))
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          deepFreezeRelationship(entry),
        ]),
      ),
    ) as T;
  return value;
}

function failure(
  code: RelationshipError["code"],
  message: string,
): RelationshipResult<never> {
  return { ok: false, error: { code, message } };
}

function validInput(input: unknown): input is RelationshipInput {
  return (
    isRecord(input) &&
    ((input.kind === "external" &&
      typeof input.key === "string" &&
      input.key.trim().length > 0) ||
      (input.kind === "relationship" &&
        typeof input.relationshipId === "string" &&
        input.relationshipId.length > 0))
  );
}

export function isRelationshipValue(
  value: unknown,
): value is RelationshipValue {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "scalar")
    return (
      typeof value.value === "number" &&
      Number.isFinite(value.value) &&
      (value.unit === undefined || typeof value.unit === "string")
    );
  if (value.kind === "boolean") return typeof value.value === "boolean";
  if (value.kind === "text") return typeof value.value === "string";
  if (value.kind === "vec2" || value.kind === "vec3") {
    const coordinates =
      value.kind === "vec2" ? [value.x, value.y] : [value.x, value.y, value.z];
    return (
      coordinates.every(
        (entry) => typeof entry === "number" && Number.isFinite(entry),
      ) &&
      (value.unit === undefined || typeof value.unit === "string")
    );
  }
  if (value.kind !== "curve2" || !Array.isArray(value.samples)) return false;
  let previous = Number.NEGATIVE_INFINITY;
  for (const sample of value.samples) {
    if (
      !isRecord(sample) ||
      typeof sample.parameter !== "number" ||
      !Number.isFinite(sample.parameter) ||
      sample.parameter <= previous ||
      !isRecord(sample.point) ||
      typeof sample.point.x !== "number" ||
      typeof sample.point.y !== "number" ||
      !Number.isFinite(sample.point.x) ||
      !Number.isFinite(sample.point.y)
    )
      return false;
    previous = sample.parameter;
  }
  return (
    value.samples.length >= 2 &&
    (value.parameterUnit === undefined ||
      typeof value.parameterUnit === "string") &&
    (value.pointUnit === undefined || typeof value.pointUnit === "string")
  );
}

function validOperation(
  operation: unknown,
): operation is RelationshipOperation {
  if (!isRecord(operation) || typeof operation.kind !== "string") return false;
  if (operation.kind === "bind") return validInput(operation.input);
  if (operation.kind === "offset")
    return validInput(operation.input) && isRelationshipValue(operation.offset);
  if (operation.kind === "attach" || operation.kind === "follow")
    return (
      validInput(operation.position) &&
      (operation.offset === undefined ||
        (isRelationshipValue(operation.offset) &&
          (operation.offset.kind === "vec2" ||
            operation.offset.kind === "vec3")))
    );
  if (operation.kind === "tangent" || operation.kind === "normal")
    return validInput(operation.curve) && validInput(operation.parameter);
  if (operation.kind !== "derive" || !Array.isArray(operation.inputs))
    return false;
  return (
    [
      "add",
      "subtract",
      "scale",
      "magnitude",
      "component-x",
      "component-y",
      "component-z",
    ].includes(String(operation.operator)) && operation.inputs.every(validInput)
  );
}

export function validateDependencyRelationship(
  definition: DependencyRelationshipV1,
): RelationshipResult<DependencyRelationshipV1> {
  const candidate = definition as unknown;
  if (
    isRecord(candidate) &&
    isRecord(candidate.target) &&
    candidate.target.kind === "physical"
  )
    return failure(
      "forbidden-authority",
      "Relationships cannot target authoritative physical state.",
    );
  if (
    !isRecord(definition) ||
    typeof definition.id !== "string" ||
    typeof definition.name !== "string" ||
    !definition.name.trim() ||
    !validOperation(definition.operation) ||
    !isRecord(definition.target) ||
    !["derived", "representation", "presentation", "layout"].includes(
      String(definition.target.kind),
    ) ||
    typeof definition.target.property !== "string" ||
    !definition.target.property.trim() ||
    !isJsonValue(definition)
  )
    return failure(
      "invalid-definition",
      "Dependency relationship definition is malformed.",
    );
  return { ok: true, value: deepFreezeRelationship(definition) };
}

export function createDependencyRelationshipEnvelope(
  definition: DependencyRelationshipV1,
): RelationshipResult<RelationshipDefinition> {
  const valid = validateDependencyRelationship(definition);
  if (!valid.ok) return valid;
  return {
    ok: true,
    value: deepFreezeRelationship({
      id: valid.value.id,
      typeId: DEPENDENCY_RELATIONSHIP_TYPE_ID,
      schemaVersion: 1,
      configuration: valid.value as unknown as JsonObject,
      enabled: true,
    }),
  };
}

export function parseDependencyRelationshipEnvelope(
  envelope: RelationshipDefinition,
): RelationshipResult<DependencyRelationshipV1> {
  if (
    envelope.typeId !== DEPENDENCY_RELATIONSHIP_TYPE_ID ||
    envelope.schemaVersion !== 1 ||
    envelope.enabled !== true
  )
    return failure(
      "invalid-envelope",
      "Unsupported dependency relationship envelope.",
    );
  const definition =
    envelope.configuration as unknown as DependencyRelationshipV1;
  if (definition.id !== envelope.id)
    return failure(
      "invalid-envelope",
      "Relationship envelope and configuration IDs differ.",
    );
  return validateDependencyRelationship(definition);
}
