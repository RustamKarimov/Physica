import { describe, expect, it } from "vitest";
import { PhysicalModelRuntime } from "@physica/physics-core";
import { createPhysicsLibraryRegistries } from "@physica/plugin-sdk";
import {
  OSCILLATION_EXAMPLE_IDS,
  evaluateCoupledOscillators,
  evaluateShm,
  evaluateSmallAnglePendulum,
  drivenOscillatorModel,
  drivenSteadyResponse,
  mechanicsLibraryRequirementIds,
  resonanceCurve,
  runOscillationScenario,
  sampleShm,
  shmOscillatorModel,
  stepDrivenOscillator,
  stepNonlinearPendulum,
  registerMechanicsPhysicsLibrary,
  type MechanicsResult,
} from "../src";

function value<T>(result: MechanicsResult<T>): Readonly<T> {
  if (!result.ok) throw new Error("Expected a successful mechanics result.");
  return result.value;
}

describe("Phase 13 simple harmonic motion", () => {
  const parameters = {
    amplitudeMetres: 0.2,
    angularFrequencyRadiansPerSecond: 5,
    phaseRadians: 0.3,
    massKilograms: 0.4,
  };

  it("keeps derivatives, restoring force and energy on one phase", () => {
    const state = value(evaluateShm(parameters, 0.73));
    expect(state.accelerationMetresPerSecondSquared).toBeCloseTo(
      -25 * state.displacementMetres,
      12,
    );
    expect(state.forceNewtons).toBeCloseTo(
      parameters.massKilograms * state.accelerationMetresPerSecondSquared,
      12,
    );
    expect(state.kineticEnergyJoules + state.potentialEnergyJoules).toBeCloseTo(
      state.totalEnergyJoules,
      12,
    );
    expect(state.totalEnergyJoules).toBeCloseTo(
      0.5 *
        state.springConstantNewtonsPerMetre *
        parameters.amplitudeMetres ** 2,
      12,
    );
  });

  it("is deterministic and independent of scrub order", () => {
    const late = value(evaluateShm(parameters, 4.2));
    value(evaluateShm(parameters, 0.1));
    value(evaluateShm(parameters, 2.8));
    expect(value(evaluateShm(parameters, 4.2))).toEqual(late);
    const samples = value(sampleShm(parameters, 2, 41));
    expect(samples).toHaveLength(41);
    expect(samples[0]).toEqual(value(evaluateShm(parameters, 0)));
    expect(samples[40]).toEqual(value(evaluateShm(parameters, 2)));
  });

  it("runs through the analytical PhysicalModelRuntime", () => {
    const runtime = PhysicalModelRuntime.initialize(
      shmOscillatorModel,
      parameters,
    );
    expect(runtime.ok).toBe(true);
    if (!runtime.ok) return;
    expect(runtime.value.advanceTo(0.7)).toMatchObject({
      ok: true,
      value: { state: { timeSeconds: 0.7 } },
    });
    expect(runtime.value.reset().state).toEqual(
      value(evaluateShm(parameters, 0)),
    );
  });
});

describe("Phase 13 pendulum and numerical extensions", () => {
  it("matches the small-angle pendulum period and validates its limit", () => {
    const state = value(
      evaluateSmallAnglePendulum(
        {
          lengthMetres: 1,
          angularAmplitudeRadians: 0.1,
          gravitationalAccelerationMetresPerSecondSquared: 9.81,
          massKilograms: 0.2,
        },
        0,
      ),
    );
    expect(state.periodSeconds).toBeCloseTo(
      2 * Math.PI * Math.sqrt(1 / 9.81),
      12,
    );
    expect(
      evaluateSmallAnglePendulum(
        {
          lengthMetres: 1,
          angularAmplitudeRadians: 0.5,
          gravitationalAccelerationMetresPerSecondSquared: 9.81,
          massKilograms: 0.2,
        },
        0,
      ),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "oscillation.invalid-small-angle-pendulum" }],
    });
  });

  it("dissipates mechanical energy in an undriven damped oscillator", () => {
    const parameters = {
      massKilograms: 1,
      springConstantNewtonsPerMetre: 16,
      dampingKilogramsPerSecond: 1,
      driveForceAmplitudeNewtons: 0,
      driveAngularFrequencyRadiansPerSecond: 0,
    };
    let state = value(
      stepDrivenOscillator(
        {
          timeSeconds: 0,
          displacementMetres: 0.2,
          velocityMetresPerSecond: 0,
        },
        parameters,
        0.01,
      ),
    );
    const firstEnergy = state.mechanicalEnergyJoules;
    for (let index = 0; index < 199; index += 1)
      state = value(stepDrivenOscillator(state, parameters, 0.01));
    expect(state.mechanicalEnergyJoules).toBeLessThan(firstEnergy);
    expect(state.dissipatedPowerWatts).toBeGreaterThanOrEqual(0);
  });

  it("uses the exact nonlinear pendulum acceleration in the ODE adapter", () => {
    const state = value(
      stepNonlinearPendulum(
        {
          timeSeconds: 0,
          angleRadians: 0.5,
          angularVelocityRadiansPerSecond: 0,
        },
        1,
        9.81,
        1e-5,
      ),
    );
    expect(state.angularVelocityRadiansPerSecond / 1e-5).toBeCloseTo(
      -9.81 * Math.sin(0.5),
      5,
    );
  });

  it("runs the numerical driven model through the common runtime", () => {
    const runtime = PhysicalModelRuntime.initialize(drivenOscillatorModel, {
      massKilograms: 1,
      springConstantNewtonsPerMetre: 16,
      dampingKilogramsPerSecond: 0.5,
      driveForceAmplitudeNewtons: 1,
      driveAngularFrequencyRadiansPerSecond: 3,
      initialDisplacementMetres: 0,
      initialVelocityMetresPerSecond: 0,
    });
    expect(runtime.ok).toBe(true);
    if (!runtime.ok) return;
    const frame = runtime.value.advanceTo(0.01);
    expect(frame.ok).toBe(true);
    if (frame.ok)
      expect(frame.value.observables.mechanicalEnergyJoules).toBeGreaterThan(0);
  });
});

