import {
  parseRegisteredTypeId,
  parseUuid,
  registeredTypeId,
  type EquationDefinition,
  type EquationId,
  type JsonObject,
  type JsonValue,
} from "@physica/core-model";
import { asRecord, checkedJsonObject, cloneJson, freezeDeep } from "./internal";
import {
  EQUATION_MODEL_SCHEMA_VERSION,
  EQUATION_MODEL_TYPE_ID,
  parseEquationDefinition,
  toEquationDefinition,
} from "./persistence";
import { validateEquationTransform } from "./transform";
import type {
  EquationEquivalenceStatus,
  EquationMatchConfidence,
  EquationMatchMethod,
  EquationResult,
  EquationTokenCorrespondence,
  EquationTransformV1,
  EquationVerificationMethod,
  SemanticEquationNodeId,
} from "./types";

export const EQUATION_TRANSFORM_TYPE_ID = registeredTypeId(
  "physica:equation/transform-v1",
);
export const EQUATION_TRANSFORM_SCHEMA_VERSION = 1;

function invalid(path: string, message: string): EquationResult<never> {
  return {
    ok: false,
    error: { kind: "invalid-equation-transform", path, message },
  };
}

function definitionToJson(definition: EquationDefinition): JsonObject {
  return {
    id: definition.id,
    typeId: definition.typeId,
    schemaVersion: definition.schemaVersion,
    configuration: cloneJson(definition.configuration),
    enabled: definition.enabled,
  };
}

function parseEmbeddedDefinition(
  value: unknown,
  path: string,
): EquationResult<EquationDefinition> {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.typeId !== "string" ||
    typeof record.schemaVersion !== "number" ||
    typeof record.enabled !== "boolean"
  ) {
    return invalid(path, "Embedded equation definition header is malformed.");
  }
  const id = parseUuid<EquationId>(record.id);
  if (!id.ok) return invalid(path + ".id", "Equation ID must be UUID-v4.");
  const typeId = parseRegisteredTypeId(record.typeId);
  if (!typeId.ok) {
    return invalid(path + ".typeId", "Registered equation type ID is invalid.");
  }
  const configuration = checkedJsonObject(record.configuration, {
    kind: "invalid-equation-transform",
    path: path + ".configuration",
    message: "Embedded equation configuration must be a JSON object.",
  });
  if (!configuration.ok) return configuration;
  return {
    ok: true,
    value: {
      id: id.value,
      typeId: typeId.value,
      schemaVersion: record.schemaVersion,
      configuration: configuration.value,
      enabled: record.enabled,
    },
  };
}

function parseVerificationMethod(
  value: unknown,
): EquationResult<EquationVerificationMethod> {
  const record = asRecord(value);
  if (!record || typeof record.kind !== "string") {
    return invalid(
      "$.configuration.verificationMethod",
      "Method is malformed.",
    );
  }
  if (record.kind === "teacher-declaration") {
    return typeof record.statement === "string"
      ? { ok: true, value: { kind: record.kind, statement: record.statement } }
      : invalid(
          "$.configuration.verificationMethod.statement",
          "Teacher statement must be text.",
        );
  }
  if (record.kind === "presentation-only") {
    return typeof record.reason === "string"
      ? { ok: true, value: { kind: record.kind, reason: record.reason } }
      : invalid(
          "$.configuration.verificationMethod.reason",
          "Presentation-only reason must be text.",
        );
  }
  const engine = asRecord(record.engine);
  if (
    !engine ||
    engine.id !== "cortex-js/compute-engine" ||
    engine.version !== "0.120.0" ||
    (record.outcome !== "verified" && record.outcome !== "not-established")
  ) {
    return invalid(
      "$.configuration.verificationMethod",
      "Compute Engine verification stamp/outcome is malformed.",
    );
  }
  if (record.kind === "compute-engine") {
    if (
      record.operation !== "expression-equality" &&
      record.operation !== "residual-equality"
    ) {
      return invalid(
        "$.configuration.verificationMethod.operation",
        "Automatic verification operation is unsupported.",
      );
    }
    return {
      ok: true,
      value: {
        kind: record.kind,
        operation: record.operation,
        outcome: record.outcome,
        engine: { id: engine.id, version: engine.version },
      },
    };
  }
  if (record.kind === "compute-engine-substitution") {
    const substitutions = checkedJsonObject(record.substitutions, {
      kind: "invalid-substitution",
      path: "$.configuration.verificationMethod.substitutions",
      message: "Stored substitutions must be a JSON object.",
    });
    if (!substitutions.ok) return substitutions;
    return {
      ok: true,
      value: {
        kind: record.kind,
        substitutions: substitutions.value,
        outcome: record.outcome,
        engine: { id: engine.id, version: engine.version },
      },
    };
  }
  return invalid(
    "$.configuration.verificationMethod.kind",
    "Verification method kind is unsupported.",
  );
}

export function toEquationTransformDefinition(
  transform: EquationTransformV1,
  enabled = true,
): EquationResult<EquationDefinition> {
  const valid = validateEquationTransform(transform);
  if (!valid.ok) return valid;
  const source = toEquationDefinition(transform.sourceExpression);
  if (!source.ok) return source;
  const target = toEquationDefinition(transform.targetExpression);
  if (!target.ok) return target;
  return {
    ok: true,
    value: freezeDeep({
      id: transform.id,
      typeId: EQUATION_TRANSFORM_TYPE_ID,
      schemaVersion: EQUATION_TRANSFORM_SCHEMA_VERSION,
      configuration: {
        name: transform.name,
        sourceExpression: definitionToJson(source.value),
        targetExpression: definitionToJson(target.value),
        tokenCorrespondence: transform.tokenCorrespondence.map((item) => ({
          sourceNodeId: item.sourceNodeId,
          targetNodeId: item.targetNodeId,
          method: item.method,
          confidence: item.confidence,
        })),
        equivalenceStatus: transform.equivalenceStatus,
        verificationMethod: cloneJson(
          transform.verificationMethod as unknown as JsonValue,
        ),
        verificationExplanation: transform.verificationExplanation,
        ...(transform.metadata
          ? { metadata: cloneJson(transform.metadata) }
          : {}),
      },
      enabled,
    }),
  };
}

