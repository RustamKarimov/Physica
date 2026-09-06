import { describe, expect, it } from "vitest";
import { PhysicalModelRuntime } from "@physica/physics-core";
import { createPhysicsLibraryRegistries } from "@physica/plugin-sdk";
import {
  BOLTZMANN_CONSTANT,
  MOLAR_GAS_CONSTANT,
  THERMAL_EXAMPLE_IDS,
  THERMAL_LIBRARY_DESCRIPTORS,
  TeachingGasSimulation,
  calibrateThermometricProperty,
  constantPressureProcess,
  constantVolumeProcess,
  fromCelsius,
  fromKelvin,
  idealGasModel,
  isothermalProcess,
  piecewiseProcess,
  registerThermalPhysicsLibrary,
  runThermalScenario,
  solveIdealGas,
  thermalContactAt,
  thermalContactModel,
  type ProcessPoint,
  type ThermalResult,
  type ThermodynamicState,
} from "../src";

function value<T>(result: ThermalResult<T>): Readonly<T> {
  if (!result.ok) throw new Error("Expected a successful thermal result.");
  return result.value;
}

function gasState(): ThermodynamicState {
  const gas = value(
    solveIdealGas(
      {
        volumeCubicMetres: 0.025,
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

describe("Phase 12 temperature", () => {
  it("round-trips absolute and Celsius temperatures and rejects impossible values", () => {
    const converted = value(fromCelsius(100));
    expect(converted.kelvin).toBeCloseTo(373.15, 12);
    expect(value(fromKelvin(converted.kelvin)).celsius).toBeCloseTo(100, 12);
    expect(fromKelvin(-0.01)).toMatchObject({
      ok: false,
      issues: [{ code: "thermal.negative-kelvin" }],
    });
  });

  it("uses a two-fixed-point linear thermometric calibration", () => {
    const calibration = value(calibrateThermometricProperty(10, 30, 15));
    expect(calibration.celsius).toBe(25);
    expect(calibration.kelvin).toBeCloseTo(298.15, 12);
    expect(calibrateThermometricProperty(4, 4, 4)).toMatchObject({
      ok: false,
      issues: [{ code: "thermal.degenerate-calibration" }],
    });
  });

  it("conserves two-body thermal energy and converges to equilibrium", () => {
    const parameters = {
      bodyAInitialKelvin: 400,
      bodyBInitialKelvin: 280,
      bodyAHeatCapacityJoulesPerKelvin: 500,
      bodyBHeatCapacityJoulesPerKelvin: 1000,
      conductanceWattsPerKelvin: 20,
    };
    const initial = value(thermalContactAt(parameters, 0));
    const later = value(thermalContactAt(parameters, 200));
    expect(later.totalThermalEnergyJoules).toBeCloseTo(
      initial.totalThermalEnergyJoules,
      10,
    );
    expect(Math.abs(later.temperatureDifferenceKelvin)).toBeLessThan(
      Math.abs(initial.temperatureDifferenceKelvin),
    );
  });
});

describe("Phase 12 gas and particles", () => {
  it("satisfies pV=nRT and the kinetic-temperature relation", () => {
    const state = value(
      solveIdealGas(
        {
          volumeCubicMetres: 0.02,
          temperatureKelvin: 350,
          amountMoles: 0.8,
        },
        "pressurePascals",
      ),
    );
    expect(state.pVJoules).toBeCloseTo(state.nRTJoules, 12);
    expect(state.nRTJoules).toBeCloseTo(0.8 * MOLAR_GAS_CONSTANT * 350, 12);
    expect(state.meanTranslationalKineticEnergyJoules).toBeCloseTo(
      1.5 * BOLTZMANN_CONSTANT * 350,
      12,
    );
    expect(
      solveIdealGas(
        { volumeCubicMetres: 0, temperatureKelvin: 300, amountMoles: 1 },
        "pressurePascals",
      ),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "thermal.invalid-gas-state" }],
    });
  });

  it("replays the seeded particle gas and restores checkpoints exactly", () => {
    const options = {
      particleCount: 12,
      temperatureKelvin: 300,
      particleMassKilograms: 4.65e-26,
      particleRadiusMetres: 0.01,
      bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      seed: 12345,
    };
    const first = value(TeachingGasSimulation.create(options));
    const second = value(TeachingGasSimulation.create(options));
    const a = value(first.step(0.00001));
    const b = value(second.step(0.00001));
    expect(a.snapshot).toEqual(b.snapshot);
    const checkpoint = a.snapshot;
    const advanced = value(first.step(0.00001));
    first.restore(checkpoint);
    expect(value(first.step(0.00001)).snapshot).toEqual(advanced.snapshot);
  });

  it("conserves elastic kinetic energy before wall contact and bounds a Brownian tracer", () => {
    const simulation = value(
      TeachingGasSimulation.create({
        particleCount: 16,
        temperatureKelvin: 300,
        particleMassKilograms: 4.65e-26,
        particleRadiusMetres: 0.01,
        bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        seed: 7,
        brownianTracer: {
          radiusMetres: 0.05,
          massKilograms: 4.65e-24,
        },
      }),
    );
    const initial = simulation.snapshot();
    const later = value(simulation.step(1e-8));
    expect(later.kineticEnergyJoules).toBeCloseTo(
      initial.kineticEnergyJoules,
      12,
    );
    expect(later.brownianPosition).toBeDefined();
    expect(later.brownianPosition!.x).toBeGreaterThanOrEqual(0.05);
    expect(later.brownianPosition!.x).toBeLessThanOrEqual(0.95);
    expect(later.wallCollisionRatePerSecond).toBeGreaterThanOrEqual(0);
    expect(later.wallImpulseRateNewtons).toBeGreaterThanOrEqual(0);
  });
});

describe("Phase 12 thermodynamics", () => {
  it("applies deltaU = Q - W_by to constant-volume and pressure paths", () => {
    const initial = gasState();
    for (const process of [
      value(constantVolumeProcess(initial, 360)),
      value(constantPressureProcess(initial, 360)),
    ]) {
      expect(process.heatIntoGasJoules - process.workByGasJoules).toBeCloseTo(
        process.internalEnergyChangeJoules,
        10,
      );
      expect(
        process.areaSegments.reduce(
          (sum, segment) => sum + segment.signedWorkJoules,
          0,
        ),
      ).toBeCloseTo(process.workByGasJoules, 10);
    }
  });

  it("uses the exact logarithmic isothermal work and signed cycle area", () => {
    const initial = gasState();
    const path = value(
      isothermalProcess(initial, initial.volumeCubicMetres * 2, 32),
    );
    expect(path.internalEnergyChangeJoules).toBeCloseTo(0, 12);
    expect(path.workByGasJoules).toBeCloseTo(
      initial.amountMoles *
        MOLAR_GAS_CONSTANT *
        initial.temperatureKelvin *
        Math.log(2),
      10,
    );
    expect(
      path.areaSegments.reduce(
        (sum, segment) => sum + segment.signedWorkJoules,
        0,
      ),
    ).toBeCloseTo(path.workByGasJoules, 10);
    const point = (pressure: number, volume: number): ProcessPoint => ({
      pressurePascals: pressure,
      volumeCubicMetres: volume,
      temperatureKelvin:
        (pressure * volume) / (initial.amountMoles * MOLAR_GAS_CONSTANT),
    });
    const cycle = value(
      piecewiseProcess(
        initial.amountMoles,
        [
          point(100_000, 0.02),
          point(200_000, 0.02),
          point(200_000, 0.04),
          point(100_000, 0.04),
          point(100_000, 0.02),
        ],
        true,
      ),
    );
    expect(cycle.workByGasJoules).toBeCloseTo(2000, 10);
    expect(cycle.internalEnergyChangeJoules).toBeCloseTo(0, 10);
  });
});

describe("Phase 12 contracts, scenarios and catalog", () => {
  it("runs analytical model contracts through the authoritative runtime", () => {
    const contact = PhysicalModelRuntime.initialize(thermalContactModel, {
      bodyAInitialKelvin: 350,
      bodyBInitialKelvin: 280,
      bodyAHeatCapacityJoulesPerKelvin: 500,
      bodyBHeatCapacityJoulesPerKelvin: 500,
      conductanceWattsPerKelvin: 10,
    });
    expect(contact.ok).toBe(true);
    if (contact.ok)
      expect(
        contact.value.advanceTo(20).ok &&
          contact.value.state.temperatureDifferenceKelvin,
      ).toBeLessThan(70);
    expect(
      PhysicalModelRuntime.initialize(idealGasModel, {
        volumeCubicMetres: 0.02,
        temperatureKelvin: 300,
        amountMoles: 1,
      }).ok,
    ).toBe(true);
  });

  it("publishes exactly the twelve mandatory scenarios with finite JSON", () => {
    expect(THERMAL_EXAMPLE_IDS).toHaveLength(12);
    for (const id of THERMAL_EXAMPLE_IDS) {
      const scenario = runThermalScenario(id);
      expect(scenario.id).toBe(id);
      expect(scenario.assumptions.length).toBeGreaterThan(0);
      expect(JSON.stringify(scenario)).not.toMatch(/null/);
    }
  });

  it("registers all canonical Library entries without ID collisions", () => {
    expect(
      new Set(THERMAL_LIBRARY_DESCRIPTORS.map((item) => item.id)).size,
    ).toBe(THERMAL_LIBRARY_DESCRIPTORS.length);
    const registries = createPhysicsLibraryRegistries();
    registerThermalPhysicsLibrary(registries);
    for (const descriptor of THERMAL_LIBRARY_DESCRIPTORS)
      expect(registries.library.has("physica:library/" + descriptor.id)).toBe(
        true,
      );
  });
});
