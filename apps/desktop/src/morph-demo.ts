import { DeterministicIdFactory } from "@physica/core-model";
import { createSvgMorphPlan } from "@physica/renderer-svg";
import {
  compileMorphSchedule,
  createMatchedTransformPlan,
  evaluateMorphSchedule,
  type MatchedTransformElement,
  type MorphDefinition,
} from "@physica/storyboard";

const ids = new DeterministicIdFactory(221_000);
const sceneId = ids.sceneId();
const definition: MorphDefinition = {
  id: ids.storyboardStepId(),
  name: "Desktop circle to ellipse",
  source: { kind: "representation", sceneId, id: ids.representationId() },
  destination: {
    kind: "representation",
    sceneId,
    id: ids.representationId(),
  },
  clockKey: "presentation",
  startTimeSeconds: 0,
  durationSeconds: 4,
  easing: { kind: "named", id: "ease-in-out" },
  priority: 0,
  reversible: true,
  scrubbable: true,
  operation: { kind: "shape-morph", topology: "closed", sampleCount: 64 },
};
const compiled = compileMorphSchedule([definition]);
if (!compiled.ok) throw new Error(compiled.error.code);
const schedule = compiled.value;

function ellipse(radiusX: number, radiusY: number) {
  return Array.from({ length: 32 }, (_, index) => {
    const angle = (index * Math.PI * 2) / 32;
    return {
      x: 155 + radiusX * Math.cos(angle),
      y: 105 + radiusY * Math.sin(angle),
    };
  });
}

const sourceGeometry = { points: ellipse(48, 48), closed: true };
const destinationGeometry = { points: ellipse(92, 34), closed: true };

function element(
  semanticId: string,
  compatibilityKey: string,
): MatchedTransformElement {
  return {
    semanticId,
    compatibilityKey,
    target: {
      kind: "representation",
      sceneId,
      id: ids.representationId(),
    },
  };
}

const matched = createMatchedTransformPlan(
  [element("force-vector", "svg-path"), element("caption", "text")],
  [element("caption", "image"), element("force-vector", "svg-path")],
);
if (!matched.ok) throw new Error(matched.error.code);
const matchedPlan = matched.value;

function pathData(
  points: readonly { readonly x: number; readonly y: number }[],
) {
  return (
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      )
      .join(" ") + " Z"
  );
}

export const desktopMorphDurationSeconds = schedule.durationSeconds;

export function evaluateDesktopMorph(
  presentationTimeSeconds: number,
  reducedMotion: boolean,
) {
  const frame = evaluateMorphSchedule(schedule, presentationTimeSeconds, {
    reducedMotion,
  });
  if (!frame.ok) throw new Error(frame.error.code);
  const transition = frame.value.transitions[0];
  const progress = transition?.progress ?? 0;
  const plan = createSvgMorphPlan(
    sourceGeometry,
    destinationGeometry,
    progress,
    64,
  );
  if (!plan.ok || plan.value.kind !== "morph")
    throw new Error(plan.ok ? plan.value.kind : plan.error.kind);
  return Object.freeze({
    progress,
    pathData: pathData(plan.value.points),
    sampleCount: plan.value.points.length,
    sourceOpacity: transition?.sourceOpacity ?? 1,
    destinationOpacity: transition?.destinationOpacity ?? 0,
    matchedMorphId: matchedPlan.matches.find(
      ({ strategy }) => strategy === "morph",
    )?.semanticId,
    matchedReplaceId: matchedPlan.matches.find(
      ({ strategy }) => strategy === "replace",
    )?.semanticId,
  });
}
