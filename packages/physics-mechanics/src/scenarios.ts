import { circularMotionModel } from "./models";
import {
  centripetalFromLinearSpeed,
  evaluateUniformCircularMotion,
} from "./circular";
import {
  evaluateElasticPlasticMaterial,
  evaluateHookeLaw,
  evaluateStressStrain,
} from "./deformation";
import {
  impulseFromSamples,
  resolveForceBalance,
  solveAtwoodMachine,
  solveCollision1D,
  solveInclinedPlane,
} from "./dynamics";
import {
  createEnergyLedger,
  efficiency,
  elasticPotentialEnergy,
  gravitationalPotentialEnergy,
  kineticEnergy,
  power,
  workFromSamples,
} from "./energy";
import { evaluateKinematics1D, evaluateProjectile } from "./kinematics";
import {
  formatSignificantFigures,
  summarizeRepeatedMeasurements,
  vectorFromMagnitudeAngle,
} from "./measurements";
import {
  centreOfMass,
  density,
  hydrostaticPressure,
  isStableAgainstTipping,
  resolveMomentBalance,
} from "./statics";
import { deepFreeze, type MechanicsResult } from "./types";

import {
  MECHANICS_EXAMPLE_IDS,
  TITLES,
  TOPICS,
  type MechanicsExampleId,
  type MechanicsScenario,
} from "./scenario-catalog";

function unwrap<T>(result: MechanicsResult<T>): Readonly<T> {
  if (!result.ok)
    throw new Error(result.issues.map((issue) => issue.message).join("; "));
  return result.value;
}

function round(value: number): number {
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function rounded<T>(value: T): T {
  if (typeof value === "number") return round(value) as T;
  if (Array.isArray(value)) return value.map(rounded) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, rounded(child)]),
    ) as T;
  return value;
}

