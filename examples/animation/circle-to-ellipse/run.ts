import { DeterministicIdFactory } from "@physica/core-model";
import { createSvgMorphPlan } from "@physica/renderer-svg";
import {
  compileMorphSchedule,
  createMatchedTransformPlan,
  evaluateMorphSchedule,
  type MatchedTransformElement,
  type MorphDefinition,
} from "@physica/storyboard";

function ellipse(radiusX: number, radiusY: number) {
  return Array.from({ length: 32 }, (_, index) => {
    const angle = (index * Math.PI * 2) / 32;
    return { x: radiusX * Math.cos(angle), y: radiusY * Math.sin(angle) };
  });
}

function rounded(value: number): number {
  const result = Number(value.toFixed(6));
  return Object.is(result, -0) ? 0 : result;
}

export function runCircleToEllipse() {
  const ids = new DeterministicIdFactory(220_000);
  const sceneId = ids.sceneId();
  const definition: MorphDefinition = {
    id: ids.storyboardStepId(),
    name: "Circle to ellipse",
    source: {
      kind: "representation",
      sceneId,
      id: ids.representationId(),
    },
    destination: {
      kind: "representation",
      sceneId,
      id: ids.representationId(),
    },
    clockKey: "presentation",
    startTimeSeconds: 0,
    durationSeconds: 4,
    easing: { kind: "named", id: "linear" },
    priority: 0,
    reversible: true,
    scrubbable: true,
    operation: { kind: "shape-morph", topology: "closed", sampleCount: 64 },
  };
  const schedule = compileMorphSchedule([definition]);
  if (!schedule.ok) throw new Error(schedule.error.code);
  const source = { points: ellipse(40, 40), closed: true };
  const destination = { points: ellipse(72, 28), closed: true };
  const sample = (timeSeconds: number) => {
    const frame = evaluateMorphSchedule(schedule.value, timeSeconds);
    if (!frame.ok) throw new Error(frame.error.code);
    const transition = frame.value.transitions[0]!;
    const plan = createSvgMorphPlan(
      source,
      destination,
      transition.progress,
      64,
    );
    if (!plan.ok || plan.value.kind !== "morph")
      throw new Error(plan.ok ? plan.value.kind : plan.error.kind);
    const morphPlan = plan.value;
    const points = [0, 16, 32, 48].map((index) => ({
      x: rounded(morphPlan.points[index]!.x),
      y: rounded(morphPlan.points[index]!.y),
    }));
    return {
      timeSeconds,
      progress: transition.progress,
      sampleCount: morphPlan.points.length,
      cardinalPoints: points,
    };
  };

  const element = (
    semanticId: string,
    compatibilityKey: string,
  ): MatchedTransformElement => ({
    semanticId,
    compatibilityKey,
    target: {
      kind: "representation",
      sceneId,
      id: ids.representationId(),
    },
  });
  const matches = createMatchedTransformPlan(
    [element("force", "path"), element("label", "text")],
    [
      element("label", "image"),
      element("force", "path"),
      element("new-value", "text"),
    ],
  );
  if (!matches.ok) throw new Error(matches.error.code);
  const fallback = createSvgMorphPlan(
    {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      closed: false,
    },
    { points: ellipse(10, 6), closed: true },
    0.5,
  );
  if (!fallback.ok) throw new Error(fallback.error.kind);
  const atHalf = sample(2);
  return {
    id: "circle-to-ellipse",
    samples: [sample(0), atHalf, sample(4)],
    equalTimeDeterministic:
      JSON.stringify(sample(2)) === JSON.stringify(atHalf),
    matchedStrategies: matches.value.matches.map(
      ({ semanticId, strategy }) => `${semanticId}:${strategy}`,
    ),
    enteringIds: matches.value.entries.map(({ semanticId }) => semanticId),
    exitingIds: matches.value.exits.map(({ semanticId }) => semanticId),
    incompatibleFallback: fallback.value,
  };
}
