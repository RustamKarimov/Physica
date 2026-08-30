import {
  revealChannel,
  validateRevealDefinition,
  freezeReveal,
} from "./reveal-definitions";
import { revealError, type RevealResult } from "./reveal-errors";
import type {
  RevealDefinition,
  RevealSchedule,
  ScheduledReveal,
} from "./reveal-types";

function order(left: ScheduledReveal, right: ScheduledReveal): number {
  return (
    left.startTimeSeconds - right.startTimeSeconds ||
    left.priority - right.priority ||
    left.id.localeCompare(right.id)
  );
}

function key(reveal: ScheduledReveal): string {
  return [reveal.target.sceneId, reveal.target.id, reveal.channel].join("/");
}

function overlaps(left: ScheduledReveal, right: ScheduledReveal): boolean {
  if (left.durationSeconds === 0 || right.durationSeconds === 0)
    return left.startTimeSeconds === right.startTimeSeconds;
  return (
    left.startTimeSeconds < right.endTimeSeconds &&
    right.startTimeSeconds < left.endTimeSeconds
  );
}

export function compileRevealSchedule(
  definitions: readonly RevealDefinition[],
): RevealResult<RevealSchedule> {
  const ids = new Set<string>();
  const reveals: ScheduledReveal[] = [];
  for (const definition of definitions) {
    const validated = validateRevealDefinition(definition);
    if (!validated.ok) return validated;
    if (ids.has(definition.id))
      return {
        ok: false,
        error: revealError(
          "duplicate-reveal",
          "duplicate-reveal-id",
          "Reveal IDs must be unique.",
          { relatedIds: [definition.id] },
        ),
      };
    ids.add(definition.id);
    reveals.push({
      ...validated.value,
      channel: revealChannel(validated.value.operation),
      endTimeSeconds:
        validated.value.startTimeSeconds + validated.value.durationSeconds,
    });
  }
  reveals.sort(order);
  for (let leftIndex = 0; leftIndex < reveals.length; leftIndex += 1) {
    const left = reveals[leftIndex]!;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < reveals.length;
      rightIndex += 1
    ) {
      const right = reveals[rightIndex]!;
      if (key(left) === key(right) && overlaps(left, right))
        return {
          ok: false,
          error: revealError(
            "channel-conflict",
            "overlapping-reveal-channel",
            "One target cannot have overlapping effects on the same reveal channel.",
            { relatedIds: [left.id, right.id] },
          ),
        };
    }
  }
  return {
    ok: true,
    value: freezeReveal({
      reveals,
      durationSeconds: reveals.reduce(
        (maximum, reveal) => Math.max(maximum, reveal.endTimeSeconds),
        0,
      ),
    }),
  };
}