export function parseEquationTransformDefinition(
  definition: EquationDefinition,
): EquationResult<EquationTransformV1> {
  if (
    definition.typeId !== EQUATION_TRANSFORM_TYPE_ID ||
    definition.schemaVersion !== EQUATION_TRANSFORM_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: {
        kind: "unsupported-equation-transform-envelope",
        typeId: definition.typeId,
        schemaVersion: definition.schemaVersion,
      },
    };
  }
  const configuration = asRecord(definition.configuration);
  if (!configuration || typeof configuration.name !== "string") {
    return invalid("$.configuration", "Transform configuration is malformed.");
  }
  const sourceDefinition = parseEmbeddedDefinition(
    configuration.sourceExpression,
    "$.configuration.sourceExpression",
  );
  if (!sourceDefinition.ok) return sourceDefinition;
  const targetDefinition = parseEmbeddedDefinition(
    configuration.targetExpression,
    "$.configuration.targetExpression",
  );
  if (!targetDefinition.ok) return targetDefinition;
  if (
    sourceDefinition.value.typeId !== EQUATION_MODEL_TYPE_ID ||
    sourceDefinition.value.schemaVersion !== EQUATION_MODEL_SCHEMA_VERSION ||
    targetDefinition.value.typeId !== EQUATION_MODEL_TYPE_ID ||
    targetDefinition.value.schemaVersion !== EQUATION_MODEL_SCHEMA_VERSION
  ) {
    return invalid(
      "$.configuration",
      "Transform source and target must be V1 semantic equation models.",
    );
  }
  const source = parseEquationDefinition(sourceDefinition.value);
  if (!source.ok) return source;
  const target = parseEquationDefinition(targetDefinition.value);
  if (!target.ok) return target;
  if (!Array.isArray(configuration.tokenCorrespondence)) {
    return invalid(
      "$.configuration.tokenCorrespondence",
      "Token correspondence must be an array.",
    );
  }
  const methods = new Set<EquationMatchMethod>([
    "teacher-override",
    "persistent-id",
    "symbolic-identity",
    "structural-identity",
    "canonical-expression",
    "glyph-fallback",
  ]);
  const confidences = new Set<EquationMatchConfidence>([
    "author",
    "high",
    "medium",
    "low",
  ]);
  const correspondence: EquationTokenCorrespondence[] = [];
  for (
    let index = 0;
    index < configuration.tokenCorrespondence.length;
    index += 1
  ) {
    const record = asRecord(configuration.tokenCorrespondence[index]);
    if (
      !record ||
      typeof record.sourceNodeId !== "string" ||
      typeof record.targetNodeId !== "string" ||
      typeof record.method !== "string" ||
      typeof record.confidence !== "string" ||
      !methods.has(record.method as EquationMatchMethod) ||
      !confidences.has(record.confidence as EquationMatchConfidence)
    ) {
      return invalid(
        "$.configuration.tokenCorrespondence[" + index + "]",
        "Stored correspondence is malformed.",
      );
    }
    correspondence.push({
      sourceNodeId: record.sourceNodeId as SemanticEquationNodeId,
      targetNodeId: record.targetNodeId as SemanticEquationNodeId,
      method: record.method as EquationMatchMethod,
      confidence: record.confidence as EquationMatchConfidence,
    });
  }
  const statuses = new Set<EquationEquivalenceStatus>([
    "VERIFIED_EQUIVALENT",
    "VERIFIED_SUBSTITUTION",
    "TEACHER_DECLARED",
    "UNVERIFIED_PRESENTATION",
  ]);
  if (
    typeof configuration.equivalenceStatus !== "string" ||
    !statuses.has(
      configuration.equivalenceStatus as EquationEquivalenceStatus,
    ) ||
    typeof configuration.verificationExplanation !== "string"
  ) {
    return invalid(
      "$.configuration.equivalenceStatus",
      "Stored verification result is malformed.",
    );
  }
  const method = parseVerificationMethod(configuration.verificationMethod);
  if (!method.ok) return method;
  let metadata: JsonObject | undefined;
  if (configuration.metadata !== undefined) {
    const checked = checkedJsonObject(configuration.metadata, {
      kind: "invalid-equation-transform",
      path: "$.configuration.metadata",
      message: "Transform metadata must be a JSON object.",
    });
    if (!checked.ok) return checked;
    metadata = checked.value;
  }
  const transform: EquationTransformV1 = {
    id: definition.id,
    name: configuration.name,
    sourceExpression: source.value,
    targetExpression: target.value,
    tokenCorrespondence: correspondence,
    equivalenceStatus:
      configuration.equivalenceStatus as EquationEquivalenceStatus,
    verificationMethod: method.value,
    verificationExplanation: configuration.verificationExplanation,
    ...(metadata ? { metadata } : {}),
  };
  const valid = validateEquationTransform(transform);
  return valid.ok ? { ok: true, value: freezeDeep(transform) } : valid;
}
