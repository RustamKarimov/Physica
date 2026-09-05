import {
  createBuiltInPhysicsLibrary,
  planLibraryInstantiation,
} from "@physica/assets";
import {
  BUILTIN_COMMAND_TYPES,
  DefaultProjectStore,
  command,
  createBuiltinCommandRegistry,
  type ProjectStore,
} from "@physica/commands";
import {
  createEmptyProject,
  createEmptyScene,
  DeterministicIdFactory,
  registeredTypeId,
  type EntityId,
  type RegisteredTypeId,
  type SceneId,
} from "@physica/core-model";
import type { AdvancedTimelineV1 } from "@physica/storyboard";
import { registerMechanicsPhysicsLibrary } from "@physica/physics-mechanics";

export interface ProjectTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly question: string;
  readonly itemIds: readonly string[];
  readonly seed: number;
}

export const PROJECT_TEMPLATES: readonly ProjectTemplate[] = [
  {
    id: "blank",
    title: "Blank investigation",
    description: "An empty scene with all authoring tools ready.",
    question: "What physical relationship would you like learners to explore?",
    itemIds: [],
    seed: 710_000,
  },
  {
    id: "motion",
    title: "Motion explanation",
    description: "A ball, coordinate axes and graph panel to start a lesson.",
    question: "How does an object's motion connect to its graph?",
    itemIds: [
      "physica:library/ball",
      "physica:library/coordinate-axes",
      "physica:library/graph-panel",
    ],
    seed: 720_000,
  },
  {
    id: "equation",
    title: "Equation walkthrough",
    description: "An equation panel and explanation block for a derivation.",
    question: "Which mathematical change should learners understand?",
    itemIds: [
      "physica:library/equation-panel",
      "physica:library/text-explanation",
    ],
    seed: 730_000,
  },
  {
    id: "projectile",
    title: "Projectile lesson",
    description: "Launcher, projectile, trajectory and linked motion graph.",
    question: "How do horizontal and vertical motion combine?",
    itemIds: ["physica:library/projectile-launcher-setup"],
    seed: 740_000,
  },
  {
    id: "incline",
    title: "Inclined-plane FBD",
    description: "A block, plane and resolved force representations.",
    question: "Which forces determine motion down the plane?",
    itemIds: ["physica:library/inclined-plane-block"],
    seed: 750_000,
  },
  {
    id: "pulley",
    title: "Pulley investigation",
    description: "Two masses, one string and a shared constraint.",
    question: "How do the two masses set acceleration and tension?",
    itemIds: ["physica:library/atwood-machine"],
    seed: 760_000,
  },
  {
    id: "collision",
    title: "Collision analysis",
    description: "Track, two trolleys and before/after momentum views.",
    question: "What is conserved through the collision?",
    itemIds: ["physica:library/collision-track"],
    seed: 770_000,
  },
  {
    id: "energy",
    title: "Energy transfer",
    description: "Input, useful output, stores and dissipation.",
    question: "Where does every joule go?",
    itemIds: ["physica:library/efficiency-energy-flow-setup"],
    seed: 780_000,
  },
  {
    id: "stress",
    title: "Stress–strain explanation",
    description: "Specimen, probes, graph and elastic-limit marker.",
    question: "How does a material cross from elastic to plastic behavior?",
    itemIds: ["physica:library/stress-strain-demonstration"],
    seed: 790_000,
  },
  {
    id: "circular",
    title: "Uniform circular motion",
    description: "Ball, orbit, radius and physical vector followers.",
    question: "Why is acceleration inward while velocity is tangent?",
    itemIds: ["physica:library/ball-on-string-circular-motion"],
    seed: 800_000,
  },
];

export interface EditorSession {
  readonly ids: DeterministicIdFactory;
  readonly store: ProjectStore;
  readonly sceneId: SceneId;
  readonly template: ProjectTemplate;
}

export const physicsLibrary = createBuiltInPhysicsLibrary();
registerMechanicsPhysicsLibrary(physicsLibrary.registries);
const mechanicsReferences = physicsLibrary.validateReferences();
if (!mechanicsReferences.ok) throw new Error(mechanicsReferences.error.message);

