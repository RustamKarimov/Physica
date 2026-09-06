import { compareGasStates, solveIdealGas } from "./gas";
import { TeachingGasSimulation } from "./particles";
import {
  calibrateThermometricProperty,
  fromCelsius,
  thermalContactAt,
} from "./temperature";
import {
  constantPressureProcess,
  constantVolumeProcess,
  isothermalProcess,
  piecewiseProcess,
  type ProcessPoint,
  type ThermodynamicState,
} from "./thermodynamics";
import { deepFreeze, type ThermalResult } from "./types";

export const THERMAL_EXAMPLE_IDS = Object.freeze([
  "temperature-scales",
  "thermometer-calibration",
  "thermal-equilibrium",
  "ideal-gas-law",
  "gas-particles",
  "gas-compression",
  "speed-distribution",
  "brownian-tracer",
  "first-law",
  "pv-process",
  "isothermal-process",
  "thermodynamic-cycle-extension",
] as const);

export type ThermalExampleId = (typeof THERMAL_EXAMPLE_IDS)[number];
export type ThermalTopic = 14 | 15 | 16;

export interface ThermalScenario {
  readonly id: ThermalExampleId;
  readonly topic: ThermalTopic;
  readonly title: string;
  readonly question: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly result: unknown;
  readonly representations: readonly string[];
  readonly assumptions: readonly string[];
}

function unwrap<T>(result: ThermalResult<T>): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}

function initialState(): ThermodynamicState {
  const gas = unwrap(
    solveIdealGas(
      {
        volumeCubicMetres: 0.024,
        temperatureKelvin: 300,
        amountMoles: 1,
      },
      "pressurePascals",
    ),
  );
  return {
    pressurePascals: gas.pressurePascals,
    volumeCubicMetres: gas.volumeCubicMetres,
    temperatureKelvin: gas.temperatureKelvin,
    amountMoles: gas.amountMoles,
  };
}

function gasFrame(brownian: boolean, steps: number) {
  const simulation = unwrap(
    TeachingGasSimulation.create({
      particleCount: brownian ? 28 : 24,
      temperatureKelvin: 300,
      particleMassKilograms: 4.65e-26,
      particleRadiusMetres: 0.012,
      bounds: { minX: 0, maxX: 1, minY: 0, maxY: 0.7 },
      seed: brownian ? 970215 : 9702,
      ...(brownian
        ? {
            brownianTracer: {
              radiusMetres: 0.055,
              massKilograms: 4.65e-24,
            },
          }
        : {}),
    }),
  );
  let frame = simulation.snapshot();
  for (let index = 0; index < steps; index += 1)
    frame = unwrap(simulation.step(0.00001));
  return frame;
}

