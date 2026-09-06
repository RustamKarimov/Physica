import {
  capacitorState,
  equivalentCapacitance,
  rcTransientState,
} from "./capacitors";
import {
  internalResistanceState,
  potentialDividerState,
  solveElectricalNetwork,
} from "./circuits";
import {
  chargeTransfer,
  componentCharacteristic,
  ohmicState,
  resistivityState,
} from "./fundamentals";
import { deepFreeze, type ElectricityResult } from "./types";

export const ELECTRICITY_EXAMPLE_IDS = Object.freeze([
  "charge-current",
  "ohmic-resistor",
  "iv-characteristics",
  "resistivity",
  "electrical-power",
  "series-parallel",
  "kirchhoff-network",
  "internal-resistance",
  "potential-divider",
  "capacitance-qv",
  "capacitor-energy",
  "capacitors-combinations",
  "rc-charging",
] as const);
export type ElectricityExampleId = (typeof ELECTRICITY_EXAMPLE_IDS)[number];

export interface ElectricityScenario {
  readonly id: ElectricityExampleId;
  readonly topic: 9 | 10 | 19;
  readonly title: string;
  readonly question: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly result: unknown;
  readonly representations: readonly string[];
  readonly assumptions: readonly string[];
}

function unwrap<T>(result: ElectricityResult<T>): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}
function canonical<T>(value: T): T {
  if (typeof value === "number") {
    const rounded = Number(value.toPrecision(12));
    return (Object.is(rounded, -0) ? 0 : rounded) as T;
  }
  if (Array.isArray(value)) return value.map(canonical) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, canonical(child)]),
    ) as T;
  return value;
}

function network(id: "series-parallel" | "kirchhoff-network") {
  return id === "series-parallel"
    ? {
        nodes: ["ground", "supply", "junction"],
        groundNode: "ground",
        branches: [
          {
            id: "series",
            fromNode: "supply",
            toNode: "junction",
            resistanceOhms: 4,
          },
          {
            id: "parallel-a",
            fromNode: "junction",
            toNode: "ground",
            resistanceOhms: 6,
          },
          {
            id: "parallel-b",
            fromNode: "junction",
            toNode: "ground",
            resistanceOhms: 3,
          },
        ],
        sources: [
          {
            id: "cell",
            positiveNode: "supply",
            negativeNode: "ground",
            emfVolts: 12,
          },
        ],
      }
    : {
        nodes: ["ground", "supply", "left", "right"],
        groundNode: "ground",
        branches: [
          {
            id: "upper-left",
            fromNode: "supply",
            toNode: "left",
            resistanceOhms: 2,
          },
          {
            id: "lower-left",
            fromNode: "left",
            toNode: "ground",
            resistanceOhms: 4,
          },
          {
            id: "upper-right",
            fromNode: "supply",
            toNode: "right",
            resistanceOhms: 3,
          },
          {
            id: "lower-right",
            fromNode: "right",
            toNode: "ground",
            resistanceOhms: 6,
          },
          {
            id: "bridge",
            fromNode: "left",
            toNode: "right",
            resistanceOhms: 5,
          },
        ],
        sources: [
          {
            id: "cell",
            positiveNode: "supply",
            negativeNode: "ground",
            emfVolts: 12,
          },
        ],
      };
}

