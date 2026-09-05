import {
  DeterministicIdFactory,
  registeredTypeId,
  type JsonObject,
  type RegisteredTypeId,
} from "@physica/core-model";
import {
  createPhysicsLibraryRegistries,
  type InstrumentDefinition,
  type CompatibleTargetDefinition,
  type LibraryAnchorDefinition,
  type LibraryItemClass,
  type LibraryItemDefinition,
  type LibraryPortDefinition,
  type LibraryProjectSnapshotTemplate,
  type LibrarySource,
  type MaterialPresetDefinition,
  type PhysicsLibraryRegistries,
  type PrefabDefinition,
} from "@physica/plugin-sdk";
import { PhysicsLibraryCatalog } from "./catalog";

const BUILT_IN_SOURCE: LibrarySource = Object.freeze({
  kind: "built-in",
  sourcePackage: "@physica/assets",
});

const BUILT_IN_LICENSE = Object.freeze({
  spdxId: "LicenseRef-Physica-Built-In",
});

const EXAMPLE_ID = "foundation-object-pack";

interface ObjectDescriptor {
  readonly slug: string;
  readonly displayName: string;
  readonly description: string;
  readonly itemClass: LibraryItemClass;
  readonly tags: readonly string[];
  readonly componentType: string;
  readonly defaultParameters?: JsonObject;
  readonly anchors?: readonly LibraryAnchorDefinition[];
  readonly ports?: readonly LibraryPortDefinition[];
  readonly dimensionality?: "2D" | "3D" | "BOTH";
  readonly compatibleTargets?: readonly CompatibleTargetDefinition[];
  readonly recommendedControlIds?: readonly RegisteredTypeId[];
}

function localAnchor(
  id: string,
  displayName: string,
  x: number,
  y: number,
  anchorType: string,
  compatiblePortTypeIds: readonly RegisteredTypeId[] = [],
): LibraryAnchorDefinition {
  return {
    id,
    displayName,
    anchorTypeId: registeredTypeId(anchorType),
    position: { x, y, z: 0 },
    compatiblePortTypeIds,
  };
}

function localPort(
  id: string,
  displayName: string,
  portType: string,
  anchorId?: string,
): LibraryPortDefinition {
  return {
    id,
    displayName,
    portTypeId: registeredTypeId(portType),
    direction: "bidirectional",
    maximumConnections: 1,
    ...(anchorId === undefined ? {} : { anchorId }),
  };
}

function entityPrefab(
  descriptor: ObjectDescriptor,
  seed: number,
): PrefabDefinition {
  const ids = new DeterministicIdFactory(seed);
  const sceneId = ids.sceneId();
  const entityId = ids.entityId();
  const componentId = ids.componentInstanceId();
  const snapshot: LibraryProjectSnapshotTemplate = {
    templateSceneId: sceneId,
    assets: [],
    datasets: [],
    entityDefinitions: [
      {
        id: entityId,
        name: descriptor.displayName,
        entityTypeId: registeredTypeId("physica:entity/" + descriptor.slug),
        componentInstances: [
          {
            instanceId: componentId,
            componentTypeId: registeredTypeId(descriptor.componentType),
            componentSchemaVersion: 1,
            configuration: descriptor.defaultParameters ?? {},
            initialState: {},
            bindings: [],
            enabled: true,
          },
        ],
        tags: descriptor.tags,
        visualDefaults: { libraryShape: descriptor.slug },
      },
    ],
    systemDefinitions: [],
    clockDefinitions: [],
    eventDefinitions: [],
    relationshipDefinitions: [],
    representations: [],
    controls: [],
    datasetRefs: [],
    equationDefinitions: [],
    graphDefinitions: [],
  };
  return {
    id: registeredTypeId("physica:prefab/" + descriptor.slug),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.displayName,
    source: BUILT_IN_SOURCE,
    targetSlots: [],
    snapshot,
    exampleIds: [EXAMPLE_ID],
  };
}

