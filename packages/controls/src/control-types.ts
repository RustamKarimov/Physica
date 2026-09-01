import type { ControlId } from "@physica/core-model";

export type ControlValue =
  | { readonly kind: "scalar"; readonly value: number; readonly unit?: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "vec2"; readonly x: number; readonly y: number }
  | { readonly kind: "action"; readonly sequence: number };

export type ControlBindingTarget =
  | { readonly kind: "document-parameter"; readonly path: string }
  | { readonly kind: "initial-physical-state"; readonly path: string }
  | { readonly kind: "live-runtime-input"; readonly key: string }
  | { readonly kind: "presentation-property"; readonly path: string }
  | { readonly kind: "layout-property"; readonly path: string }
  | { readonly kind: "measurement-probe"; readonly key: string };

interface ControlBase {
  readonly id: ControlId;
  readonly name: string;
  readonly accessibleLabel: string;
  readonly description?: string;
  readonly binding: ControlBindingTarget;
}

export interface ScalarRange {
  readonly minimum: number;
  readonly maximum: number;
  readonly step?: number;
}

export type InteractiveControlV1 =
  | (ControlBase & {
      readonly kind: "slider";
      readonly range: ScalarRange;
      readonly canonicalUnit?: string;
    })
  | (ControlBase & {
      readonly kind: "number-unit";
      readonly range?: ScalarRange;
      readonly canonicalUnit: string;
      readonly displayUnit: string;
    })
  | (ControlBase & { readonly kind: "toggle" })
  | (ControlBase & { readonly kind: "button" })
  | (ControlBase & {
      readonly kind: "vector-handle";
      readonly step?: number;
    })
  | (ControlBase & {
      readonly kind: "physical-drag";
      readonly mode: "initial" | "live";
    })
  | (ControlBase & { readonly kind: "layout-drag" })
  | (ControlBase & {
      readonly kind: "probe";
      readonly displayUnit?: string;
    });

export interface ControlAction {
  readonly controlId: ControlId;
  readonly route:
    | "document-command"
    | "initial-state-command"
    | "live-runtime-input"
    | "presentation"
    | "layout";
  readonly target: string;
  readonly value: ControlValue;
}

export interface ControlError {
  readonly code:
    | "invalid-envelope"
    | "invalid-definition"
    | "invalid-value"
    | "incompatible-unit"
    | "read-only-control"
    | "binding-mismatch";
  readonly message: string;
}

export type ControlResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ControlError };
