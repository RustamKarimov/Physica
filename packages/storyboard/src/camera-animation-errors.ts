import type { Result } from "@physica/core-model";

export interface CameraAnimationError {
  readonly kind:
    | "invalid-definition"
    | "invalid-target"
    | "invalid-operation"
    | "invalid-time"
    | "invalid-easing"
    | "duplicate-camera-animation"
    | "channel-conflict"
    | "presentation-clock-missing"
    | "presentation-clock-mismatch"
    | "schedule-evaluation-failed";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly relatedIds?: readonly string[];
}

export type CameraAnimationResult<T> = Result<T, CameraAnimationError>;

export function cameraAnimationError(
  kind: CameraAnimationError["kind"],
  code: string,
  message: string,
  options: Pick<CameraAnimationError, "path" | "relatedIds"> = {},
): CameraAnimationError {
  return Object.freeze({ kind, code, message, ...options });
}