function itemFor(
  descriptor: ObjectDescriptor,
  prefab: PrefabDefinition,
): LibraryItemDefinition {
  const mechanicsTopics: Readonly<Record<string, readonly number[]>> = {
    ball: [2, 3, 5, 12],
    block: [2, 3],
    trolley: [2, 3],
    car: [2, 12],
    mass: [3, 4, 5],
    string: [3, 12],
    spring: [3, 5, 6],
    pulley: [3],
    support: [4, 6],
    "ground-surface": [2, 3],
    ruler: [1, 4, 6],
    stopwatch: [1, 2, 12],
    "vector-arrow": [1, 2, 3, 12],
    "coordinate-axes": [1, 2],
    "graph-panel": [1, 2, 3, 4, 5, 6, 12],
    "equation-panel": [1, 2, 3, 4, 5, 6, 12],
    "pulley-mass-setup": [3],
  };
  const topicNumbers = mechanicsTopics[descriptor.slug] ?? [];
  return {
    id: registeredTypeId("physica:library/" + descriptor.slug),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.displayName,
    description: descriptor.description,
    itemClass: descriptor.itemClass,
    source: BUILT_IN_SOURCE,
    domainTags: ["physics"],
    curriculumTags: [
      "general",
      ...(topicNumbers.length > 0
        ? [
            "cambridge-9702",
            ...topicNumbers.map((topic) => `cambridge-9702-topic-${topic}`),
          ]
        : []),
    ],
    topicTags: [
      ...descriptor.tags,
      ...topicNumbers.map((topic) => `topic-${topic}`),
    ],
    searchTags: [
      ...new Set([...descriptor.tags, descriptor.displayName.toLowerCase()]),
    ],
    physicalQuantityTags: [],
    thumbnail: {
      kind: "procedural",
      uri: "physica://thumbnail/" + descriptor.slug,
      altText: descriptor.displayName + " library preview",
    },
    defaultParameters: descriptor.defaultParameters ?? {},
    editableProperties: [],
    anchors: descriptor.anchors ?? [],
    ports: descriptor.ports ?? [],
    compatibleTargets: descriptor.compatibleTargets ?? [],
    recommendedRepresentationIds: [],
    recommendedControlIds: descriptor.recommendedControlIds ?? [],
    assumptions: [],
    visualVariants: [],
    dimensionality: descriptor.dimensionality ?? "BOTH",
    exampleIds: [EXAMPLE_ID],
    requiredCoreRange: ">=0.0.0",
    requiredPlugins: [],
    dependentAssetIds: [],
    license: BUILT_IN_LICENSE,
    creation: { kind: "prefab", definitionId: prefab.id },
  };
}

const mechanicsPort = registeredTypeId("physica:port/mechanical-attachment");

