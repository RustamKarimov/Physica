import { describe, expect, it } from "vitest";
import { PhysicalModelRuntime } from "@physica/physics-core";
import { createPhysicsLibraryRegistries } from "@physica/plugin-sdk";
import {
  COULOMB_CONSTANT,
  FIELD_EXAMPLE_IDS,
  FIELD_LIBRARY_DESCRIPTORS,
  GRAVITATIONAL_CONSTANT,
  acSourceModel,
  advanceChargedParticleInUniformElectricField,
  circularOrbit,
  electricFieldAt,
  electricPotentialAt,
  forceOnCurrent,
  gravitationalFieldAt,
  gravitationalPotentialAt,
  idealTransformer,
  inducedEmf,
  longSolenoidField,
  magneticCircularMotion,
  magneticForceOnCharge,
  magneticFlux,
  registerFieldsPhysicsLibrary,
  runFieldScenario,
  sinusoidalSignal,
  transmissionLoss,
  vec3,
} from "../src";

function value<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  if (!result.ok) throw new Error("Expected a successful field result.");
  return result.value;
}

describe("Phase 11 gravity and electric fields", () => {
  it("obeys inverse square, direction and potential-gradient reference cases", () => {
    const mass = {
      id: "m",
      massKilograms: 8e12,
      positionMetres: vec3(0, 0, 0),
    };
    const near = value(gravitationalFieldAt([mass], vec3(2, 0, 0)));
    const far = value(gravitationalFieldAt([mass], vec3(4, 0, 0)));
    expect(near.x).toBeCloseTo(4 * far.x, 12);
    expect(near.x).toBeCloseTo(
      (-GRAVITATIONAL_CONSTANT * mass.massKilograms) / 4,
      12,
    );
    const h = 1e-4;
    const gradient =
      (value(gravitationalPotentialAt([mass], vec3(2 + h, 0, 0))) -
        value(gravitationalPotentialAt([mass], vec3(2 - h, 0, 0)))) /
      (2 * h);
    expect(near.x).toBeCloseTo(-gradient, 6);

    const charge = {
      id: "q",
      chargeCoulombs: 3e-9,
      positionMetres: vec3(0, 0, 0),
    };
    const electric = value(electricFieldAt([charge], vec3(2, 0, 0)));
    expect(electric.x).toBeCloseTo(
      (COULOMB_CONSTANT * charge.chargeCoulombs) / 4,
      12,
    );
    const electricGradient =
      (value(electricPotentialAt([charge], vec3(2 + h, 0, 0))) -
        value(electricPotentialAt([charge], vec3(2 - h, 0, 0)))) /
      (2 * h);
    expect(electric.x).toBeCloseTo(-electricGradient, 6);
  });

  it("superposes equal sources and validates singularities", () => {
    const masses = [
      { id: "left", massKilograms: 1e10, positionMetres: vec3(-1, 0, 0) },
      { id: "right", massKilograms: 1e10, positionMetres: vec3(1, 0, 0) },
    ];
    expect(value(gravitationalFieldAt(masses, vec3(0, 0, 0)))).toEqual(
      vec3(0, 0, 0),
    );
    expect(
      gravitationalFieldAt(masses, masses[0]!.positionMetres),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "gravity.singular-source" }],
    });
    expect(
      electricPotentialAt(
        [{ id: "q", chargeCoulombs: 1, positionMetres: vec3(0, 0, 0) }],
        vec3(Number.NaN, 0, 0),
      ),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "electric-field.invalid-position" }],
    });
  });

  it("matches circular-orbit and uniform-field trajectory relations", () => {
    const orbit = value(circularOrbit(5.972e24, 6.771e6, 1000));
    expect(orbit.speedMetresPerSecond ** 2).toBeCloseTo(
      (GRAVITATIONAL_CONSTANT * 5.972e24) / 6.771e6,
      6,
    );
    expect(orbit.totalEnergyJoules).toBeCloseTo(-orbit.kineticEnergyJoules, 6);
    const state = value(
      advanceChargedParticleInUniformElectricField(
        {
          positionMetres: vec3(0, 0, 0),
          velocityMetresPerSecond: vec3(2, 0, 0),
          timeSeconds: 0,
        },
        2,
        4,
        vec3(0, 8, 0),
        0.5,
      ),
    );
    expect(state.positionMetres).toEqual(vec3(1, 0.5, 0));
    expect(state.velocityMetresPerSecond).toEqual(vec3(2, 2, 0));
  });
});

