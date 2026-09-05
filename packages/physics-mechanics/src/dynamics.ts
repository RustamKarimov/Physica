import {
  add,
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
  type Vector2,
} from "./types";

export interface ForceContribution {
  readonly id: string;
  readonly label: string;
  readonly forceNewtons: Vector2;
  readonly source:
    | "gravity"
    | "normal"
    | "friction"
    | "tension"
    | "applied"
    | "drag"
    | "other";
}

export interface ForceBalance {
  readonly contributions: readonly ForceContribution[];
  readonly resultantNewtons: Vector2;
  readonly accelerationMetresPerSecondSquared: Vector2;
}

export function resolveForceBalance(
  massKilograms: number,
  contributions: readonly ForceContribution[],
): MechanicsResult<ForceBalance> {
  const values: Record<string, number> = { massKilograms };
  contributions.forEach((force, index) => {
    values[`contributions.${index}.x`] = force.forceNewtons.x;
    values[`contributions.${index}.y`] = force.forceNewtons.y;
  });
  const issues = validateFinite(values);
  if (massKilograms <= 0)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-mass",
        "Mass must be greater than zero.",
        "massKilograms",
      ),
    );
  if (
    new Set(contributions.map((force) => force.id)).size !==
    contributions.length
  )
    issues.push(
      mechanicsIssue(
        "dynamics.duplicate-force-id",
        "Every force contribution needs a unique ID.",
        "contributions",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const resultantNewtons = add(
    contributions.map((force) => force.forceNewtons),
  );
  return valid({
    contributions: [...contributions],
    resultantNewtons,
    accelerationMetresPerSecondSquared: {
      x: resultantNewtons.x / massKilograms,
      y: resultantNewtons.y / massKilograms,
    },
  });
}

export interface InclinedPlaneSolution {
  readonly weightNewtons: number;
  readonly normalNewtons: number;
  readonly downslopeWeightNewtons: number;
  readonly frictionNewtons: number;
  readonly resultantDownslopeNewtons: number;
  readonly accelerationDownslopeMetresPerSecondSquared: number;
  readonly moving: boolean;
}

export function solveInclinedPlane(
  massKilograms: number,
  angleRadians: number,
  frictionCoefficient: number,
  gravityMetresPerSecondSquared = 9.81,
): MechanicsResult<InclinedPlaneSolution> {
  const issues = validateFinite({
    massKilograms,
    angleRadians,
    frictionCoefficient,
    gravityMetresPerSecondSquared,
  });
  if (massKilograms <= 0)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-mass",
        "Mass must be greater than zero.",
        "massKilograms",
      ),
    );
  if (frictionCoefficient < 0)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-friction",
        "Friction coefficient cannot be negative.",
        "frictionCoefficient",
      ),
    );
  if (gravityMetresPerSecondSquared <= 0)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-gravity",
        "Gravity magnitude must be positive.",
        "gravityMetresPerSecondSquared",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const weightNewtons = massKilograms * gravityMetresPerSecondSquared;
  const normalNewtons = weightNewtons * Math.cos(angleRadians);
  const downslopeWeightNewtons = weightNewtons * Math.sin(angleRadians);
  const maximumFriction = frictionCoefficient * Math.abs(normalNewtons);
  const moving = Math.abs(downslopeWeightNewtons) > maximumFriction;
  const frictionNewtons = moving
    ? Math.sign(downslopeWeightNewtons) * maximumFriction
    : downslopeWeightNewtons;
  const resultantDownslopeNewtons = downslopeWeightNewtons - frictionNewtons;
  return valid({
    weightNewtons,
    normalNewtons,
    downslopeWeightNewtons,
    frictionNewtons,
    resultantDownslopeNewtons,
    accelerationDownslopeMetresPerSecondSquared:
      resultantDownslopeNewtons / massKilograms,
    moving,
  });
}

export interface AtwoodSolution {
  readonly accelerationMetresPerSecondSquared: number;
  readonly tensionNewtons: number;
  readonly heavierSide: "A" | "B" | "balanced";
  readonly constraintResidualNewtons: number;
}

