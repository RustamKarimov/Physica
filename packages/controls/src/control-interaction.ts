import {
  convertValue,
  createDefaultUnitRegistry,
  type DefaultUnitRegistry,
} from "@physica/units";
import {
  deepFreezeControl,
  validateInteractiveControl,
} from "./control-definitions";
import type {
  ControlAction,
  ControlBindingTarget,
  ControlResult,
  ControlValue,
  InteractiveControlV1,
  ScalarRange,
} from "./control-types";

function invalid(message: string): ControlResult<never> {
  return { ok: false, error: { code: "invalid-value", message } };
}

function normalizeRange(value: number, range?: ScalarRange): number {
  if (range === undefined) return value;
  const clamped = Math.max(range.minimum, Math.min(range.maximum, value));
  if (range.step === undefined) return clamped;
  const steps = Math.round((clamped - range.minimum) / range.step);
  return Math.max(
    range.minimum,
    Math.min(range.maximum, range.minimum + steps * range.step),
  );
}

function normalizeScalar(
  definition: InteractiveControlV1,
  value: ControlValue,
  registry: DefaultUnitRegistry,
): ControlResult<ControlValue> {
  if (value.kind !== "scalar" || !Number.isFinite(value.value))
    return invalid("Control requires a finite scalar value.");
  if (definition.kind === "number-unit") {
    const source = registry.parse(value.unit ?? definition.displayUnit);
    const target = registry.parse(definition.canonicalUnit);
    if (!source.ok || !target.ok)
      return {
        ok: false,
        error: {
          code: "incompatible-unit",
          message: "Control unit expression could not be parsed.",
        },
      };
    const converted = convertValue(value.value, source.value, target.value);
    if (!converted.ok)
      return {
        ok: false,
        error: {
          code: "incompatible-unit",
          message:
            "Control units are dimensionally or semantically incompatible.",
        },
      };
    return {
      ok: true,
      value: deepFreezeControl({
        kind: "scalar",
        value: normalizeRange(converted.value, definition.range),
        unit: definition.canonicalUnit,
      }),
    };
  }
  if (definition.kind !== "slider")
    return invalid("This control does not accept a scalar value.");
  return {
    ok: true,
    value: deepFreezeControl({
      kind: "scalar",
      value: normalizeRange(value.value, definition.range),
      ...(definition.canonicalUnit === undefined
        ? {}
        : { unit: definition.canonicalUnit }),
    }),
  };
}

function normalizeValue(
  definition: InteractiveControlV1,
  value: ControlValue,
  registry: DefaultUnitRegistry,
): ControlResult<ControlValue> {
  if (definition.kind === "slider" || definition.kind === "number-unit")
    return normalizeScalar(definition, value, registry);
  if (definition.kind === "toggle")
    return value.kind === "boolean"
      ? { ok: true, value: deepFreezeControl(value) }
      : invalid("Toggle controls require a boolean value.");
  if (definition.kind === "button")
    return value.kind === "action" && Number.isSafeInteger(value.sequence)
      ? { ok: true, value: deepFreezeControl(value) }
      : invalid("Button controls require an action pulse.");
  if (
    definition.kind === "vector-handle" ||
    definition.kind === "physical-drag" ||
    definition.kind === "layout-drag"
  )
    return value.kind === "vec2" &&
      Number.isFinite(value.x) &&
      Number.isFinite(value.y)
      ? { ok: true, value: deepFreezeControl(value) }
      : invalid("Vector and drag controls require a finite vec2 value.");
  return {
    ok: false,
    error: {
      code: "read-only-control",
      message: "Measurement probes are read-only.",
    },
  };
}

function routeOf(binding: ControlBindingTarget): ControlAction["route"] {
  switch (binding.kind) {
    case "document-parameter":
      return "document-command";
    case "initial-physical-state":
      return "initial-state-command";
    case "live-runtime-input":
      return "live-runtime-input";
    case "presentation-property":
      return "presentation";
    case "layout-property":
      return "layout";
    case "measurement-probe":
      throw new TypeError("Measurement probes cannot produce actions.");
  }
}

function targetOf(binding: ControlBindingTarget): string {
  return "key" in binding ? binding.key : binding.path;
}

export function createControlAction(
  definition: InteractiveControlV1,
  value: ControlValue,
  registry: DefaultUnitRegistry = createDefaultUnitRegistry(),
): ControlResult<ControlAction> {
  const validated = validateInteractiveControl(definition);
  if (!validated.ok) return validated;
  const control = validated.value;
  if (control.kind === "probe")
    return {
      ok: false,
      error: {
        code: "read-only-control",
        message: "Measurement probes are read-only.",
      },
    };
  const normalized = normalizeValue(control, value, registry);
  if (!normalized.ok) return normalized;
  return {
    ok: true,
    value: deepFreezeControl({
      controlId: control.id,
      route: routeOf(control.binding),
      target: targetOf(control.binding),
      value: normalized.value,
    }),
  };
}

export interface ControlActionRoutes {
  readonly dispatchDocumentCommand: (action: ControlAction) => void;
  readonly dispatchInitialStateCommand: (action: ControlAction) => void;
  readonly enqueueLiveInput: (action: ControlAction) => void;
  readonly applyPresentationAction: (action: ControlAction) => void;
  readonly applyLayoutAction: (action: ControlAction) => void;
}

export function routeControlAction(
  action: ControlAction,
  routes: ControlActionRoutes,
): void {
  switch (action.route) {
    case "document-command":
      routes.dispatchDocumentCommand(action);
      break;
    case "initial-state-command":
      routes.dispatchInitialStateCommand(action);
      break;
    case "live-runtime-input":
      routes.enqueueLiveInput(action);
      break;
    case "presentation":
      routes.applyPresentationAction(action);
      break;
    case "layout":
      routes.applyLayoutAction(action);
      break;
  }
}
