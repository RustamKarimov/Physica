import { DeterministicIdFactory, registeredTypeId } from "@physica/core-model";
import type {
  InstrumentDefinition,
  LibraryItemClass,
  LibraryItemDefinition,
  PhysicsLibraryRegistries,
  PrefabDefinition,
} from "@physica/plugin-sdk";
import { FIELD_EXAMPLE_IDS, type FieldTopic } from "./scenarios";

export interface FieldLibraryDescriptor {
  readonly id: string;
  readonly name: string;
  readonly topics: readonly FieldTopic[];
  readonly itemClass: LibraryItemClass;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[+/–]/gu, " ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function entries(
  topic: FieldTopic,
  itemClass: LibraryItemClass,
  names: readonly string[],
): FieldLibraryDescriptor[] {
  return names.map((name) => ({
    id: slug(name),
    name,
    topics: [topic],
    itemClass,
  }));
}

const RAW_DESCRIPTORS: readonly FieldLibraryDescriptor[] = [
  ...entries(13, "smart-model", [
    "PointMassGravitySource",
    "SphericalGravitySource",
    "GravitationalField",
    "GravitationalPotential",
    "OrbitalBody",
    "CircularOrbitModel",
    "NumericalOrbitModel",
  ]),
  ...entries(13, "prefab", [
    "Earth–Satellite System",
    "Earth–Moon System",
    "Two-Mass Field Setup",
    "Multi-Source Field Scene",
    "Circular Orbit Setup",
    "Escape-Trajectory Extension",
  ]),
  ...entries(13, "visual-object", [
    "Earth",
    "Moon",
    "planet",
    "star",
    "satellite",
    "spacecraft",
    "point mass",
    "orbit path",
    "planet surface",
  ]),
  ...entries(13, "instrument", ["gravitational-field probe"]),
  ...entries(13, "representation", [
    "potential probe",
    "field-vector grid",
    "field lines",
    "equipotential curves",
    "potential graph",
    "orbital velocity vector",
    "energy panel",
  ]),
  ...entries(18, "smart-model", [
    "PointCharge",
    "ChargedSphereSource",
    "UniformElectricField",
    "ElectricPotential",
    "MultiChargeField",
    "ChargedParticle",
    "ElectricForceModel",
  ]),
  ...entries(18, "prefab", [
    "Single Point Charge",
    "Two-Charge Field",
    "Multi-Charge Field",
    "Parallel-Plate Field",
    "Charged Particle Between Plates",
    "Electron-Beam Deflection Setup",
    "Zero-Field Point Setup",
  ]),
  ...entries(18, "visual-object", [
    "positive charge",
    "negative charge",
    "charged sphere",
    "parallel plates",
    "electron",
    "proton/test charge",
    "electron gun",
    "screen",
    "field region",
  ]),
  ...entries(18, "instrument", ["electric-field probe"]),
  ...entries(18, "representation", [
    "potential probe",
    "vector-field grid",
    "field lines",
    "equipotential curves",
    "potential graph",
    "force vector",
    "particle trajectory",
  ]),
  ...entries(20, "smart-model", [
    "UniformMagneticField",
    "MagneticDipole",
    "CurrentCarryingWire",
    "CurrentLoop",
    "Solenoid",
    "MovingChargeInMagneticField",
    "MagneticForceModel",
    "FluxSurface",
    "InductionModel",
  ]),
  ...entries(20, "prefab", [
    "Force on Current-Carrying Wire",
    "Charged Particle in Uniform B",
    "Velocity-Selector Extension",
    "Mass-Spectrometer Extension",
    "Solenoid Field",
    "Induction Coil Pair",
    "Motional-EMF Extension",
  ]),
  ...entries(20, "visual-object", [
    "bar magnet",
    "horseshoe magnet",
    "compass",
    "straight wire",
    "wire loop",
    "solenoid",
    "coil",
    "iron core",
    "electron/proton",
    "magnetic pole markers",
  ]),
  ...entries(20, "instrument", ["Hall/magnetic-field probe", "compass needle"]),
  ...entries(20, "representation", [
    "B-field vector grid",
    "field lines",
    "force vector",
    "velocity vector",
    "flux surface",
    "flux/emf graph",
  ]),
  ...entries(21, "smart-model", [
    "SinusoidalVoltageSource",
    "SinusoidalCurrentSource",
    "ACLoad",
    "RMSModel",
    "IdealTransformer",
    "PeriodicSignal",
    "RectifierExtension",
  ]),
  ...entries(21, "prefab", [
    "AC Source + Oscilloscope",
    "RMS Explorer",
    "Step-Up Transformer",
    "Step-Down Transformer",
    "Power Transmission Setup",
    "Rectifier/Smoothing Extension",
    "RLC Extension",
  ]),
  ...entries(21, "visual-object", [
    "AC generator/source",
    "coil",
    "transformer core",
    "primary coil",
    "secondary coil",
    "load",
    "transmission line",
    "diode extension",
    "capacitor extension",
  ]),
  ...entries(21, "instrument", ["oscilloscope", "AC voltmeter", "AC ammeter"]),
  ...entries(21, "representation", [
    "waveform graph",
    "RMS marker",
    "turns counter",
    "flux display",
    "power-flow panel",
    "phasor extension",
  ]),
];

