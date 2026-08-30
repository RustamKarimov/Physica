import { animationError, type AnimationResult } from "./animation-errors";
import type { AnimationEasing } from "./animation-types";

export function validateEasing(
  easing: AnimationEasing,
): AnimationResult<AnimationEasing> {
  const source = easing as unknown;
  if (
    source === null ||
    typeof source !== "object" ||
    Array.isArray(source) ||
    !("kind" in source && typeof source.kind === "string")
  )
    return {
      ok: false,
      error: animationError(
        "invalid-easing",
        "invalid-easing-shape",
        "Easing must be a named or cubic Bézier definition.",
      ),
    };
  if (source.kind === "named")
    return "id" in source &&
      typeof source.id === "string" &&
      ["linear", "ease-in", "ease-out", "ease-in-out"].includes(source.id)
      ? {
          ok: true,
          value: Object.freeze({
            kind: "named",
            id: source.id,
          }) as AnimationEasing,
        }
      : {
          ok: false,
          error: animationError(
            "invalid-easing",
            "unknown-named-easing",
            "The named easing is not registered.",
          ),
        };
  if (source.kind === "cubic-bezier") {
    const x1 = "x1" in source ? source.x1 : undefined;
    const y1 = "y1" in source ? source.y1 : undefined;
    const x2 = "x2" in source ? source.x2 : undefined;
    const y2 = "y2" in source ? source.y2 : undefined;
    const values = [x1, y1, x2, y2];
    if (
      values.every(
        (value) => typeof value === "number" && Number.isFinite(value),
      ) &&
      (x1 as number) >= 0 &&
      (x1 as number) <= 1 &&
      (x2 as number) >= 0 &&
      (x2 as number) <= 1
    )
      return {
        ok: true,
        value: Object.freeze({
          kind: "cubic-bezier",
          x1,
          y1,
          x2,
          y2,
        }) as AnimationEasing,
      };
  }
  return {
    ok: false,
    error: animationError(
      "invalid-easing",
      "invalid-cubic-bezier",
      "Cubic Bézier controls must be finite and x controls must be in [0, 1].",
    ),
  };
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
