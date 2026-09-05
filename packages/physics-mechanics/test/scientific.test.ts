import { describe, expect, it } from "vitest";
import { PhysicalModelRuntime } from "@physica/physics-core";
import { createPhysicsLibraryRegistries } from "@physica/plugin-sdk";
import { registeredTypeId } from "@physica/core-model";
import {
  LENGTH,
  MASS,
  TIME,
  divideDimensions,
  multiplyDimensions,
  powerDimension,
} from "@physica/units";
import {
  MECHANICS_EXAMPLE_IDS,
  evaluateElasticPlasticMaterial,
  evaluateHookeLaw,
  evaluateKinematics1D,
  evaluateProjectile,
  evaluateStressStrain,
  evaluateUniformCircularMotion,
  centreOfMass,
  checkDimensionalEquation,
  createEnergyLedger,
  density,
  hydrostaticPressure,
  impulseFromSamples,
  mechanicsLibraryRequirementIds,
  projectileModel,
  registerMechanicsPhysicsLibrary,
  resolveForceBalance,
  resolveMomentBalance,
  runMechanicsScenario,
  solveAtwoodMachine,
  solveCollision1D,
  solveInclinedPlane,
  summarizeRepeatedMeasurements,
  workFromSamples,
} from "../src";

function value<T>(
  result:
    { readonly ok: true; readonly value: Readonly<T> } | { readonly ok: false },
): Readonly<T> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected a valid mechanics result.");
  return result.value;
}

describe("Topic 1 reference and validation", () => {
  it("calculates half-range uncertainty and rejects insufficient samples", () => {
    const summary = value(summarizeRepeatedMeasurements([9.8, 10.2, 10, 10.1]));
    expect(summary.mean).toBeCloseTo(10.025);
    expect(summary.absoluteUncertainty).toBeCloseTo(0.2);
    expect(summarizeRepeatedMeasurements([1])).toMatchObject({
      ok: false,
      issues: [{ code: "measurement.too-few-samples" }],
    });
  });
  it("proves the mechanics force, energy and pressure relations are homogeneous", () => {
    const acceleration = divideDimensions(LENGTH, powerDimension(TIME, 2));
    const force = multiplyDimensions(MASS, acceleration);
    const energy = multiplyDimensions(force, LENGTH);
    const pressure = divideDimensions(force, powerDimension(LENGTH, 2));

    expect(
      checkDimensionalEquation(force, multiplyDimensions(MASS, acceleration)),
    ).toMatchObject({ homogeneous: true });
    expect(
      checkDimensionalEquation(
        energy,
        multiplyDimensions(
          MASS,
          divideDimensions(powerDimension(LENGTH, 2), powerDimension(TIME, 2)),
        ),
      ),
    ).toMatchObject({ homogeneous: true });
    expect(
      checkDimensionalEquation(
        pressure,
        divideDimensions(
          MASS,
          multiplyDimensions(LENGTH, powerDimension(TIME, 2)),
        ),
      ),
    ).toMatchObject({ homogeneous: true });
  });
});

describe("Topic 2 reference and validation", () => {
  it("uses one analytical state for displacement, velocity and acceleration", () => {
    expect(
      value(
        evaluateKinematics1D(
          {
            initialPositionMetres: 2,
            initialVelocityMetresPerSecond: 3,
            accelerationMetresPerSecondSquared: 4,
          },
          2,
        ),
      ),
    ).toEqual({
      timeSeconds: 2,
      positionMetres: 16,
      displacementMetres: 14,
      velocityMetresPerSecond: 11,
      speedMetresPerSecond: 11,
      accelerationMetresPerSecondSquared: 4,
    });
  });
  it("preserves projectile symmetry and runtime event ordering", () => {
    const parameters = {
      initialPositionMetres: { x: 0, y: 0 },
      launchSpeedMetresPerSecond: 20,
      launchAngleRadians: Math.PI / 4,
      gravityMetresPerSecondSquared: 10,
    };
    const midpoint = value(evaluateProjectile(parameters, Math.SQRT2));
    expect(midpoint.velocityMetresPerSecond.y).toBeCloseTo(0, 12);
    const runtime = PhysicalModelRuntime.initialize(
      projectileModel,
      parameters,
    );
    expect(runtime.ok).toBe(true);
    if (!runtime.ok) return;
    expect(runtime.value.advanceTo(3)).toMatchObject({
      ok: true,
      value: { events: [{ eventType: "mechanics.projectile.ground-contact" }] },
    });
  });
});

describe("Topic 3 reference and validation", () => {
  it("resolves Newton II, incline, pulley, impulse and collision invariants", () => {
    expect(
      value(
        resolveForceBalance(2, [
          {
            id: "a",
            label: "push",
            source: "applied",
            forceNewtons: { x: 8, y: 0 },
          },
        ]),
      ).accelerationMetresPerSecondSquared.x,
    ).toBe(4);
    expect(
      value(solveInclinedPlane(5, Math.PI / 6, 0))
        .accelerationDownslopeMetresPerSecondSquared,
    ).toBeCloseTo(4.905);
    expect(
      value(solveAtwoodMachine(2, 3)).constraintResidualNewtons,
    ).toBeCloseTo(0, 12);
    expect(
      value(
        impulseFromSamples([
          { timeSeconds: 0, forceNewtons: 0 },
          { timeSeconds: 1, forceNewtons: 4 },
        ]),
      ),
    ).toBe(2);
    const collision = value(
      solveCollision1D(
        { massKilograms: 2, velocityMetresPerSecond: 3 },
        { massKilograms: 1, velocityMetresPerSecond: 0 },
        1,
      ),
    );
    expect(collision.momentumResidual).toBeCloseTo(0, 12);
    expect(collision.kineticEnergyChange).toBeCloseTo(0, 12);
  });
});

