import {
  isJsonValue,
  registeredTypeId,
  type JsonObject,
  type StoryboardStepEnvelope,
} from "@physica/core-model";
import { validateCameraPresentationOperation } from "@physica/renderer-core";
import { validateEasing } from "./animation-easing";
import {
  cameraAnimationError,
  type CameraAnimationResult,
} from "./camera-animation-errors";
import type {
  CameraAnimationDefinition,
  CameraAnimationTarget,
} from "./camera-animation-types";

export const CAMERA_ANIMATION_STEP_TYPE_ID = registeredTypeId(
  "physica:storyboard/camera-v1",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function freezeCameraAnimation<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(
      value.map((entry) => freezeCameraAnimation(entry)),
    ) as T;
  if (isRecord(value))
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, freezeCameraAnimation(entry)]),
      ),
    ) as T;
  return value;
}

function validTarget(value: unknown): value is CameraAnimationTarget {
  return (
    isRecord(value) &&
    value.kind === "scene" &&
    typeof value.sceneId === "string" &&
    value.sceneId.length > 0
  );
}

export function validateCameraAnimationDefinition(
  definition: CameraAnimationDefinition,
): CameraAnimationResult<CameraAnimationDefinition> {
  if (!isRecord(definition))
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-definition",
        "invalid-camera-animation-definition",
        "Camera-animation definitions must be JSON objects.",
      ),
    };
  if (!validTarget(definition.target))
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-target",
        "scene-target-required",
        "Camera animations require a Scene target.",
        { path: "target" },
      ),
    };
  if (definition.clockKey !== "presentation")
    return {
      ok: false,
      error: cameraAnimationError(
        "presentation-clock-mismatch",
        "presentation-clock-required",
        "Camera animations must use the presentation clock.",
        { path: "clockKey" },
      ),
    };
  if (
    !Number.isFinite(definition.startTimeSeconds) ||
    definition.startTimeSeconds < 0 ||
    !Number.isFinite(definition.durationSeconds) ||
    definition.durationSeconds < 0 ||
    !Number.isSafeInteger(definition.priority)
  )
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-time",
        "invalid-camera-animation-timing",
        "Camera animation start, duration and priority must be valid non-negative timing values.",
      ),
    };
  if (
    typeof definition.id !== "string" ||
    definition.id.length === 0 ||
    typeof definition.name !== "string" ||
    definition.name.trim().length === 0 ||
    typeof definition.reversible !== "boolean" ||
    typeof definition.scrubbable !== "boolean" ||
    !isJsonValue(definition)
  )
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-definition",
        "invalid-camera-animation-definition",
        "Camera animation identity, timing, flags and metadata must be finite and JSON-safe.",
      ),
    };
  const operation = validateCameraPresentationOperation(definition.operation);
  if (!operation.ok)
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-operation",
        operation.error.kind,
        "message" in operation.error
          ? operation.error.message
          : "The Camera operation is invalid.",
        { path: "operation" },
      ),
    };
  const easing = validateEasing(definition.easing);
  if (!easing.ok)
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-easing",
        easing.error.code,
        easing.error.message,
        easing.error.path === undefined ? {} : { path: easing.error.path },
      ),
    };
  return {
    ok: true,
    value: freezeCameraAnimation({
      id: definition.id,
      name: definition.name,
      target: definition.target,
      clockKey: definition.clockKey,
      startTimeSeconds: definition.startTimeSeconds,
      durationSeconds: definition.durationSeconds,
      operation: operation.value,
      easing: easing.value,
      priority: definition.priority,
      reversible: definition.reversible,
      scrubbable: definition.scrubbable,
      ...(definition.metadata === undefined
        ? {}
        : { metadata: definition.metadata }),
    } satisfies CameraAnimationDefinition),
  };
}

export function createCameraAnimationEnvelope(
  definition: CameraAnimationDefinition,
  enabled = true,
): CameraAnimationResult<StoryboardStepEnvelope> {
  if (typeof enabled !== "boolean")
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-definition",
        "invalid-envelope-enabled",
        "Camera-animation envelope enabled state must be boolean.",
      ),
    };
  const validated = validateCameraAnimationDefinition(definition);
  if (!validated.ok) return validated;
  const { id, ...configuration } = validated.value;
  return {
    ok: true,
    value: freezeCameraAnimation({
      id,
      typeId: CAMERA_ANIMATION_STEP_TYPE_ID,
      schemaVersion: 1,
      configuration: configuration as unknown as JsonObject,
      enabled,
    }),
  };
}

export function parseCameraAnimationEnvelope(
  envelope: StoryboardStepEnvelope,
): CameraAnimationResult<CameraAnimationDefinition> {
  if (
    !isRecord(envelope) ||
    envelope.typeId !== CAMERA_ANIMATION_STEP_TYPE_ID ||
    envelope.schemaVersion !== 1 ||
    typeof envelope.id !== "string" ||
    !isRecord(envelope.configuration) ||
    typeof envelope.enabled !== "boolean"
  )
    return {
      ok: false,
      error: cameraAnimationError(
        "invalid-definition",
        "unsupported-camera-animation-envelope",
        "The Storyboard step is not a supported V1 Camera animation.",
      ),
    };
  return validateCameraAnimationDefinition({
    id: envelope.id,
    ...envelope.configuration,
  } as unknown as CameraAnimationDefinition);
}

export function validateCameraAnimationEnvelope(
  envelope: StoryboardStepEnvelope,
): CameraAnimationResult<StoryboardStepEnvelope> {
  const parsed = parseCameraAnimationEnvelope(envelope);
  return parsed.ok
    ? createCameraAnimationEnvelope(parsed.value, envelope.enabled)
    : parsed;
}
