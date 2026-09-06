import { DeterministicIdFactory, registeredTypeId } from "@physica/core-model";
import {
  type InstrumentDefinition,
  type LibraryItemClass,
  type LibraryItemDefinition,
  type LibraryProjectSnapshotTemplate,
  type PhysicsLibraryRegistries,
  type PrefabDefinition,
} from "@physica/plugin-sdk";
import { ELECTRICITY_EXAMPLE_IDS } from "./scenarios";

export interface ElectricityLibraryDescriptor {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly topics: readonly (9 | 10 | 19)[];
  readonly itemClass: LibraryItemClass;
}

function d(
  id: string,
  name: string,
  topics: readonly (9 | 10 | 19)[],
  itemClass: LibraryItemClass,
  aliases: readonly string[] = [],
): ElectricityLibraryDescriptor {
  return Object.freeze({
    id,
    name,
    aliases: Object.freeze([...aliases]),
    topics,
    itemClass,
  });
}

export const ELECTRICITY_LIBRARY_DESCRIPTORS: readonly ElectricityLibraryDescriptor[] =
  Object.freeze([
    d("charge-reservoir", "ChargeReservoir", [9], "smart-model"),
    d("current-model", "CurrentModel", [9], "smart-model"),
    d("conductor", "Conductor", [9], "smart-model"),
    d("ohmic-resistor", "OhmicResistor", [9], "smart-model"),
    d("non-ohmic-component", "NonOhmicComponent", [9], "smart-model"),
    d("resistivity-model", "ResistivityModel", [9], "smart-model"),
    d("electrical-power-model", "ElectricalPowerModel", [9], "smart-model"),
    d(
      "charge-carrier-representation",
      "ChargeCarrierRepresentation",
      [9],
      "smart-model",
    ),
    d("current-charge-time-setup", "Current–Charge–Time Setup", [9], "prefab"),
    d("ohmic-iv-apparatus", "Ohmic I–V Apparatus", [9], "prefab"),
    d(
      "filament-lamp-iv-apparatus",
      "Filament-Lamp I–V Apparatus",
      [9],
      "prefab",
    ),
    d(
      "resistivity-wire-apparatus",
      "Resistivity-Wire Apparatus",
      [9],
      "prefab",
    ),
    d("electrical-power-setup", "Electrical Power Setup", [9], "prefab"),
    d(
      "sensor-component-extension",
      "Sensor-Component Extension",
      [9],
      "prefab",
    ),
    d("wire", "wire/conductor", [9, 10, 19], "visual-object", [
      "wire",
      "connecting wire",
    ]),
    d("resistor", "resistor", [9, 10, 19], "visual-object"),
    d("filament-lamp", "filament lamp", [9], "visual-object", ["load/lamp"]),
    d("thermistor", "thermistor", [9], "visual-object"),
    d("ldr", "LDR", [9], "visual-object"),
    d("cell", "cell", [9, 10, 19], "visual-object", ["cell/source"]),
    d("battery", "battery", [9, 10], "visual-object"),
    d(
      "charge-carrier-token",
      "electron/charge-carrier token",
      [9],
      "visual-object",
    ),
    d(
      "metal-lattice-schematic",
      "metal lattice schematic",
      [9],
      "visual-object",
    ),
    d("ammeter", "ammeter", [9, 10, 19], "instrument"),
    d("voltmeter", "voltmeter", [9, 10, 19], "instrument"),
    d("current-probe", "current probe", [9], "instrument"),
    d("potential-probe", "potential probe", [9], "instrument"),
    d("power-meter", "power meter", [9], "instrument"),
    d("iv-graph", "I–V graph", [9, 10], "representation", ["I–V/data graph"]),
    d("resistance-readout", "resistance readout", [9], "representation"),
    d(
      "length-area-geometry-markers",
      "length/area geometry markers",
      [9],
      "representation",
    ),
    d("circuit-node", "CircuitNode", [10], "smart-model"),
    d("circuit-branch", "CircuitBranch", [10], "smart-model"),
    d("ideal-wire", "IdealWire", [10], "smart-model"),
    d("dc-voltage-source", "DCVoltageSource", [10], "smart-model"),
    d(
      "cell-internal-resistance",
      "CellWithInternalResistance",
      [10],
      "smart-model",
    ),
    d("resistor-model", "Resistor", [10], "smart-model"),
    d("variable-resistor-model", "VariableResistor", [10], "smart-model"),
    d("switch-model", "Switch", [10], "smart-model"),
    d("potential-divider-model", "PotentialDivider", [10], "smart-model"),
    d("ideal-ammeter", "IdealAmmeter", [10], "smart-model"),
    d("ideal-voltmeter", "IdealVoltmeter", [10], "smart-model"),
    d("series-circuit", "Series Circuit", [10], "prefab"),
    d("parallel-circuit", "Parallel Circuit", [10], "prefab"),
    d(
      "kirchhoff-multi-loop-circuit",
      "Kirchhoff Multi-Loop Circuit",
      [10],
      "prefab",
    ),
    d(
      "internal-resistance-circuit",
      "Internal-Resistance Circuit",
      [10],
      "prefab",
    ),
    d("potential-divider-apparatus", "Potential Divider", [10], "prefab"),
    d("sensor-potential-divider", "Sensor Potential Divider", [10], "prefab"),
    d("variable-resistor-circuit", "Variable-Resistor Circuit", [10], "prefab"),
    d("bridge-extension", "Bridge Extension", [10], "prefab"),
    d("switch", "switch", [10, 19], "visual-object"),
    d("variable-resistor", "variable resistor", [10], "visual-object"),
    d("potentiometer", "potentiometer", [10], "visual-object"),
    d("junction", "junction", [10], "visual-object"),
    d("meter-body", "meter body", [10], "visual-object"),
    d("terminal", "terminal", [10], "visual-object"),
    d("galvanometer", "galvanometer extension", [10], "instrument"),
    d(
      "current-path-highlighter",
      "current-path highlighter",
      [10],
      "representation",
    ),
    d(
      "node-potential-overlay",
      "node-potential overlay",
      [10],
      "representation",
    ),
    d(
      "circuit-equation-panel",
      "circuit equation panel",
      [10],
      "representation",
    ),
    d(
      "power-per-component-overlay",
      "power-per-component overlay",
      [10],
      "representation",
    ),
    d("capacitor-model", "Capacitor", [19], "smart-model"),
    d(
      "parallel-plate-capacitor",
      "ParallelPlateCapacitor",
      [19],
      "smart-model",
    ),
    d("capacitor-network", "CapacitorNetwork", [19], "smart-model"),
    d("rc-transient-model", "RCTransientModel", [19], "smart-model"),
    d("dielectric-material", "DielectricMaterial", [19], "smart-model"),
    d(
      "stored-electrical-energy-model",
      "StoredElectricalEnergyModel",
      [19],
      "smart-model",
    ),
    d(
      "adjustable-parallel-plate-capacitor",
      "Adjustable Parallel-Plate Capacitor",
      [19],
      "prefab",
    ),
    d("capacitors-series", "Capacitors in Series", [19], "prefab"),
    d("capacitors-parallel", "Capacitors in Parallel", [19], "prefab"),
    d("rc-charging-circuit", "RC Charging Circuit", [19], "prefab"),
    d("rc-discharging-circuit", "RC Discharging Circuit", [19], "prefab"),
    d(
      "dielectric-insertion-extension",
      "Dielectric-Insertion Extension",
      [19],
      "prefab",
    ),
    d("capacitor-symbol", "capacitor symbol", [19], "visual-object"),
    d("parallel-plates", "parallel plates", [19], "visual-object"),
    d("charge-symbols", "charge symbols", [19], "visual-object"),
    d("dielectric-slab", "dielectric slab", [19], "visual-object"),
    d("charge-readout", "charge readout", [19], "instrument"),
    d(
      "electric-field-display",
      "electric-field display",
      [19],
      "representation",
    ),
    d("qv-graph", "Q–V graph", [19], "representation"),
    d("voltage-time-graph", "V–t graph", [19], "representation"),
    d("current-time-graph", "I–t graph", [19], "representation"),
    d("energy-display", "energy display", [19], "representation"),
    d("time-constant-marker", "time-constant marker", [19], "representation"),
  ]);

