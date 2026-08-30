import type { Result } from "@physica/core-model";

export interface MorphError {
  readonly kind:
    | "invalid-definition"
    | "invalid-target"
    | "invalid-operation"
    | "invalid-time"
    | "invalid-easing"
    | "duplicate-morph"
    | "target-conflict"
    | "duplicate-semantic-id"
    | "presentation-clock-missing"
    | "presentation-clock-mismatch"
    | "schedule-evaluation-failed";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly relatedIds?: readonly string[];
}

export type MorphResult<T> = Result<T, MorphError>;

export function morphError(
  kind: MorphError["kind"],
  code: string,
  message: string,
  options: Pick<MorphError, "path" | "relatedIds"> = {},
): MorphError {
  return Object.freeze({ kind, code, message, ...options });
}
