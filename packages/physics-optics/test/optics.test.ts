import { describe, expect, it } from "vitest";
import { PhysicalModelRuntime } from "@physica/physics-core";
import { createPhysicsLibraryRegistries } from "@physica/plugin-sdk";
import {
  OPTICS_EXAMPLE_IDS,
  doubleSlitIntensity,
  doubleSlitModel,
  gratingIntensity,
  malusLaw,
  opticsLibraryRequirementIds,
  refractRay,
  registerOpticsPhysicsLibrary,
  runOpticsScenario,
  singleSlitIntensity,
  thinLensImage,
} from "../src";

function unwrap<T>(
  result:
    { readonly ok: true; readonly value: Readonly<T> } | { readonly ok: false },
): Readonly<T> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected valid optics result.");
  return result.value;
}

describe("Phase 9 optics science", () => {
  it("handles central slit limits and exact first single-slit minimum", () => {
    expect(
      unwrap(singleSlitIntensity(600e-9, 0.12e-3, 2, 0, 4)).intensity,
    ).toBe(4);
    const firstMinimumPosition = 2 * Math.tan(Math.asin(600e-9 / 0.12e-3));
    expect(
      unwrap(singleSlitIntensity(600e-9, 0.12e-3, 2, firstMinimumPosition, 1))
        .normalizedIntensity,
    ).toBeCloseTo(0, 12);
  });

  it("uses one double-slit state for intensity, phase and fringe spacing", () => {
    const parameters = {
      wavelengthMetres: 550e-9,
      slitSeparationMetres: 0.3e-3,
      slitWidthMetres: 0.08e-3,
      screenDistanceMetres: 2,
      peakIntensity: 1,
    };
    const centre = unwrap(doubleSlitIntensity(parameters, 0));
    expect(centre.normalizedIntensity).toBe(1);
    expect(centre.pathDifferenceMetres).toBe(0);
    expect(centre.approximateFringeSpacingMetres).toBeCloseTo(0.0036666667);
    expect(
      PhysicalModelRuntime.initialize(doubleSlitModel, {
        ...parameters,
        probePositionMetres: 0,
      }),
    ).toMatchObject({ ok: true });
  });

  it("checks grating maxima, Snell/TIR, lens imaging and Malus law", () => {
    expect(
      unwrap(gratingIntensity(500e-9, 2e-6, 5, Math.asin(0.25)))
        .normalizedIntensity,
    ).toBe(1);
    const refraction = unwrap(refractRay(1, 1.5, Math.PI / 6));
    expect(1 * Math.sin(Math.PI / 6)).toBeCloseTo(
      1.5 * Math.sin(refraction.refractedAngleRadians!),
      12,
    );
    expect(
      unwrap(refractRay(1.5, 1, Math.PI / 3)).totalInternalReflection,
    ).toBe(true);
    expect(unwrap(thinLensImage(0.2, 0.6))).toMatchObject({
      imageDistanceMetres: 0.3,
      magnification: -0.5,
      imageKind: "real-inverted",
    });
    expect(unwrap(malusLaw(8, Math.PI / 3)).transmittedIntensity).toBeCloseTo(
      2,
    );
  });

  it("runs every scenario deterministically and registers extension Library IDs", () => {
    expect(OPTICS_EXAMPLE_IDS).toHaveLength(5);
    for (const id of OPTICS_EXAMPLE_IDS) {
      expect(runOpticsScenario(id)).toEqual(runOpticsScenario(id));
      expect(Object.isFrozen(runOpticsScenario(id))).toBe(true);
    }
    const registries = createPhysicsLibraryRegistries();
    registerOpticsPhysicsLibrary(registries);
    expect(registries.library.list()).toHaveLength(
      opticsLibraryRequirementIds().length,
    );
  });
});
