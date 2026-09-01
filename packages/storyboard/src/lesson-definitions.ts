import {
  isJsonValue,
  registeredTypeId,
  type JsonObject,
  type StoryboardStepEnvelope,
} from "@physica/core-model";
import type {
  LessonAction,
  LessonAdvanceRule,
  LessonResult,
  LessonStepV1,
  StoryboardObservableValue,
} from "./lesson-types";

export const LESSON_STEP_TYPE_ID = registeredTypeId(
  "physica:storyboard/lesson-step-v1",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function deepFreezeLesson<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((entry) => deepFreezeLesson(entry))) as T;
  if (isRecord(value))
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          deepFreezeLesson(entry),
        ]),
      ),
    ) as T;
  return value;
}

function invalid(message: string): LessonResult<never> {
  return { ok: false, error: { code: "invalid-step", message } };
}

function validTrigger(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "next" || value.kind === "previous") return true;
  if (value.kind === "choice")
    return typeof value.choiceId === "string" && value.choiceId.length > 0;
  if (value.kind === "event")
    return typeof value.eventKey === "string" && value.eventKey.length > 0;
  return false;
}

function validAction(action: unknown): action is LessonAction {
  if (!isRecord(action) || typeof action.kind !== "string") return false;
  if (action.kind === "presentation")
    return (
      typeof action.target === "string" &&
      action.target.length > 0 &&
      typeof action.property === "string" &&
      action.property.length > 0 &&
      isJsonValue(action.value)
    );
  if (action.kind === "simulation")
    return (
      ["play", "pause", "reset", "seek"].includes(String(action.command)) &&
      (action.command !== "seek" ||
        (typeof action.timeSeconds === "number" &&
          Number.isFinite(action.timeSeconds) &&
          action.timeSeconds >= 0))
    );
  if (action.kind === "note")
    return (
      typeof action.text === "string" &&
      action.text.trim().length > 0 &&
      ["teacher", "learner", "all"].includes(String(action.audience))
    );
  if (action.kind === "camera")
    return typeof action.cue === "string" && action.cue.trim().length > 0;
  if (action.kind === "flow") return validTrigger(action.trigger);
  return false;
}

function validObservable(value: unknown): value is StoryboardObservableValue {
  if (!isRecord(value)) return false;
  if (value.kind === "scalar")
    return typeof value.value === "number" && Number.isFinite(value.value);
  if (value.kind === "boolean") return typeof value.value === "boolean";
  if (value.kind === "text") return typeof value.value === "string";
  return false;
}

function validAdvance(advance: unknown): advance is LessonAdvanceRule {
  if (!isRecord(advance) || typeof advance.kind !== "string") return false;
  if (advance.kind === "manual") return true;
  if (advance.kind === "after-duration")
    return (
      typeof advance.durationSeconds === "number" &&
      Number.isFinite(advance.durationSeconds) &&
      advance.durationSeconds >= 0
    );
  if (advance.kind === "condition")
    return (
      typeof advance.sourceKey === "string" &&
      advance.sourceKey.length > 0 &&
      [
        "equals",
        "not-equals",
        "greater-than",
        "greater-than-or-equal",
        "less-than",
        "less-than-or-equal",
      ].includes(String(advance.operator)) &&
      validObservable(advance.value)
    );
  if (advance.kind === "interaction-pause")
    return (
      typeof advance.interactionKey === "string" &&
      advance.interactionKey.length > 0 &&
      typeof advance.prompt === "string" &&
      advance.prompt.trim().length > 0
    );
  return false;
}

export function validateLessonStep(
  step: LessonStepV1,
): LessonResult<LessonStepV1> {
  if (
    !isRecord(step) ||
    typeof step.id !== "string" ||
    typeof step.name !== "string" ||
    !step.name.trim() ||
    !Array.isArray(step.actions) ||
    !step.actions.every(validAction) ||
    !validAdvance(step.advance) ||
    !isJsonValue(step)
  )
    return invalid("Lesson step is malformed.");
  return { ok: true, value: deepFreezeLesson(step) };
}

export function createLessonStepEnvelope(
  step: LessonStepV1,
): LessonResult<StoryboardStepEnvelope> {
  const valid = validateLessonStep(step);
  if (!valid.ok) return valid;
  return {
    ok: true,
    value: deepFreezeLesson({
      id: valid.value.id,
      typeId: LESSON_STEP_TYPE_ID,
      schemaVersion: 1,
      configuration: valid.value as unknown as JsonObject,
      enabled: true,
    }),
  };
}

export function parseLessonStepEnvelope(
  envelope: StoryboardStepEnvelope,
): LessonResult<LessonStepV1> {
  if (
    envelope.typeId !== LESSON_STEP_TYPE_ID ||
    envelope.schemaVersion !== 1 ||
    envelope.enabled !== true
  )
    return {
      ok: false,
      error: {
        code: "invalid-envelope",
        message: "Unsupported lesson step envelope.",
      },
    };
  const step = envelope.configuration as unknown as LessonStepV1;
  if (step.id !== envelope.id)
    return {
      ok: false,
      error: {
        code: "invalid-envelope",
        message: "Lesson envelope and configuration IDs differ.",
      },
    };
  return validateLessonStep(step);
}
