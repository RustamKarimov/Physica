import type { StoryboardStepEnvelope } from "@physica/core-model";
import {
  LESSON_STEP_TYPE_ID,
  parseLessonStepEnvelope,
} from "./lesson-definitions";
import type {
  LessonResult,
  LessonSchedule,
  LessonStepV1,
} from "./lesson-types";

export function compileLessonSchedule(
  envelopes: readonly StoryboardStepEnvelope[],
): LessonResult<LessonSchedule> {
  const steps: LessonStepV1[] = [];
  const ids = new Set<string>();
  for (const envelope of envelopes) {
    if (!envelope.enabled || envelope.typeId !== LESSON_STEP_TYPE_ID) continue;
    const parsed = parseLessonStepEnvelope(envelope);
    if (!parsed.ok) return parsed;
    if (ids.has(parsed.value.id))
      return {
        ok: false,
        error: {
          code: "duplicate-step",
          message: "Lesson step IDs must be unique.",
          stepId: parsed.value.id,
        },
      };
    ids.add(parsed.value.id);
    steps.push(parsed.value);
  }
  return {
    ok: true,
    value: Object.freeze({ steps: Object.freeze(steps) }),
  };
}