export function solveAtwoodMachine(
  massAKilograms: number,
  massBKilograms: number,
  gravityMetresPerSecondSquared = 9.81,
): MechanicsResult<AtwoodSolution> {
  const issues = validateFinite({
    massAKilograms,
    massBKilograms,
    gravityMetresPerSecondSquared,
  });
  if (massAKilograms <= 0 || massBKilograms <= 0)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-pulley-mass",
        "Both pulley masses must be greater than zero.",
      ),
    );
  if (gravityMetresPerSecondSquared <= 0)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-gravity",
        "Gravity magnitude must be positive.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const acceleration =
    ((massBKilograms - massAKilograms) * gravityMetresPerSecondSquared) /
    (massAKilograms + massBKilograms);
  const tension =
    massAKilograms * (gravityMetresPerSecondSquared + acceleration);
  const otherTension =
    massBKilograms * (gravityMetresPerSecondSquared - acceleration);
  return valid({
    accelerationMetresPerSecondSquared: acceleration,
    tensionNewtons: tension,
    heavierSide:
      massAKilograms === massBKilograms
        ? "balanced"
        : massAKilograms > massBKilograms
          ? "A"
          : "B",
    constraintResidualNewtons: tension - otherTension,
  });
}

export interface CollisionBody1D {
  readonly massKilograms: number;
  readonly velocityMetresPerSecond: number;
}
export interface CollisionSolution1D {
  readonly finalVelocityA: number;
  readonly finalVelocityB: number;
  readonly momentumBefore: number;
  readonly momentumAfter: number;
  readonly momentumResidual: number;
  readonly kineticEnergyBefore: number;
  readonly kineticEnergyAfter: number;
  readonly kineticEnergyChange: number;
  readonly restitution: number;
}

export function solveCollision1D(
  a: CollisionBody1D,
  b: CollisionBody1D,
  restitution: number,
): MechanicsResult<CollisionSolution1D> {
  const issues = validateFinite({
    massA: a.massKilograms,
    velocityA: a.velocityMetresPerSecond,
    massB: b.massKilograms,
    velocityB: b.velocityMetresPerSecond,
    restitution,
  });
  if (a.massKilograms <= 0 || b.massKilograms <= 0)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-collision-mass",
        "Both collision masses must be greater than zero.",
      ),
    );
  if (restitution < 0 || restitution > 1)
    issues.push(
      mechanicsIssue(
        "dynamics.invalid-restitution",
        "Restitution must be between zero and one.",
        "restitution",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const totalMass = a.massKilograms + b.massKilograms;
  const finalVelocityA =
    (a.massKilograms * a.velocityMetresPerSecond +
      b.massKilograms * b.velocityMetresPerSecond -
      b.massKilograms *
        restitution *
        (a.velocityMetresPerSecond - b.velocityMetresPerSecond)) /
    totalMass;
  const finalVelocityB =
    (a.massKilograms * a.velocityMetresPerSecond +
      b.massKilograms * b.velocityMetresPerSecond +
      a.massKilograms *
        restitution *
        (a.velocityMetresPerSecond - b.velocityMetresPerSecond)) /
    totalMass;
  const momentumBefore =
    a.massKilograms * a.velocityMetresPerSecond +
    b.massKilograms * b.velocityMetresPerSecond;
  const momentumAfter =
    a.massKilograms * finalVelocityA + b.massKilograms * finalVelocityB;
  const kineticEnergyBefore =
    0.5 * a.massKilograms * a.velocityMetresPerSecond ** 2 +
    0.5 * b.massKilograms * b.velocityMetresPerSecond ** 2;
  const kineticEnergyAfter =
    0.5 * a.massKilograms * finalVelocityA ** 2 +
    0.5 * b.massKilograms * finalVelocityB ** 2;
  return valid({
    finalVelocityA,
    finalVelocityB,
    momentumBefore,
    momentumAfter,
    momentumResidual: momentumAfter - momentumBefore,
    kineticEnergyBefore,
    kineticEnergyAfter,
    kineticEnergyChange: kineticEnergyAfter - kineticEnergyBefore,
    restitution,
  });
}

export function impulseFromSamples(
  samples: readonly {
    readonly timeSeconds: number;
    readonly forceNewtons: number;
  }[],
): MechanicsResult<number> {
  if (samples.length < 2)
    return invalid(
      mechanicsIssue(
        "dynamics.impulse-too-few-samples",
        "Impulse requires at least two force-time samples.",
      ),
    );
  const issues = validateFinite(
    Object.fromEntries(
      samples.flatMap((sample, index) => [
        [`samples.${index}.timeSeconds`, sample.timeSeconds],
        [`samples.${index}.forceNewtons`, sample.forceNewtons],
      ]),
    ),
  );
  if (
    samples.some(
      (sample, index) =>
        index > 0 && sample.timeSeconds <= samples[index - 1]!.timeSeconds,
    )
  )
    issues.push(
      mechanicsIssue(
        "dynamics.impulse-time-order",
        "Force-time samples must have strictly increasing time.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  let impulse = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1]!;
    const right = samples[index]!;
    impulse +=
      0.5 *
      (left.forceNewtons + right.forceNewtons) *
      (right.timeSeconds - left.timeSeconds);
  }
  return valid(impulse);
}
