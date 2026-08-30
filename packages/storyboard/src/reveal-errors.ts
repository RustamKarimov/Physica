import type { Result } from "@physica/core-model";

export interface RevealError {
  readonly kind:
    | "invalid-definition"
    | "invalid-target"
    | "invalid-operation"
    | "invalid-time"
    | "invalid-easing"
    | "duplicate-reveal"
    | "channel-conflict"
    | "presentation-clock-missing"
    | "presentation-clock-mismatch"
    | "schedule-evaluation-failed";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly relatedIds?: readonly string[];
}

export type RevealResult<T> = Result<T, RevealError>;

export function revealError(
  kind: RevealError["kind"],
  code: string,
  message: string,
  options: Pick<RevealError, "path" | "relatedIds"> = {},
): RevealError {
  return Object.freeze({ kind, code, message, ...options });
}