export function electricityLibrarySlug(
  descriptorOrName: ElectricityLibraryDescriptor | string,
): string {
  if (typeof descriptorOrName !== "string") return descriptorOrName.id;
  return descriptorOrName
    .toLowerCase()
    .replace(/[–+&/]/gu, " ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

const ASSEMBLIES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "current-charge-time-setup": [
    "Charge reservoir",
    "Conductor",
    "Ammeter",
    "Timer",
    "Charge counter",
  ],
  "ohmic-iv-apparatus": [
    "D.C. source",
    "Resistor",
    "Ammeter",
    "Voltmeter",
    "I–V graph",
  ],
  "filament-lamp-iv-apparatus": [
    "D.C. source",
    "Filament lamp",
    "Ammeter",
    "Voltmeter",
    "I–V graph",
  ],
  "resistivity-wire-apparatus": [
    "Test wire",
    "Length marker",
    "Area marker",
    "Ammeter",
    "Voltmeter",
  ],
  "series-circuit": [
    "Cell",
    "Resistor A",
    "Resistor B",
    "Ammeter",
    "Connecting wires",
  ],
  "parallel-circuit": [
    "Cell",
    "Junction A",
    "Branch A",
    "Branch B",
    "Junction B",
  ],
  "kirchhoff-multi-loop-circuit": [
    "Cell",
    "Left loop",
    "Right loop",
    "Bridge branch",
    "Equation panel",
  ],
  "internal-resistance-circuit": [
    "Cell emf",
    "Internal resistor",
    "Load",
    "Terminal voltmeter",
  ],
  "potential-divider-apparatus": [
    "Source",
    "Upper resistor",
    "Lower resistor",
    "Output voltmeter",
  ],
  "adjustable-parallel-plate-capacitor": [
    "Positive plate",
    "Negative plate",
    "Separation marker",
    "Charge readout",
  ],
  "rc-charging-circuit": [
    "Source",
    "Switch",
    "Resistor",
    "Capacitor",
    "V–t graph",
    "I–t graph",
  ],
  "rc-discharging-circuit": [
    "Charged capacitor",
    "Switch",
    "Resistor",
    "V–t graph",
    "I–t graph",
  ],
});