describe("Phase 13 resonance and coupled systems", () => {
  it("calculates finite driven amplitude and phase and rejects ideal singular resonance", () => {
    const response = value(
      drivenSteadyResponse({
        massKilograms: 1,
        springConstantNewtonsPerMetre: 25,
        dampingKilogramsPerSecond: 1,
        driveForceAmplitudeNewtons: 2,
        driveAngularFrequencyRadiansPerSecond: 5,
      }),
    );
    expect(response.amplitudeMetres).toBeCloseTo(0.4, 12);
    expect(response.phaseLagRadians).toBeCloseTo(Math.PI / 2, 12);
    expect(
      drivenSteadyResponse({
        massKilograms: 1,
        springConstantNewtonsPerMetre: 25,
        dampingKilogramsPerSecond: 0,
        driveForceAmplitudeNewtons: 2,
        driveAngularFrequencyRadiansPerSecond: 5,
      }),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "oscillation.singular-undamped-resonance" }],
    });
  });

  it("shows a resonance maximum near the natural frequency", () => {
    const curve = value(
      resonanceCurve(
        {
          massKilograms: 1,
          springConstantNewtonsPerMetre: 25,
          dampingKilogramsPerSecond: 0.5,
          driveForceAmplitudeNewtons: 1,
        },
        1,
        9,
        161,
      ),
    );
    const peak = curve.reduce((best, point) =>
      point.amplitudeMetres > best.amplitudeMetres ? point : best,
    );
    expect(peak.drivingAngularFrequencyRadiansPerSecond).toBeCloseTo(5, 1);
    expect(peak.amplitudeMetres).toBeGreaterThan(curve[0]!.amplitudeMetres);
  });

  it("owns both coupled masses and preserves symmetric/antisymmetric modes", () => {
    const symmetric = value(
      evaluateCoupledOscillators(
        {
          massKilograms: 1,
          groundingSpringConstantNewtonsPerMetre: 9,
          couplingSpringConstantNewtonsPerMetre: 8,
          symmetricAmplitudeMetres: 0.1,
          antisymmetricAmplitudeMetres: 0,
        },
        0.4,
      ),
    );
    expect(symmetric.firstDisplacementMetres).toBeCloseTo(
      symmetric.secondDisplacementMetres,
      12,
    );
    const anti = value(
      evaluateCoupledOscillators(
        {
          massKilograms: 1,
          groundingSpringConstantNewtonsPerMetre: 9,
          couplingSpringConstantNewtonsPerMetre: 8,
          symmetricAmplitudeMetres: 0,
          antisymmetricAmplitudeMetres: 0.1,
        },
        0.4,
      ),
    );
    expect(anti.firstDisplacementMetres).toBeCloseTo(
      -anti.secondDisplacementMetres,
      12,
    );
    expect(anti.antisymmetricAngularFrequencyRadiansPerSecond).toBe(5);
    expect(anti.symmetricAngularFrequencyRadiansPerSecond).toBe(3);
  });
});

describe("Phase 13 scenarios and Library", () => {
  it("publishes exactly four mandatory deterministic scenarios", () => {
    expect(OSCILLATION_EXAMPLE_IDS).toHaveLength(4);
    for (const id of OSCILLATION_EXAMPLE_IDS) {
      const scenario = runOscillationScenario(id);
      expect(scenario.id).toBe(id);
      expect(scenario.topic).toBe(17);
      expect(scenario.assumptions.length).toBeGreaterThan(0);
      expect(JSON.stringify(scenario)).not.toMatch(/null/);
    }
  });

  it("registers the complete merged mechanics and oscillations catalog", () => {
    const registries = createPhysicsLibraryRegistries();
    registerMechanicsPhysicsLibrary(registries);
    for (const id of mechanicsLibraryRequirementIds())
      expect(registries.library.has(id)).toBe(true);
    for (const id of [
      "physica:library/shmoscillator",
      "physica:library/horizontal-mass-spring",
      "physica:library/resonance-curve",
      "physica:library/coupled-oscillator-extension",
    ])
      expect(registries.library.has(id)).toBe(true);
  });
});