const FOUNDATION_OBJECTS: readonly ObjectDescriptor[] = [
  {
    slug: "ball",
    displayName: "Ball",
    description: "A mechanics-ready spherical body with a center anchor.",
    itemClass: "smart-model",
    tags: ["mechanics", "motion", "sphere"],
    componentType: "physica:component/rigid-body",
    defaultParameters: { shape: "sphere", radius: 0.25 },
    anchors: [
      localAnchor("center", "Center", 0, 0, "physica:anchor/body-center"),
    ],
  },
  {
    slug: "block",
    displayName: "Block",
    description: "A rectangular rigid body for force and motion experiments.",
    itemClass: "smart-model",
    tags: ["mechanics", "forces", "rigid-body"],
    componentType: "physica:component/rigid-body",
    defaultParameters: { shape: "box", width: 1, height: 0.6 },
  },
  {
    slug: "trolley",
    displayName: "Trolley",
    description: "A low-friction dynamics trolley with attachment ports.",
    itemClass: "smart-model",
    tags: ["mechanics", "dynamics", "motion"],
    componentType: "physica:component/rigid-body",
    ports: [
      localPort("front", "Front attachment", mechanicsPort, "front"),
      localPort("rear", "Rear attachment", mechanicsPort, "rear"),
    ],
    anchors: [
      localAnchor("front", "Front", 0.6, 0, "physica:anchor/attachment", [
        mechanicsPort,
      ]),
      localAnchor("rear", "Rear", -0.6, 0, "physica:anchor/attachment", [
        mechanicsPort,
      ]),
    ],
  },
  {
    slug: "car",
    displayName: "Car",
    description: "A vehicle model for kinematics and dynamics scenes.",
    itemClass: "smart-model",
    tags: ["mechanics", "kinematics", "vehicle"],
    componentType: "physica:component/rigid-body",
  },
  {
    slug: "mass",
    displayName: "Mass",
    description: "A compact hanging or free mass with a top attachment point.",
    itemClass: "smart-model",
    tags: ["mechanics", "mass", "weight"],
    componentType: "physica:component/rigid-body",
    anchors: [
      localAnchor("top", "Top", 0, -0.3, "physica:anchor/attachment", [
        mechanicsPort,
      ]),
    ],
    ports: [localPort("top", "Top attachment", mechanicsPort, "top")],
  },
  {
    slug: "string",
    displayName: "String",
    description: "A two-ended connector for tension and constraint models.",
    itemClass: "smart-model",
    tags: ["mechanics", "tension", "constraint"],
    componentType: "physica:component/connector",
    anchors: [
      localAnchor("end-a", "End A", -0.5, 0, "physica:anchor/attachment", [
        mechanicsPort,
      ]),
      localAnchor("end-b", "End B", 0.5, 0, "physica:anchor/attachment", [
        mechanicsPort,
      ]),
    ],
    ports: [
      localPort("end-a", "End A", mechanicsPort, "end-a"),
      localPort("end-b", "End B", mechanicsPort, "end-b"),
    ],
  },
  {
    slug: "spring",
    displayName: "Spring",
    description: "An elastic connector with semantic end ports.",
    itemClass: "smart-model",
    tags: ["mechanics", "elasticity", "oscillations"],
    componentType: "physica:component/spring",
    anchors: [
      localAnchor("end-a", "End A", -0.5, 0, "physica:anchor/attachment", [
        mechanicsPort,
      ]),
      localAnchor("end-b", "End B", 0.5, 0, "physica:anchor/attachment", [
        mechanicsPort,
      ]),
    ],
    ports: [
      localPort("end-a", "End A", mechanicsPort, "end-a"),
      localPort("end-b", "End B", mechanicsPort, "end-b"),
    ],
  },
  {
    slug: "pulley",
    displayName: "Pulley",
    description: "A pulley body with support and rope attachment semantics.",
    itemClass: "smart-model",
    tags: ["mechanics", "rotation", "tension"],
    componentType: "physica:component/pulley",
  },
  {
    slug: "support",
    displayName: "Support",
    description: "A visual support point for mechanical arrangements.",
    itemClass: "visual-object",
    tags: ["apparatus", "support"],
    componentType: "physica:component/visual-object",
  },
  {
    slug: "ground-surface",
    displayName: "Ground / Surface",
    description: "A configurable visual surface for experiment layouts.",
    itemClass: "visual-object",
    tags: ["apparatus", "surface", "ground"],
    componentType: "physica:component/visual-object",
  },
  {
    slug: "ruler",
    displayName: "Ruler",
    description: "A visual ruler for scale and distance annotations.",
    itemClass: "instrument",
    tags: ["measurement", "length", "apparatus"],
    componentType: "physica:component/instrument",
  },
  {
    slug: "stopwatch",
    displayName: "Stopwatch",
    description: "A clock-bound time display instrument.",
    itemClass: "instrument",
    tags: ["measurement", "time", "apparatus"],
    componentType: "physica:component/instrument",
  },
  {
    slug: "vector-arrow",
    displayName: "Vector Arrow",
    description:
      "A physics-aware representation that reads a mathematical vector observable.",
    itemClass: "representation",
    tags: ["representation", "vector", "observable", "physics-aware"],
    componentType: "physica:component/representation-panel",
    defaultParameters: {
      representationTypeId: "physica:representation/physics-vector-v1",
      worldScale: 1,
    },
    compatibleTargets: [
      { kind: "observable-kind", valueKind: "vec2" },
      { kind: "observable-kind", valueKind: "vec3" },
    ],
    recommendedControlIds: [
      registeredTypeId("physica:control-kind/vector-handle"),
    ],
  },
  {
    slug: "coordinate-axes",
    displayName: "Coordinate Axes",
    description: "A visual coordinate frame for diagrams and models.",
    itemClass: "visual-object",
    tags: ["representation", "coordinates", "axes"],
    componentType: "physica:component/visual-object",
  },
  {
    slug: "graph-panel",
    displayName: "Graph Panel",
    description: "A graph representation panel ready for later data binding.",
    itemClass: "representation",
    tags: ["representation", "graph", "data"],
    componentType: "physica:component/representation-panel",
  },
  {
    slug: "equation-panel",
    displayName: "Equation Panel",
    description: "An equation representation panel for authored explanations.",
    itemClass: "representation",
    tags: ["representation", "equation", "mathematics"],
    componentType: "physica:component/representation-panel",
  },
  {
    slug: "pulley-mass-setup",
    displayName: "Pulley and Mass Setup",
    description: "A reusable mechanics apparatus arrangement prefab.",
    itemClass: "prefab",
    tags: ["mechanics", "apparatus", "prefab"],
    componentType: "physica:component/prefab-assembly",
  },
];

const TEXT_PRESETS = [
  "Text Block",
  "Definition",
  "Explanation",
  "Caption",
  "Callout",
  "Quote",
  "Bullet List",
  "Examiner Note",
  "Warning",
] as const;

