import { evaluateEasing } from "./animation-easing";
import { freezeMorph } from "./morph-definitions";
import { morphError, type MorphResult } from "./morph-errors";
import type {
  MorphSchedule,
  MorphTransitionState,
  PresentationMorphFrame,
  ScheduledMorph,
} from "./morph-types";

function progress(
  morph: ScheduledMorph,
  timeSeconds: number,
  reducedMotion: boolean,
): MorphResult<number> {
  if (reducedMotion || morph.durationSeconds === 0)
    return { ok: true, value: 1 };
  const normalized = Math.min(
    1,
    Math.max(0, (timeSeconds - morph.startTimeSeconds) / morph.durationSeconds),
  );
  const eased = evaluateEasing(morph.easing, normalized);
  return eased.ok
    ? eased
    : {
        ok: false,
        error: morphError(
          "schedule-evaluation-failed",
          eased.error.code,
          eased.error.message,
        ),
      };
}

export function evaluateMorphSchedule(
  schedule: MorphSchedule,
  presentationTimeSeconds: number,
  options: { readonly reducedMotion?: boolean } = {},
): MorphResult<PresentationMorphFrame> {
  if (!Number.isFinite(presentationTimeSeconds))
    return {
      ok: false,
      error: morphError(
        "schedule-evaluation-failed",
        "non-finite-presentation-time",
        "Presentation time must be finite.",
      ),
    };
  const transitions: MorphTransitionState[] = [];
  for (const morph of schedule.morphs) {
    if (presentationTimeSeconds < morph.startTimeSeconds) continue;
    const amount = progress(
      morph,
      presentationTimeSeconds,
      options.reducedMotion === true,
    );
    if (!amount.ok) return amount;
    transitions.push({
      id: morph.id,
      source: morph.source,
      destination: morph.destination,
      operation: morph.operation,
      progress: amount.value,
      sourceOpacity: 1 - amount.value,
      destinationOpacity: amount.value,
    });
  }
  return {
    ok: true,
    value: freezeMorph({ presentationTimeSeconds, transitions }),
  };
}
