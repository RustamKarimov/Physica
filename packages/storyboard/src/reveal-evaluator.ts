import { evaluateEasing } from "./animation-easing";
import { freezeReveal } from "./reveal-definitions";
import { revealError, type RevealResult } from "./reveal-errors";
import type {
  PresentationRevealFrame,
  RevealOperation,
  RevealSchedule,
  RevealTargetState,
  ScheduledReveal,
} from "./reveal-types";

function progress(
  reveal: ScheduledReveal,
  timeSeconds: number,
  reducedMotion: boolean,
): RevealResult<number> {
  if (reducedMotion || reveal.durationSeconds === 0)
    return { ok: true, value: 1 };
  const normalized = Math.min(
    1,
    Math.max(
      0,
      (timeSeconds - reveal.startTimeSeconds) / reveal.durationSeconds,
    ),
  );
  const eased = evaluateEasing(reveal.easing, normalized);
  return eased.ok
    ? eased
    : {
        ok: false,
        error: revealError(
          "schedule-evaluation-failed",
          eased.error.code,
          eased.error.message,
        ),
      };
}

function interpolate(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function operationValue(operation: RevealOperation, amount: number) {
  if (operation.kind === "opacity")
    return interpolate(operation.startOpacity, operation.endOpacity, amount);
  if (operation.kind === "emphasis")
    return {
      mode: operation.mode,
      intensity: interpolate(
        operation.startIntensity,
        operation.endIntensity,
        amount,
      ),
      ...(operation.accent ? { accent: operation.accent } : {}),
    };
  const value = {
    progress: interpolate(
      operation.startProgress,
      operation.endProgress,
      amount,
    ),
  };
  if (operation.kind === "draw-path")
    return { ...value, direction: operation.direction };
  if (operation.kind === "mask")
    return {
      ...value,
      axis: operation.axis,
      edge: operation.edge,
      feather: operation.feather,
    };
  return value.progress;
}

type MutableTarget = {
  sceneId: RevealTargetState["sceneId"];
  representationId: RevealTargetState["representationId"];
  path?: RevealTargetState["path"];
  mask?: RevealTargetState["mask"];
  opacity?: RevealTargetState["opacity"];
  label?: RevealTargetState["label"];
  emphasis?: RevealTargetState["emphasis"];
};

export function evaluateRevealSchedule(
  schedule: RevealSchedule,
  presentationTimeSeconds: number,
  options: { readonly reducedMotion?: boolean } = {},
): RevealResult<PresentationRevealFrame> {
  if (!Number.isFinite(presentationTimeSeconds))
    return {
      ok: false,
      error: revealError(
        "schedule-evaluation-failed",
        "non-finite-presentation-time",
        "Presentation time must be finite.",
      ),
    };
  const targets = new Map<string, MutableTarget>();
  for (const reveal of schedule.reveals) {
    if (presentationTimeSeconds < reveal.startTimeSeconds) continue;
    const amount = progress(
      reveal,
      presentationTimeSeconds,
      options.reducedMotion === true,
    );
    if (!amount.ok) return amount;
    const key = reveal.target.sceneId + "/" + reveal.target.id;
    const target = targets.get(key) ?? {
      sceneId: reveal.target.sceneId,
      representationId: reveal.target.id,
    };
    const source = {
      value: operationValue(reveal.operation, amount.value),
      sourceId: reveal.id,
    };
    if (reveal.channel === "path")
      target.path = source as RevealTargetState["path"];
    if (reveal.channel === "mask")
      target.mask = source as RevealTargetState["mask"];
    if (reveal.channel === "opacity")
      target.opacity = source as RevealTargetState["opacity"];
    if (reveal.channel === "label")
      target.label = source as RevealTargetState["label"];
    if (reveal.channel === "emphasis")
      target.emphasis = source as RevealTargetState["emphasis"];
    targets.set(key, target);
  }
  return {
    ok: true,
    value: freezeReveal({
      presentationTimeSeconds,
      targets: [...targets.values()]
        .sort(
          (left, right) =>
            left.sceneId.localeCompare(right.sceneId) ||
            left.representationId.localeCompare(right.representationId),
        )
        .map((target): RevealTargetState => ({
          sceneId: target.sceneId,
          representationId: target.representationId,
          ...(target.path === undefined ? {} : { path: target.path }),
          ...(target.mask === undefined ? {} : { mask: target.mask }),
          ...(target.opacity === undefined ? {} : { opacity: target.opacity }),
          ...(target.label === undefined ? {} : { label: target.label }),
          ...(target.emphasis === undefined
            ? {}
            : { emphasis: target.emphasis }),
        })),
    }),
  };
}
