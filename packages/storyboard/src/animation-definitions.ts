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

function finiteValue(value: AnimationValue): boolean {
  return value.kind === "scalar"
    ? Number.isFinite(value.value)
    : [value.x, value.y, value.z].every(Number.isFinite);
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
  if (
    definition.target.kind !== "representation" ||
    !definition.target.sceneId ||
    !definition.target.id
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
    !definition.name.trim() ||
    definition.clockKey !== "presentation" ||
    !isJsonValue(definition)
  )
    return {
      ok: false,
      error: animationError(
        "invalid-definition",
        "invalid-animation-definition",
        "Animation definitions must be named, presentation-clock and JSON-safe.",
      ),
    };
  return { ok: true, value: definition };
}

export function createAnimationEnvelope(
  definition: AnimationDefinition,
  enabled = true,
): AnimationResult<StoryboardStepEnvelope> {
  const validation = validateAnimationDefinition(definition);
  if (!validation.ok) return validation;
  const { id, ...configuration } = definition;
  return {
    ok: true,
    value: Object.freeze({
      id,
      typeId: ANIMATION_STEP_TYPE_ID,
      schemaVersion: 1,
      configuration: configuration as unknown as JsonObject,
      enabled,
    }),
  };
}

export function parseAnimationEnvelope(
  envelope: StoryboardStepEnvelope,
): AnimationResult<AnimationDefinition> {
  if (
    envelope.typeId !== ANIMATION_STEP_TYPE_ID ||
    envelope.schemaVersion !== 1
  )
    return {
      ok: false,
      error: animationError(
        "invalid-definition",
        "unsupported-animation-envelope",
        "The Storyboard step is not a supported V1 animation.",
      ),
    };
  const definition = {
    id: envelope.id,
    ...envelope.configuration,
  } as unknown as AnimationDefinition;
  const validation = validateAnimationDefinition(definition);
  return validation.ok
    ? { ok: true, value: Object.freeze(definition) }
    : validation;
}
