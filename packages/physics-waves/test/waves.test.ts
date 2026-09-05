import { describe, expect, it } from "vitest";
import { PhysicalModelRuntime } from "@physica/physics-core";
import { createPhysicsLibraryRegistries } from "@physica/plugin-sdk";
import {
  WAVE_EXAMPLE_IDS,
  evaluateHarmonicWave,
  evaluateStandingWave,
  evaluateSuperposition,
  harmonicWaveModel,
  registerWavePhysicsLibrary,
  runWaveScenario,
  waveBoundaryCoefficients,
  waveLibraryRequirementIds,
} from "../src";

function unwrap<T>(
  result:
    { readonly ok: true; readonly value: Readonly<T> } | { readonly ok: false },
): Readonly<T> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected valid wave result.");
  return result.value;
}

const wave = {
  amplitudeMetres: 0.2,
  frequencyHertz: 4,
  wavelengthMetres: 1.5,
  phaseRadians: 0,
  direction: 1 as const,
};

describe("Phase 9 wave science", () => {
  it("preserves v = f lambda and the harmonic time derivative", () => {
    const state = unwrap(evaluateHarmonicWave(wave, 0.3, 0.2));
    expect(state.patternSpeedMetresPerSecond).toBe(6);
    const dt = 1e-6;
    const next = unwrap(evaluateHarmonicWave(wave, 0.3, 0.2 + dt));
    expect(
      (next.displacementMetres - state.displacementMetres) / dt,
    ).toBeCloseTo(state.particleVelocityMetresPerSecond, 4);
  });

  it("adds signed displacements and locates standing-wave nodes", () => {
    const first = unwrap(evaluateHarmonicWave(wave, 0.2, 0.1));
    const secondParameters = { ...wave, phaseRadians: Math.PI / 3 };
    const second = unwrap(evaluateHarmonicWave(secondParameters, 0.2, 0.1));
    const superposition = unwrap(
      evaluateSuperposition([wave, secondParameters], 0.2, 0.1),
    );
    expect(superposition.resultantDisplacementMetres).toBeCloseTo(
      first.displacementMetres + second.displacementMetres,
      12,
    );
    const standing = unwrap(
      evaluateStandingWave(
        {
          componentAmplitudeMetres: 0.1,
          frequencyHertz: 2,
          wavelengthMetres: 1,
          phaseRadians: 0,
          lengthMetres: 2,
        },
        0.5,
        0.2,
      ),
    );
    expect(standing.displacementMetres).toBeCloseTo(0, 12);
    expect(standing.nodePositionsMetres).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it("conserves ideal boundary energy and validates the runtime contract", () => {
    const boundary = unwrap(waveBoundaryCoefficients(2, 5));
    expect(boundary.energyResidual).toBeCloseTo(0, 12);
    expect(
      PhysicalModelRuntime.initialize(harmonicWaveModel, wave),
    ).toMatchObject({ ok: true });
    expect(
      evaluateHarmonicWave({ ...wave, wavelengthMetres: 0 }, 0, 0),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "waves.invalid-periodic-parameter" }],
    });
  });

  it("runs every scenario deterministically and registers all Library IDs", () => {
    expect(WAVE_EXAMPLE_IDS).toHaveLength(6);
    for (const id of WAVE_EXAMPLE_IDS) {
      expect(runWaveScenario(id)).toEqual(runWaveScenario(id));
      expect(Object.isFrozen(runWaveScenario(id))).toBe(true);
    }
    const registries = createPhysicsLibraryRegistries();
    registerWavePhysicsLibrary(registries);
    expect(registries.library.list()).toHaveLength(
      waveLibraryRequirementIds().length,
    );
    expect(JSON.parse(JSON.stringify(registries.library.list()))).toEqual(
      registries.library.list(),
    );
  });
});
