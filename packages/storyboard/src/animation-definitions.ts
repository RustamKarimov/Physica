import {
  isJsonValue,
  registeredTypeId,
  type JsonObject,
  type StoryboardStepEnvelope,
} from "@physica/core-model";
import { animationError, type AnimationResult } from "./animation-errors";
import { validateEasing } from "./animation-easing";
import type {
  AnimationChannel,
  AnimationDefinition,
  AnimationValue,
} from "./animation-types";

export const ANIMATION_STEP_TYPE_ID = registeredTypeId(
  "physica:storyboard/animation-v1",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneAndFreeze<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((entry) => cloneAndFreeze(entry))) as T;
  if (isRecord(value))
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .map(([key, entry]) => [key, cloneAndFreeze(entry)]),
      ),
    ) as T;
  return value;
}

function finiteValue(value: unknown): value is AnimationValue {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "scalar")
    return typeof value.value === "number" && Number.isFinite(value.value);
  return (
    value.kind === "vec3" &&
    [value.x, value.y, value.z].every(
      (entry) => typeof entry === "number" && Number.isFinite(entry),
    )
  );
}

function valueMatches(
  channel: AnimationChannel,
  value: AnimationValue,
): boolean {
  return channel === "presentation.translation" ||
    channel === "presentation.scale"
    ? value.kind === "vec3"
    : value.kind === "scalar";
}

export function validateAnimationDefinition(
  definition: AnimationDefinition,
): AnimationResult<AnimationDefinition> {
  if (!isRecord(definition))
    return {
      ok: false,
      error: animationError(
        "invalid-definition",
        "invalid-animation-definition",
        "Animation definitions must be JSON objects.",
      ),
    };
  const target = definition.target as unknown;
  if (
    !isRecord(target) ||
    target.kind !== "representation" ||
    typeof target.sceneId !== "string" ||
    target.sceneId.length === 0 ||
    typeof target.id !== "string" ||
    target.id.length === 0
  )
    return {
      ok: false,
      error: animationError(
        "invalid-target",
        "representation-target-required",
        "Step 11 animations require a representation target.",
        { path: "target" },
      ),
    };
  if (
    ![
      "presentation.translation",
      "presentation.rotation",
      "presentation.scale",
      "presentation.opacity",
    ].includes(definition.channel)
  )
    return {
      ok: false,
      error: animationError(
        "invalid-channel",
        "unsupported-channel",
        "The presentation channel is unsupported.",
        { path: "channel" },
      ),
    };
  if (definition.clockKey !== "presentation")
    return {
      ok: false,
      error: animationError(
        "presentation-clock-mismatch",
        "presentation-clock-required",
        "Animations must use the mandatory presentation clock.",
        { path: "clockKey" },
      ),
    };
  if (
    !["sequence", "replace", "additive", "multiplicative", "reject"].includes(
      definition.conflictPolicy,
    )
  )
    return {
      ok: false,
      error: animationError(
        "unsupported-conflict-policy",
        "unknown-conflict-policy",
        "The animation conflict policy is unsupported.",
        { path: "conflictPolicy" },
      ),
    };
  if (
    typeof definition.reversible !== "boolean" ||
    typeof definition.scrubbable !== "boolean"
  )
    return {
      ok: false,
      error: animationError(
        "invalid-definition",
        "invalid-playback-capabilities",
        "reversible and scrubbable must be boolean values.",
      ),
    };
  if (
    !Number.isFinite(definition.startTimeSeconds) ||
    !Number.isFinite(definition.durationSeconds) ||
    definition.durationSeconds < 0 ||
    !Number.isSafeInteger(definition.priority)
  )
    return {
      ok: false,
      error: animationError(
        "invalid-time",
        "invalid-animation-timing",
        "Start, duration and priority must be valid finite values.",
        { path: "startTimeSeconds" },
      ),
    };
  if (
    !finiteValue(definition.startValue) ||
    !finiteValue(definition.endValue) ||
    !valueMatches(definition.channel, definition.startValue) ||
    !valueMatches(definition.channel, definition.endValue)
  )
    return {
      ok: false,
      error: animationError(
        "invalid-value",
        "channel-value-mismatch",
        "Animation endpoint values do not match the typed channel.",
        { path: "startValue" },
      ),
    };
  if (
    definition.channel === "presentation.opacity" &&
    ((definition.startValue as { value: number }).value < 0 ||
      (definition.startValue as { value: number }).value > 1 ||
      (definition.endValue as { value: number }).value < 0 ||
      (definition.endValue as { value: number }).value > 1)
  )
    return {
      ok: false,
      error: animationError(
        "invalid-value",
        "opacity-out-of-range",
        "Opacity endpoints must be in [0, 1].",
      ),
    };
  if (
    definition.channel === "presentation.scale" &&
    [definition.startValue, definition.endValue].some(
      (value) =>
        value.kind === "vec3" && [value.x, value.y, value.z].some((v) => v < 0),
    )
  )
    return {
      ok: false,
      error: animationError(
        "invalid-value",
        "negative-scale",
        "Scale endpoints cannot be negative.",
      ),
    };
  const easing = validateEasing(definition.easing);
  if (!easing.ok) return easing;
  if (
    typeof definition.name !== "string" ||
    !definition.name.trim() ||
    !isJsonValue(definition)
  )
    return {
      ok: false,
      error: animationError(
        "invalid-definition",
        "invalid-animation-definition",
        "Animation definitions must be named and JSON-safe.",
      ),
    };
  return { ok: true, value: cloneAndFreeze(definition) };
}

export function createAnimationEnvelope(
  definition: AnimationDefinition,
  enabled = true,
): AnimationResult<StoryboardStepEnvelope> {
  if (typeof enabled !== "boolean")
    return {
      ok: false,
      error: animationError(
        "invalid-definition",
        "invalid-envelope-enabled",
        "Animation envelope enabled state must be boolean.",
        { path: "enabled" },
      ),
    };
  const validation = validateAnimationDefinition(definition);
  if (!validation.ok) return validation;
  const { id, ...configuration } = validation.value;
  return {
    ok: true,
    value: cloneAndFreeze({
      id,
      typeId: ANIMATION_STEP_TYPE_ID,
      schemaVersion: 1,
      configuration: cloneAndFreeze(configuration) as unknown as JsonObject,
      enabled,
    }),
  };
}

export function parseAnimationEnvelope(
  envelope: StoryboardStepEnvelope,
): AnimationResult<AnimationDefinition> {
  if (
    !isRecord(envelope) ||
    envelope.typeId !== ANIMATION_STEP_TYPE_ID ||
    envelope.schemaVersion !== 1 ||
    typeof envelope.id !== "string" ||
    !isRecord(envelope.configuration) ||
    typeof envelope.enabled !== "boolean"
  )
    return {
      ok: false,
      error: animationError(
        "invalid-definition",
        "unsupported-animation-envelope",
        "The Storyboard step is not a well-formed supported V1 animation.",
      ),
    };
  const definition = {
    id: envelope.id,
    ...envelope.configuration,
  } as unknown as AnimationDefinition;
  return validateAnimationDefinition(definition);
}

export function validateAnimationEnvelope(
  envelope: StoryboardStepEnvelope,
): AnimationResult<StoryboardStepEnvelope> {
  const parsed = parseAnimationEnvelope(envelope);
  if (!parsed.ok) return parsed;
  return createAnimationEnvelope(parsed.value, envelope.enabled);
}
