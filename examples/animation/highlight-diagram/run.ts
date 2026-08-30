import { DeterministicIdFactory } from "@physica/core-model";
import { resolveSvgEmphasis } from "@physica/renderer-svg";
import {
  compileRevealSchedule,
  evaluateRevealSchedule,
  type RevealDefinition,
} from "@physica/storyboard";

export function runHighlightDiagram() {
  const ids = new DeterministicIdFactory(192_000);
  const sceneId = ids.sceneId();
  const base = {
    name: "Emphasis",
    clockKey: "presentation" as const,
    startTimeSeconds: 0,
    durationSeconds: 2,
    easing: { kind: "named" as const, id: "linear" as const },
    priority: 0,
    reversible: true,
    scrubbable: true,
  };
  const definitions: RevealDefinition[] = [
    {
      ...base,
      id: ids.storyboardStepId(),
      target: {
        kind: "representation",
        sceneId,
        id: ids.representationId(),
      },
      operation: {
        kind: "emphasis",
        mode: "highlight",
        startIntensity: 0,
        endIntensity: 1,
        accent: { red: 0.965, green: 0.78, blue: 0.263, alpha: 1 },
      },
    },
    {
      ...base,
      id: ids.storyboardStepId(),
      target: {
        kind: "representation",
        sceneId,
        id: ids.representationId(),
      },
      operation: {
        kind: "emphasis",
        mode: "dim",
        startIntensity: 0,
        endIntensity: 1,
      },
    },
  ];
  const schedule = compileRevealSchedule(definitions);
  if (!schedule.ok) throw new Error(schedule.error.code);
  const sample = (timeSeconds: number) => {
    const frame = evaluateRevealSchedule(schedule.value, timeSeconds);
    if (!frame.ok) throw new Error(frame.error.code);
    return {
      timeSeconds,
      targets: frame.value.targets.map((target) => {
        const emphasis = target.emphasis!.value;
        const style = resolveSvgEmphasis(emphasis.mode, emphasis.intensity);
        if (!style.ok) throw new Error(style.error.kind);
        return {
          representationId: target.representationId,
          mode: emphasis.mode,
          intensity: emphasis.intensity,
          opacityMultiplier: style.value.opacityMultiplier,
          accentIntensity: style.value.accentIntensity,
        };
      }),
    };
  };
  return {
    id: "highlight-diagram",
    explanation: "Focus on the force vector; velocity remains context.",
    samples: [sample(0), sample(1), sample(2)],
  };
}
