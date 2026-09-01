import { registeredTypeId, type RegisteredTypeId } from "@physica/core-model";
import type { ControlValue } from "./control-types";

export interface ControlKindMetadata {
  readonly typeId: RegisteredTypeId;
  readonly kind:
    | "slider"
    | "number-unit"
    | "toggle"
    | "button"
    | "vector-handle"
    | "physical-drag"
    | "layout-drag"
    | "probe";
  readonly valueKind: ControlValue["kind"] | "read-only";
  readonly keyboardBehavior: string;
}

const CONTROL_KIND_REGISTRY: readonly ControlKindMetadata[] = Object.freeze([
  {
    typeId: registeredTypeId("physica:control-kind/slider"),
    kind: "slider",
    valueKind: "scalar",
    keyboardBehavior: "Arrow keys change by one configured step.",
  },
  {
    typeId: registeredTypeId("physica:control-kind/number-unit"),
    kind: "number-unit",
    valueKind: "scalar",
    keyboardBehavior: "Typed value and unit are committed with Enter.",
  },
  {
    typeId: registeredTypeId("physica:control-kind/toggle"),
    kind: "toggle",
    valueKind: "boolean",
    keyboardBehavior: "Space toggles the value.",
  },
  {
    typeId: registeredTypeId("physica:control-kind/button"),
    kind: "button",
    valueKind: "action",
    keyboardBehavior: "Space or Enter activates the action.",
  },
  {
    typeId: registeredTypeId("physica:control-kind/vector-handle"),
    kind: "vector-handle",
    valueKind: "vec2",
    keyboardBehavior: "Arrow keys move one configured vector step.",
  },
  {
    typeId: registeredTypeId("physica:control-kind/physical-drag"),
    kind: "physical-drag",
    valueKind: "vec2",
    keyboardBehavior: "Arrow keys move the physical input by one step.",
  },
  {
    typeId: registeredTypeId("physica:control-kind/layout-drag"),
    kind: "layout-drag",
    valueKind: "vec2",
    keyboardBehavior: "Arrow keys move presentation layout by one step.",
  },
  {
    typeId: registeredTypeId("physica:control-kind/probe"),
    kind: "probe",
    valueKind: "read-only",
    keyboardBehavior: "Focus reads the current measured value.",
  },
]);

export function listControlKinds(): readonly ControlKindMetadata[] {
  return CONTROL_KIND_REGISTRY;
}
