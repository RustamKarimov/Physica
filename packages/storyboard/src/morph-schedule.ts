import { freezeMorph, validateMorphDefinition } from "./morph-definitions";
import { morphError, type MorphResult } from "./morph-errors";
import type {
  MorphDefinition,
  MorphSchedule,
  ScheduledMorph,
} from "./morph-types";

function order(left: ScheduledMorph, right: ScheduledMorph): number {
  return (
    left.startTimeSeconds - right.startTimeSeconds ||
    left.priority - right.priority ||
    left.id.localeCompare(right.id)
  );
}

function overlaps(left: ScheduledMorph, right: ScheduledMorph): boolean {
  if (left.durationSeconds === 0 || right.durationSeconds === 0)
    return left.startTimeSeconds === right.startTimeSeconds;
  return (
    left.startTimeSeconds < right.endTimeSeconds &&
    right.startTimeSeconds < left.endTimeSeconds
  );
}

function targets(morph: ScheduledMorph): readonly string[] {
  return [
    morph.source.sceneId + "/" + morph.source.id,
    morph.destination.sceneId + "/" + morph.destination.id,
  ];
}

export function compileMorphSchedule(
  definitions: readonly MorphDefinition[],
): MorphResult<MorphSchedule> {
  const ids = new Set<string>();
  const morphs: ScheduledMorph[] = [];
  for (const definition of definitions) {
    const validated = validateMorphDefinition(definition);
    if (!validated.ok) return validated;
    if (ids.has(definition.id))
      return {
        ok: false,
        error: morphError(
          "duplicate-morph",
          "duplicate-morph-id",
          "Morph transition IDs must be unique.",
          { relatedIds: [definition.id] },
        ),
      };
    ids.add(definition.id);
    morphs.push({
      ...validated.value,
      endTimeSeconds:
        validated.value.startTimeSeconds + validated.value.durationSeconds,
    });
  }
  morphs.sort(order);
  for (let leftIndex = 0; leftIndex < morphs.length; leftIndex += 1) {
    const left = morphs[leftIndex]!;
    const leftTargets = new Set(targets(left));
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < morphs.length;
      rightIndex += 1
    ) {
      const right = morphs[rightIndex]!;
      if (
        overlaps(left, right) &&
        targets(right).some((target) => leftTargets.has(target))
      )
        return {
          ok: false,
          error: morphError(
            "target-conflict",
            "overlapping-morph-target",
            "A Representation cannot participate in overlapping morph transitions.",
            { relatedIds: [left.id, right.id] },
          ),
        };
    }
  }
  return {
    ok: true,
    value: freezeMorph({
      morphs,
      durationSeconds: morphs.reduce(
        (maximum, morph) => Math.max(maximum, morph.endTimeSeconds),
        0,
      ),
    }),
  };
}
