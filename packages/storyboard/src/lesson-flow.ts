import type {
  PresentationFlow,
  PresentationTrigger,
  SceneId,
} from "@physica/core-model";
import type { LessonFlowResolution, LessonResult } from "./lesson-types";

function sameTrigger(
  left: PresentationTrigger,
  right: PresentationTrigger,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "choice" && right.kind === "choice")
    return left.choiceId === right.choiceId;
  if (left.kind === "event" && right.kind === "event")
    return left.eventKey === right.eventKey;
  return left.kind === "next" || left.kind === "previous";
}

export function resolvePresentationFlowTrigger(
  flow: PresentationFlow,
  fromSceneId: SceneId,
  trigger: PresentationTrigger,
): LessonResult<LessonFlowResolution> {
  const transition = flow.transitions
    .filter(
      (candidate) =>
        candidate.fromSceneId === fromSceneId &&
        sameTrigger(candidate.trigger, trigger),
    )
    .sort(
      (left, right) =>
        (right.priority ?? 0) - (left.priority ?? 0) ||
        left.id.localeCompare(right.id),
    )[0];
  return transition === undefined
    ? {
        ok: false,
        error: {
          code: "transition-not-found",
          message: "No presentation transition matches the requested trigger.",
        },
      }
    : {
        ok: true,
        value: Object.freeze({ transition, flow }),
      };
}