export function createEditorSession(template: ProjectTemplate): EditorSession {
  const ids = new DeterministicIdFactory(template.seed);
  const document = createEmptyProject(ids, {
    title: template.title,
    description: template.question,
    tags: ["teacher-authored", "phase-8", "mechanics-alpha"],
    createdAt: new Date().toISOString(),
  });
  const store = new DefaultProjectStore(
    document,
    createBuiltinCommandRegistry(),
    ids,
  );
  const scene = createEmptyScene(ids, template.title);
  const added = store.dispatch(
    command(
      ids,
      BUILTIN_COMMAND_TYPES.addScene,
      { scene },
      "Create authoring scene",
    ),
  );
  if (!added.ok) throw new Error(added.error.message);

  const session = { ids, store, sceneId: scene.id, template };
  for (const itemId of template.itemIds) {
    addLibraryItem(session, registeredTypeId(itemId));
  }
  store.markSaved();
  return session;
}

export function addLibraryItem(
  session: EditorSession,
  itemId: RegisteredTypeId,
): readonly EntityId[] {
  const plan = planLibraryInstantiation(physicsLibrary, {
    itemId,
    destinationSceneId: session.sceneId,
    idFactory: session.ids,
  });
  if (!plan.ok) throw new Error(plan.error.message);
  const result = session.store.dispatch(
    command(
      session.ids,
      BUILTIN_COMMAND_TYPES.instantiateLibraryItem,
      plan.value,
      "Add Physics Library item",
    ),
  );
  if (!result.ok) throw new Error(result.error.message);
  return plan.value.snapshot.entityDefinitions.map((entity) => entity.id);
}

export function setPhysicalPosition(
  session: EditorSession,
  entityId: EntityId,
  x: number,
  y: number,
): boolean {
  const scene = session.store
    .getDocument()
    .scenes.find((candidate) => candidate.id === session.sceneId);
  const entity = scene?.entityDefinitions.find(
    (candidate) => candidate.id === entityId,
  );
  const component = entity?.componentInstances[0];
  if (!component) return false;
  const result = session.store.dispatch(
    command(
      session.ids,
      BUILTIN_COMMAND_TYPES.setComponentInitialState,
      {
        sceneId: session.sceneId,
        entityId,
        componentInstanceId: component.instanceId,
        initialState: { ...component.initialState, positionX: x, positionY: y },
      },
      "Move physical initial position",
    ),
  );
  return result.ok;
}

export const TEACHER_TIMELINE: AdvancedTimelineV1 = {
  schemaVersion: 1,
  tracks: [
    {
      id: "animation",
      name: "Animation",
      kind: "animation",
      clockKey: "presentation",
      clips: [
        {
          id: "introduce",
          label: "Introduce model",
          startSeconds: 0,
          durationSeconds: 2.5,
          clockKey: "presentation",
          payload: { action: "reveal" },
        },
        {
          id: "trace",
          label: "Trace explanation",
          startSeconds: 2.5,
          durationSeconds: 3.5,
          clockKey: "presentation",
          payload: { action: "draw-path" },
        },
      ],
    },
    {
      id: "simulation",
      name: "Simulation clock",
      kind: "clock",
      clockKey: "simulation",
      clips: [
        {
          id: "run",
          label: "Run model",
          startSeconds: 1,
          durationSeconds: 4,
          clockKey: "simulation",
          payload: { command: "play" },
        },
      ],
    },
    {
      id: "narration",
      name: "Narration",
      kind: "audio",
      clockKey: "audio",
      clips: [
        {
          id: "voice",
          label: "Teacher explanation",
          startSeconds: 0.5,
          durationSeconds: 4,
          clockKey: "audio",
          payload: { source: "pending-recording" },
        },
      ],
    },
    {
      id: "data",
      name: "Data acquisition",
      kind: "acquisition",
      clockKey: "simulation",
      clips: [
        {
          id: "sample",
          label: "Record observables",
          startSeconds: 1,
          durationSeconds: 4,
          clockKey: "simulation",
          payload: { cadenceSeconds: 0.1 },
        },
      ],
    },
  ],
};

export const PROJECTILE_PHYSSCRIPT = `physica 1
scene "Projectile explanation"
model Ball type physica:model/projectile-v1
set Ball.speed = 20 m/s
set Ball.launch_angle = 45 deg
show physica:representation/trajectory-v1 of Ball
graph Ball.vertical_position against time
step "Maximum height"
pause simulation when Ball.vertical_velocity = 0 m/s
`;

export const EQUATION_PHYSSCRIPT = `physica 1
scene "Equation rearrangement"
step "Begin with Newton's second law"
transform equation EqStart to EqSolved
`;
