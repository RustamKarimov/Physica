import { DeterministicIdFactory, registeredTypeId } from "@physica/core-model";
import {
  type LibraryItemClass,
  type LibraryItemDefinition,
  type LibraryProjectSnapshotTemplate,
  type PhysicsLibraryRegistries,
  type PrefabDefinition,
} from "@physica/plugin-sdk";
import { OPTICS_EXAMPLE_IDS } from "./scenarios";

export interface OpticsLibraryDescriptor {
  readonly name: string;
  readonly itemClass: LibraryItemClass;
  readonly extension: "geometrical" | "physical";
}

function group(
  extension: OpticsLibraryDescriptor["extension"],
  itemClass: LibraryItemClass,
  names: readonly string[],
): OpticsLibraryDescriptor[] {
  return names.map((name) => ({ name, itemClass, extension }));
}

export const OPTICS_LIBRARY_DESCRIPTORS: readonly OpticsLibraryDescriptor[] =
  Object.freeze([
    ...group("geometrical", "smart-model", [
      "Snell-Law Boundary",
      "Thin Lens Model",
      "Plane Mirror Model",
      "Curved Mirror Model",
      "Prism Ray Model",
    ]),
    ...group("geometrical", "prefab", [
      "Ray Box and Boundary",
      "Thin-Lens Bench",
      "Two-Lens System",
      "Prism Explorer",
    ]),
    ...group("geometrical", "visual-object", [
      "optical ray",
      "surface normal",
      "plane mirror",
      "curved mirror",
      "thin lens",
      "prism",
      "virtual image marker",
    ]),
    ...group("physical", "smart-model", [
      "Finite-Slit Diffraction",
      "Diffraction Grating",
      "Malus-Law Polarization",
    ]),
    ...group("physical", "prefab", [
      "Polarizer–Analyzer Setup",
      "Physical Optics Screen",
    ]),
    ...group("physical", "visual-object", [
      "polarizer",
      "analyzer",
      "optical screen",
    ]),
    ...group("physical", "representation", [
      "principal-ray overlay",
      "critical-angle indicator",
      "polarization-axis vectors",
      "grating-order markers",
    ]),
  ]);

export function opticsLibrarySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[–+&/]/gu, " ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

const PARTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "ray-box-and-boundary": ["Ray box", "Boundary", "Normal", "Angle indicators"],
  "thin-lens-bench": ["Object", "Thin lens", "Principal rays", "Image screen"],
  "polarizer-analyzer-setup": [
    "Source",
    "Polarizer",
    "Analyzer",
    "Intensity detector",
  ],
  "physical-optics-screen": ["Aperture", "Screen", "Intensity strip", "Graph"],
});

export function registerOpticsPhysicsLibrary(
  registries: PhysicsLibraryRegistries,
): void {
  const source = Object.freeze({
    kind: "built-in" as const,
    sourcePackage: "@physica/physics-optics",
  });
  const missing = OPTICS_LIBRARY_DESCRIPTORS.filter(
    (descriptor) =>
      !registries.library.has(
        registeredTypeId(
          `physica:library/${opticsLibrarySlug(descriptor.name)}`,
        ),
      ),
  );
  const prefabs: PrefabDefinition[] = missing.map((descriptor, index) => {
    const ids = new DeterministicIdFactory(950_000 + index * 100);
    const sceneId = ids.sceneId();
    const parts = PARTS[opticsLibrarySlug(descriptor.name)] ?? [
      descriptor.name,
    ];
    const snapshot: LibraryProjectSnapshotTemplate = {
      templateSceneId: sceneId,
      assets: [],
      datasets: [],
      entityDefinitions: parts.map((name, partIndex) => ({
        id: ids.entityId(),
        name,
        entityTypeId: registeredTypeId(
          `physica:entity/${opticsLibrarySlug(name)}`,
        ),
        componentInstances: [
          {
            instanceId: ids.componentInstanceId(),
            componentTypeId: registeredTypeId(
              `physica:component/${opticsLibrarySlug(name)}-v1`,
            ),
            componentSchemaVersion: 1,
            configuration: {
              opticsLibraryRole: descriptor.itemClass,
              partIndex,
            },
            initialState: {},
            bindings: [],
            enabled: true,
          },
        ],
        tags: ["optics", descriptor.extension],
        visualDefaults: { libraryShape: opticsLibrarySlug(name) },
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
    return {
      id: registeredTypeId(
        `physica:prefab/${opticsLibrarySlug(descriptor.name)}`,
      ),
      schemaVersion: 1,
      version: "1.0.0",
      displayName: descriptor.name,
      source,
      targetSlots: [],
      snapshot,
      exampleIds: OPTICS_EXAMPLE_IDS,
    };
  });
  const items: LibraryItemDefinition[] = missing.map((descriptor, index) => ({
    id: registeredTypeId(
      `physica:library/${opticsLibrarySlug(descriptor.name)}`,
    ),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.name,
    description: `${descriptor.name} for deterministic ${descriptor.extension} optics teaching.`,
    itemClass: descriptor.itemClass,
    source,
    domainTags: ["physics", "optics", descriptor.extension],
    curriculumTags:
      descriptor.extension === "physical" ? ["cambridge-9702-topic-8"] : [],
    topicTags: ["extended-optics", descriptor.extension],
    searchTags: [opticsLibrarySlug(descriptor.name), "ray", "light"],
    physicalQuantityTags: ["angle", "wavelength", "intensity"],
    thumbnail: {
      kind: "procedural",
      uri: `physica://thumbnail/${opticsLibrarySlug(descriptor.name)}`,
      altText: `${descriptor.name} optics preview`,
    },
    defaultParameters: {},
    editableProperties: [],
    anchors: [],
    ports: [],
    compatibleTargets: [],
    recommendedRepresentationIds: [],
    recommendedControlIds: [],
    assumptions: [
      {
        id: "optics-approximation",
        description: "Declared educational optics approximation.",
      },
    ],
    visualVariants: [
      {
        id: "schematic",
        displayName: "Scientific schematic",
        visual: { style: "schematic" },
      },
    ],
    dimensionality: "2D",
    exampleIds: OPTICS_EXAMPLE_IDS,
    requiredCoreRange: ">=0.0.0",
    requiredPlugins: [],
    dependentAssetIds: [],
    license: { spdxId: "LicenseRef-Physica-Built-In" },
    creation: { kind: "prefab", definitionId: prefabs[index]!.id },
  }));
  const prefabResult = registries.prefabs.registerMany(prefabs);
  if (!prefabResult.ok) throw new Error(prefabResult.error.message);
  const itemResult = registries.library.registerMany(items);
  if (!itemResult.ok) throw new Error(itemResult.error.message);
}

export function opticsLibraryRequirementIds(): readonly string[] {
  return Object.freeze(
    OPTICS_LIBRARY_DESCRIPTORS.map(
      (descriptor) => `physica:library/${opticsLibrarySlug(descriptor.name)}`,
    ),
  );
}
