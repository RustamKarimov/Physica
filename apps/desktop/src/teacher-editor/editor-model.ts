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
import { registerElectricityPhysicsLibrary } from "@physica/physics-electricity";
import { registerFieldsPhysicsLibrary } from "@physica/physics-fields";
import { registerMechanicsPhysicsLibrary } from "@physica/physics-mechanics";
import { registerOpticsPhysicsLibrary } from "@physica/physics-optics";
import { registerThermalPhysicsLibrary } from "@physica/physics-thermal";
import { registerWavePhysicsLibrary } from "@physica/physics-waves";

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
  {
    id: "progressive-wave",
    title: "Progressive wave lesson",
    description: "String, source, support and displacement probe.",
    question:
      "How can the wave pattern move while medium particles remain local?",
    itemIds: ["physica:library/string-rope-wave-setup"],
    seed: 810_000,
  },
  {
    id: "standing-wave",
    title: "Standing-wave explanation",
    description: "Counter-propagating sources with node and antinode markers.",
    question: "Why do standing-wave nodes remain fixed?",
    itemIds: ["physica:library/standing-wave-string"],
    seed: 820_000,
  },
  {
    id: "double-slit",
    title: "Double-slit investigation",
    description: "Coherent source, slit barrier, screen and intensity graph.",
    question: "How do path and phase difference form the fringe pattern?",
    itemIds: ["physica:library/double-slit-setup"],
    seed: 830_000,
  },
  {
    id: "ray-optics",
    title: "Ray-optics bench",
    description:
      "Ray source, refracting boundary, normal and angle indicators.",
    question: "How does refractive index change a ray's direction?",
    itemIds: ["physica:library/ray-box-and-boundary"],
    seed: 840_000,
  },
  {
    id: "polarization",
    title: "Polarization investigation",
    description: "Source, polarizer, analyzer and intensity detector.",
    question: "How does relative axis angle control transmitted intensity?",
    itemIds: ["physica:library/polarizer-analyzer-setup"],
    seed: 850_000,
  },
  {
    id: "charge-current",
    title: "Charge and current lesson",
    description:
      "Charge reservoir, conductor, ammeter, timer and live counter.",
    question: "How does current determine transferred charge over time?",
    itemIds: ["physica:library/current-charge-time-setup"],
    seed: 860_000,
  },
  {
    id: "iv-characteristics",
    title: "I–V investigation",
    description:
      "Source, filament lamp, meters and linked characteristic graph.",
    question: "How does a filament lamp depart from ohmic behavior?",
    itemIds: ["physica:library/filament-lamp-iv-apparatus"],
    seed: 870_000,
  },
  {
    id: "resistivity",
    title: "Resistivity investigation",
    description: "Test wire, geometry markers and electrical probes.",
    question: "How do material and conductor geometry determine resistance?",
    itemIds: ["physica:library/resistivity-wire-apparatus"],
    seed: 880_000,
  },
  {
    id: "dc-network",
    title: "D.C. network lesson",
    description:
      "Source, branches, nodes, meters and Kirchhoff equation panel.",
    question: "How do node potentials determine every branch current?",
    itemIds: ["physica:library/kirchhoff-multi-loop-circuit"],
    seed: 890_000,
  },
  {
    id: "cell-divider",
    title: "Cell and divider lesson",
    description: "Internal resistance, load, potential divider and voltmeters.",
    question: "How are emf, lost volts and divider output related?",
    itemIds: [
      "physica:library/internal-resistance-circuit",
      "physica:library/potential-divider-apparatus",
    ],
    seed: 900_000,
  },
  {
    id: "rc-charging",
    title: "RC charging lesson",
    description:
      "Source, switch, resistor, capacitor and synchronized V–t/I–t graphs.",
    question: "What changes during each RC time constant?",
    itemIds: ["physica:library/rc-charging-circuit"],
    seed: 910_000,
  },
  {
    id: "gravity-field",
    title: "Gravitational field lesson",
    description: "Earth, field probe, vector grid and potential graph.",
    question: "How are gravitational field and potential linked?",
    itemIds: ["physica:library/earth-satellite-system"],
    seed: 920_000,
  },
  {
    id: "circular-orbit",
    title: "Circular orbit lesson",
    description: "Earth, satellite, orbit path, vectors and energy panel.",
    question: "How does orbital radius determine speed, period and energy?",
    itemIds: ["physica:library/circular-orbit-setup"],
    seed: 930_000,
  },
  {
    id: "electric-field",
    title: "Electric field lesson",
    description: "Signed source, field probe, vector grid and equipotentials.",
    question: "How do source sign and position determine E and V?",
    itemIds: ["physica:library/two-charge-field"],
    seed: 940_000,
  },
  {
    id: "charged-particle-plates",
    title: "Charged-particle deflection",
    description: "Parallel plates, electron, force vector and trajectory.",
    question: "How does an electric field alter particle motion?",
    itemIds: ["physica:library/charged-particle-between-plates"],
    seed: 950_000,
  },
  {
    id: "magnetic-force",
    title: "Magnetic force lesson",
    description: "Current-carrying wire, B-field markers and force vector.",
    question: "How are current, field and force directions related?",
    itemIds: ["physica:library/force-on-current-carrying-wire"],
    seed: 960_000,
  },
  {
    id: "induction",
    title: "Induction lesson",
    description: "Coil pair, flux surface and signed emf graph.",
    question: "Why does induced emf oppose the flux change?",
    itemIds: ["physica:library/induction-coil-pair"],
    seed: 970_000,
  },
  {
    id: "ac-rms",
    title: "AC and RMS lesson",
    description: "Sinusoidal source, oscilloscope and RMS marker.",
    question: "How does RMS describe the heating effect of AC?",
    itemIds: ["physica:library/ac-source-oscilloscope"],
    seed: 980_000,
  },
  {
    id: "transformer",
    title: "Transformer lesson",
    description: "Primary, secondary, core, waveforms and power-flow panel.",
    question: "How does turns ratio enable efficient power transmission?",
    itemIds: ["physica:library/power-transmission-setup"],
    seed: 990_000,
  },
  {
    id: "temperature-equilibrium",
    title: "Temperature and equilibrium lesson",
    description: "Two thermal bodies, probes and a linked temperature graph.",
    question: "How does thermal contact produce a shared equilibrium?",
    itemIds: ["physica:library/two-body-thermal-contact"],
    seed: 1_000_000,
  },
  {
    id: "thermometer-calibration",
    title: "Thermometer calibration lesson",
    description: "Fixed points, thermometric property and calibration graph.",
    question: "How do fixed points define a temperature scale?",
    itemIds: ["physica:library/thermometer-calibration-setup"],
    seed: 1_010_000,
  },
  {
    id: "ideal-gas",
    title: "Ideal-gas investigation",
    description: "Gas container, piston, gauges and a shared state table.",
    question: "How are p, V, n and absolute T constrained?",
    itemIds: ["physica:library/fixed-volume-gas-container"],
    seed: 1_020_000,
  },
  {
    id: "particle-gas",
    title: "Particle gas lesson",
    description: "Seeded elastic gas, collision counter and speed histogram.",
    question: "How do molecular collisions connect to gas observables?",
    itemIds: ["physica:library/2d-molecular-gas-box"],
    seed: 1_030_000,
  },
  {
    id: "brownian-motion",
    title: "Brownian motion lesson",
    description: "Gas ensemble, large tracer and deterministic path.",
    question: "How do many impacts produce irregular tracer motion?",
    itemIds: ["physica:library/brownian-motion-cell"],
    seed: 1_040_000,
  },
  {
    id: "thermodynamic-process",
    title: "Thermodynamic process lesson",
    description: "Piston, P–V graph, area shader and energy ledger.",
    question: "How do heat, work and internal energy remain consistent?",
    itemIds: ["physica:library/p-v-process-explorer"],
    seed: 1_050_000,
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
registerWavePhysicsLibrary(physicsLibrary.registries);
registerOpticsPhysicsLibrary(physicsLibrary.registries);
registerElectricityPhysicsLibrary(physicsLibrary.registries);
registerFieldsPhysicsLibrary(physicsLibrary.registries);
registerThermalPhysicsLibrary(physicsLibrary.registries);
const builtInReferences = physicsLibrary.validateReferences();
if (!builtInReferences.ok) throw new Error(builtInReferences.error.message);

export function createEditorSession(template: ProjectTemplate): EditorSession {
  const ids = new DeterministicIdFactory(template.seed);
  const document = createEmptyProject(ids, {
    title: template.title,
    description: template.question,
    tags: [
      "teacher-authored",
      "phase-12",
      "thermal-gases-alpha",
      "fields-ac-alpha",
      "electricity-circuits-alpha",
    ],
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