describe("Phase 11 magnetism and alternating current", () => {
  it("matches Lorentz, BIL, radius, solenoid and induction references", () => {
    expect(
      value(magneticForceOnCharge(2, vec3(3, 0, 0), vec3(0, 0, 4))),
    ).toEqual(vec3(0, -24, 0));
    expect(value(forceOnCurrent(0.5, 3, 0.2, Math.PI / 2))).toBeCloseTo(
      0.3,
      12,
    );
    expect(value(magneticCircularMotion(2, 6, 3, 4)).radiusMetres).toBe(1);
    expect(value(longSolenoidField(1000, 2, 0.5))).toBeCloseTo(
      0.0050265482457,
      12,
    );
    const flux = value(magneticFlux(0.4, 0.2, 0));
    expect(value(inducedEmf(10, flux, 2 * flux, 0.5))).toBeCloseTo(-1.6, 12);
  });

  it("matches RMS, transformer and transmission power relations", () => {
    const signal = value(sinusoidalSignal(10, 50, 0.005));
    expect(signal.instantaneous).toBeCloseTo(10, 12);
    expect(signal.rms).toBeCloseTo(10 / Math.sqrt(2), 12);
    const transformer = value(idealTransformer(100, 500, 20, 4));
    expect(transformer.secondaryVoltageVolts).toBe(100);
    expect(transformer.secondaryCurrentAmperes).toBe(0.8);
    expect(transformer.outputPowerWatts).toBe(transformer.inputPowerWatts);
    const low = value(transmissionLoss(10_000, 100, 2));
    const high = value(transmissionLoss(10_000, 1000, 2));
    expect(low.lineLossWatts / high.lineLossWatts).toBe(100);
  });

  it("runs an analytical AC PhysicalModelContract deterministically", () => {
    const runtime = PhysicalModelRuntime.initialize(acSourceModel, {
      peakVolts: 100,
      frequencyHertz: 50,
      phaseRadians: 0,
    });
    expect(runtime.ok).toBe(true);
    if (!runtime.ok) return;
    expect(runtime.value.advanceTo(0.005)).toMatchObject({
      ok: true,
      value: { state: { instantaneousVolts: 100 } },
    });
    expect(runtime.value.reset().timeSeconds).toBe(0);
  });
});

describe("Phase 11 catalog and scenarios", () => {
  it("publishes exactly the mandatory 15 scenarios with finite JSON output", () => {
    expect(FIELD_EXAMPLE_IDS).toHaveLength(15);
    for (const id of FIELD_EXAMPLE_IDS) {
      const scenario = runFieldScenario(id);
      expect(scenario.id).toBe(id);
      expect(scenario.assumptions.length).toBeGreaterThan(0);
      expect(JSON.stringify(scenario)).not.toMatch(/null/);
    }
  });

  it("registers every canonical catalog item without duplicate IDs", () => {
    expect(new Set(FIELD_LIBRARY_DESCRIPTORS.map((item) => item.id)).size).toBe(
      FIELD_LIBRARY_DESCRIPTORS.length,
    );
    expect(
      FIELD_LIBRARY_DESCRIPTORS.filter(
        (item) => item.name.toLowerCase() === "solenoid",
      ).map((item) => item.itemClass),
    ).toEqual(["smart-model", "visual-object"]);
    const registries = createPhysicsLibraryRegistries();
    registerFieldsPhysicsLibrary(registries);
    for (const descriptor of FIELD_LIBRARY_DESCRIPTORS)
      expect(registries.library.has(`physica:library/${descriptor.id}`)).toBe(
        true,
      );
  });
});
