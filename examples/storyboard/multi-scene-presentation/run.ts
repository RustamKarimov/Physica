import {
  DeterministicIdFactory,
  type PresentationFlow,
} from "@physica/core-model";
import {
  StoryboardStateStore,
  compileLessonSchedule,
  createLessonStepEnvelope,
  evaluateLessonSchedule,
  resolvePresentationFlowTrigger,
  type LessonStepV1,
} from "@physica/storyboard";

export function runMultiScenePresentation() {
  const ids = new DeterministicIdFactory(2_350_000);
  const introduction = ids.sceneId();
  const foundation = ids.sceneId();
  const challenge = ids.sceneId();
  const low = {
    id: ids.presentationTransitionId(),
    fromSceneId: introduction,
    toSceneId: foundation,
    trigger: { kind: "choice" as const, choiceId: "challenge" },
    priority: 1,
  };
  const high = {
    id: ids.presentationTransitionId(),
    fromSceneId: introduction,
    toSceneId: challenge,
    trigger: { kind: "choice" as const, choiceId: "challenge" },
    priority: 10,
  };
  const flow: PresentationFlow = {
    entrySceneId: introduction,
    sceneOrder: [introduction, foundation, challenge],
    transitions: [low, high],
  };
  const selected = resolvePresentationFlowTrigger(flow, introduction, {
    kind: "choice",
    choiceId: "challenge",
  });
  if (!selected.ok) throw new Error(selected.error.message);
  const lesson: LessonStepV1 = {
    id: ids.storyboardStepId(),
    name: "Choose a route",
    actions: [
      {
        kind: "flow",
        trigger: { kind: "choice", choiceId: "challenge" },
      },
      {
        kind: "note",
        text: "The challenge route has explicit higher priority.",
        audience: "teacher",
      },
    ],
    advance: { kind: "manual" },
  };
  const envelope = createLessonStepEnvelope(lesson);
  if (!envelope.ok) throw new Error(envelope.error.message);
  const schedule = compileLessonSchedule([envelope.value]);
  if (!schedule.ok) throw new Error(schedule.error.message);
  const entry = evaluateLessonSchedule(
    schedule.value,
    0,
    new StoryboardStateStore(),
    () => undefined,
  );
  if (!entry.ok) throw new Error(entry.error.message);
  return {
    id: "multi-scene-presentation",
    sceneCount: flow.sceneOrder.length,
    matchingTransitionCount: 2,
    selectedPriority: selected.value.transition.priority,
    selectedChallengeScene: selected.value.transition.toSceneId === challenge,
    directives: entry.value.latestDirectives.map((directive) => directive.kind),
    status: entry.value.status,
  };
}