function details(id: ThermalExampleId): Omit<ThermalScenario, "id"> {
  const initial = initialState();
  switch (id) {
    case "temperature-scales":
      return {
        topic: 14,
        title: "Celsius and kelvin scales",
        question: "How do Celsius intervals map onto the absolute scale?",
        parameters: { celsius: 25 },
        result: unwrap(fromCelsius(25)),
        representations: ["dual thermometer", "Celsius scale", "Kelvin scale"],
        assumptions: ["exact conventional offset of 273.15"],
      };
    case "thermometer-calibration":
      return {
        topic: 14,
        title: "Thermometer calibration",
        question: "How do two fixed points define a linear temperature scale?",
        parameters: {
          icePointProperty: 100,
          steamPointProperty: 138.5,
          measuredProperty: 119.25,
        },
        result: unwrap(calibrateThermometricProperty(100, 138.5, 119.25)),
        representations: [
          "liquid thermometer",
          "fixed-point markers",
          "calibration graph",
        ],
        assumptions: ["thermometric property varies linearly"],
      };
    case "thermal-equilibrium":
      return {
        topic: 14,
        title: "Two-body thermal equilibrium",
        question: "How do two isolated bodies approach a shared temperature?",
        parameters: {
          bodyAInitialKelvin: 360,
          bodyBInitialKelvin: 280,
          bodyAHeatCapacityJoulesPerKelvin: 500,
          bodyBHeatCapacityJoulesPerKelvin: 1000,
          conductanceWattsPerKelvin: 25,
          timeSeconds: 60,
        },
        result: unwrap(
          thermalContactAt(
            {
              bodyAInitialKelvin: 360,
              bodyBInitialKelvin: 280,
              bodyAHeatCapacityJoulesPerKelvin: 500,
              bodyBHeatCapacityJoulesPerKelvin: 1000,
              conductanceWattsPerKelvin: 25,
            },
            60,
          ),
        ),
        representations: [
          "two thermal blocks",
          "thermal contact",
          "temperature-time graph",
        ],
        assumptions: ["constant heat capacities", "isolated two-body system"],
      };
    case "ideal-gas-law":
      return {
        topic: 15,
        title: "Ideal-gas law",
        question: "How do p, V, n and absolute T constrain one another?",
        parameters: {
          volumeCubicMetres: 0.024,
          temperatureKelvin: 300,
          amountMoles: 1,
        },
        result: unwrap(
          solveIdealGas(
            {
              volumeCubicMetres: 0.024,
              temperatureKelvin: 300,
              amountMoles: 1,
            },
            "pressurePascals",
          ),
        ),
        representations: [
          "gas container",
          "pressure gauge",
          "temperature readout",
          "state table",
        ],
        assumptions: ["ideal gas at equilibrium"],
      };
    case "gas-particles":
      return {
        topic: 15,
        title: "Elastic particle gas",
        question: "How do microscopic collisions retain ensemble invariants?",
        parameters: { particleCount: 24, temperatureKelvin: 300, seed: 9702 },
        result: gasFrame(false, 20),
        representations: [
          "2D particle container",
          "velocity vectors",
          "collision counter",
        ],
        assumptions: ["2D elastic hard disks", "schematic particle scale"],
      };
    case "gas-compression": {
      const final = unwrap(
        solveIdealGas(
          {
            volumeCubicMetres: 0.012,
            temperatureKelvin: 300,
            amountMoles: 1,
          },
          "pressurePascals",
        ),
      );
      return {
        topic: 15,
        title: "Isothermal gas compression",
        question: "Why does pressure double when fixed gas volume halves?",
        parameters: {
          initialVolumeCubicMetres: 0.024,
          finalVolumeCubicMetres: 0.012,
          temperatureKelvin: 300,
        },
        result: unwrap(
          compareGasStates(
            unwrap(solveIdealGas(initial, "pressurePascals")),
            final,
          ),
        ),
        representations: ["movable piston", "pressure gauge", "P–V graph"],
        assumptions: ["fixed amount", "isothermal equilibrium states"],
      };
    }
    case "speed-distribution": {
      const frame = gasFrame(false, 30);
      return {
        topic: 15,
        title: "Particle speed distribution",
        question: "How does a gas ensemble occupy a range of speeds?",
        parameters: { particleCount: 24, temperatureKelvin: 300, seed: 9702 },
        result: {
          equivalentTemperatureKelvin: frame.equivalentTemperatureKelvin,
          meanSquaredSpeed: frame.meanSquaredSpeed,
          speedHistogram: frame.speedHistogram,
        },
        representations: [
          "particle ensemble",
          "speed histogram",
          "mean-speed marker",
        ],
        assumptions: ["seeded 2D teaching distribution"],
      };
    }
    case "brownian-tracer":
      return {
        topic: 15,
        title: "Brownian tracer",
        question:
          "How can many deterministic collisions produce an irregular path?",
        parameters: { particleCount: 28, temperatureKelvin: 300, seed: 970215 },
        result: gasFrame(true, 60),
        representations: ["gas particles", "large tracer", "tracer path"],
        assumptions: [
          "seeded elastic hard-disk teaching model",
          "schematic time and size scales",
        ],
      };
    case "first-law":
      return {
        topic: 16,
        title: "First-law energy ledger",
        question: "How are heat, work and internal-energy change reconciled?",
        parameters: { process: "constant-volume", finalTemperatureKelvin: 360 },
        result: unwrap(constantVolumeProcess(initial, 360)),
        representations: [
          "system boundary",
          "heat arrow",
          "energy ledger",
          "equation",
        ],
        assumptions: ["monatomic ideal gas", "constant volume"],
      };
    case "pv-process":
      return {
        topic: 16,
        title: "Constant-pressure P–V process",
        question: "How does graph area equal work done by the gas?",
        parameters: {
          process: "constant-pressure",
          finalTemperatureKelvin: 420,
        },
        result: unwrap(constantPressureProcess(initial, 420)),
        representations: [
          "weighted piston",
          "P–V path",
          "area/work shader",
          "energy ledger",
        ],
        assumptions: ["monatomic ideal gas", "quasi-static process"],
      };
    case "isothermal-process":
      return {
        topic: 16,
        title: "Isothermal P–V process",
        question: "Why does heat input equal work during ideal-gas expansion?",
        parameters: { finalVolumeCubicMetres: 0.048 },
        result: unwrap(isothermalProcess(initial, 0.048)),
        representations: [
          "thermal reservoir",
          "piston",
          "isothermal curve",
          "area/work shader",
        ],
        assumptions: ["ideal gas", "quasi-static isothermal path"],
      };
    case "thermodynamic-cycle-extension": {
      const n = initial.amountMoles;
      const statePoint = (
        pressurePascals: number,
        volumeCubicMetres: number,
      ): ProcessPoint => ({
        pressurePascals,
        volumeCubicMetres,
        temperatureKelvin:
          (pressurePascals * volumeCubicMetres) / (n * 8.31446261815324),
      });
      const points = [
        statePoint(100_000, 0.02),
        statePoint(200_000, 0.02),
        statePoint(200_000, 0.04),
        statePoint(100_000, 0.04),
        statePoint(100_000, 0.02),
      ];
      return {
        topic: 16,
        title: "Thermodynamic cycle extension",
        question:
          "How does the orientation and enclosed P–V area set net work?",
        parameters: { path: "clockwise rectangular cycle" },
        result: unwrap(piecewiseProcess(n, points, true)),
        representations: [
          "closed P–V path",
          "signed area",
          "cycle direction",
          "energy ledger",
        ],
        assumptions: ["piecewise-linear quasi-static ideal-gas cycle"],
      };
    }
  }
}

export function runThermalScenario(id: ThermalExampleId): ThermalScenario {
  return deepFreeze({ id, ...details(id) }) as ThermalScenario;
}

export const THERMAL_SCENARIOS = Object.freeze(
  THERMAL_EXAMPLE_IDS.map(runThermalScenario),
);
