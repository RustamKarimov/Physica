import { useMemo, useState } from "react";
import {
  DeterministicIdFactory,
  type RelationshipId,
} from "@physica/core-model";
import {
  createControlAction,
  type InteractiveControlV1,
} from "@physica/controls";
import {
  compileRelationshipPlan,
  createPhysicsVectorRepresentation,
  evaluateRelationshipPlan,
  RelationshipStateStore,
  resolvePhysicsVector,
  type DependencyRelationshipV1,
  type RelationshipValue,
} from "@physica/relationships";
import {
  StoryboardStateStore,
  compileLessonSchedule,
  createLessonStepEnvelope,
  evaluateLessonSchedule,
  type LessonSchedule,
  type LessonStepV1,
  type StoryboardSnapshot,
} from "@physica/storyboard";
import "./phase5-workbench.css";

const ids = new DeterministicIdFactory(500_000);
const followerId = ids.relationshipId();
const tangentId = ids.relationshipId();
const originId = ids.relationshipId();
const vectorId = ids.relationshipId();
const vectorRepresentationId = ids.representationId();
const curveControl: InteractiveControlV1 = {
  id: ids.controlId(),
  kind: "slider",
  name: "Curve parameter",
  accessibleLabel: "Curve follower parameter",
  binding: { kind: "presentation-property", path: "curve.parameter" },
  range: { minimum: 0, maximum: 2, step: 1 },
};
const velocityControl: InteractiveControlV1 = {
  id: ids.controlId(),
  kind: "slider",
  name: "Horizontal velocity",
  accessibleLabel: "Horizontal velocity component",
  binding: { kind: "live-runtime-input", key: "projectile.velocity-x" },
  range: { minimum: 0, maximum: 8, step: 0.5 },
  canonicalUnit: "m/s",
};
const curve: RelationshipValue = {
  kind: "curve2",
  samples: [
    { parameter: 0, point: { x: 0, y: 0 } },
    { parameter: 1, point: { x: 1, y: 1 } },
    { parameter: 2, point: { x: 2, y: 4 } },
  ],
  parameterUnit: "s",
  pointUnit: "m",
};
const relationshipDefinitions: readonly DependencyRelationshipV1[] = [
  {
    id: followerId,
    name: "Follower",
    operation: {
      kind: "follow",
      position: { kind: "external", key: "curve-point" },
      offset: { kind: "vec2", x: 0, y: 0.2, unit: "m" },
    },
    target: { kind: "representation", property: "position" },
  },
  {
    id: tangentId,
    name: "Tangent",
    operation: {
      kind: "tangent",
      curve: { kind: "external", key: "curve" },
      parameter: { kind: "external", key: "curve-parameter" },
    },
    target: { kind: "representation", property: "direction" },
  },
  {
    id: originId,
    name: "Vector origin",
    operation: {
      kind: "bind",
      input: { kind: "external", key: "curve-point" },
    },
    target: { kind: "derived", property: "vector-origin" },
  },
  {
    id: vectorId,
    name: "Velocity observable",
    operation: { kind: "bind", input: { kind: "external", key: "velocity" } },
    target: { kind: "derived", property: "velocity-vector" },
  },
];
const compiledRelationships = compileRelationshipPlan(relationshipDefinitions);
if (!compiledRelationships.ok)
  throw new Error(compiledRelationships.error.message);
const relationshipPlan = compiledRelationships.value;
const vectorDefinition = {
  id: vectorRepresentationId,
  originRelationshipId: originId,
  vectorRelationshipId: vectorId,
  worldScale: 0.25,
  label: "Velocity",
  unit: "m/s",
  style: { color: "#36d6c6", lineWidth: 4, headSize: 10 },
};
const vectorEnvelope = createPhysicsVectorRepresentation(vectorDefinition);
if (!vectorEnvelope.ok) throw new Error(vectorEnvelope.error.message);