describe("Topics 4–6 reference and validation", () => {
  it("checks statics, density, pressure and centre of mass", () => {
    expect(
      value(
        resolveMomentBalance([
          {
            id: "left",
            forceNewtons: 10,
            perpendicularDistanceMetres: 2,
            direction: "anticlockwise",
          },
          {
            id: "right",
            forceNewtons: 20,
            perpendicularDistanceMetres: 1,
            direction: "clockwise",
          },
        ]),
      ).equilibrium,
    ).toBe(true);
    expect(
      value(
        centreOfMass([
          { massKilograms: 1, positionMetres: { x: 0, y: 0 } },
          { massKilograms: 3, positionMetres: { x: 4, y: 0 } },
        ]),
      ).x,
    ).toBe(3);
    expect(value(density(8, 0.002))).toBe(4000);
    expect(value(hydrostaticPressure(1000, 2, 10))).toBe(20000);
  });
  it("checks exact energy and deformation relations", () => {
    expect(
      value(
        workFromSamples([
          { displacementMetres: 0, forceNewtons: 0 },
          { displacementMetres: 2, forceNewtons: 10 },
        ]),
      ),
    ).toBe(10);
    expect(
      value(createEnergyLedger(100, 60, 20, 20)).conservationResidualJoules,
    ).toBe(0);
    expect(value(evaluateHookeLaw(200, 0.1))).toMatchObject({
      forceNewtons: 20,
      storedEnergyJoules: 1,
    });
    expect(
      value(evaluateStressStrain(100, 1e-6, 0.001, 2)).youngModulusPascals,
    ).toBe(200e9);
    expect(
      value(evaluateElasticPlasticMaterial(200e9, 400e6, 10e9, 0.004)).region,
    ).toBe("plastic");
  });
});

describe("Topic 12 reference and validation", () => {
  it("keeps velocity tangent and acceleration radial", () => {
    const state = value(
      evaluateUniformCircularMotion(
        {
          radiusMetres: 2,
          angularSpeedRadiansPerSecond: 3,
          initialAngleRadians: 0.4,
          massKilograms: 0.5,
        },
        1.2,
      ),
    );
    const radiusDotVelocity =
      state.positionMetres.x * state.velocityMetresPerSecond.x +
      state.positionMetres.y * state.velocityMetresPerSecond.y;
    const cross =
      state.positionMetres.x * state.accelerationMetresPerSecondSquared.y -
      state.positionMetres.y * state.accelerationMetresPerSecondSquared.x;
    expect(radiusDotVelocity).toBeCloseTo(0, 12);
    expect(cross).toBeCloseTo(0, 12);
    expect(state.centripetalForceNewtons).toBe(9);
  });
});

describe("Mechanics Gallery and Library coverage", () => {
  it("executes all 30 mandatory scenarios deterministically", () => {
    expect(MECHANICS_EXAMPLE_IDS).toHaveLength(30);
    for (const id of MECHANICS_EXAMPLE_IDS) {
      const first = runMechanicsScenario(id);
      const second = runMechanicsScenario(id);
      expect(first).toEqual(second);
      expect(Object.isFrozen(first)).toBe(true);
      expect(first.representations.length).toBeGreaterThan(0);
    }
  });
  it("registers all canonical requirements and meaningful Alpha prefabs", () => {
    const registries = createPhysicsLibraryRegistries();
    registerMechanicsPhysicsLibrary(registries);
    for (const id of mechanicsLibraryRequirementIds())
      expect(registries.library.has(registeredTypeId(id))).toBe(true);
    for (const id of [
      "projectile-launcher-setup",
      "inclined-plane-block",
      "atwood-machine",
      "collision-track",
      "efficiency-energy-flow-setup",
      "stress-strain-demonstration",
      "ball-on-string-circular-motion",
    ]) {
      expect(
        registries.prefabs.get(registeredTypeId(`physica:prefab/${id}`))
          ?.snapshot.entityDefinitions.length,
      ).toBeGreaterThan(3);
    }
  });
  it("stores immutable, JSON-round-trippable built-in Library definitions", () => {
    const registries = createPhysicsLibraryRegistries();
    registerMechanicsPhysicsLibrary(registries);
    const items = registries.library.list();
    const serialized = JSON.stringify(items);
    const restored = JSON.parse(serialized) as unknown;

    expect(restored).toEqual(items);
    expect(items.length).toBe(mechanicsLibraryRequirementIds().length);
    expect(items.every((item) => Object.isFrozen(item))).toBe(true);
    expect(
      items.every(
        (item) =>
          item.source.kind === "built-in" &&
          item.source.sourcePackage === "@physica/physics-mechanics" &&
          item.license.spdxId === "LicenseRef-Physica-Built-In",
      ),
    ).toBe(true);
  });
});
