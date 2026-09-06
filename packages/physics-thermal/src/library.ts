import { DeterministicIdFactory, registeredTypeId } from "@physica/core-model";
import type {
  InstrumentDefinition,
  LibraryItemClass,
  LibraryItemDefinition,
  PhysicsLibraryRegistries,
  PrefabDefinition,
} from "@physica/plugin-sdk";
import { THERMAL_EXAMPLE_IDS, type ThermalTopic } from "./scenarios";

export interface ThermalLibraryDescriptor {
  readonly id: string;
  readonly name: string;
  readonly topics: readonly ThermalTopic[];
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
  topic: ThermalTopic,
  itemClass: LibraryItemClass,
  names: readonly string[],
): ThermalLibraryDescriptor[] {
  return names.map((name) => ({
    id: slug(name),
    name,
    topics: [topic],
    itemClass,
  }));
}

const RAW_DESCRIPTORS: readonly ThermalLibraryDescriptor[] = [
  ...entries(14, "smart-model", [
    "ThermalBody",
    "TemperatureState",
    "ThermometricProperty",
    "LiquidThermometerModel",
    "ResistanceThermometerModel",
    "ThermocoupleModel",
    "ThermalEquilibriumModel",
  ]),
  ...entries(14, "prefab", [
    "Thermometer Calibration Setup",
    "Ice/Steam Fixed-Point Setup",
    "Two-Body Thermal Contact",
    "Water-Bath Temperature Setup",
    "Thermometric-Property Explorer",
  ]),
  ...entries(14, "visual-object", [
    "liquid-in-glass thermometer",
    "digital thermometer",
    "resistance thermometer",
    "thermocouple",
    "thermal block",
    "beaker",
    "water bath",
    "ice point",
    "steam point",
  ]),
  ...entries(14, "instrument", ["temperature probe"]),
  ...entries(14, "representation", [
    "calibration graph",
    "Celsius scale",
    "Kelvin scale",
    "thermal-equilibrium readout",
  ]),
  ...entries(15, "smart-model", [
    "IdealGasState",
    "GasContainer",
    "MovablePiston",
    "GasParticle",
    "HardDiskGas",
    "BrownianTracer",
    "StatisticalGasObservable",
  ]),
  ...entries(15, "prefab", [
    "Fixed-Volume Gas Container",
    "Weighted-Piston Gas",
    "Isothermal Gas Setup",
    "2D Molecular Gas Box",
    "Brownian Motion Cell",
    "Gas Mixing/Diffusion Extension",
  ]),
  ...entries(15, "visual-object", [
    "gas container",
    "piston",
    "weights",
    "molecule/particle",
    "large Brownian particle",
    "heater",
    "cooling bath",
    "container wall",
  ]),
  ...entries(15, "instrument", ["pressure gauge", "thermometer"]),
  ...entries(15, "representation", [
    "volume scale",
    "piston-position ruler",
    "speed histogram",
    "pressure-vs-time graph",
    "P–V graph",
    "particle velocity vectors",
  ]),
  ...entries(16, "smart-model", [
    "ThermodynamicSystem",
    "ThermodynamicState",
    "ProcessPath",
    "HeatTransfer",
    "WorkTransfer",
    "InternalEnergyLedger",
    "ThermalReservoir",
  ]),
  ...entries(16, "prefab", [
    "Constant-Volume Process",
    "Constant-Pressure Piston",
    "Isothermal Process",
    "P–V Process Explorer",
    "Thermodynamic Cycle Extension",
    "Heat-Engine Extension",
  ]),
  ...entries(16, "visual-object", [
    "gas cylinder",
    "piston",
    "heater",
    "hot reservoir",
    "cold reservoir",
    "system boundary",
    "work weight",
    "thermal arrow",
  ]),
  ...entries(16, "instrument", [
    "temperature probe",
    "pressure probe",
    "volume probe",
  ]),
  ...entries(16, "representation", [
    "P–V graph",
    "area/work shader",
    "energy ledger",
    "heat/work transfer arrows",
  ]),
];

const classesByBaseId = new Map<string, Set<LibraryItemClass>>();
for (const descriptor of RAW_DESCRIPTORS) {
  const classes = classesByBaseId.get(descriptor.id) ?? new Set();
  classes.add(descriptor.itemClass);
  classesByBaseId.set(descriptor.id, classes);
}

const byId = new Map<string, ThermalLibraryDescriptor>();
for (const rawDescriptor of RAW_DESCRIPTORS) {
  const descriptor =
    classesByBaseId.get(rawDescriptor.id)!.size > 1
      ? {
          ...rawDescriptor,
          id: rawDescriptor.id + "-" + rawDescriptor.itemClass,
        }
      : rawDescriptor;
  const existing = byId.get(descriptor.id);
  if (existing)
    byId.set(descriptor.id, {
      ...existing,
      topics: [...new Set([...existing.topics, ...descriptor.topics])],
    });
  else byId.set(descriptor.id, descriptor);
}

