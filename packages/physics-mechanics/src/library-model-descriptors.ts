import type { JsonObject } from "@physica/core-model";
import type { LibraryItemClass } from "@physica/plugin-sdk";
import {
  MECHANICS_EXAMPLE_IDS,
  type MechanicsExampleId,
} from "./scenario-catalog";

export interface MechanicsLibraryDescriptor {
  readonly name: string;
  readonly itemClass: LibraryItemClass;
  readonly topics: readonly (1 | 2 | 3 | 4 | 5 | 6 | 12)[];
  readonly tags: readonly string[];
  readonly examples: readonly MechanicsExampleId[];
  readonly defaultParameters?: JsonObject;
}

const topicExamples = (
  topic: MechanicsLibraryDescriptor["topics"][number],
): readonly MechanicsExampleId[] =>
  MECHANICS_EXAMPLE_IDS.filter(
    (id) =>
      (
        ({
          "units-prefixes": 1,
          "dimensional-analysis": 1,
          "vector-components": 1,
          "uncertainty-repeated-measurements": 1,
          "constant-velocity": 2,
          "constant-acceleration": 2,
          "free-fall": 2,
          projectile: 2,
          "motion-graphs-linked": 2,
          "forces-fbd": 3,
          "inclined-plane": 3,
          "pulley-system": 3,
          "elastic-collision": 3,
          "inelastic-collision": 3,
          impulse: 3,
          "moments-balance": 4,
          "centre-of-mass-stability": 4,
          density: 4,
          "pressure-depth": 4,
          "energy-conservation": 5,
          "spring-energy": 5,
          "work-area": 5,
          "power-efficiency": 5,
          "hooke-law": 6,
          "young-modulus": 6,
          "stress-strain": 6,
          "elastic-energy": 6,
          "uniform-circular-motion": 12,
          "centripetal-force": 12,
          "velocity-acceleration-followers": 12,
        }) as const
      )[id] === topic,
  );

export function descriptors(
  itemClass: LibraryItemClass,
  topic: MechanicsLibraryDescriptor["topics"][number],
  names: readonly string[],
  tags: readonly string[],
): readonly MechanicsLibraryDescriptor[] {
  return names.map((name) => ({
    name,
    itemClass,
    topics: [topic],
    tags,
    examples: topicExamples(topic),
  }));
}

export const SMART_MODELS = [
  ...descriptors(
    "smart-model",
    1,
    [
      "PhysicalQuantity",
      "ScalarQuantity",
      "VectorQuantity",
      "Measurement",
      "UncertainQuantity",
      "RepeatedMeasurementSet",
      "CoordinateFrame",
    ],
    ["quantities", "measurement"],
  ),
  ...descriptors(
    "smart-model",
    2,
    [
      "PointParticle",
      "TranslationalBody",
      "ConstantVelocityModel",
      "ConstantAccelerationModel",
      "FreeFallModel",
      "ProjectileModel",
      "PiecewiseMotionModel",
      "NumericalTrajectoryBody",
    ],
    ["kinematics", "motion"],
  ),
  ...descriptors(
    "smart-model",
    3,
    [
      "NewtonianBody",
      "Force",
      "GravityForce",
      "NormalContact",
      "FrictionForce",
      "TensionForce",
      "AppliedForce",
      "DragForce",
      "ImpulseModel",
      "MomentumBody",
      "CollisionModel",
      "StringConstraint",
    ],
    ["dynamics", "force"],
  ),
  ...descriptors(
    "smart-model",
    4,
    [
      "RigidBodyStatics",
      "CentreOfMassModel",
      "PivotConstraint",
      "MomentTorqueModel",
      "DensityBody",
      "PressureField",
      "HydrostaticPressureModel",
    ],
    ["statics", "pressure"],
  ),
  ...descriptors(
    "smart-model",
    5,
    [
      "EnergyLedger",
      "WorkProcess",
      "KineticEnergyModel",
      "GravitationalPotentialEnergyModel",
      "ElasticEnergyModel",
      "PowerModel",
      "EfficiencyModel",
      "DissipationModel",
    ],
    ["energy", "work"],
  ),
  ...descriptors(
    "smart-model",
    6,
    [
      "LinearSpring",
      "ElasticWire",
      "MaterialSpecimen",
      "StressStrainMaterial",
      "ElasticPlasticMaterial",
      "LoadingPathModel",
    ],
    ["deformation", "materials"],
  ),
  ...descriptors(
    "smart-model",
    12,
    [
      "CircularPathConstraint",
      "CircularMotionBody",
      "AngularState",
      "CentripetalAccelerationModel",
      "CentripetalForceModel",
      "RotatingFrame",
    ],
    ["circular-motion", "rotation"],
  ),
] as const;
