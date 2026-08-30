import { DeterministicIdFactory } from "@physica/core-model";
import {
  compileAnimationSchedule,
  evaluateAnimationSchedule,
  type AnimationDefinition,
} from "@physica/storyboard";

export function runMoveScaleRotate() {
  const ids = new DeterministicIdFactory(160_000);
  const sceneId = ids.sceneId();
  const representationId = ids.representationId();
  const base = {
    name: "Animation",
    target: { kind: "representation" as const, sceneId, id: representationId },
    clockKey: "presentation" as const,
    startTimeSeconds: 0,
    durationSeconds: 2,
    easing: { kind: "named" as const, id: "linear" as const },
    conflictPolicy: "replace" as const,
    priority: 0,
    reversible: true,
    scrubbable: true,
  };
  const animations: readonly AnimationDefinition[] = [
    {
      ...base,
      id: ids.storyboardStepId(),
      name: "Move",
      channel: "presentation.translation",
      startValue: { kind: "vec3", x: 0, y: 0, z: 0 },
      endValue: { kind: "vec3", x: 120, y: -40, z: 0 },
    },
    {
      ...base,
      id: ids.storyboardStepId(),
      name: "Rotate",
      channel: "presentation.rotation",
      startValue: { kind: "scalar", value: 0 },
      endValue: { kind: "scalar", value: Math.PI },
    },
    {
      ...base,
      id: ids.storyboardStepId(),
      name: "Scale",
      channel: "presentation.scale",
      startValue: { kind: "vec3", x: 1, y: 1, z: 1 },
      endValue: { kind: "vec3", x: 1.5, y: 1.5, z: 1.5 },
    },
  ];
  const schedule = compileAnimationSchedule(animations);
  if (!schedule.ok) throw new Error(schedule.error.code);
  const sample = (timeSeconds: number) => {
    const result = evaluateAnimationSchedule(schedule.value, timeSeconds);
    if (!result.ok) throw new Error(result.error.code);
    const target = result.value.targets[0]!;
    return {
      timeSeconds,
      translation: target.translation,
      rotationRadians: target.rotationRadians,
      scale: target.scale,
    };
  };
  const forward = [sample(0), sample(1), sample(2)];
  const reverse = sample(1);
  return {
    id: "move-scale-rotate",
    durationSeconds: schedule.value.durationSeconds,
    forward,
    reverse,
    equalTimeDeterministic:
      JSON.stringify(forward[1]) === JSON.stringify(reverse),
  };
}
