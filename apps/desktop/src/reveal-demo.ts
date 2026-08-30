import { DeterministicIdFactory } from "@physica/core-model";
import {
  createSvgStrokeDrawPlan,
  resolveSvgEmphasis,
} from "@physica/renderer-svg";
import {
  compileRevealSchedule,
  evaluateRevealSchedule,
  type RevealDefinition,
} from "@physica/storyboard";
import { writtenGraphemePrefix } from "@physica/typography";

const ids = new DeterministicIdFactory(171_000);
const sceneId = ids.sceneId();
const pathId = ids.representationId();
const labelId = ids.representationId();
const focusId = ids.representationId();
const contextId = ids.representationId();
const base = {
  name: "Desktop reveal",
  clockKey: "presentation" as const,
  startTimeSeconds: 0,
  durationSeconds: 4,
  easing: { kind: "named" as const, id: "ease-in-out" as const },
  priority: 0,
  reversible: true,
  scrubbable: true,
};
const definitions: readonly RevealDefinition[] = [
  {
    ...base,
    id: ids.storyboardStepId(),
    target: { kind: "representation", sceneId, id: pathId },
    operation: {
      kind: "draw-path",
      direction: "forward",
      startProgress: 0,
      endProgress: 1,
    },
  },
  {
    ...base,
    id: ids.storyboardStepId(),
    target: { kind: "representation", sceneId, id: labelId },
    operation: {
      kind: "write-label",
      startProgress: 0,
      endProgress: 1,
    },
  },
  {
    ...base,
    id: ids.storyboardStepId(),
    target: { kind: "representation", sceneId, id: focusId },
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
    target: { kind: "representation", sceneId, id: contextId },
    operation: {
      kind: "emphasis",
      mode: "dim",
      startIntensity: 0,
      endIntensity: 1,
    },
  },
];
const compiled = compileRevealSchedule(definitions);
if (!compiled.ok) throw new Error(compiled.error.code);
const schedule = compiled.value;
const fullLabel = "Resultant force F = ma · 👩‍🔬";

export const desktopRevealDurationSeconds = schedule.durationSeconds;

export function evaluateDesktopReveal(
  presentationTimeSeconds: number,
  reducedMotion: boolean,
) {
  const frame = evaluateRevealSchedule(schedule, presentationTimeSeconds, {
    reducedMotion,
  });
  if (!frame.ok) throw new Error(frame.error.code);
  const find = (representationId: string) =>
    frame.value.targets.find(
      (target) => target.representationId === representationId,
    );
  const progress = find(pathId)?.path?.value.progress ?? 0;
  const drawPlan = createSvgStrokeDrawPlan(
    [
      { x: 52, y: 166 },
      { x: 255, y: 56 },
    ],
    progress,
  );
  if (!drawPlan.ok) throw new Error(drawPlan.error.kind);
  const labelProgress = find(labelId)?.label?.value ?? 0;
  const prefix = writtenGraphemePrefix(fullLabel, labelProgress, "en");
  if (!prefix.ok) throw new Error(prefix.error.kind);
  const highlightIntensity = find(focusId)?.emphasis?.value.intensity ?? 0;
  const dimIntensity = find(contextId)?.emphasis?.value.intensity ?? 0;
  const highlight = resolveSvgEmphasis("highlight", highlightIntensity);
  const dim = resolveSvgEmphasis("dim", dimIntensity);
  if (!highlight.ok || !dim.ok) throw new Error("invalid-emphasis");
  return Object.freeze({
    fullLabel,
    visibleLabel: prefix.value.visibleText,
    visibleGraphemes: prefix.value.visibleCount,
    totalGraphemes: prefix.value.segments.length,
    pathProgress: progress,
    dashArray: drawPlan.value.dashArray,
    dashOffset: drawPlan.value.dashOffset,
    arrowHeadVisible: drawPlan.value.arrowHeadVisible,
    highlightIntensity: highlight.value.accentIntensity,
    contextOpacity: dim.value.opacityMultiplier,
  });
}
