import { describe, expect, it } from "vitest";
import { PhysicalModelRuntime } from "@physica/physics-core";
import { createPhysicsLibraryRegistries } from "@physica/plugin-sdk";
import {
  ELECTRICITY_EXAMPLE_IDS,
  VACUUM_PERMITTIVITY_FARADS_PER_METRE,
  capacitorState,
  chargeTransfer,
  componentCharacteristic,
  createElectricalComponentRegistry,
  dcElectricalNetworkModel,
  electricityLibraryRequirementIds,
  equivalentCapacitance,
  internalResistanceState,
  measureBranchCurrent,
  measurePotentialDifference,
  ohmicState,
  parallelPlateCapacitance,
  potentialDividerState,
  rcTransientModel,
  rcTransientState,
  registerElectricityPhysicsLibrary,
  resistivityState,
  runElectricityScenario,
  solveElectricalNetwork,
} from "../src";

function unwrap<T>(
  result:
    { readonly ok: true; readonly value: Readonly<T> } | { readonly ok: false },
): Readonly<T> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected valid electricity result.");
  return result.value;
}

const SERIES_PARALLEL = {
  nodes: ["ground", "supply", "junction"],
  groundNode: "ground",
  branches: [
    { id: "series", fromNode: "supply", toNode: "junction", resistanceOhms: 4 },
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
} as const;

describe("Phase 10 electricity science", () => {
  it("keeps Q=It, V=IR and all ohmic power identities exact", () => {
    expect(unwrap(chargeTransfer(1.5, 12))).toMatchObject({
      transferredChargeCoulombs: 18,
      conventionalDirection: "positive",
    });
    const state = unwrap(ohmicState(12, 6));
    expect(state.currentAmps).toBe(2);
    expect(state.powerWatts).toBe(24);
    expect(state.powerByCurrentSquaredWatts).toBe(24);
    expect(state.powerByVoltageSquaredWatts).toBe(24);
  });

  it("resolves resistivity geometry and distinct component characteristics", () => {
    expect(
      unwrap(resistivityState(1.68e-8, 2, 1e-6)).resistanceOhms,
    ).toBeCloseTo(0.0336, 12);
    const ohmicAt3 = unwrap(componentCharacteristic("ohmic", 3)).currentAmps;
    const ohmicAt6 = unwrap(componentCharacteristic("ohmic", 6)).currentAmps;
    const lampAt3 = unwrap(componentCharacteristic("filament", 3)).currentAmps;
    const lampAt6 = unwrap(componentCharacteristic("filament", 6)).currentAmps;
    expect(ohmicAt6 / ohmicAt3).toBeCloseTo(2, 12);
    expect(lampAt6 / lampAt3).toBeLessThan(2);
    expect(
      unwrap(componentCharacteristic("thermistor", 5, 2))
        .effectiveResistanceOhms,
    ).toBeLessThan(
      unwrap(componentCharacteristic("thermistor", 5, 1))
        .effectiveResistanceOhms,
    );
  });

  it("solves a series-parallel network with KCL/KVL and ideal meters", () => {
    const state = unwrap(solveElectricalNetwork(SERIES_PARALLEL));
    expect(state.nodePotentialsVolts.supply).toBeCloseTo(12, 12);
    expect(state.nodePotentialsVolts.junction).toBeCloseTo(4, 12);
    expect(state.branchCurrentsAmps.series).toBeCloseTo(2, 12);
    expect(state.branchCurrentsAmps["parallel-a"]).toBeCloseTo(2 / 3, 12);
    expect(state.branchCurrentsAmps["parallel-b"]).toBeCloseTo(4 / 3, 12);
    expect(state.maximumKclResidualAmps).toBeLessThan(1e-12);
    expect(state.maximumKvlResidualVolts).toBeLessThan(1e-12);
    expect(
      unwrap(measurePotentialDifference(state, "junction", "ground")),
    ).toBeCloseTo(4, 12);
    expect(unwrap(measureBranchCurrent(state, "series"))).toBeCloseTo(2, 12);
  });

  it("returns stable diagnostics for invalid topology and singular networks", () => {
    const invalidShort = solveElectricalNetwork({
      nodes: ["ground", "a"],
      groundNode: "ground",
      branches: [
        { id: "short", fromNode: "a", toNode: "a", resistanceOhms: 0 },
      ],
      sources: [],
    });
    expect(invalidShort.ok).toBe(false);
    if (!invalidShort.ok)
      expect(invalidShort.issues.map((issue) => issue.code)).toContain(
        "electricity.short-circuit",
      );
    const openSource = solveElectricalNetwork({
      nodes: ["ground", "floating"],
      groundNode: "ground",
      branches: [],
      sources: [
        {
          id: "source",
          positiveNode: "floating",
          negativeNode: "ground",
          emfVolts: 5,
        },
      ],
    });
    expect(openSource).toMatchObject({ ok: true });
    if (openSource.ok)
      expect(openSource.value.diagnostics.join(" ")).toContain(
        "Open-circuit warning",
      );
    expect(
      solveElectricalNetwork({
        nodes: ["ground", "floating"],
        groundNode: "ground",
        branches: [],
        sources: [],
      }),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "electricity.singular-network" }],
    });
  });

  it("keeps terminal p.d., lost volts and divider limits consistent", () => {
    const cell = unwrap(internalResistanceState(12, 1, 5));
    expect(cell.currentAmps).toBe(2);
    expect(cell.terminalPotentialDifferenceVolts + cell.lostVolts).toBe(12);
    expect(cell.loadPowerWatts + cell.internalPowerWatts).toBe(24);
    expect(
      unwrap(potentialDividerState(12, 2000, 4000)).outputVoltageVolts,
    ).toBe(8);
    expect(
      unwrap(potentialDividerState(12, 2000, 4000, 4000)).outputVoltageVolts,
    ).toBe(6);
  });

  it("checks Q=CV, capacitor energy identities and network rules", () => {
    const capacitor = unwrap(capacitorState(0.002, 10));
    expect(capacitor.chargeCoulombs).toBe(0.02);
    expect(capacitor.energyJoules).toBeCloseTo(0.1, 12);
    expect(capacitor.energyByChargeVoltageJoules).toBeCloseTo(
      capacitor.energyJoules,
      12,
    );
    expect(capacitor.energyByChargeSquaredJoules).toBeCloseTo(
      capacitor.energyJoules,
      12,
    );
    expect(unwrap(equivalentCapacitance([3e-6, 6e-6], "series"))).toBeCloseTo(
      2e-6,
      15,
    );
    expect(unwrap(equivalentCapacitance([3e-6, 6e-6], "parallel"))).toBeCloseTo(
      9e-6,
      15,
    );
  });

  it("checks parallel-plate scaling and exact RC reference times", () => {
    const plate = unwrap(parallelPlateCapacitance(0.02, 0.001, 1));
    expect(plate.capacitanceFarads).toBeCloseTo(
      VACUUM_PERMITTIVITY_FARADS_PER_METRE * 20,
      20,
    );
    const parameters = {
      sourceVoltageVolts: 12,
      resistanceOhms: 2000,
      capacitanceFarads: 0.0005,
      initialVoltageVolts: 0,
    };
    expect(unwrap(rcTransientState(parameters, 0))).toMatchObject({
      voltageVolts: 0,
      currentAmps: 0.006,
    });
    const atTau = unwrap(rcTransientState(parameters, 1));
    expect(atTau.voltageVolts).toBeCloseTo(12 * (1 - Math.exp(-1)), 12);
    expect(atTau.currentAmps).toBeCloseTo(0.006 * Math.exp(-1), 12);
    expect(unwrap(rcTransientState(parameters, 20)).voltageVolts).toBeCloseTo(
      12,
      7,
    );
  });

  it("integrates both physical models through the shared runtime contract", () => {
    expect(
      PhysicalModelRuntime.initialize(
        dcElectricalNetworkModel,
        SERIES_PARALLEL,
      ),
    ).toMatchObject({ ok: true });
    expect(
      PhysicalModelRuntime.initialize(rcTransientModel, {
        sourceVoltageVolts: 12,
        resistanceOhms: 2000,
        capacitanceFarads: 0.0005,
        initialVoltageVolts: 0,
      }),
    ).toMatchObject({ ok: true });
  });

  it("registers typed component and complete Library catalogs deterministically", () => {
    const components = createElectricalComponentRegistry();
    expect(components.list()).toHaveLength(12);
    expect(
      components.list().every((component) => component.ports.length === 2),
    ).toBe(true);
    expect(
      components.register({
        ...components.list()[0]!,
        typeId: "plugin:bad-component" as never,
      }),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "electricity.invalid-component-type" }],
    });
    const registries = createPhysicsLibraryRegistries();
    registerElectricityPhysicsLibrary(registries);
    expect(registries.library.list()).toHaveLength(
      electricityLibraryRequirementIds().length,
    );
    expect(electricityLibraryRequirementIds(9).length).toBeGreaterThan(20);
    expect(electricityLibraryRequirementIds(10).length).toBeGreaterThan(25);
    expect(electricityLibraryRequirementIds(19).length).toBeGreaterThan(20);
  });

  it("runs all 13 required scenarios as immutable deterministic evidence", () => {
    expect(ELECTRICITY_EXAMPLE_IDS).toHaveLength(13);
    for (const id of ELECTRICITY_EXAMPLE_IDS) {
      const first = runElectricityScenario(id);
      expect(first).toEqual(runElectricityScenario(id));
      expect(Object.isFrozen(first)).toBe(true);
    }
  });
});
