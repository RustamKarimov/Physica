import type { RepresentationId, Result } from "@physica/core-model";

export type RenderError =
  | { readonly kind: "invalid-render-id"; readonly value: string }
  | { readonly kind: "invalid-viewport"; readonly message: string }
  | { readonly kind: "invalid-camera"; readonly message: string }
  | { readonly kind: "invalid-camera-animation"; readonly message: string }
  | {
      readonly kind: "missing-camera-subject";
      readonly representationId: RepresentationId;
    }
  | {
      readonly kind: "invalid-fit-bounds";
      readonly representationId: RepresentationId;
      readonly message: string;
    }
  | { readonly kind: "invalid-projection"; readonly message: string }
  | { readonly kind: "invalid-transform"; readonly message: string }
  | {
      readonly kind: "invalid-primitive";
      readonly renderId: string;
      readonly message: string;
    }
  | { readonly kind: "duplicate-render-item"; readonly renderId: string }
  | {
      readonly kind: "invalid-layer-backend";
      readonly renderId: string;
      readonly backend: string;
      readonly layer: string;
    }
  | {
      readonly kind: "unsupported-primitive";
      readonly renderId: string;
      readonly backend: string;
      readonly primitive: string;
    }
  | { readonly kind: "invalid-render-frame"; readonly message: string }
  | {
      readonly kind: "invalid-pick-region";
      readonly renderId: string;
      readonly message: string;
    }
  | {
      readonly kind: "adapter-initialization-failed";
      readonly backend: string;
      readonly message: string;
    }
  | {
      readonly kind: "adapter-render-failed";
      readonly backend: string;
      readonly message: string;
    }
  | {
      readonly kind: "adapter-disposal-failed";
      readonly backend: string;
      readonly message: string;
    };

export type RenderResult<T> = Result<T, RenderError>;