function details(id: ElectricityExampleId): Omit<ElectricityScenario, "id"> {
  switch (id) {
    case "charge-current":
      return {
        topic: 9,
        title: "Charge and current bookkeeping",
        question:
          "How much signed charge passes when current flows for a measured time?",
        parameters: { currentAmps: 1.5, durationSeconds: 12 },
        result: unwrap(chargeTransfer(1.5, 12)),
        representations: ["charge counter", "current arrows", "time readout"],
        assumptions: ["steady conventional current"],
      };
    case "ohmic-resistor":
      return {
        topic: 9,
        title: "Ohmic resistor",
        question:
          "How do potential difference, current and power share one state?",
        parameters: { voltageVolts: 12, resistanceOhms: 6 },
        result: unwrap(ohmicState(12, 6)),
        representations: ["resistor", "ammeter", "voltmeter", "power meter"],
        assumptions: ["constant temperature", "ohmic response"],
      };
    case "iv-characteristics":
      return {
        topic: 9,
        title: "I–V characteristics",
        question: "How does a filament lamp differ from an ohmic resistor?",
        parameters: { voltagesVolts: [-6, -3, 0, 3, 6], curveControl: 1 },
        result: {
          ohmic: [-6, -3, 0, 3, 6].map((voltage) =>
            unwrap(componentCharacteristic("ohmic", voltage)),
          ),
          filament: [-6, -3, 0, 3, 6].map((voltage) =>
            unwrap(componentCharacteristic("filament", voltage)),
          ),
        },
        representations: [
          "component symbols",
          "I–V graph",
          "resistance readout",
        ],
        assumptions: ["static teaching curves", "temperature history omitted"],
      };
    case "resistivity":
      return {
        topic: 9,
        title: "Resistivity wire",
        question: "How do material, length and area determine resistance?",
        parameters: {
          resistivityOhmMetres: 1.68e-8,
          lengthMetres: 2,
          areaSquareMetres: 1e-6,
        },
        result: unwrap(resistivityState(1.68e-8, 2, 1e-6)),
        representations: [
          "wire geometry",
          "length marker",
          "area marker",
          "resistance readout",
        ],
        assumptions: [
          "uniform material",
          "uniform cross-section",
          "fixed temperature",
        ],
      };
    case "electrical-power":
      return {
        topic: 9,
        title: "Electrical power",
        question:
          "Why do three equivalent power expressions agree for an ohmic load?",
        parameters: { voltageVolts: 9, resistanceOhms: 3 },
        result: unwrap(ohmicState(9, 3)),
        representations: [
          "energy-flow arrows",
          "power meter",
          "equation panel",
        ],
        assumptions: ["ohmic load", "steady D.C."],
      };
    case "series-parallel": {
      const parameters = network(id);
      return {
        topic: 10,
        title: "Series–parallel D.C. network",
        question:
          "How do branch currents divide while KCL and KVL remain satisfied?",
        parameters,
        result: unwrap(solveElectricalNetwork(parameters)),
        representations: [
          "circuit schematic",
          "node potentials",
          "current arrows",
          "meters",
        ],
        assumptions: [
          "ideal source",
          "ohmic resistors",
          "ideal wires and meters",
        ],
      };
    }
    case "kirchhoff-network": {
      const parameters = network(id);
      return {
        topic: 10,
        title: "Kirchhoff bridge network",
        question:
          "Can a multi-loop solution satisfy every node and component equation together?",
        parameters,
        result: unwrap(solveElectricalNetwork(parameters)),
        representations: [
          "bridge schematic",
          "KCL panel",
          "KVL panel",
          "node-color overlay",
        ],
        assumptions: [
          "balanced resistive bridge",
          "simultaneous modified-nodal solve",
        ],
      };
    }
    case "internal-resistance":
      return {
        topic: 10,
        title: "Cell with internal resistance",
        question: "Where do terminal p.d. and lost volts come from under load?",
        parameters: {
          emfVolts: 12,
          internalResistanceOhms: 1,
          loadResistanceOhms: 5,
        },
        result: unwrap(internalResistanceState(12, 1, 5)),
        representations: [
          "cell model",
          "load",
          "terminal voltmeter",
          "power split",
        ],
        assumptions: ["constant emf", "lumped internal resistance"],
      };
    case "potential-divider":
      return {
        topic: 10,
        title: "Potential divider",
        question:
          "How does the resistor ratio set the measured output potential?",
        parameters: {
          sourceVoltageVolts: 12,
          upperResistanceOhms: 2000,
          lowerResistanceOhms: 4000,
        },
        result: unwrap(potentialDividerState(12, 2000, 4000)),
        representations: [
          "divider schematic",
          "slider marker",
          "voltmeter",
          "ratio equation",
        ],
        assumptions: ["unloaded output", "ideal voltmeter"],
      };
    case "capacitance-qv":
      return {
        topic: 19,
        title: "Capacitance and Q–V",
        question: "How does stored charge scale with potential difference?",
        parameters: { capacitanceFarads: 0.0005, voltageVolts: 12 },
        result: unwrap(capacitorState(0.0005, 12)),
        representations: ["capacitor plates", "charge symbols", "Q–V graph"],
        assumptions: ["constant ideal capacitance"],
      };
    case "capacitor-energy":
      return {
        topic: 19,
        title: "Capacitor energy",
        question: "Why do all three capacitor-energy expressions agree?",
        parameters: { capacitanceFarads: 0.002, voltageVolts: 10 },
        result: unwrap(capacitorState(0.002, 10)),
        representations: [
          "charge accumulation",
          "energy display",
          "equation panel",
        ],
        assumptions: ["ideal capacitor", "quasi-static charging"],
      };
    case "capacitors-combinations":
      return {
        topic: 19,
        title: "Capacitors in combination",
        question:
          "How do the same capacitors combine differently in series and parallel?",
        parameters: { capacitancesFarads: [0.000003, 0.000006] },
        result: {
          seriesFarads: unwrap(equivalentCapacitance([3e-6, 6e-6], "series")),
          parallelFarads: unwrap(
            equivalentCapacitance([3e-6, 6e-6], "parallel"),
          ),
        },
        representations: [
          "series network",
          "parallel network",
          "equivalent readout",
        ],
        assumptions: ["ideal capacitors", "uncharged before connection"],
      };
    case "rc-charging": {
      const parameters = {
        sourceVoltageVolts: 12,
        resistanceOhms: 2000,
        capacitanceFarads: 0.0005,
        initialVoltageVolts: 0,
      };
      return {
        topic: 19,
        title: "RC charging transient",
        question: "What changes after exactly one time constant?",
        parameters: { ...parameters, timeSeconds: 1 },
        result: unwrap(rcTransientState(parameters, 1)),
        representations: [
          "charging circuit",
          "plate charge",
          "V–t graph",
          "I–t graph",
          "time-constant marker",
        ],
        assumptions: ["ideal first-order RC circuit", "constant 12 V source"],
      };
    }
  }
}

export function runElectricityScenario(
  id: ElectricityExampleId,
): ElectricityScenario {
  return deepFreeze(canonical({ id, ...details(id) })) as ElectricityScenario;
}

export const ELECTRICITY_SCENARIOS = Object.freeze(
  ELECTRICITY_EXAMPLE_IDS.map(runElectricityScenario),
);
