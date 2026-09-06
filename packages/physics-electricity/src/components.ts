import { registeredTypeId, type RegisteredTypeId } from "@physica/core-model";
import {
  electricityIssue,
  invalidElectricity,
  validElectricity,
  type ElectricityResult,
} from "./types";

export type ElectricalComponentKind =
  | "wire"
  | "source"
  | "resistor"
  | "non-ohmic"
  | "switch"
  | "ammeter"
  | "voltmeter"
  | "capacitor";

export interface ElectricalPortDescriptor {
  readonly id: string;
  readonly portTypeId: RegisteredTypeId;
  readonly direction: "bidirectional";
  readonly maximumConnections: number;
}

export interface ElectricalComponentDefinition {
  readonly typeId: RegisteredTypeId;
  readonly displayName: string;
  readonly kind: ElectricalComponentKind;
  readonly ports: readonly ElectricalPortDescriptor[];
  readonly parameterIds: readonly string[];
  readonly assumptions: readonly string[];
}

function twoTerminal(
  slug: string,
  displayName: string,
  kind: ElectricalComponentKind,
  parameterIds: readonly string[],
  assumptions: readonly string[],
): ElectricalComponentDefinition {
  return Object.freeze({
    typeId: registeredTypeId(`physica:electrical-component/${slug}-v1`),
    displayName,
    kind,
    ports: Object.freeze([
      Object.freeze({
        id: "terminal-a",
        portTypeId: registeredTypeId("physica:port/electrical-node-v1"),
        direction: "bidirectional" as const,
        maximumConnections: 8,
      }),
      Object.freeze({
        id: "terminal-b",
        portTypeId: registeredTypeId("physica:port/electrical-node-v1"),
        direction: "bidirectional" as const,
        maximumConnections: 8,
      }),
    ]),
    parameterIds: Object.freeze([...parameterIds]),
    assumptions: Object.freeze([...assumptions]),
  });
}

export const BUILT_IN_ELECTRICAL_COMPONENTS = Object.freeze([
  twoTerminal("ideal-wire", "Ideal wire", "wire", [], ["zero potential drop"]),
  twoTerminal(
    "dc-voltage-source",
    "D.C. voltage source",
    "source",
    ["voltageVolts"],
    ["ideal fixed emf"],
  ),
  twoTerminal(
    "cell-internal-resistance",
    "Cell with internal resistance",
    "source",
    ["emfVolts", "internalResistanceOhms"],
    ["lumped series internal resistance"],
  ),
  twoTerminal(
    "resistor",
    "Resistor",
    "resistor",
    ["resistanceOhms"],
    ["ohmic at fixed temperature"],
  ),
  twoTerminal(
    "variable-resistor",
    "Variable resistor",
    "resistor",
    ["minimumOhms", "maximumOhms", "fraction"],
    ["linear contact law"],
  ),
  twoTerminal(
    "switch",
    "Switch",
    "switch",
    ["closed"],
    ["ideal open or closed state"],
  ),
  twoTerminal(
    "filament-lamp",
    "Filament lamp",
    "non-ohmic",
    ["curveControl"],
    ["static non-ohmic teaching curve"],
  ),
  twoTerminal(
    "thermistor",
    "Thermistor",
    "non-ohmic",
    ["temperatureCelsius"],
    ["steady NTC response"],
  ),
  twoTerminal(
    "ldr",
    "LDR",
    "non-ohmic",
    ["illuminanceControl"],
    ["steady power-law response"],
  ),
  twoTerminal(
    "ideal-ammeter",
    "Ideal ammeter",
    "ammeter",
    [],
    ["zero burden; observes branch current"],
  ),
  twoTerminal(
    "ideal-voltmeter",
    "Ideal voltmeter",
    "voltmeter",
    [],
    ["infinite input resistance; observes node potential difference"],
  ),
  twoTerminal(
    "capacitor",
    "Capacitor",
    "capacitor",
    ["capacitanceFarads"],
    ["ideal lumped capacitance"],
  ),
]);

export class ElectricalComponentRegistry {
  readonly #definitions = new Map<
    RegisteredTypeId,
    ElectricalComponentDefinition
  >();

  register(
    definition: ElectricalComponentDefinition,
  ): ElectricityResult<ElectricalComponentDefinition> {
    if (!definition.typeId.startsWith("physica:electrical-component/"))
      return invalidElectricity(
        electricityIssue(
          "electricity.invalid-component-type",
          "Electrical component type IDs must use the physica:electrical-component/ namespace.",
          "typeId",
        ),
      );
    if (
      new Set(definition.ports.map((port) => port.id)).size !==
        definition.ports.length ||
      definition.ports.some(
        (port) =>
          !port.portTypeId.startsWith("physica:port/") ||
          !Number.isInteger(port.maximumConnections) ||
          port.maximumConnections <= 0,
      )
    )
      return invalidElectricity(
        electricityIssue(
          "electricity.invalid-component-ports",
          "Electrical ports need unique IDs, namespaced types and positive integer capacities.",
          "ports",
        ),
      );
    if (this.#definitions.has(definition.typeId))
      return invalidElectricity(
        electricityIssue(
          "electricity.duplicate-component-type",
          `Electrical component type ${definition.typeId} is already registered.`,
          "typeId",
        ),
      );
    this.#definitions.set(definition.typeId, definition);
    return validElectricity(definition);
  }

  get(typeId: RegisteredTypeId): ElectricalComponentDefinition | undefined {
    return this.#definitions.get(typeId);
  }

  list(): readonly ElectricalComponentDefinition[] {
    return Object.freeze(
      [...this.#definitions.values()].sort((a, b) =>
        a.typeId.localeCompare(b.typeId),
      ),
    );
  }
}

export function createElectricalComponentRegistry(): ElectricalComponentRegistry {
  const registry = new ElectricalComponentRegistry();
  for (const definition of BUILT_IN_ELECTRICAL_COMPONENTS) {
    const result = registry.register(definition);
    if (!result.ok) throw new Error(result.issues[0]?.message);
  }
  return registry;
}
