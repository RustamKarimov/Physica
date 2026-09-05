import { DeterministicIdFactory, registeredTypeId } from "@physica/core-model";
import {
  type LibraryItemClass,
  type LibraryItemDefinition,
  type LibraryProjectSnapshotTemplate,
  type PhysicsLibraryRegistries,
  type PrefabDefinition,
} from "@physica/plugin-sdk";
import { WAVE_EXAMPLE_IDS } from "./scenarios";

export interface WaveLibraryDescriptor {
  readonly name: string;
  readonly topic: 7 | 8;
  readonly itemClass: LibraryItemClass;
}

function descriptors(
  topic: 7 | 8,
  itemClass: LibraryItemClass,
  names: readonly string[],
): WaveLibraryDescriptor[] {
  return names.map((name) => ({ name, topic, itemClass }));
}

export const WAVE_LIBRARY_DESCRIPTORS: readonly WaveLibraryDescriptor[] =
  Object.freeze([
    ...descriptors(7, "smart-model", [
      "HarmonicWave",
      "WavePulse",
      "LongitudinalWaveMedium",
      "WaveSource",
      "WaveBoundary",
      "WavefrontSource",
      "SampledWaveField",
    ]),
    ...descriptors(7, "prefab", [
      "String/Rope Wave Setup",
      "Slinky Longitudinal Wave",
      "Ripple Tank",
      "Tuning-Fork Sound Setup",
      "Speaker–Microphone Setup",
      "Pulse Reflection Boundary",
      "Two-Medium Wave Boundary",
    ]),
    ...descriptors(7, "visual-object", [
      "rope/string",
      "slinky",
      "water surface",
      "wave paddle",
      "oscillator",
      "tuning fork",
      "loudspeaker",
      "microphone",
      "boundary line",
      "medium region",
      "wavefront lines",
    ]),
    ...descriptors(7, "representation", [
      "displacement probe",
      "phase marker",
      "wavelength ruler",
      "frequency/period marker",
      "oscilloscope",
      "waveform graph",
      "wavefront display",
      "particle-motion arrows",
    ]),
    ...descriptors(8, "smart-model", [
      "SuperpositionSystem",
      "CoherentWaveSource",
      "StandingWaveModel",
      "InterferenceSourcePair",
      "SlitAperture",
      "DiffractionModel",
      "InterferenceScreen",
    ]),
    ...descriptors(8, "prefab", [
      "Two-Wave Superposition",
      "Standing-Wave String",
      "Two-Source Ripple Tank",
      "Two-Speaker Interference",
      "Single-Slit Setup",
      "Double-Slit Setup",
      "Diffraction-Grating Extension",
      "Air-Column Resonance Extension",
    ]),
    ...descriptors(8, "visual-object", [
      "fixed-end string",
      "wave source pair",
      "slit barrier",
      "single slit",
      "double slit",
      "multi-slit grating",
      "screen",
      "ripple sources",
      "speaker pair",
      "air column/tube",
    ]),
    ...descriptors(8, "representation", [
      "path-difference ruler",
      "phase-difference indicator",
      "node/antinode markers",
      "screen-intensity strip",
      "intensity graph",
      "wavefront overlay",
      "resultant-wave graph",
      "fringe-spacing ruler",
    ]),
  ]);

export function waveLibrarySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[–+&/]/gu, " ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

const PARTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "string-rope-wave-setup": [
    "String",
    "Oscillator",
    "Fixed support",
    "Displacement probe",
  ],
  "slinky-longitudinal-wave": [
    "Slinky",
    "Driver",
    "Particle row",
    "Compression markers",
  ],
  "pulse-reflection-boundary": [
    "String",
    "Pulse source",
    "Boundary",
    "Incident/reflected probes",
  ],
  "two-wave-superposition": [
    "Wave source A",
    "Wave source B",
    "Component graphs",
    "Resultant graph",
  ],
  "standing-wave-string": [
    "String",
    "Two sources",
    "Node markers",
    "Antinode markers",
  ],
  "double-slit-setup": [
    "Coherent source",
    "Double slit",
    "Screen",
    "Intensity graph",
  ],
});

