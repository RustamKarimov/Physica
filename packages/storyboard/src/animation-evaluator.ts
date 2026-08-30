import { animationError, type AnimationResult } from "./animation-errors";
import { evaluateEasing } from "./animation-easing";
import type {
  AnimationSchedule,
  AnimationValue,
  PresentationAnimationFrame,
  PresentationTargetState,
  ScheduledAnimation,
} from "./animation-types";

function freeze<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze)) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, freeze(entry)]),
      ),
    ) as T;
  return value;
}

function interpolate(
  start: AnimationValue,
  end: AnimationValue,
  amount: number,
): AnimationValue {
  if (start.kind === "scalar" && end.kind === "scalar")
    return {
      kind: "scalar",
      value: start.value + (end.value - start.value) * amount,
    };
  if (start.kind === "vec3" && end.kind === "vec3")
    return {
      kind: "vec3",
      x: start.x + (end.x - start.x) * amount,
      y: start.y + (end.y - start.y) * amount,
      z: start.z + (end.z - start.z) * amount,
    };
  throw new Error("Validated animation values have incompatible kinds.");
}

function animationValue(
  animation: ScheduledAnimation,
  timeSeconds: number,
  reducedMotion: boolean,
): AnimationResult<AnimationValue> {
  if (reducedMotion || animation.durationSeconds === 0)
    return { ok: true, value: animation.endValue };
  const progress = Math.min(
    1,
    Math.max(
      0,
      (timeSeconds - animation.startTimeSeconds) / animation.durationSeconds,
    ),
  );
  const eased = evaluateEasing(animation.easing, progress);
  return eased.ok
    ? {
        ok: true,
        value: interpolate(
          animation.startValue,
          animation.endValue,
          eased.value,
        ),
      }
    : eased;
}

function targetKey(animation: ScheduledAnimation): string {
  return animation.target.sceneId + "/" + animation.target.id;
}

interface MutableTarget {
  sceneId: ScheduledAnimation["target"]["sceneId"];
  representationId: ScheduledAnimation["target"]["id"];
  translation: { x: number; y: number; z: number };
  rotationRadians: number;
  scale: { x: number; y: number; z: number };
  opacity: number;
  sourceAnimationIds: ScheduledAnimation["id"][];
}

function apply(
  target: MutableTarget,
  animation: ScheduledAnimation,
  value: AnimationValue,
): void {
  const combine = animation.conflictPolicy;
  if (
    animation.channel === "presentation.translation" &&
    value.kind === "vec3"
  ) {
    target.translation =
      combine === "additive"
        ? {
            x: target.translation.x + value.x,
            y: target.translation.y + value.y,
            z: target.translation.z + value.z,
          }
        : { x: value.x, y: value.y, z: value.z };
  }
  if (animation.channel === "presentation.rotation" && value.kind === "scalar")
    target.rotationRadians =
      combine === "additive"
        ? target.rotationRadians + value.value
        : value.value;
  if (animation.channel === "presentation.scale" && value.kind === "vec3")
    target.scale =
      combine === "multiplicative"
        ? {
            x: target.scale.x * value.x,
            y: target.scale.y * value.y,
            z: target.scale.z * value.z,
          }
        : { x: value.x, y: value.y, z: value.z };
  if (animation.channel === "presentation.opacity" && value.kind === "scalar")
    target.opacity =
      combine === "multiplicative" ? target.opacity * value.value : value.value;
  target.sourceAnimationIds.push(animation.id);
}

export function evaluateAnimationSchedule(
  schedule: AnimationSchedule,
  presentationTimeSeconds: number,
  options: { readonly reducedMotion?: boolean } = {},
): AnimationResult<PresentationAnimationFrame> {
  if (!Number.isFinite(presentationTimeSeconds))
    return {
      ok: false,
      error: animationError(
        "schedule-evaluation-failed",
        "non-finite-presentation-time",
        "Presentation time must be finite.",
      ),
    };
  const targets = new Map<string, MutableTarget>();
  for (const animation of schedule.animations) {
    if (presentationTimeSeconds < animation.startTimeSeconds) continue;
    const key = targetKey(animation);
    let target = targets.get(key);
    if (!target) {
      target = {
        sceneId: animation.target.sceneId,
        representationId: animation.target.id,
        translation: { x: 0, y: 0, z: 0 },
        rotationRadians: 0,
        scale: { x: 1, y: 1, z: 1 },
        opacity: 1,
        sourceAnimationIds: [],
      };
      targets.set(key, target);
    }
    const value = animationValue(
      animation,
      presentationTimeSeconds,
      options.reducedMotion === true,
    );
    if (!value.ok) return value;
    apply(target, animation, value.value);
  }
  const ordered: PresentationTargetState[] = [...targets.values()]
    .sort(
      (left, right) =>
        left.sceneId.localeCompare(right.sceneId) ||
        left.representationId.localeCompare(right.representationId),
    )
    .map((entry) => ({ ...entry }));
  return {
    ok: true,
    value: freeze({ presentationTimeSeconds, targets: ordered }),
  };
}
