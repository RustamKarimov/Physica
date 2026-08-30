import { evaluateEasing } from "./animation-easing";
import { freezeCameraAnimation } from "./camera-animation-definitions";
import {
  cameraAnimationError,
  type CameraAnimationResult,
} from "./camera-animation-errors";
import type {
  CameraAnimationSchedule,
  PresentationCameraFrame,
  ScheduledCameraAnimation,
} from "./camera-animation-types";

function progress(
  animation: ScheduledCameraAnimation,
  timeSeconds: number,
  reducedMotion: boolean,
): CameraAnimationResult<number> {
  if (reducedMotion || animation.durationSeconds === 0)
    return { ok: true, value: 1 };
  const normalized = Math.min(
    1,
    Math.max(
      0,
      (timeSeconds - animation.startTimeSeconds) / animation.durationSeconds,
    ),
  );
  const eased = evaluateEasing(animation.easing, normalized);
  return eased.ok
    ? eased
    : {
        ok: false,
        error: cameraAnimationError(
          "schedule-evaluation-failed",
          eased.error.code,
          eased.error.message,
        ),
      };
}

export function evaluateCameraAnimationSchedule(
  schedule: CameraAnimationSchedule,
  presentationTimeSeconds: number,
  options: { readonly reducedMotion?: boolean } = {},
): CameraAnimationResult<PresentationCameraFrame> {
  if (!Number.isFinite(presentationTimeSeconds))
    return {
      ok: false,
      error: cameraAnimationError(
        "schedule-evaluation-failed",
        "non-finite-presentation-time",
        "Presentation time must be finite.",
      ),
    };
  const operations = [];
  for (const animation of schedule.animations) {
    if (presentationTimeSeconds < animation.startTimeSeconds) continue;
    const amount = progress(
      animation,
      presentationTimeSeconds,
      options.reducedMotion === true,
    );
    if (!amount.ok) return amount;
    operations.push({
      sourceId: animation.id,
      operation: animation.operation,
      progress: amount.value,
    });
  }
  return {
    ok: true,
    value: freezeCameraAnimation({
      presentationTimeSeconds,
      operations,
    }),
  };
}
