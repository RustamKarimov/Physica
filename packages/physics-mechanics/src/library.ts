import { DeterministicIdFactory, registeredTypeId } from "@physica/core-model";
import {
  type InstrumentDefinition,
  type LibraryItemDefinition,
  type LibraryProjectSnapshotTemplate,
  type LibrarySource,
  type PhysicsLibraryRegistries,
  type PrefabDefinition,
} from "@physica/plugin-sdk";
import {
  MECHANICS_LIBRARY_DESCRIPTORS,
  mechanicsLibrarySlug,
} from "./library-descriptors";
import type { MechanicsLibraryDescriptor } from "./library-model-descriptors";

const SOURCE: LibrarySource = Object.freeze({
  kind: "built-in",
  sourcePackage: "@physica/physics-mechanics",
});
const LICENSE = Object.freeze({ spdxId: "LicenseRef-Physica-Built-In" });

const ALPHA_PARTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "projectile-launcher-setup": [
    "Launcher",
    "Projectile",
    "Ground plane",
    "Trajectory",
    "Motion graph",
  ],
  "inclined-plane-block": [
    "Inclined plane",
    "Mass block",
    "Weight vector",
    "Normal vector",
    "Friction vector",
    "Free-body diagram",
  ],
  "atwood-machine": ["Pulley", "Mass A", "Mass B", "String", "Tension vectors"],
  "two-block-pulley-system": [
    "Pulley",
    "Block A",
    "Block B",
    "String",
    "Force diagram",
  ],
  "collision-track": [
    "Track",
    "Trolley A",
    "Trolley B",
    "Momentum vectors",
    "Before/after panel",
  ],
  "efficiency-energy-flow-setup": [
    "Energy input",
    "Useful output",
    "Dissipation",
    "Energy-flow diagram",
    "Power meter",
  ],
  "stress-strain-demonstration": [
    "Material specimen",
    "Force sensor",
    "Extensometer",
    "Stress-strain graph",
    "Elastic-limit marker",
  ],
  "ball-on-string-circular-motion": [
    "Centre marker",
    "String",
    "Ball",
    "Radius line",
    "Velocity vector",
    "Centripetal-force vector",
  ],
});

