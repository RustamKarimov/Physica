import { animationError, type AnimationResult } from "./animation-errors";
import { validateAnimationDefinition } from "./animation-definitions";
import type {
  AnimationComposition,
  AnimationDefinition,
  AnimationSchedule,
  ScheduledAnimation,
} from "./animation-types";

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze)) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, deepFreeze(entry)]),
      ),
    ) as T;
  return value;
}

function order(left: ScheduledAnimation, right: ScheduledAnimation): number {
  return (
    left.startTimeSeconds - right.startTimeSeconds ||
    left.priority - right.priority ||
    left.id.localeCompare(right.id)
  );
}

function channelKey(animation: AnimationDefinition): string {
  return [
    animation.target.sceneId,
    animation.target.id,
    animation.channel,
  ].join("/");
}

function overlap(left: ScheduledAnimation, right: ScheduledAnimation): boolean {
  if (left.durationSeconds === 0 || right.durationSeconds === 0)
    return left.startTimeSeconds === right.startTimeSeconds;
  return (
    left.startTimeSeconds < right.endTimeSeconds &&
    right.startTimeSeconds < left.endTimeSeconds
  );
}

function policySupported(animation: AnimationDefinition): boolean {
  if (animation.conflictPolicy === "additive")
    return (
      animation.channel === "presentation.translation" ||
      animation.channel === "presentation.rotation"
    );
  if (animation.conflictPolicy === "multiplicative")
    return (
      animation.channel === "presentation.scale" ||
      animation.channel === "presentation.opacity"
    );
  return true;
}

export function compileAnimationSchedule(
  definitions: readonly AnimationDefinition[],
): AnimationResult<AnimationSchedule> {
  const seen = new Set<string>();
  const scheduled: ScheduledAnimation[] = [];
  for (const definition of definitions) {
    const validation = validateAnimationDefinition(definition);
    if (!validation.ok) return validation;
    if (seen.has(definition.id))
      return {
        ok: false,
        error: animationError(
          "duplicate-animation",
          "duplicate-animation-id",
          "Animation IDs must be unique.",
          { relatedIds: [definition.id] },
        ),
      };
    seen.add(definition.id);
    if (!policySupported(definition))
      return {
        ok: false,
        error: animationError(
          "unsupported-conflict-policy",
          "channel-policy-mismatch",
          "The conflict policy is not supported by this channel.",
          { relatedIds: [definition.id] },
        ),
      };
    let startTimeSeconds = definition.startTimeSeconds;
    if (definition.conflictPolicy === "sequence") {
      const priorEnd = scheduled
        .filter((entry) => channelKey(entry) === channelKey(definition))
        .reduce(
          (maximum, entry) => Math.max(maximum, entry.endTimeSeconds),
          startTimeSeconds,
        );
      startTimeSeconds = priorEnd;
    }
    scheduled.push({
      ...definition,
      startTimeSeconds,
      endTimeSeconds: startTimeSeconds + definition.durationSeconds,
    });
  }
  scheduled.sort(order);
  for (let leftIndex = 0; leftIndex < scheduled.length; leftIndex += 1) {
    const left = scheduled[leftIndex]!;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < scheduled.length;
      rightIndex += 1
    ) {
      const right = scheduled[rightIndex]!;
      if (channelKey(left) !== channelKey(right) || !overlap(left, right))
        continue;
      if (
        left.conflictPolicy === "reject" ||
        right.conflictPolicy === "reject" ||
        left.conflictPolicy !== right.conflictPolicy
      )
        return {
          ok: false,
          error: animationError(
            "channel-conflict",
            "overlapping-channel-conflict",
            "Overlapping animations have incompatible conflict policies.",
            { relatedIds: [left.id, right.id] },
          ),
        };
    }
  }
  return {
    ok: true,
    value: deepFreeze({
      animations: scheduled,
      durationSeconds: scheduled.reduce(
        (maximum, entry) => Math.max(maximum, entry.endTimeSeconds),
        0,
      ),
    }),
  };
}

interface Flattened {
  readonly definitions: readonly AnimationDefinition[];
  readonly spanSeconds: number;
}

function flatten(
  composition: AnimationComposition,
  originSeconds: number,
): AnimationResult<Flattened> {
  if (composition.kind === "wait") {
    if (
      !Number.isFinite(composition.durationSeconds) ||
      composition.durationSeconds < 0
    )
      return {
        ok: false,
        error: animationError(
          "invalid-composition",
          "invalid-wait-duration",
          "Wait duration must be finite and non-negative.",
        ),
      };
    return {
      ok: true,
      value: { definitions: [], spanSeconds: composition.durationSeconds },
    };
  }
  if (composition.kind === "clip") {
    const animation = {
      ...composition.animation,
      startTimeSeconds: originSeconds + composition.animation.startTimeSeconds,
    };
    return {
      ok: true,
      value: {
        definitions: [animation],
        spanSeconds:
          composition.animation.startTimeSeconds +
          composition.animation.durationSeconds,
      },
    };
  }
  if (
    composition.kind === "stagger" &&
    (!Number.isFinite(composition.intervalSeconds) ||
      composition.intervalSeconds < 0)
  )
    return {
      ok: false,
      error: animationError(
        "invalid-composition",
        "invalid-stagger-interval",
        "Stagger interval must be finite and non-negative.",
      ),
    };
  const definitions: AnimationDefinition[] = [];
  let spanSeconds = 0;
  let cursor = 0;
  for (const [index, child] of composition.children.entries()) {
    const offset =
      composition.kind === "sequence"
        ? cursor
        : composition.kind === "stagger"
          ? index * composition.intervalSeconds
          : 0;
    const result = flatten(child, originSeconds + offset);
    if (!result.ok) return result;
    definitions.push(...result.value.definitions);
    spanSeconds = Math.max(spanSeconds, offset + result.value.spanSeconds);
    if (composition.kind === "sequence") cursor += result.value.spanSeconds;
  }
  return { ok: true, value: { definitions, spanSeconds } };
}

export function compileAnimationComposition(
  composition: AnimationComposition,
): AnimationResult<AnimationSchedule> {
  const flattened = flatten(composition, 0);
  return flattened.ok
    ? compileAnimationSchedule(flattened.value.definitions)
    : flattened;
}
