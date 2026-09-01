import {
  isJsonValue,
  registeredTypeId,
  type ControlDefinition,
  type JsonObject,
} from "@physica/core-model";
import type {
  ControlBindingTarget,
  ControlResult,
  InteractiveControlV1,
  ScalarRange,
} from "./control-types";

export const INTERACTIVE_CONTROL_TYPE_ID = registeredTypeId(
  "physica:control/interactive-v1",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function deepFreezeControl<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((entry) => deepFreezeControl(entry))) as T;
  if (isRecord(value))
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          deepFreezeControl(entry),
        ]),
      ),
    ) as T;
  return value;
}

function invalid(message: string): ControlResult<never> {
  return { ok: false, error: { code: "invalid-definition", message } };
}

function validRange(range: unknown): range is ScalarRange {
  return (
    isRecord(range) &&
    typeof range.minimum === "number" &&
    Number.isFinite(range.minimum) &&
    typeof range.maximum === "number" &&
    Number.isFinite(range.maximum) &&
    range.minimum <= range.maximum &&
    (range.step === undefined ||
      (typeof range.step === "number" &&
        Number.isFinite(range.step) &&
        range.step > 0))
  );
}

function validBinding(binding: unknown): binding is ControlBindingTarget {
  if (!isRecord(binding) || typeof binding.kind !== "string") return false;
  if (
    binding.kind === "document-parameter" ||
    binding.kind === "initial-physical-state" ||
    binding.kind === "presentation-property" ||
    binding.kind === "layout-property"
  )
    return typeof binding.path === "string" && binding.path.trim().length > 0;
  if (
    binding.kind === "live-runtime-input" ||
    binding.kind === "measurement-probe"
  )
    return typeof binding.key === "string" && binding.key.trim().length > 0;
  return false;
}

function bindingMatches(definition: InteractiveControlV1): boolean {
  if (definition.kind === "physical-drag")
    return definition.mode === "initial"
      ? definition.binding.kind === "initial-physical-state"
      : definition.binding.kind === "live-runtime-input";
  if (definition.kind === "layout-drag")
    return definition.binding.kind === "layout-property";
  if (definition.kind === "probe")
    return definition.binding.kind === "measurement-probe";
  return definition.binding.kind !== "measurement-probe";
}

export function validateInteractiveControl(
  definition: InteractiveControlV1,
): ControlResult<InteractiveControlV1> {
  if (
    !isRecord(definition) ||
    typeof definition.id !== "string" ||
    typeof definition.name !== "string" ||
    !definition.name.trim() ||
    typeof definition.accessibleLabel !== "string" ||
    !definition.accessibleLabel.trim() ||
    !validBinding(definition.binding) ||
    ![
      "slider",
      "number-unit",
      "toggle",
      "button",
      "vector-handle",
      "physical-drag",
      "layout-drag",
      "probe",
    ].includes(String(definition.kind)) ||
    !isJsonValue(definition)
  )
    return invalid("Interactive control definition is malformed.");
  if (!bindingMatches(definition))
    return {
      ok: false,
      error: {
        code: "binding-mismatch",
        message: "Control kind and binding authority do not match.",
      },
    };
  if (definition.kind === "slider" && !validRange(definition.range))
    return invalid("Slider range is invalid.");
  if (
    definition.kind === "number-unit" &&
    ((definition.range !== undefined && !validRange(definition.range)) ||
      !definition.canonicalUnit.trim() ||
      !definition.displayUnit.trim())
  )
    return invalid("Number/unit configuration is invalid.");
  if (
    definition.kind === "vector-handle" &&
    definition.step !== undefined &&
    (!Number.isFinite(definition.step) || definition.step <= 0)
  )
    return invalid("Vector handle step must be positive.");
  return { ok: true, value: deepFreezeControl(definition) };
}

export function createInteractiveControlEnvelope(
  definition: InteractiveControlV1,
): ControlResult<ControlDefinition> {
  const validated = validateInteractiveControl(definition);
  if (!validated.ok) return validated;
  return {
    ok: true,
    value: deepFreezeControl({
      id: validated.value.id,
      typeId: INTERACTIVE_CONTROL_TYPE_ID,
      schemaVersion: 1,
      configuration: validated.value as unknown as JsonObject,
      enabled: true,
    }),
  };
}

export function parseInteractiveControlEnvelope(
  envelope: ControlDefinition,
): ControlResult<InteractiveControlV1> {
  if (
    envelope.typeId !== INTERACTIVE_CONTROL_TYPE_ID ||
    envelope.schemaVersion !== 1 ||
    envelope.enabled !== true
  )
    return {
      ok: false,
      error: {
        code: "invalid-envelope",
        message: "Unsupported interactive control envelope.",
      },
    };
  const definition = envelope.configuration as unknown as InteractiveControlV1;
  if (definition.id !== envelope.id)
    return {
      ok: false,
      error: {
        code: "invalid-envelope",
        message: "Control envelope and configuration IDs differ.",
      },
    };
  return validateInteractiveControl(definition);
}