function snapshot(
  descriptor: ElectricityLibraryDescriptor,
  seed: number,
): LibraryProjectSnapshotTemplate {
  const ids = new DeterministicIdFactory(seed);
  const parts = ASSEMBLIES[descriptor.id] ?? [descriptor.name];
  return {
    templateSceneId: ids.sceneId(),
    assets: [],
    datasets: [],
    entityDefinitions: parts.map((part, index) => ({
      id: ids.entityId(),
      name: part,
      entityTypeId: registeredTypeId(
        `physica:entity/${electricityLibrarySlug(part)}`,
      ),
      componentInstances: [
        {
          instanceId: ids.componentInstanceId(),
          componentTypeId: registeredTypeId(
            `physica:component/${electricityLibrarySlug(part)}-v1`,
          ),
          componentSchemaVersion: 1,
          configuration: {
            electricityLibraryRole: descriptor.itemClass,
            partIndex: index,
          },
          initialState: {},
          bindings: [],
          enabled: true,
        },
      ],
      tags: [
        "electricity",
        ...descriptor.topics.map((topic) => `topic-${topic}`),
      ],
      visualDefaults: { libraryShape: electricityLibrarySlug(part) },
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

function electricalPorts(descriptor: ElectricityLibraryDescriptor) {
  const terminalItem =
    descriptor.itemClass === "smart-model" &&
    /(resistor|wire|source|cell|switch|capacitor|divider|ammeter|voltmeter)/u.test(
      descriptor.id,
    );
  return terminalItem
    ? ["terminal-a", "terminal-b"].map((id) => ({
        id,
        displayName: id === "terminal-a" ? "Terminal A" : "Terminal B",
        portTypeId: registeredTypeId("physica:port/electrical-node-v1"),
        direction: "bidirectional" as const,
        maximumConnections: 8,
      }))
    : [];
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
      `Invalid electricity Library definition: ${result.error.code} — ${result.error.message}`,
    );
}

export function registerElectricityPhysicsLibrary(
  registries: PhysicsLibraryRegistries,
): void {
  const source = Object.freeze({
    kind: "built-in" as const,
    sourcePackage: "@physica/physics-electricity",
  });
  const missing = ELECTRICITY_LIBRARY_DESCRIPTORS.filter(
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
    snapshot: snapshot(descriptor, 1_000_000 + index * 100),
    exampleIds: ELECTRICITY_EXAMPLE_IDS,
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
      portRequirements:
        descriptor.id === "voltmeter"
          ? [
              {
                role: "potential-nodes",
                displayName: "Two circuit nodes",
                compatiblePortTypeIds: [
                  registeredTypeId("physica:port/electrical-node-v1"),
                ],
                minimumCount: 2,
                maximumCount: 2,
              },
            ]
          : descriptor.id === "ammeter" || descriptor.id === "current-probe"
            ? [
                {
                  role: "branch",
                  displayName: "Circuit branch",
                  compatiblePortTypeIds: [
                    registeredTypeId("physica:port/electrical-branch-v1"),
                  ],
                  minimumCount: 1,
                  maximumCount: 1,
                },
              ]
            : [],
      observableKinds: [
        "electric-current",
        "electric-potential",
        "power",
        "charge",
      ],
      allowIncompleteAuthoring: true,
      exampleIds: ELECTRICITY_EXAMPLE_IDS,
    }));
  const instrumentById = new Map(
    instruments.map((instrument) => [
      instrument.id.replace("physica:instrument/", ""),
      instrument,
    ]),
  );
  const items: LibraryItemDefinition[] = missing.map((descriptor, index) => {
    const instrument = instrumentById.get(descriptor.id);
    return {
      id: registeredTypeId(`physica:library/${descriptor.id}`),
      schemaVersion: 1,
      version: "1.0.0",
      displayName: descriptor.name,
      description: `${descriptor.name} for deterministic electricity teaching.`,
      itemClass: descriptor.itemClass,
      source,
      domainTags: ["physics", "electricity", "circuits"],
      curriculumTags: [
        "cambridge-9702",
        ...descriptor.topics.map((topic) => `cambridge-9702-topic-${topic}`),
      ],
      topicTags: descriptor.topics.map((topic) => `topic-${topic}`),
      searchTags: [
        ...new Set([
          descriptor.id,
          ...descriptor.aliases,
          ...descriptor.name.toLowerCase().split(/\s+/u),
        ]),
      ],
      physicalQuantityTags: [
        "charge",
        "current",
        "potential",
        "resistance",
        "power",
        "capacitance",
      ],
      thumbnail: {
        kind: "procedural",
        uri: `physica://thumbnail/${descriptor.id}`,
        altText: `${descriptor.name} electrical schematic preview`,
      },
      defaultParameters: {},
      editableProperties: [],
      anchors: [],
      ports: electricalPorts(descriptor),
      compatibleTargets:
        descriptor.itemClass === "instrument"
          ? [
              {
                kind: "port-type",
                portTypeId: registeredTypeId("physica:port/electrical-node-v1"),
                minimumCount: descriptor.id === "voltmeter" ? 2 : 1,
                maximumCount: descriptor.id === "voltmeter" ? 2 : 1,
              },
            ]
          : [],
      recommendedRepresentationIds: [],
      recommendedControlIds: [],
      assumptions: [
        {
          id: "lumped-electricity",
          description: "Ideal lumped educational electrical model.",
        },
      ],
      visualVariants: [
        {
          id: "iec-schematic",
          displayName: "IEC-style schematic",
          visual: { style: "iec-schematic" },
        },
      ],
      dimensionality: "2D",
      exampleIds: ELECTRICITY_EXAMPLE_IDS,
      requiredCoreRange: ">=0.0.0",
      requiredPlugins: [],
      dependentAssetIds: [],
      license: { spdxId: "LicenseRef-Physica-Built-In" },
      ...(descriptor.itemClass === "smart-model"
        ? {
            modelProvenance: {
              modelId: registeredTypeId(`physica:model/${descriptor.id}-v1`),
              version: "1.0.0",
              reference: "Physica Phase 10 electricity model catalog",
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

export function electricityLibraryRequirementIds(
  topic?: 9 | 10 | 19,
): readonly string[] {
  return Object.freeze(
    ELECTRICITY_LIBRARY_DESCRIPTORS.filter(
      (descriptor) => topic === undefined || descriptor.topics.includes(topic),
    ).map((descriptor) => `physica:library/${descriptor.id}`),
  );
}
