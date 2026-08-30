import {
  isJsonValue,
  registeredTypeId,
  type JsonObject,
  type StoryboardStepEnvelope,
} from "@physica/core-model";
import { validateEasing } from "./animation-easing";
import { morphError, type MorphResult } from "./morph-errors";
import type {
  MorphDefinition,
  MorphOperation,
  MorphTarget,
} from "./morph-types";

export const MORPH_STEP_TYPE_ID = registeredTypeId(
  "physica:storyboard/morph-v1",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function freezeMorph<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((entry) => freezeMorph(entry))) as T;
  if (isRecord(value))
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, freezeMorph(entry)]),
      ),
    ) as T;
  return value;
}

function validTarget(value: unknown): value is MorphTarget {
  return (
    isRecord(value) &&
    value.kind === "representation" &&
    typeof value.sceneId === "string" &&
    value.sceneId.length > 0 &&
    typeof value.id === "string" &&
    value.id.length > 0
  );
}

function validOperation(value: unknown): value is MorphOperation {
  if (!isRecord(value)) return false;
  if (value.kind === "shape-morph")
    return (
      (value.topology === "open" || value.topology === "closed") &&
      Number.isSafeInteger(value.sampleCount) &&
      Number(value.sampleCount) >= (value.topology === "closed" ? 3 : 2) &&
      Number(value.sampleCount) <= 4096
    );
  if (value.kind === "matched-transform") {
    const sourceKey = value.sourceCompatibilityKey;
    const destinationKey = value.destinationCompatibilityKey;
    const strategy = value.strategy;
    return (
      typeof value.semanticId === "string" &&
      value.semanticId.trim().length > 0 &&
      typeof sourceKey === "string" &&
      sourceKey.trim().length > 0 &&
      typeof destinationKey === "string" &&
      destinationKey.trim().length > 0 &&
      (strategy === "morph" || strategy === "replace") &&
      (strategy !== "morph" || sourceKey === destinationKey)
    );
  }
  return false;
}

export function validateMorphDefinition(
  definition: MorphDefinition,
): MorphResult<MorphDefinition> {
  if (!isRecord(definition))
    return {
      ok: false,
      error: morphError(
        "invalid-definition",
        "invalid-morph-definition",
        "Morph definitions must be JSON objects.",
      ),
    };
  if (!validTarget(definition.source) || !validTarget(definition.destination))
    return {
      ok: false,
      error: morphError(
        "invalid-target",
        "representation-targets-required",
        "Morph transitions require source and destination Representation targets.",
        { path: "source" },
      ),
    };
  if (definition.source.sceneId !== definition.destination.sceneId)
    return {
      ok: false,
      error: morphError(
        "invalid-target",
        "same-scene-targets-required",
        "Morph source and destination must belong to the same Scene.",
        {
          relatedIds: [
            definition.source.sceneId,
            definition.destination.sceneId,
          ],
        },
      ),
    };
  if (definition.clockKey !== "presentation")
    return {
      ok: false,
      error: morphError(
        "presentation-clock-mismatch",
        "presentation-clock-required",
        "Morph transitions must use the presentation clock.",
        { path: "clockKey" },
      ),
    };
  if (
    typeof definition.id !== "string" ||
    definition.id.length === 0 ||
    typeof definition.name !== "string" ||
    definition.name.trim().length === 0 ||
    !Number.isFinite(definition.startTimeSeconds) ||
    !Number.isFinite(definition.durationSeconds) ||
    definition.durationSeconds < 0 ||
    !Number.isSafeInteger(definition.priority) ||
    typeof definition.reversible !== "boolean" ||
    typeof definition.scrubbable !== "boolean" ||
    !isJsonValue(definition)
  )
    return {
      ok: false,
      error: morphError(
        "invalid-definition",
        "invalid-morph-definition",
        "Morph identity, timing, flags and metadata must be finite and JSON-safe.",
      ),
    };
  if (!validOperation(definition.operation))
    return {
      ok: false,
      error: morphError(
        "invalid-operation",
        "invalid-morph-operation",
        "The morph operation is malformed or incompatible with its strategy.",
        { path: "operation" },
      ),
    };
  const easing = validateEasing(definition.easing);
  if (!easing.ok)
    return {
      ok: false,
      error: morphError(
        "invalid-easing",
        easing.error.code,
        easing.error.message,
        easing.error.path === undefined ? {} : { path: easing.error.path },
      ),
    };
  return { ok: true, value: freezeMorph(definition) };
}

export function createMorphEnvelope(
  definition: MorphDefinition,
  enabled = true,
): MorphResult<StoryboardStepEnvelope> {
  if (typeof enabled !== "boolean")
    return {
      ok: false,
      error: morphError(
        "invalid-definition",
        "invalid-envelope-enabled",
        "Morph envelope enabled state must be boolean.",
      ),
    };
  const validated = validateMorphDefinition(definition);
  if (!validated.ok) return validated;
  const { id, ...configuration } = validated.value;
  return {
    ok: true,
    value: freezeMorph({
      id,
      typeId: MORPH_STEP_TYPE_ID,
      schemaVersion: 1,
      configuration: configuration as unknown as JsonObject,
      enabled,
    }),
  };
}

export function parseMorphEnvelope(
  envelope: StoryboardStepEnvelope,
): MorphResult<MorphDefinition> {
  if (
    !isRecord(envelope) ||
    envelope.typeId !== MORPH_STEP_TYPE_ID ||
    envelope.schemaVersion !== 1 ||
    typeof envelope.id !== "string" ||
    !isRecord(envelope.configuration) ||
    typeof envelope.enabled !== "boolean"
  )
    return {
      ok: false,
      error: morphError(
        "invalid-definition",
        "unsupported-morph-envelope",
        "The Storyboard step is not a supported V1 morph.",
      ),
    };
  return validateMorphDefinition({
    id: envelope.id,
    ...envelope.configuration,
  } as unknown as MorphDefinition);
}

export function validateMorphEnvelope(
  envelope: StoryboardStepEnvelope,
): MorphResult<StoryboardStepEnvelope> {
  const parsed = parseMorphEnvelope(envelope);
  return parsed.ok
    ? createMorphEnvelope(parsed.value, envelope.enabled)
    : parsed;
}
