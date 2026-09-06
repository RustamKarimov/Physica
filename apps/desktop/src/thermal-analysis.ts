import {
  TeachingGasSimulation,
  constantVolumeProcess,
  fromCelsius,
  isothermalProcess,
  solveIdealGas,
  thermalContactAt,
} from "@physica/physics-thermal";
import type { ThermalControlKey, ThermalWorkflowId } from "./thermal-workflows";

export interface ThermalAnalysis {
  readonly values: readonly (readonly [string, string])[];
  readonly validation: string;
  readonly graph: readonly {
    readonly x: number;
    readonly y: number;
    readonly secondary?: number;
  }[];
  readonly particles: readonly Readonly<{
    x: number;
    y: number;
    radius: number;
    tracer: boolean;
  }>[];
  readonly state: Readonly<Record<string, number>>;
}

function unwrap<T>(
  result:
    | { readonly ok: true; readonly value: Readonly<T> }
    | {
        readonly ok: false;
        readonly issues: readonly { readonly message: string }[];
      },
): Readonly<T> {
  if (!result.ok) throw new Error(result.issues[0]?.message);
  return result.value;
}

export function formatThermalValue(value: number): string {
  if (
    Math.abs(value) > 0 &&
    (Math.abs(value) < 0.001 || Math.abs(value) >= 10_000)
  )
    return value.toExponential(3);
  return Number(value.toFixed(4)).toString();
}
const f = (value: number, unit: string) =>
  formatThermalValue(value) + (unit ? " " + unit : "");

function initialGas(
  temperatureKelvin: number,
  volumeCubicMetres: number,
  amountMoles: number,
) {
  return unwrap(
    solveIdealGas(
      { temperatureKelvin, volumeCubicMetres, amountMoles },
      "pressurePascals",
    ),
  );
}