function snapshot(
  descriptor: MechanicsLibraryDescriptor,
  seed: number,
): LibraryProjectSnapshotTemplate {
  const ids = new DeterministicIdFactory(seed);
  const sceneId = ids.sceneId();
  const partNames = ALPHA_PARTS[mechanicsLibrarySlug(descriptor.name)] ?? [
    descriptor.name,
  ];
  return {
    templateSceneId: sceneId,
    assets: [],
    datasets: [],
    entityDefinitions: partNames.map((partName, index) => ({
      id: ids.entityId(),
      name: partName,
      entityTypeId: registeredTypeId(
        `physica:entity/${mechanicsLibrarySlug(partName)}`,
      ),
      componentInstances: [
        {
          instanceId: ids.componentInstanceId(),
          componentTypeId: registeredTypeId(
            descriptor.itemClass === "smart-model"
              ? `physica:model/${mechanicsLibrarySlug(descriptor.name)}-v1`
              : `physica:component/${mechanicsLibrarySlug(partName)}-v1`,
          ),
          componentSchemaVersion: 1,
          configuration: {
            ...(descriptor.defaultParameters ?? {}),
            mechanicsLibraryRole: descriptor.itemClass,
            partIndex: index,
          },
          initialState: {},
          bindings: [],
          enabled: true,
        },
      ],
      tags: ["mechanics", ...descriptor.tags],
      visualDefaults: { libraryShape: mechanicsLibrarySlug(partName) },
    })),
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
}

function prefabFor(
  descriptor: MechanicsLibraryDescriptor,
  seed: number,
): PrefabDefinition {
  return {
    id: registeredTypeId(
      `physica:prefab/${mechanicsLibrarySlug(descriptor.name)}`,
    ),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.name,
    source: SOURCE,
    targetSlots: [],
    snapshot: snapshot(descriptor, seed),
    exampleIds: descriptor.examples,
  };
}

function itemFor(
  descriptor: MechanicsLibraryDescriptor,
  prefab: PrefabDefinition,
  instrument?: InstrumentDefinition,
): LibraryItemDefinition {
  const idSlug = mechanicsLibrarySlug(descriptor.name);
  return {
    id: registeredTypeId(`physica:library/${idSlug}`),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.name,
    description: `${descriptor.name} for deterministic mechanics teaching.`,
    itemClass: descriptor.itemClass,
    source: SOURCE,
    domainTags: ["physics", "mechanics"],
    curriculumTags: [
      "cambridge-9702",
      ...descriptor.topics.map((topic) => `cambridge-9702-topic-${topic}`),
    ],
    topicTags: descriptor.topics.map((topic) => `topic-${topic}`),
    searchTags: [
      ...new Set([...descriptor.tags, idSlug, ...descriptor.examples]),
    ],
    physicalQuantityTags: descriptor.tags,
    thumbnail: {
      kind: "procedural",
      uri: `physica://thumbnail/${idSlug}`,
      altText: `${descriptor.name} mechanics preview`,
    },
    defaultParameters: descriptor.defaultParameters ?? {},
    editableProperties: [],
    anchors: [],
    ports: [],
    compatibleTargets: [],
    recommendedRepresentationIds: [],
    recommendedControlIds: [],
    assumptions:
      descriptor.itemClass === "smart-model"
        ? [
            {
              id: "educational-model",
              description:
                "Model assumptions are shown with the active configuration.",
            },
          ]
        : [],
    visualVariants: [
      {
        id: "schematic",
        displayName: "Scientific schematic",
        visual: { style: "schematic" },
      },
    ],
    dimensionality: "2D",
    exampleIds: descriptor.examples,
    requiredCoreRange: ">=0.0.0",
    requiredPlugins: [],
    dependentAssetIds: [],
    license: LICENSE,
    ...(descriptor.itemClass === "smart-model"
      ? {
          modelProvenance: {
            modelId: registeredTypeId(`physica:model/${idSlug}-v1`),
            version: "1.0.0",
            reference: "Physica Phase 8 mechanics analytical model catalog",
          },
        }
      : {}),
    creation: instrument
      ? { kind: "instrument", definitionId: instrument.id }
      : { kind: "prefab", definitionId: prefab.id },
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
      `Invalid mechanics Library definition: ${result.error.code} — ${result.error.message}`,
    );
}

export function registerMechanicsPhysicsLibrary(
  registries: PhysicsLibraryRegistries,
): void {
  const missing = MECHANICS_LIBRARY_DESCRIPTORS.filter(
    (descriptor) =>
      !registries.library.has(
        registeredTypeId(
          `physica:library/${mechanicsLibrarySlug(descriptor.name)}`,
        ),
      ),
  );
  const prefabs = missing.map((descriptor, index) =>
    prefabFor(descriptor, 800_000 + index * 500),
  );
  const instruments: InstrumentDefinition[] = [];
  missing.forEach((descriptor, index) => {
    if (descriptor.itemClass === "instrument")
      instruments.push({
        id: registeredTypeId(
          `physica:instrument/${mechanicsLibrarySlug(descriptor.name)}`,
        ),
        schemaVersion: 1,
        version: "1.0.0",
        displayName: descriptor.name,
        source: SOURCE,
        prefabId: prefabs[index]!.id,
        portRequirements: [],
        observableKinds: descriptor.tags,
        allowIncompleteAuthoring: true,
        exampleIds: descriptor.examples,
      });
  });
  const instrumentByName = new Map(
    instruments.map((instrument) => [instrument.displayName, instrument]),
  );
  requireRegistration(registries.prefabs.registerMany(prefabs));
  requireRegistration(registries.instruments.registerMany(instruments));
  requireRegistration(
    registries.library.registerMany(
      missing.map((descriptor, index) =>
        itemFor(
          descriptor,
          prefabs[index]!,
          instrumentByName.get(descriptor.name),
        ),
      ),
    ),
  );
}

export function mechanicsLibraryRequirementIds(): readonly string[] {
  return Object.freeze(
    MECHANICS_LIBRARY_DESCRIPTORS.map(
      (descriptor) =>
        `physica:library/${mechanicsLibrarySlug(descriptor.name)}`,
    ),
  );
}
