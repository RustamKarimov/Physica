import type { Result } from "@physica/core-model";

export interface AnimationError {
  readonly kind:
    | "invalid-definition"
    | "invalid-target"
    | "invalid-channel"
    | "invalid-value"
    | "invalid-time"
    | "invalid-easing"
    | "invalid-composition"
    | "duplicate-animation"
    | "channel-conflict"
    | "unsupported-conflict-policy"
    | "presentation-clock-missing"
    | "presentation-clock-mismatch"
    | "schedule-evaluation-failed";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly relatedIds?: readonly string[];
}

export type AnimationResult<T> = Result<T, AnimationError>;

export function animationError(
  kind: AnimationError["kind"],
  code: string,
  message: string,
  options: Pick<AnimationError, "path" | "relatedIds"> = {},
): AnimationError {
  return Object.freeze({ kind, code, message, ...options });
}
