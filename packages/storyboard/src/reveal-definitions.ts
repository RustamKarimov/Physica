import {
  isJsonValue,
  registeredTypeId,
  type JsonObject,
  type StoryboardStepEnvelope,
} from "@physica/core-model";
import { validateEasing } from "./animation-easing";
import { revealError, type RevealResult } from "./reveal-errors";
import type {
  RevealChannel,
  RevealDefinition,
  RevealOperation,
} from "./reveal-types";

export const REVEAL_STEP_TYPE_ID = registeredTypeId(
  "physica:storyboard/reveal-v1",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function freezeReveal<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((entry) => freezeReveal(entry))) as T;
  if (isRecord(value))
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, freezeReveal(entry)]),
      ),
    ) as T;
  return value;
}

function unit(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function validAccent(value: unknown): boolean {
  return (
    value === undefined ||
    (isRecord(value) &&
      [value.red, value.green, value.blue, value.alpha].every(unit))
  );
}

function validOperation(value: unknown): value is RevealOperation {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "draw-path")
    return (
      unit(value.startProgress) &&
      unit(value.endProgress) &&
      (value.direction === "forward" || value.direction === "reverse")
    );
  if (value.kind === "mask")
    return (
      unit(value.startProgress) &&
      unit(value.endProgress) &&
      (value.axis === "horizontal" || value.axis === "vertical") &&
      (value.edge === "start" || value.edge === "end") &&
      typeof value.feather === "number" &&
      Number.isFinite(value.feather) &&
      value.feather >= 0
    );
  if (value.kind === "opacity")
    return unit(value.startOpacity) && unit(value.endOpacity);
  if (value.kind === "write-label")
    return unit(value.startProgress) && unit(value.endProgress);
  if (value.kind === "emphasis")
    return (
      ["highlight", "dim", "isolate"].includes(String(value.mode)) &&
      unit(value.startIntensity) &&
      unit(value.endIntensity) &&
      validAccent(value.accent)
    );
  return false;
}

export function revealChannel(operation: RevealOperation): RevealChannel {
  if (operation.kind === "draw-path") return "path";
  if (operation.kind === "write-label") return "label";
  return operation.kind;
}

export function validateRevealDefinition(
  definition: RevealDefinition,
): RevealResult<RevealDefinition> {
  if (!isRecord(definition))
    return {
      ok: false,
      error: revealError(
        "invalid-definition",
        "invalid-reveal-definition",
        "Reveal definitions must be JSON objects.",
      ),
    };
  const target = definition.target as unknown;
  if (
    !isRecord(target) ||
    target.kind !== "representation" ||
    typeof target.sceneId !== "string" ||
    !target.sceneId ||
    typeof target.id !== "string" ||
    !target.id
  )
    return {
      ok: false,
      error: revealError(
        "invalid-target",
        "representation-target-required",
        "Reveal effects require a representation target.",
        { path: "target" },
      ),
    };
  if (definition.clockKey !== "presentation")
    return {
      ok: false,
      error: revealError(
        "presentation-clock-mismatch",
        "presentation-clock-required",
        "Reveal effects must use the presentation clock.",
        { path: "clockKey" },
      ),
    };
  if (
    typeof definition.name !== "string" ||
    !definition.name.trim() ||
    typeof definition.id !== "string" ||
    !definition.id ||
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
      error: revealError(
        "invalid-definition",
        "invalid-reveal-definition",
        "Reveal identity, timing, flags and metadata must be finite and JSON-safe.",
      ),
    };
  if (!validOperation(definition.operation))
    return {
      ok: false,
      error: revealError(
        "invalid-operation",
        "invalid-reveal-operation",
        "The reveal operation is malformed or outside its valid range.",
        { path: "operation" },
      ),
    };
  const easing = validateEasing(definition.easing);
  if (!easing.ok)
    return {
      ok: false,
      error: revealError(
        "invalid-easing",
        easing.error.code,
        easing.error.message,
        easing.error.path === undefined ? {} : { path: easing.error.path },
      ),
    };
  return { ok: true, value: freezeReveal(definition) };
}

export function createRevealEnvelope(
  definition: RevealDefinition,
  enabled = true,
): RevealResult<StoryboardStepEnvelope> {
  if (typeof enabled !== "boolean")
    return {
      ok: false,
      error: revealError(
        "invalid-definition",
        "invalid-envelope-enabled",
        "Reveal envelope enabled state must be boolean.",
      ),
    };
  const validated = validateRevealDefinition(definition);
  if (!validated.ok) return validated;
  const { id, ...configuration } = validated.value;
  return {
    ok: true,
    value: freezeReveal({
      id,
      typeId: REVEAL_STEP_TYPE_ID,
      schemaVersion: 1,
      configuration: configuration as unknown as JsonObject,
      enabled,
    }),
  };
}

export function parseRevealEnvelope(
  envelope: StoryboardStepEnvelope,
): RevealResult<RevealDefinition> {
  if (
    !isRecord(envelope) ||
    envelope.typeId !== REVEAL_STEP_TYPE_ID ||
    envelope.schemaVersion !== 1 ||
    typeof envelope.id !== "string" ||
    !isRecord(envelope.configuration) ||
    typeof envelope.enabled !== "boolean"
  )
    return {
      ok: false,
      error: revealError(
        "invalid-definition",
        "unsupported-reveal-envelope",
        "The Storyboard step is not a supported V1 reveal.",
      ),
    };
  return validateRevealDefinition({
    id: envelope.id,
    ...envelope.configuration,
  } as unknown as RevealDefinition);
}

export function validateRevealEnvelope(
  envelope: StoryboardStepEnvelope,
): RevealResult<StoryboardStepEnvelope> {
  const parsed = parseRevealEnvelope(envelope);
  return parsed.ok
    ? createRevealEnvelope(parsed.value, envelope.enabled)
    : parsed;
}