const byId = new Map<string, FieldLibraryDescriptor>();
for (const descriptor of RAW_DESCRIPTORS) {
  const existing = byId.get(descriptor.id);
  if (existing) {
    byId.set(descriptor.id, {
      ...existing,
      topics: [...new Set([...existing.topics, ...descriptor.topics])],
    });
  } else byId.set(descriptor.id, descriptor);
}

export const FIELD_LIBRARY_DESCRIPTORS: readonly FieldLibraryDescriptor[] =
  Object.freeze(
    [...byId.values()].map((descriptor) =>
      Object.freeze({
        ...descriptor,
        topics: Object.freeze([...descriptor.topics]),
      }),
    ),
  );

function snapshot(descriptor: FieldLibraryDescriptor, seed: number) {
  const ids = new DeterministicIdFactory(seed);
  return {
    templateSceneId: ids.sceneId(),
    assets: [],
    datasets: [],
    entityDefinitions: [
      {
        id: ids.entityId(),
        name: descriptor.name,
        entityTypeId: registeredTypeId(`physica:entity/${descriptor.id}`),
        componentInstances: [
          {
            instanceId: ids.componentInstanceId(),
            componentTypeId: registeredTypeId(
              `physica:component/${descriptor.id}-v1`,
            ),
            componentSchemaVersion: 1,
            configuration: { fieldLibraryRole: descriptor.itemClass },
            initialState: {},
            bindings: [],
            enabled: true,
          },
        ],
        tags: ["fields", ...descriptor.topics.map((topic) => `topic-${topic}`)],
        visualDefaults: { libraryShape: descriptor.id },
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
}

function requireRegistration(
  result:
    | { readonly ok: true }
    | {
        readonly ok: false;
        readonly error: { readonly code: string; readonly message: string };
      },
) {
  if (!result.ok)
    throw new Error(
      `Invalid fields Library definition: ${result.error.code} - ${result.error.message}`,
    );
}

export function registerFieldsPhysicsLibrary(
  registries: PhysicsLibraryRegistries,
): void {
  const source = {
    kind: "built-in" as const,
    sourcePackage: "@physica/physics-fields",
  };
  const missing = FIELD_LIBRARY_DESCRIPTORS.filter(
    (descriptor) =>
      !registries.library.has(
        registeredTypeId(`physica:library/${descriptor.id}`),
      ),
  );
  const prefabs: PrefabDefinition[] = missing.map((descriptor, index) => ({
    id: registeredTypeId(`physica:prefab/${descriptor.id}`),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.name,
    source,
    targetSlots: [],
    snapshot: snapshot(descriptor, 1_100_000 + index * 100),
    exampleIds: FIELD_EXAMPLE_IDS,
  }));
  const instruments: InstrumentDefinition[] = missing
    .map((descriptor, index) => ({ descriptor, prefab: prefabs[index]! }))
    .filter(({ descriptor }) => descriptor.itemClass === "instrument")
    .map(({ descriptor, prefab }) => ({
      id: registeredTypeId(`physica:instrument/${descriptor.id}`),
      schemaVersion: 1,
      version: "1.0.0",
      displayName: descriptor.name,
      source,
      prefabId: prefab.id,
      portRequirements: [],
      observableKinds: [
        "vector-field",
        "scalar-potential",
        "magnetic-flux",
        "voltage",
        "current",
      ],
      allowIncompleteAuthoring: true,
      exampleIds: FIELD_EXAMPLE_IDS,
    }));
  const instrumentBySlug = new Map(
    instruments.map((instrument) => [
      instrument.id.replace("physica:instrument/", ""),
      instrument,
    ]),
  );
  const items: LibraryItemDefinition[] = missing.map((descriptor, index) => {
    const instrument = instrumentBySlug.get(descriptor.id);
    return {
      id: registeredTypeId(`physica:library/${descriptor.id}`),
      schemaVersion: 1,
      version: "1.0.0",
      displayName: descriptor.name,
      description: `${descriptor.name} for deterministic field and AC teaching.`,
      itemClass: descriptor.itemClass,
      source,
      domainTags: ["physics", "fields", "electromagnetism"],
      curriculumTags: [
        "cambridge-9702",
        ...descriptor.topics.map((topic) => `cambridge-9702-topic-${topic}`),
      ],
      topicTags: descriptor.topics.map((topic) => `topic-${topic}`),
      searchTags: [
        ...new Set([
          descriptor.id,
          ...descriptor.name.toLowerCase().split(/\s+/u),
        ]),
      ],
      physicalQuantityTags: [
        "field",
        "potential",
        "force",
        "energy",
        "flux",
        "voltage",
      ],
      thumbnail: {
        kind: "procedural",
        uri: `physica://thumbnail/${descriptor.id}`,
        altText: `${descriptor.name} scientific diagram preview`,
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
          id: "curriculum-field-model",
          description: "SI-canonical deterministic educational field model.",
        },
      ],
      visualVariants: [
        {
          id: "scientific-diagram",
          displayName: "Scientific diagram",
          visual: { style: "scientific-diagram" },
        },
      ],
      dimensionality: "3D",
      exampleIds: FIELD_EXAMPLE_IDS,
      requiredCoreRange: ">=0.0.0",
      requiredPlugins: [],
      dependentAssetIds: [],
      license: { spdxId: "LicenseRef-Physica-Built-In" },
      ...(descriptor.itemClass === "smart-model"
        ? {
            modelProvenance: {
              modelId: registeredTypeId(`physica:model/${descriptor.id}-v1`),
              version: "1.0.0",
              reference: "Physica Phase 11 field and AC model catalog",
            },
          }
        : {}),
      creation: instrument
        ? { kind: "instrument" as const, definitionId: instrument.id }
        : { kind: "prefab" as const, definitionId: prefabs[index]!.id },
    };
  });
  requireRegistration(registries.prefabs.registerMany(prefabs));
  requireRegistration(registries.instruments.registerMany(instruments));
  requireRegistration(registries.library.registerMany(items));
}

export function fieldLibraryRequirementIds(
  topic?: FieldTopic,
): readonly string[] {
  return Object.freeze(
    FIELD_LIBRARY_DESCRIPTORS.filter(
      (descriptor) => topic === undefined || descriptor.topics.includes(topic),
    ).map((descriptor) => `physica:library/${descriptor.id}`),
  );
}