function makeSnapshot(
  descriptor: WaveLibraryDescriptor,
  seed: number,
): LibraryProjectSnapshotTemplate {
  const ids = new DeterministicIdFactory(seed);
  const sceneId = ids.sceneId();
  const parts = PARTS[waveLibrarySlug(descriptor.name)] ?? [descriptor.name];
  return {
    templateSceneId: sceneId,
    assets: [],
    datasets: [],
    entityDefinitions: parts.map((name, index) => ({
      id: ids.entityId(),
      name,
      entityTypeId: registeredTypeId(`physica:entity/${waveLibrarySlug(name)}`),
      componentInstances: [
        {
          instanceId: ids.componentInstanceId(),
          componentTypeId: registeredTypeId(
            `physica:component/${waveLibrarySlug(name)}-v1`,
          ),
          componentSchemaVersion: 1,
          configuration: {
            waveLibraryRole: descriptor.itemClass,
            partIndex: index,
          },
          initialState: {},
          bindings: [],
          enabled: true,
        },
      ],
      tags: ["waves", `topic-${descriptor.topic}`],
      visualDefaults: { libraryShape: waveLibrarySlug(name) },
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

export function registerWavePhysicsLibrary(
  registries: PhysicsLibraryRegistries,
): void {
  const source = Object.freeze({
    kind: "built-in" as const,
    sourcePackage: "@physica/physics-waves",
  });
  const missing = WAVE_LIBRARY_DESCRIPTORS.filter(
    (descriptor) =>
      !registries.library.has(
        registeredTypeId(`physica:library/${waveLibrarySlug(descriptor.name)}`),
      ),
  );
  const prefabs: PrefabDefinition[] = missing.map((descriptor, index) => ({
    id: registeredTypeId(`physica:prefab/${waveLibrarySlug(descriptor.name)}`),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.name,
    source,
    targetSlots: [],
    snapshot: makeSnapshot(descriptor, 900_000 + index * 100),
    exampleIds: WAVE_EXAMPLE_IDS,
  }));
  const items: LibraryItemDefinition[] = missing.map((descriptor, index) => ({
    id: registeredTypeId(`physica:library/${waveLibrarySlug(descriptor.name)}`),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.name,
    description: `${descriptor.name} for deterministic wave teaching.`,
    itemClass: descriptor.itemClass,
    source,
    domainTags: ["physics", "waves"],
    curriculumTags: [
      "cambridge-9702",
      `cambridge-9702-topic-${descriptor.topic}`,
    ],
    topicTags: [`topic-${descriptor.topic}`],
    searchTags: [waveLibrarySlug(descriptor.name), "wave", "superposition"],
    physicalQuantityTags: ["displacement", "phase", "wavelength", "frequency"],
    thumbnail: {
      kind: "procedural",
      uri: `physica://thumbnail/${waveLibrarySlug(descriptor.name)}`,
      altText: `${descriptor.name} wave preview`,
    },
    defaultParameters: {},
    editableProperties: [],
    anchors: [],
    ports: [],
    compatibleTargets: [],
    recommendedRepresentationIds: [],
    recommendedControlIds: [],
    assumptions: [
      { id: "linear-wave", description: "Linear educational wave model." },
    ],
    visualVariants: [
      {
        id: "schematic",
        displayName: "Scientific schematic",
        visual: { style: "schematic" },
      },
    ],
    dimensionality: "2D",
    exampleIds: WAVE_EXAMPLE_IDS,
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

export function waveLibraryRequirementIds(): readonly string[] {
  return Object.freeze(
    WAVE_LIBRARY_DESCRIPTORS.map(
      (descriptor) => `physica:library/${waveLibrarySlug(descriptor.name)}`,
    ),
  );
}
