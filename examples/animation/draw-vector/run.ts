import { DeterministicIdFactory } from "@physica/core-model";
import { createSvgStrokeDrawPlan } from "@physica/renderer-svg";
import {
  compileRevealSchedule,
  evaluateRevealSchedule,
  type RevealDefinition,
} from "@physica/storyboard";

export function runDrawVector() {
  const ids = new DeterministicIdFactory(190_000);
  const definition: RevealDefinition = {
    id: ids.storyboardStepId(),
    name: "Draw force vector",
    target: {
      kind: "representation",
      sceneId: ids.sceneId(),
      id: ids.representationId(),
    },
    clockKey: "presentation",
    startTimeSeconds: 0,
    durationSeconds: 2,
    easing: { kind: "named", id: "linear" },
    priority: 0,
    reversible: true,
    scrubbable: true,
    operation: {
      kind: "draw-path",
      direction: "forward",
      startProgress: 0,
      endProgress: 1,
    },
  };
  const schedule = compileRevealSchedule([definition]);
  if (!schedule.ok) throw new Error(schedule.error.code);
  const points = [
    { x: 0, y: 0 },
    { x: 60, y: 80 },
  ];
  const sample = (timeSeconds: number) => {
    const frame = evaluateRevealSchedule(schedule.value, timeSeconds);
    if (!frame.ok) throw new Error(frame.error.code);
    const state = frame.value.targets[0]!.path!.value;
    const plan = createSvgStrokeDrawPlan(
      points,
      state.progress,
      state.direction,
    );
    if (!plan.ok) throw new Error(plan.error.kind);
    return {
      timeSeconds,
      progress: state.progress,
      visibleLength: plan.value.visibleLength,
      visiblePoints: plan.value.visiblePoints,
      dashOffset: plan.value.dashOffset,
      arrowHeadVisible: plan.value.arrowHeadVisible,
    };
  };
  return {
    id: "draw-vector",
    totalLength: 100,
    samples: [sample(0), sample(1), sample(2)],
    equalTimeDeterministic:
      JSON.stringify(sample(1)) === JSON.stringify(sample(1)),
  };
}