function scenarioResult(id: MechanicsExampleId): {
  readonly result: unknown;
  readonly equations: readonly string[];
  readonly assumptions: readonly string[];
  readonly representations: readonly string[];
} {
  switch (id) {
    case "units-prefixes":
      return {
        result: {
          displayed: "1.25 km",
          canonicalMetres: 1250,
          scientific: unwrap(formatSignificantFigures(1250, 3)),
        },
        equations: ["1 km = 10³ m"],
        assumptions: ["SI prefix definitions"],
        representations: ["quantity card", "prefix scale"],
      };
    case "dimensional-analysis":
      return {
        result: {
          force: "M L T⁻²",
          massTimesAcceleration: "M L T⁻²",
          homogeneous: true,
        },
        equations: ["F = ma"],
        assumptions: ["SI base dimensions"],
        representations: ["unit tree", "equation"],
      };
    case "vector-components":
      return {
        result: unwrap(vectorFromMagnitudeAngle(10, Math.PI / 6)),
        equations: ["Vx = V cos θ", "Vy = V sin θ"],
        assumptions: ["Angle measured anticlockwise from +x"],
        representations: ["vector diagram", "component labels"],
      };
    case "uncertainty-repeated-measurements":
      return {
        result: unwrap(
          summarizeRepeatedMeasurements([1.21, 1.23, 1.22, 1.24, 1.2]),
        ),
        equations: ["Δx = (xmax − xmin)/2"],
        assumptions: ["Half-range uncertainty policy"],
        representations: ["measurement table", "uncertainty interval"],
      };
    case "constant-velocity":
      return {
        result: unwrap(
          evaluateKinematics1D(
            {
              initialPositionMetres: 2,
              initialVelocityMetresPerSecond: 3,
              accelerationMetresPerSecondSquared: 0,
            },
            4,
          ),
        ),
        equations: ["x = x₀ + vt"],
        assumptions: ["One-dimensional constant velocity"],
        representations: ["moving body", "x–t graph"],
      };
    case "constant-acceleration":
      return {
        result: unwrap(
          evaluateKinematics1D(
            {
              initialPositionMetres: 0,
              initialVelocityMetresPerSecond: 2,
              accelerationMetresPerSecondSquared: 3,
            },
            4,
          ),
        ),
        equations: ["v = u + at", "s = ut + ½at²"],
        assumptions: ["Constant acceleration"],
        representations: ["number line", "v–t graph"],
      };
    case "free-fall":
      return {
        result: unwrap(
          evaluateKinematics1D(
            {
              initialPositionMetres: 20,
              initialVelocityMetresPerSecond: 0,
              accelerationMetresPerSecondSquared: -9.81,
            },
            1,
          ),
        ),
        equations: ["y = y₀ − ½gt²"],
        assumptions: ["Uniform gravity", "Negligible air resistance"],
        representations: ["free-fall tower", "velocity vector"],
      };
    case "projectile":
      return {
        result: unwrap(
          evaluateProjectile(
            {
              initialPositionMetres: { x: 0, y: 0 },
              launchSpeedMetresPerSecond: 20,
              launchAngleRadians: Math.PI / 4,
              gravityMetresPerSecondSquared: 9.81,
            },
            1,
          ),
        ),
        equations: ["x = u cos θ · t", "y = u sin θ · t − ½gt²"],
        assumptions: ["Uniform gravity", "Negligible air resistance"],
        representations: ["trajectory", "component vectors"],
      };
    case "motion-graphs-linked":
      return {
        result: [0, 1, 2, 3].map((timeSeconds) =>
          unwrap(
            evaluateKinematics1D(
              {
                initialPositionMetres: 0,
                initialVelocityMetresPerSecond: 1,
                accelerationMetresPerSecondSquared: 2,
              },
              timeSeconds,
            ),
          ),
        ),
        equations: ["gradient(x–t) = v", "area(v–t) = displacement"],
        assumptions: ["Shared analytical state"],
        representations: ["x–t graph", "v–t graph", "a–t graph"],
      };
    case "forces-fbd":
      return {
        result: unwrap(
          resolveForceBalance(2, [
            {
              id: "push",
              label: "Push",
              source: "applied",
              forceNewtons: { x: 10, y: 0 },
            },
            {
              id: "friction",
              label: "Friction",
              source: "friction",
              forceNewtons: { x: -4, y: 0 },
            },
          ]),
        ),
        equations: ["ΣF = ma"],
        assumptions: ["Point-mass translation"],
        representations: ["physical scene", "free-body diagram"],
      };
    case "inclined-plane":
      return {
        result: unwrap(solveInclinedPlane(5, Math.PI / 6, 0.2)),
        equations: ["N = mg cos θ", "F∥ = mg sin θ"],
        assumptions: ["Rigid plane", "Coulomb friction"],
        representations: ["inclined plane", "force vectors"],
      };
    case "pulley-system":
      return {
        result: unwrap(solveAtwoodMachine(2, 3)),
        equations: ["a = (m₂−m₁)g/(m₁+m₂)"],
        assumptions: ["Massless inextensible string", "Frictionless pulley"],
        representations: ["pulley apparatus", "tension vectors"],
      };
    case "elastic-collision":
      return {
        result: unwrap(
          solveCollision1D(
            { massKilograms: 2, velocityMetresPerSecond: 3 },
            { massKilograms: 1, velocityMetresPerSecond: 0 },
            1,
          ),
        ),
        equations: ["Σp before = Σp after", "e = 1"],
        assumptions: ["One-dimensional isolated collision"],
        representations: ["collision track", "before/after momentum"],
      };
    case "inelastic-collision":
      return {
        result: unwrap(
          solveCollision1D(
            { massKilograms: 2, velocityMetresPerSecond: 3 },
            { massKilograms: 1, velocityMetresPerSecond: 0 },
            0,
          ),
        ),
        equations: ["Σp before = Σp after", "e = 0"],
        assumptions: ["One-dimensional isolated collision"],
        representations: ["collision track", "energy change"],
      };
    case "impulse":
      return {
        result: {
          impulseNewtonSeconds: unwrap(
            impulseFromSamples([
              { timeSeconds: 0, forceNewtons: 0 },
              { timeSeconds: 0.1, forceNewtons: 20 },
              { timeSeconds: 0.2, forceNewtons: 0 },
            ]),
          ),
        },
        equations: ["J = ∫F dt = Δp"],
        assumptions: ["Piecewise-linear force samples"],
        representations: ["force–time graph", "impulse area"],
      };
    case "moments-balance":
      return {
        result: unwrap(
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
        ),
        equations: ["moment = Fd⊥", "Στ = 0"],
        assumptions: ["Rigid beam", "Fixed pivot"],
        representations: ["beam and pivot", "moment arrows"],
      };
    case "centre-of-mass-stability": {
      const com = unwrap(
        centreOfMass([
          { massKilograms: 2, positionMetres: { x: 0, y: 0 } },
          { massKilograms: 1, positionMetres: { x: 3, y: 0 } },
        ]),
      );
      return {
        result: {
          centreOfMassMetres: com,
          stable: unwrap(isStableAgainstTipping(com.x, -0.5, 1.5)),
        },
        equations: ["xCOM = Σmx/Σm"],
        assumptions: ["Uniform gravitational field"],
        representations: ["COM marker", "support base"],
      };
    }
    case "density":
      return {
        result: { densityKilogramsPerCubicMetre: unwrap(density(7.8, 0.001)) },
        equations: ["ρ = m/V"],
        assumptions: ["Uniform sample"],
        representations: ["density body", "measurement apparatus"],
      };
    case "pressure-depth":
      return {
        result: { gaugePressurePascals: unwrap(hydrostaticPressure(1000, 2)) },
        equations: ["p = ρgh"],
        assumptions: ["Static incompressible fluid", "Uniform gravity"],
        representations: [
          "fluid vessel",
          "pressure arrows",
          "pressure-depth graph",
        ],
      };
    case "energy-conservation": {
      const gpe = unwrap(gravitationalPotentialEnergy(2, 5));
      const ke = unwrap(kineticEnergy(2, Math.sqrt(2 * 9.81 * 5)));
      return {
        result: {
          initialGpeJoules: gpe,
          finalKeJoules: ke,
          ledger: unwrap(createEnergyLedger(gpe, 0, ke, 0)),
        },
        equations: ["mgh = ½mv²"],
        assumptions: ["No dissipative transfer"],
        representations: ["falling body", "energy bars"],
      };
    }
    case "spring-energy":
      return {
        result: {
          storedEnergyJoules: unwrap(elasticPotentialEnergy(200, 0.1)),
        },
        equations: ["E = ½kx²"],
        assumptions: ["Linear elastic spring"],
        representations: ["spring", "energy area"],
      };
    case "work-area":
      return {
        result: {
          workJoules: unwrap(
            workFromSamples([
              { displacementMetres: 0, forceNewtons: 0 },
              { displacementMetres: 2, forceNewtons: 10 },
              { displacementMetres: 4, forceNewtons: 10 },
            ]),
          ),
        },
        equations: ["W = ∫F dx"],
        assumptions: ["Piecewise-linear force curve"],
        representations: ["force–displacement graph", "area overlay"],
      };
    case "power-efficiency":
      return {
        result: {
          powerWatts: unwrap(power(600, 3)),
          efficiency: unwrap(efficiency(450, 600)),
        },
        equations: ["P = W/t", "η = useful/input"],
        assumptions: ["Energy accounting interval is fixed"],
        representations: ["power meter", "energy-flow diagram"],
      };
    case "hooke-law":
      return {
        result: unwrap(evaluateHookeLaw(250, 0.08)),
        equations: ["F = kx"],
        assumptions: ["Within proportional limit"],
        representations: ["spring rig", "force–extension graph"],
      };
    case "young-modulus":
      return {
        result: unwrap(evaluateStressStrain(100, 1e-6, 0.001, 2)),
        equations: ["E = stress/strain"],
        assumptions: ["Uniform wire cross-section", "Linear elastic region"],
        representations: ["wire apparatus", "micrometer"],
      };
    case "stress-strain":
      return {
        result: [0.001, 0.003, 0.006].map((strain) =>
          unwrap(evaluateElasticPlasticMaterial(200e9, 400e6, 10e9, strain)),
        ),
        equations: ["σ = Eε in elastic region"],
        assumptions: ["Bilinear educational material model"],
        representations: ["specimen", "stress–strain graph"],
      };
    case "elastic-energy": {
      const hooke = unwrap(evaluateHookeLaw(500, 0.04));
      return {
        result: {
          forceNewtons: hooke.forceNewtons,
          storedEnergyJoules: hooke.storedEnergyJoules,
        },
        equations: ["E = area under F–x = ½Fx"],
        assumptions: ["Linear loading path"],
        representations: ["force–extension graph", "area shading"],
      };
    }
    case "uniform-circular-motion":
      return {
        result: unwrap(
          evaluateUniformCircularMotion(
            {
              radiusMetres: 2,
              angularSpeedRadiansPerSecond: Math.PI / 2,
              initialAngleRadians: 0,
              massKilograms: 0.5,
            },
            1,
          ),
        ),
        equations: ["v = ωr", "a = ω²r"],
        assumptions: circularMotionModel.provenance.assumptions,
        representations: ["orbit circle", "radius sweep", "angular arc"],
      };
    case "centripetal-force":
      return {
        result: unwrap(centripetalFromLinearSpeed(0.5, 6, 2)),
        equations: ["a = v²/r", "F = mv²/r"],
        assumptions: ["Uniform circular motion"],
        representations: ["ball on string", "inward force vector"],
      };
    case "velocity-acceleration-followers": {
      const state = unwrap(
        evaluateUniformCircularMotion(
          {
            radiusMetres: 3,
            angularSpeedRadiansPerSecond: 2,
            initialAngleRadians: 0,
            massKilograms: 1,
          },
          Math.PI / 4,
        ),
      );
      return {
        result: {
          positionMetres: state.positionMetres,
          velocityMetresPerSecond: state.velocityMetresPerSecond,
          accelerationMetresPerSecondSquared:
            state.accelerationMetresPerSecondSquared,
          velocityDotRadius:
            state.velocityMetresPerSecond.x * state.positionMetres.x +
            state.velocityMetresPerSecond.y * state.positionMetres.y,
          accelerationCrossRadius:
            state.accelerationMetresPerSecondSquared.x *
              state.positionMetres.y -
            state.accelerationMetresPerSecondSquared.y * state.positionMetres.x,
        },
        equations: ["v ⟂ r", "a points toward centre"],
        assumptions: ["Uniform circular motion"],
        representations: ["velocity tangent", "radial acceleration"],
      };
    }
  }
}

export function runMechanicsScenario(
  id: MechanicsExampleId,
): MechanicsScenario {
  const detail = scenarioResult(id);
  return deepFreeze(
    rounded({
      id,
      topic: TOPICS[id],
      title: TITLES[id],
      question: `What does ${TITLES[id].toLowerCase()} reveal?`,
      ...detail,
    }),
  ) as MechanicsScenario;
}

export const MECHANICS_SCENARIOS: readonly MechanicsScenario[] = Object.freeze(
  MECHANICS_EXAMPLE_IDS.map(runMechanicsScenario),
);
