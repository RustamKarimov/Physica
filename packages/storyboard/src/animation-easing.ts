import { animationError, type AnimationResult } from "./animation-errors";
import type { AnimationEasing } from "./animation-types";

export function validateEasing(
  easing: AnimationEasing,
): AnimationResult<AnimationEasing> {
  if (easing.kind === "named")
    return ["linear", "ease-in", "ease-out", "ease-in-out"].includes(easing.id)
      ? { ok: true, value: Object.freeze({ ...easing }) }
      : {
          ok: false,
          error: animationError(
            "invalid-easing",
            "unknown-named-easing",
            "The named easing is not registered.",
          ),
        };
  const values = [easing.x1, easing.y1, easing.x2, easing.y2];
  if (
    !values.every(Number.isFinite) ||
    easing.x1 < 0 ||
    easing.x1 > 1 ||
    easing.x2 < 0 ||
    easing.x2 > 1
  )
    return {
      ok: false,
      error: animationError(
        "invalid-easing",
        "invalid-cubic-bezier",
        "Cubic Bézier controls must be finite and x controls must be in [0, 1].",
      ),
    };
  return { ok: true, value: Object.freeze({ ...easing }) };
}

function bezier(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return (
    3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t
  );
}

export function evaluateEasing(
  easing: AnimationEasing,
  progress: number,
): AnimationResult<number> {
  const validation = validateEasing(easing);
  if (!validation.ok) return validation;
  if (!Number.isFinite(progress))
    return {
      ok: false,
      error: animationError(
        "invalid-easing",
        "non-finite-progress",
        "Easing progress must be finite.",
      ),
    };
  const p = Math.min(1, Math.max(0, progress));
  if (p === 0 || p === 1) return { ok: true, value: p };
  if (easing.kind === "named") {
    const value =
      easing.id === "linear"
        ? p
        : easing.id === "ease-in"
          ? p * p
          : easing.id === "ease-out"
            ? 1 - (1 - p) * (1 - p)
            : p < 0.5
              ? 2 * p * p
              : 1 - 2 * (1 - p) * (1 - p);
    return { ok: true, value };
  }
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    if (bezier(middle, easing.x1, easing.x2) < p) low = middle;
    else high = middle;
  }
  return {
    ok: true,
    value: bezier((low + high) / 2, easing.y1, easing.y2),
  };
}