function particleAnalysis(
  controls: Readonly<Record<ThermalControlKey, number>>,
  brownian: boolean,
): ThermalAnalysis {
  const count = Math.round(controls.a);
  const simulation = unwrap(
    TeachingGasSimulation.create({
      particleCount: count,
      temperatureKelvin: controls.b,
      particleMassKilograms: 4.65e-26,
      particleRadiusMetres: 0.012,
      bounds: { minX: 0, maxX: 1, minY: 0, maxY: 0.7 },
      seed: Math.round(controls.c),
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
  const path: { x: number; y: number }[] = [];
  for (let index = 0; index < 48; index += 1) {
    frame = unwrap(simulation.step(0.00001));
    if (frame.brownianPosition) path.push(frame.brownianPosition);
  }
  return {
    values: [
      ["Equivalent temperature", f(frame.equivalentTemperatureKelvin, "K")],
      ["Kinetic energy", f(frame.kineticEnergyJoules, "J")],
      ["Mean squared speed", f(frame.meanSquaredSpeed, "m² s⁻²")],
      ["Collisions", f(frame.snapshot.collisionCount, "")],
    ],
    validation:
      "Seed, particles, histogram and collision state replay deterministically.",
    graph: brownian
      ? path
      : frame.speedHistogram.map((bin, index) => ({
          x: index,
          y: bin.count,
        })),
    particles: frame.snapshot.particles.map((particle) => ({
      x: particle.x,
      y: particle.y,
      radius: particle.radius,
      tracer: particle.id === count,
    })),
    state: {
      temperature: frame.equivalentTemperatureKelvin,
      energy: frame.kineticEnergyJoules,
      collisions: frame.snapshot.collisionCount,
      tracerX: frame.brownianPosition?.x ?? 0,
      tracerY: frame.brownianPosition?.y ?? 0,
    },
  };
}

export function calculateThermalWorkflow(
  id: ThermalWorkflowId,
  controls: Readonly<Record<ThermalControlKey, number>>,
): ThermalAnalysis {
  if (id === "temperature") {
    const hot = unwrap(fromCelsius(controls.a));
    const cool = unwrap(fromCelsius(controls.b));
    const contact = unwrap(
      thermalContactAt(
        {
          bodyAInitialKelvin: hot.kelvin,
          bodyBInitialKelvin: cool.kelvin,
          bodyAHeatCapacityJoulesPerKelvin: 500,
          bodyBHeatCapacityJoulesPerKelvin: 1000,
          conductanceWattsPerKelvin: 20,
        },
        controls.c,
      ),
    );
    const graph = Array.from({ length: 61 }, (_, index) => {
      const time = index * 3;
      const state = unwrap(
        thermalContactAt(
          {
            bodyAInitialKelvin: hot.kelvin,
            bodyBInitialKelvin: cool.kelvin,
            bodyAHeatCapacityJoulesPerKelvin: 500,
            bodyBHeatCapacityJoulesPerKelvin: 1000,
            conductanceWattsPerKelvin: 20,
          },
          time,
        ),
      );
      return {
        x: time,
        y: state.bodyATemperatureKelvin,
        secondary: state.bodyBTemperatureKelvin,
      };
    });
    return {
      values: [
        ["Hot body", f(contact.bodyATemperatureKelvin, "K")],
        ["Cool body", f(contact.bodyBTemperatureKelvin, "K")],
        ["Equilibrium", f(contact.equilibriumTemperatureKelvin, "K")],
        ["Temperature gap", f(contact.temperatureDifferenceKelvin, "K")],
      ],
      validation:
        "Absolute scale and both body temperatures derive from one conserved thermal state.",
      graph,
      particles: [],
      state: {
        hot: contact.bodyATemperatureKelvin,
        cool: contact.bodyBTemperatureKelvin,
        equilibrium: contact.equilibriumTemperatureKelvin,
        time: controls.c,
      },
    };
  }
  if (id === "ideal-gas") {
    const gas = initialGas(controls.a, controls.b / 1000, controls.c);
    return {
      values: [
        ["Pressure", f(gas.pressurePascals, "Pa")],
        ["Volume", f(gas.volumeCubicMetres, "m³")],
        ["Absolute temperature", f(gas.temperatureKelvin, "K")],
        [
          "Mean particle energy",
          f(gas.meanTranslationalKineticEnergyJoules, "J"),
        ],
      ],
      validation:
        "The displayed state satisfies pV=nRT to floating-point precision.",
      graph: Array.from({ length: 61 }, (_, index) => {
        const volume = 0.005 + index * 0.00125;
        return {
          x: volume,
          y: initialGas(controls.a, volume, controls.c).pressurePascals,
        };
      }),
      particles: [],
      state: {
        pressure: gas.pressurePascals,
        volume: gas.volumeCubicMetres,
        temperature: gas.temperatureKelvin,
        amount: gas.amountMoles,
      },
    };
  }
  if (id === "particles" || id === "brownian")
    return particleAnalysis(controls, id === "brownian");
  const initial = initialGas(
    controls.a,
    id === "first-law" ? 0.024 : controls.b / 1000,
    id === "first-law" ? controls.c : controls.d,
  );
  if (id === "first-law") {
    const process = unwrap(
      constantVolumeProcess(
        {
          pressurePascals: initial.pressurePascals,
          volumeCubicMetres: initial.volumeCubicMetres,
          temperatureKelvin: initial.temperatureKelvin,
          amountMoles: initial.amountMoles,
        },
        controls.b,
      ),
    );
    return {
      values: [
        ["Heat into gas Q", f(process.heatIntoGasJoules, "J")],
        ["Work by gas W", f(process.workByGasJoules, "J")],
        [
          "Internal-energy change ΔU",
          f(process.internalEnergyChangeJoules, "J"),
        ],
        ["Identity", "ΔU = Q − W_by"],
      ],
      validation:
        "The energy ledger closes exactly under the displayed sign convention.",
      graph: process.points.map((point) => ({
        x: point.volumeCubicMetres,
        y: point.pressurePascals,
      })),
      particles: [],
      state: {
        heat: process.heatIntoGasJoules,
        work: process.workByGasJoules,
        internal: process.internalEnergyChangeJoules,
        initialTemperature: controls.a,
        finalTemperature: controls.b,
      },
    };
  }
  const process = unwrap(
    isothermalProcess(
      {
        pressurePascals: initial.pressurePascals,
        volumeCubicMetres: initial.volumeCubicMetres,
        temperatureKelvin: initial.temperatureKelvin,
        amountMoles: initial.amountMoles,
      },
      controls.c / 1000,
      48,
    ),
  );
  return {
    values: [
      ["Work by gas", f(process.workByGasJoules, "J")],
      ["Heat into gas", f(process.heatIntoGasJoules, "J")],
      ["Internal-energy change", f(process.internalEnergyChangeJoules, "J")],
      [
        "Direction",
        process.workByGasJoules >= 0
          ? "expansion → positive"
          : "compression ← negative",
      ],
    ],
    validation:
      "The exact logarithmic work and displayed P–V path share one process result.",
    graph: process.points.map((point) => ({
      x: point.volumeCubicMetres,
      y: point.pressurePascals,
    })),
    particles: [],
    state: {
      work: process.workByGasJoules,
      heat: process.heatIntoGasJoules,
      initialVolume: controls.b,
      finalVolume: controls.c,
      temperature: controls.a,
    },
  };
}
