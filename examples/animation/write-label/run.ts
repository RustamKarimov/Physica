import { DeterministicIdFactory } from "@physica/core-model";
import {
  compileRevealSchedule,
  evaluateRevealSchedule,
  type RevealDefinition,
} from "@physica/storyboard";
import { writtenGraphemePrefix } from "@physica/typography";

const LABEL = "Force: e\u0301 👩‍🔬";

export function runWriteLabel() {
  const ids = new DeterministicIdFactory(191_000);
  const definition: RevealDefinition = {
    id: ids.storyboardStepId(),
    name: "Write force label",
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
      kind: "write-label",
      startProgress: 0,
      endProgress: 1,
    },
  };
  const schedule = compileRevealSchedule([definition]);
  if (!schedule.ok) throw new Error(schedule.error.code);
  const sample = (timeSeconds: number, reducedMotion = false) => {
    const frame = evaluateRevealSchedule(schedule.value, timeSeconds, {
      reducedMotion,
    });
    if (!frame.ok) throw new Error(frame.error.code);
    const progress = frame.value.targets[0]!.label!.value;
    const prefix = writtenGraphemePrefix(LABEL, progress, "en");
    if (!prefix.ok) throw new Error(prefix.error.kind);
    return {
      timeSeconds,
      reducedMotion,
      progress,
      visibleCount: prefix.value.visibleCount,
      visibleText: prefix.value.visibleText,
    };
  };
  const segmented = writtenGraphemePrefix(LABEL, 1, "en");
  if (!segmented.ok) throw new Error(segmented.error.kind);
  return {
    id: "write-label",
    sourceText: LABEL,
    graphemes: segmented.value.segments,
    samples: [sample(0), sample(1), sample(2)],
    reducedMotionAtStart: sample(0, true),
  };
}