function textDescriptor(
  displayName: (typeof TEXT_PRESETS)[number],
): ObjectDescriptor {
  const slug = "text-" + displayName.toLowerCase().replace(/\s+/gu, "-");
  return {
    slug,
    displayName,
    description: displayName + " authoring preset metadata.",
    itemClass: "visual-object",
    tags: ["text", "authoring", "explanation"],
    componentType: "physica:component/text-block",
    defaultParameters: { preset: displayName },
    dimensionality: "2D",
  };
}

function stopwatchInstrument(prefab: PrefabDefinition): InstrumentDefinition {
  return {
    id: registeredTypeId("physica:instrument/stopwatch"),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: "Stopwatch",
    source: BUILT_IN_SOURCE,
    prefabId: prefab.id,
    portRequirements: [],
    observableKinds: ["time"],
    allowIncompleteAuthoring: true,
    exampleIds: ["bind-instrument"],
  };
}

function neutralMaterial(): MaterialPresetDefinition {
  return {
    id: registeredTypeId("physica:material/neutral-visual"),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: "Neutral Visual Material",
    source: BUILT_IN_SOURCE,
    properties: [],
    exampleIds: [EXAMPLE_ID],
    license: BUILT_IN_LICENSE,
  };
}

function materialItem(
  material: MaterialPresetDefinition,
): LibraryItemDefinition {
  return {
    id: registeredTypeId("physica:library/neutral-visual-material"),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: material.displayName,
    description:
      "A presentation-only neutral material preset with no claimed physical constants.",
    itemClass: "material-preset",
    source: BUILT_IN_SOURCE,
    domainTags: ["physics"],
    curriculumTags: ["general"],
    topicTags: ["visual", "material"],
    searchTags: ["neutral", "visual", "material"],
    physicalQuantityTags: [],
    thumbnail: {
      kind: "procedural",
      uri: "physica://thumbnail/neutral-visual-material",
      altText: "Neutral visual material preview",
    },
    defaultParameters: {},
    editableProperties: [],
    anchors: [],
    ports: [],
    compatibleTargets: [],
    recommendedRepresentationIds: [],
    recommendedControlIds: [],
    assumptions: [],
    visualVariants: [],
    dimensionality: "BOTH",
    exampleIds: [EXAMPLE_ID],
    requiredCoreRange: ">=0.0.0",
    requiredPlugins: [],
    dependentAssetIds: [],
    license: BUILT_IN_LICENSE,
    creation: { kind: "material", definitionId: material.id },
  };
}

function requireRegistration(
  result:
    | { readonly ok: true }
    | {
        readonly ok: false;
        readonly error: { readonly code: string; readonly message: string };
      },
): void {
  if (!result.ok)
    throw new Error(
      "Invalid built-in Physics Library definition: " +
        result.error.code +
        " — " +
        result.error.message,
    );
}

export function registerBuiltInPhysicsLibrary(
  registries: PhysicsLibraryRegistries,
): PhysicsLibraryCatalog {
  const descriptors = [
    ...FOUNDATION_OBJECTS,
    ...TEXT_PRESETS.map(textDescriptor),
  ];
  const prefabs = descriptors.map((descriptor, index) =>
    entityPrefab(descriptor, 10_000 + index * 100),
  );
  const items = descriptors.map((descriptor, index) =>
    itemFor(descriptor, prefabs[index]!),
  );
  const stopwatchPrefab = prefabs.find(
    (entry) => entry.id === registeredTypeId("physica:prefab/stopwatch"),
  )!;
  const instrument = stopwatchInstrument(stopwatchPrefab);
  const stopwatchIndex = items.findIndex(
    (entry) => entry.id === registeredTypeId("physica:library/stopwatch"),
  );
  items[stopwatchIndex] = {
    ...items[stopwatchIndex]!,
    creation: { kind: "instrument", definitionId: instrument.id },
    exampleIds: ["bind-instrument"],
  };
  const material = neutralMaterial();
  requireRegistration(registries.prefabs.registerMany(prefabs));
  requireRegistration(registries.instruments.register(instrument));
  requireRegistration(registries.materials.register(material));
  requireRegistration(
    registries.library.registerMany([...items, materialItem(material)]),
  );
  const catalog = new PhysicsLibraryCatalog(registries);
  const references = catalog.validateReferences();
  if (!references.ok) throw new Error(references.error.message);
  return catalog;
}

export function createBuiltInPhysicsLibrary(): PhysicsLibraryCatalog {
  return registerBuiltInPhysicsLibrary(createPhysicsLibraryRegistries());
}