export const THERMAL_LIBRARY_DESCRIPTORS: readonly ThermalLibraryDescriptor[] =
  Object.freeze(
    [...byId.values()].map((descriptor) =>
      Object.freeze({
        ...descriptor,
        topics: Object.freeze([...descriptor.topics]),
      }),
    ),
  );

function snapshot(descriptor: ThermalLibraryDescriptor, seed: number) {
  const ids = new DeterministicIdFactory(seed);
  return {
    templateSceneId: ids.sceneId(),
    assets: [],
    datasets: [],
    entityDefinitions: [
      {
        id: ids.entityId(),
        name: descriptor.name,
        entityTypeId: registeredTypeId("physica:entity/" + descriptor.id),
        componentInstances: [
          {
            instanceId: ids.componentInstanceId(),
            componentTypeId: registeredTypeId(
              "physica:component/" + descriptor.id + "-v1",
            ),
            componentSchemaVersion: 1,
            configuration: { thermalLibraryRole: descriptor.itemClass },
            initialState: {},
            bindings: [],
            enabled: true,
          },
        ],
        tags: [
          "thermal",
          ...descriptor.topics.map((topic) => "topic-" + topic),
        ],
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
      "Invalid thermal Library definition: " +
        result.error.code +
        " - " +
        result.error.message,
    );
}

export function registerThermalPhysicsLibrary(
  registries: PhysicsLibraryRegistries,
): void {
  const source = {
    kind: "built-in" as const,
    sourcePackage: "@physica/physics-thermal",
  };
  const missing = THERMAL_LIBRARY_DESCRIPTORS.filter(
    (descriptor) =>
      !registries.library.has(
        registeredTypeId("physica:library/" + descriptor.id),
      ),
  );
  const prefabs: PrefabDefinition[] = missing.map((descriptor, index) => ({
    id: registeredTypeId("physica:prefab/" + descriptor.id),
    schemaVersion: 1,
    version: "1.0.0",
    displayName: descriptor.name,
    source,
    targetSlots: [],
    snapshot: snapshot(descriptor, 1_200_000 + index * 100),
    exampleIds: THERMAL_EXAMPLE_IDS,
  }));
  const instruments: InstrumentDefinition[] = missing
    .map((descriptor, index) => ({ descriptor, prefab: prefabs[index]! }))
    .filter(({ descriptor }) => descriptor.itemClass === "instrument")
    .map(({ descriptor, prefab }) => ({
      id: registeredTypeId("physica:instrument/" + descriptor.id),
      schemaVersion: 1,
      version: "1.0.0",
      displayName: descriptor.name,
      source,
      prefabId: prefab.id,
      portRequirements: [],
      observableKinds: [
        "temperature",
        "pressure",
        "volume",
        "kinetic-energy",
        "thermal-energy",
      ],
      allowIncompleteAuthoring: true,
      exampleIds: THERMAL_EXAMPLE_IDS,
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
      id: registeredTypeId("physica:library/" + descriptor.id),
      schemaVersion: 1,
      version: "1.0.0",
      displayName: descriptor.name,
      description:
        descriptor.name + " for deterministic thermal and gas teaching.",
      itemClass: descriptor.itemClass,
      source,
      domainTags: ["physics", "thermal", "thermodynamics"],
      curriculumTags: [
        "cambridge-9702",
        ...descriptor.topics.map((topic) => "cambridge-9702-topic-" + topic),
      ],
      topicTags: descriptor.topics.map((topic) => "topic-" + topic),
      searchTags: [
        ...new Set([
          descriptor.id,
          ...descriptor.name.toLowerCase().split(/\s+/u),
        ]),
      ],
      physicalQuantityTags: [
        "temperature",
        "pressure",
        "volume",
        "energy",
        "heat",
        "work",
      ],
      thumbnail: {
        kind: "procedural",
        uri: "physica://thumbnail/" + descriptor.id,
        altText: descriptor.name + " scientific diagram preview",
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
          id: "curriculum-thermal-model",
          description: "SI-canonical deterministic educational thermal model.",
        },
      ],
      visualVariants: [
        {
          id: "scientific-diagram",
          displayName: "Scientific diagram",
          visual: { style: "scientific-diagram" },
        },
      ],
      dimensionality: "2D",
      exampleIds: THERMAL_EXAMPLE_IDS,
      requiredCoreRange: ">=0.0.0",
      requiredPlugins: [],
      dependentAssetIds: [],
      license: { spdxId: "LicenseRef-Physica-Built-In" },
      ...(descriptor.itemClass === "smart-model"
        ? {
            modelProvenance: {
              modelId: registeredTypeId(
                "physica:model/" + descriptor.id + "-v1",
              ),
              version: "1.0.0",
              reference: "Physica Phase 12 thermal model catalog",
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

export function thermalLibraryRequirementIds(
  topic?: ThermalTopic,
): readonly string[] {
  return Object.freeze(
    THERMAL_LIBRARY_DESCRIPTORS.filter(
      (descriptor) => topic === undefined || descriptor.topics.includes(topic),
    ).map((descriptor) => "physica:library/" + descriptor.id),
  );
}
