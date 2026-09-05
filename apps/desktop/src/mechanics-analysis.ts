import {
  createEnergyLedger,
  evaluateElasticPlasticMaterial,
  evaluateProjectile,
  projectileFlightTime,
  evaluateStressStrain,
  evaluateUniformCircularMotion,
  solveAtwoodMachine,
  solveCollision1D,
  solveInclinedPlane,
  type MechanicsResult,
} from "@physica/physics-mechanics";
import type { Workflow, WorkflowId } from "./mechanics-workflows";

function unwrap<T>(result: MechanicsResult<T>): Readonly<T> {
  if (!result.ok)
    throw new Error(
      result.issues[0]?.message ?? "Invalid mechanics configuration.",
    );
  return result.value;
}
export function number(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString();
}

export interface Analysis {
  readonly raw: unknown;
  readonly values: readonly (readonly [string, string])[];
  readonly validation: string;
}
export function calculate(
  id: WorkflowId,
  value: Workflow["defaults"],
): Analysis {
  if (id === "projectile") {
    const parameters = {
      initialPositionMetres: { x: 0, y: 0 },
      launchSpeedMetresPerSecond: value.a,
      launchAngleRadians: (value.b * Math.PI) / 180,
      gravityMetresPerSecondSquared: 9.81,
    };
    const landingTime = unwrap(projectileFlightTime(parameters));
    const evaluationTime = Math.min(value.c, landingTime);
    const result = unwrap(evaluateProjectile(parameters, evaluationTime));
    return {
      raw: result,
      values: [
        [
          "Position",
          `(${number(result.positionMetres.x)}, ${number(result.positionMetres.y)}) m`,
        ],
        [
          "Velocity",
          `(${number(result.velocityMetresPerSecond.x)}, ${number(result.velocityMetresPerSecond.y)}) m s⁻¹`,
        ],
        ["Speed", `${number(result.speedMetresPerSecond)} m s⁻¹`],
        ["Landing time", `${number(landingTime)} s`],
      ],
      validation:
        value.c > landingTime
          ? `Ground contact occurs at ${number(landingTime)} s; the preview is held at that event instead of extending the model below ground.`
          : "Analytical x/y state and graph remain synchronized.",
    };
  }
  if (id === "incline") {
    const result = unwrap(
      solveInclinedPlane(5, (value.a * Math.PI) / 180, value.b),
    );
    return {
      raw: result,
      values: [
        ["Downslope weight", `${number(result.downslopeWeightNewtons)} N`],
        ["Normal force", `${number(result.normalNewtons)} N`],
        ["Friction", `${number(result.frictionNewtons)} N`],
        [
          "Acceleration",
          `${number(result.accelerationDownslopeMetresPerSecondSquared)} m s⁻²`,
        ],
      ],
      validation: result.moving
        ? "Weight component exceeds limiting friction: the block moves."
        : "Static friction balances the downslope component.",
    };
  }
  if (id === "pulley") {
    const result = unwrap(solveAtwoodMachine(value.a, value.b));
    return {
      raw: result,
      values: [
        [
          "Acceleration",
          `${number(result.accelerationMetresPerSecondSquared)} m s⁻²`,
        ],
        ["Tension", `${number(result.tensionNewtons)} N`],
        [
          "Constraint residual",
          `${number(result.constraintResidualNewtons, 8)} N`,
        ],
      ],
      validation:
        "Both bodies share one constraint acceleration and one tension solution.",
    };
  }
  if (id === "collision") {
    const result = unwrap(
      solveCollision1D(
        { massKilograms: 2, velocityMetresPerSecond: value.a },
        { massKilograms: 1, velocityMetresPerSecond: value.b },
        value.c,
      ),
    );
    return {
      raw: result,
      values: [
        ["Final velocity A", `${number(result.finalVelocityA)} m s⁻¹`],
        ["Final velocity B", `${number(result.finalVelocityB)} m s⁻¹`],
        ["Momentum residual", `${number(result.momentumResidual, 8)} kg m s⁻¹`],
        ["Kinetic energy change", `${number(result.kineticEnergyChange)} J`],
      ],
      validation:
        Math.abs(result.momentumResidual) < 1e-9
          ? "Momentum is conserved; energy loss follows restitution."
          : "Momentum conservation failed.",
    };
  }
  if (id === "energy") {
    const useful = value.a * value.b;
    const stored = value.a * Math.min(value.c, 1 - value.b);
    const dissipated = value.a - useful - stored;
    const result = unwrap(
      createEnergyLedger(value.a, useful, stored, dissipated),
    );
    return {
      raw: result,
      values: [
        ["Useful", `${number(result.usefulJoules)} J`],
        ["Stored", `${number(result.storedJoules)} J`],
        ["Dissipated", `${number(result.dissipatedJoules)} J`],
        ["Residual", `${number(result.conservationResidualJoules, 8)} J`],
      ],
      validation: "Every joule is accounted for in the energy ledger.",
    };
  }
  if (id === "stress") {
    const direct = unwrap(
      evaluateStressStrain(value.a, value.b * 1e-6, value.c * 1e-3, 2),
    );
    const material = unwrap(
      evaluateElasticPlasticMaterial(200e9, 400e6, 10e9, direct.strain),
    );
    return {
      raw: { direct, material },
      values: [
        ["Stress", `${number(direct.stressPascals / 1e6)} MPa`],
        ["Strain", number(direct.strain, 6)],
        ["Measured E", `${number(direct.youngModulusPascals / 1e9)} GPa`],
        ["Material region", material.region],
      ],
      validation:
        material.region === "elastic"
          ? "Point lies in the model's elastic region."
          : "Point lies beyond the elastic limit; permanent strain is shown.",
    };
  }
  const result = unwrap(
    evaluateUniformCircularMotion(
      {
        radiusMetres: value.a,
        angularSpeedRadiansPerSecond: value.b,
        initialAngleRadians: 0,
        massKilograms: 0.5,
      },
      value.c,
    ),
  );
  return {
    raw: result,
    values: [
      ["Linear speed", `${number(result.linearSpeedMetresPerSecond)} m s⁻¹`],
      [
        "Radial acceleration",
        `${number(result.centripetalAccelerationMetresPerSecondSquared)} m s⁻²`,
      ],
      ["Centripetal force", `${number(result.centripetalForceNewtons)} N`],
      ["Angle", `${number(result.angleRadians)} rad`],
    ],
    validation: "Velocity is tangent; acceleration is antiparallel to radius.",
  };
}
