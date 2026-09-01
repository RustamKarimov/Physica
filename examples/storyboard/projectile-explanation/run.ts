import { DeterministicIdFactory } from "@physica/core-model";
import {
  StoryboardStateStore,
  compileLessonSchedule,
  createLessonStepEnvelope,
  evaluateLessonSchedule,
  type LessonStepV1,
} from "@physica/storyboard";

export function runProjectileExplanation() {
  const ids = new DeterministicIdFactory(2_340_000);
  const steps: readonly LessonStepV1[] = [
    {
      id: ids.storyboardStepId(),
      name: "Resolve velocity",
      actions: [
        { kind: "simulation", command: "pause" },
        {
          kind: "presentation",
          target: "velocity-vector",
          property: "components-visible",
          value: true,
        },
        {
          kind: "note",
          text: "Resolve the launch velocity into horizontal and vertical components.",
          audience: "all",
        },
      ],
      advance: { kind: "manual" },
    },
    {
      id: ids.storyboardStepId(),
      name: "Observe the apex",
      actions: [{ kind: "simulation", command: "play" }],
      advance: {
        kind: "condition",
        sourceKey: "fixture.vertical-velocity",
        operator: "less-than-or-equal",
        value: { kind: "scalar", value: 0 },
      },
    },
    {
      id: ids.storyboardStepId(),
      name: "Learner checkpoint",
      actions: [
        {
          kind: "note",
          text: "At the apex the vertical velocity is zero.",
          audience: "learner",
        },
      ],
      advance: {
        kind: "interaction-pause",
        interactionKey: "continue",
        prompt: "Continue after explaining the apex",
      },
    },
  ];
  const envelopes = steps.map((step) => {
    const envelope = createLessonStepEnvelope(step);
    if (!envelope.ok) throw new Error(envelope.error.message);
    return envelope.value;
  });
  const schedule = compileLessonSchedule(envelopes);
  if (!schedule.ok) throw new Error(schedule.error.message);
  const store = new StoryboardStateStore();
  let verticalVelocity = 4;
  const read = (key: string) =>
    key === "fixture.vertical-velocity"
      ? ({ kind: "scalar", value: verticalVelocity } as const)
      : undefined;
  const entry = evaluateLessonSchedule(schedule.value, 0, store, read);
  if (!entry.ok) throw new Error(entry.error.message);
  store.requestAdvance();
  const afterManual = evaluateLessonSchedule(schedule.value, 0, store, read);
  if (!afterManual.ok) throw new Error(afterManual.error.message);
  evaluateLessonSchedule(schedule.value, 0, store, read);
  verticalVelocity = 0;
  const apex = evaluateLessonSchedule(schedule.value, 1, store, read);
  if (!apex.ok) throw new Error(apex.error.message);
  const question = evaluateLessonSchedule(schedule.value, 1, store, read);
  if (!question.ok) throw new Error(question.error.message);
  store.resumeInteraction("continue");
  const completed = evaluateLessonSchedule(schedule.value, 1, store, read);
  if (!completed.ok) throw new Error(completed.error.message);
  return {
    id: "projectile-explanation",
    observableSource: "deterministic-fixture-not-phase-6-solver",
    entry: {
      index: entry.value.currentStepIndex,
      status: entry.value.status,
      directives: entry.value.latestDirectives.map((directive) =>
        directive.kind === "simulation"
          ? directive.kind + ":" + directive.command
          : directive.kind,
      ),
    },
    afterManualIndex: afterManual.value.currentStepIndex,
    apexIndex: apex.value.currentStepIndex,
    question: {
      status: question.value.status,
      directives: question.value.latestDirectives.map(
        (directive) => directive.kind,
      ),
    },
    completed: {
      index: completed.value.currentStepIndex,
      status: completed.value.status,
      directiveCount: completed.value.directiveHistory.length,
    },
  };
}