function createLesson(): LessonSchedule {
  const lessonIds = new DeterministicIdFactory(510_000);
  const steps: readonly LessonStepV1[] = [
    {
      id: lessonIds.storyboardStepId(),
      name: "Resolve the vector",
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
          text: "Separate the mathematical vector from its visual scale.",
          audience: "all",
        },
      ],
      advance: { kind: "manual" },
    },
    {
      id: lessonIds.storyboardStepId(),
      name: "Observe a condition",
      actions: [{ kind: "simulation", command: "play" }],
      advance: {
        kind: "condition",
        sourceKey: "demo.apex",
        operator: "equals",
        value: { kind: "boolean", value: true },
      },
    },
    {
      id: lessonIds.storyboardStepId(),
      name: "Learner checkpoint",
      actions: [
        {
          kind: "note",
          text: "Confirm the difference between physical and layout movement.",
          audience: "learner",
        },
      ],
      advance: {
        kind: "interaction-pause",
        interactionKey: "continue",
        prompt: "Continue after the learner responds",
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
  return schedule.value;
}

function evaluateDemoLesson(
  schedule: LessonSchedule,
  store: StoryboardStateStore,
  apex: boolean,
): StoryboardSnapshot {
  const result = evaluateLessonSchedule(schedule, 0, store, (key) =>
    key === "demo.apex" ? { kind: "boolean", value: apex } : undefined,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function worldToScreen(point: { readonly x: number; readonly y: number }) {
  return { x: 115 + point.x * 125, y: 315 - point.y * 58 };
}

function advanceLesson(
  schedule: LessonSchedule,
  store: StoryboardStateStore,
  snapshot: StoryboardSnapshot,
): StoryboardSnapshot {
  if (snapshot.currentStepIndex === 0) store.requestAdvance();
  if (snapshot.currentStepIndex === 2) store.resumeInteraction("continue");
  let next = evaluateDemoLesson(
    schedule,
    store,
    snapshot.currentStepIndex >= 1,
  );
  if (next.status !== "complete" && next.latestDirectives.length === 0)
    next = evaluateDemoLesson(schedule, store, true);
  return next;
}

export function Phase5Workbench() {
  const [parameter, setParameter] = useState(1);
  const [velocityX, setVelocityX] = useState(3);
  const [lesson] = useState(() => ({
    schedule: createLesson(),
    store: new StoryboardStateStore(),
  }));
  const [storyboard, setStoryboard] = useState(() =>
    evaluateDemoLesson(lesson.schedule, lesson.store, false),
  );
  const resolved = useMemo(() => {
    const point = {
      kind: "vec2" as const,
      x: parameter,
      y: parameter * parameter,
      unit: "m",
    };
    const values = new Map<string, RelationshipValue>([
      ["curve", curve],
      ["curve-point", point],
      ["curve-parameter", { kind: "scalar", value: parameter, unit: "s" }],
      ["velocity", { kind: "vec2", x: velocityX, y: 4, unit: "m/s" }],
    ]);
    const store = new RelationshipStateStore();
    const evaluation = evaluateRelationshipPlan(
      relationshipPlan,
      (key) => values.get(key),
      store,
    );
    if (!evaluation.ok) throw new Error(evaluation.error.message);
    const vector = resolvePhysicsVector(
      vectorDefinition,
      (id: RelationshipId) => evaluation.value.values.get(id),
    );
    if (!vector.ok) throw new Error(vector.error.message);
    return {
      follower: evaluation.value.values.get(followerId),
      tangent: evaluation.value.values.get(tangentId),
      vector: vector.value,
      recomputed: evaluation.value.recomputedIds.length,
    };
  }, [parameter, velocityX]);
  if (resolved.follower?.kind !== "vec2" || resolved.tangent?.kind !== "vec2")
    throw new Error("Phase 5 desktop relationship values are invalid.");
  const follower = worldToScreen(resolved.follower);
  const tangentEnd = {
    x: follower.x + resolved.tangent.x * 90,
    y: follower.y - resolved.tangent.y * 90,
  };
  const vectorTail = worldToScreen(resolved.vector.tail);
  const vectorHead = worldToScreen(resolved.vector.head);
  const latestNote = [...storyboard.directiveHistory]
    .reverse()
    .find((directive) => directive.kind === "note");

  return (
    <section
      className="phase5-workbench"
      id="phase-5-workbench"
      aria-labelledby="phase5-title"
    >
      <div className="phase5-heading">
        <div>
          <span>PHASE 5 · INTEGRATED CONTRACT WORKBENCH</span>
          <h1 id="phase5-title">
            Relationships respond. Controls route. Storyboard teaches.
          </h1>
        </div>
        <p>
          This is a live foundation preview using the real Phase 5 APIs. The
          curve is explicitly piecewise and the projectile observable is a
          fixture; final mechanics and visual polish arrive in later phases.
        </p>
      </div>
      <div className="phase5-grid">
        <div className="phase5-stage">
          <svg
            viewBox="0 0 520 390"
            role="img"
            aria-label="Derived curve follower, tangent and physics-aware velocity vector"
          >
            <defs>
              <marker
                id="phase5-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            <path className="phase5-axis" d="M65 315 H480 M115 350 V45" />
            <path className="phase5-curve" d="M115 315 L240 257 L365 83" />
            <circle
              className="phase5-follower"
              cx={follower.x}
              cy={follower.y}
              r="9"
            />
            <line
              className="phase5-tangent"
              x1={follower.x}
              y1={follower.y}
              x2={tangentEnd.x}
              y2={tangentEnd.y}
              markerEnd="url(#phase5-arrow)"
            />
            <line
              className="phase5-vector"
              x1={vectorTail.x}
              y1={vectorTail.y}
              x2={vectorHead.x}
              y2={vectorHead.y}
              markerEnd="url(#phase5-arrow)"
            />
            <text x="330" y="45">
              velocity observable
            </text>
            <text x="330" y="68">
              |v| = {resolved.vector.magnitude.toFixed(2)} m/s
            </text>
            <text x="75" y="375">
              piecewise relationship model · {resolved.recomputed} derived
              outputs
            </text>
          </svg>
        </div>
        <aside
          className="phase5-controls"
          aria-label="Phase 5 interactive controls"
        >
          <div className="phase5-card">
            <span>CONTROL ROUTING</span>
            <label>
              Curve parameter <output>{parameter.toFixed(0)} s</output>
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                value={parameter}
                onChange={(event) => {
                  const action = createControlAction(curveControl, {
                    kind: "scalar",
                    value: Number(event.target.value),
                  });
                  if (action.ok && action.value.value.kind === "scalar")
                    setParameter(action.value.value.value);
                }}
              />
            </label>
            <label>
              Horizontal velocity <output>{velocityX.toFixed(1)} m/s</output>
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={velocityX}
                onChange={(event) => {
                  const action = createControlAction(velocityControl, {
                    kind: "scalar",
                    value: Number(event.target.value),
                  });
                  if (action.ok && action.value.value.kind === "scalar")
                    setVelocityX(action.value.value.value);
                }}
              />
            </label>
            <p>
              Slider values are normalized first, then routed to presentation or
              live-runtime owners.
            </p>
          </div>
          <div className="phase5-card phase5-story">
            <span>STORYBOARD · {storyboard.status}</span>
            <strong>
              {storyboard.currentStepIndex < lesson.schedule.steps.length
                ? lesson.schedule.steps[storyboard.currentStepIndex]?.name
                : "Explanation complete"}
            </strong>
            <p>
              {latestNote?.kind === "note"
                ? latestNote.text
                : "Ready for the next teacher action."}
            </p>
            <button
              type="button"
              disabled={storyboard.status === "complete"}
              onClick={() =>
                setStoryboard(
                  advanceLesson(lesson.schedule, lesson.store, storyboard),
                )
              }
            >
              {storyboard.currentStepIndex === 2
                ? "Resume interaction"
                : "Advance explanation"}
            </button>
          </div>
          <div className="phase5-authority">
            <b>AUTHORITY CHECK</b>
            <span>Relationships: derived only</span>
            <span>Controls: owner-routed actions</span>
            <span>Storyboard: directives, no solver writes</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
