import {
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
  type Vector2,
} from "./types";

export interface MomentContribution {
  readonly id: string;
  readonly forceNewtons: number;
  readonly perpendicularDistanceMetres: number;
  readonly direction: "clockwise" | "anticlockwise";
}
export interface MomentBalance {
  readonly clockwiseNewtonMetres: number;
  readonly anticlockwiseNewtonMetres: number;
  readonly resultantNewtonMetres: number;
  readonly equilibrium: boolean;
}
export function resolveMomentBalance(
  moments: readonly MomentContribution[],
  toleranceNewtonMetres = 1e-9,
): MechanicsResult<MomentBalance> {
  const issues = validateFinite({
    toleranceNewtonMetres,
    ...Object.fromEntries(
      moments.flatMap((moment, index) => [
        [`moments.${index}.forceNewtons`, moment.forceNewtons],
        [
          `moments.${index}.perpendicularDistanceMetres`,
          moment.perpendicularDistanceMetres,
        ],
      ]),
    ),
  });
  if (toleranceNewtonMetres < 0)
    issues.push(
      mechanicsIssue(
        "statics.invalid-tolerance",
        "Moment tolerance cannot be negative.",
      ),
    );
  if (moments.some((moment) => moment.perpendicularDistanceMetres < 0))
    issues.push(
      mechanicsIssue(
        "statics.negative-distance",
        "Perpendicular distances cannot be negative.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const clockwiseNewtonMetres = moments
    .filter((moment) => moment.direction === "clockwise")
    .reduce(
      (sum, moment) =>
        sum + moment.forceNewtons * moment.perpendicularDistanceMetres,
      0,
    );
  const anticlockwiseNewtonMetres = moments
    .filter((moment) => moment.direction === "anticlockwise")
    .reduce(
      (sum, moment) =>
        sum + moment.forceNewtons * moment.perpendicularDistanceMetres,
      0,
    );
  const resultantNewtonMetres =
    anticlockwiseNewtonMetres - clockwiseNewtonMetres;
  return valid({
    clockwiseNewtonMetres,
    anticlockwiseNewtonMetres,
    resultantNewtonMetres,
    equilibrium: Math.abs(resultantNewtonMetres) <= toleranceNewtonMetres,
  });
}

export function centreOfMass(
  points: readonly {
    readonly massKilograms: number;
    readonly positionMetres: Vector2;
  }[],
): MechanicsResult<Vector2> {
  if (points.length === 0)
    return invalid(
      mechanicsIssue("statics.no-masses", "At least one mass is required."),
    );
  const issues = validateFinite(
    Object.fromEntries(
      points.flatMap((point, index) => [
        [`points.${index}.massKilograms`, point.massKilograms],
        [`points.${index}.x`, point.positionMetres.x],
        [`points.${index}.y`, point.positionMetres.y],
      ]),
    ),
  );
  if (points.some((point) => point.massKilograms <= 0))
    issues.push(
      mechanicsIssue(
        "statics.invalid-mass",
        "Every mass must be greater than zero.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const totalMass = points.reduce((sum, point) => sum + point.massKilograms, 0);
  return valid({
    x:
      points.reduce(
        (sum, point) => sum + point.massKilograms * point.positionMetres.x,
        0,
      ) / totalMass,
    y:
      points.reduce(
        (sum, point) => sum + point.massKilograms * point.positionMetres.y,
        0,
      ) / totalMass,
  });
}

export function density(
  massKilograms: number,
  volumeCubicMetres: number,
): MechanicsResult<number> {
  const issues = validateFinite({ massKilograms, volumeCubicMetres });
  if (massKilograms < 0)
    issues.push(
      mechanicsIssue("statics.negative-mass", "Mass cannot be negative."),
    );
  if (volumeCubicMetres <= 0)
    issues.push(
      mechanicsIssue(
        "statics.invalid-volume",
        "Volume must be greater than zero.",
      ),
    );
  return issues.length > 0
    ? invalid(...issues)
    : valid(massKilograms / volumeCubicMetres);
}

export function hydrostaticPressure(
  fluidDensityKilogramsPerCubicMetre: number,
  depthMetres: number,
  gravityMetresPerSecondSquared = 9.81,
  surfacePressurePascals = 0,
): MechanicsResult<number> {
  const issues = validateFinite({
    fluidDensityKilogramsPerCubicMetre,
    depthMetres,
    gravityMetresPerSecondSquared,
    surfacePressurePascals,
  });
  if (fluidDensityKilogramsPerCubicMetre <= 0)
    issues.push(
      mechanicsIssue(
        "statics.invalid-fluid-density",
        "Fluid density must be positive.",
      ),
    );
  if (depthMetres < 0)
    issues.push(
      mechanicsIssue("statics.negative-depth", "Depth cannot be negative."),
    );
  if (gravityMetresPerSecondSquared <= 0)
    issues.push(
      mechanicsIssue(
        "statics.invalid-gravity",
        "Gravity magnitude must be positive.",
      ),
    );
  return issues.length > 0
    ? invalid(...issues)
    : valid(
        surfacePressurePascals +
          fluidDensityKilogramsPerCubicMetre *
            gravityMetresPerSecondSquared *
            depthMetres,
      );
}

export function isStableAgainstTipping(
  centreOfMassHorizontalMetres: number,
  supportMinimumMetres: number,
  supportMaximumMetres: number,
): MechanicsResult<boolean> {
  const issues = validateFinite({
    centreOfMassHorizontalMetres,
    supportMinimumMetres,
    supportMaximumMetres,
  });
  if (supportMaximumMetres <= supportMinimumMetres)
    issues.push(
      mechanicsIssue(
        "statics.invalid-support",
        "Support maximum must exceed support minimum.",
      ),
    );
  return issues.length > 0
    ? invalid(...issues)
    : valid(
        centreOfMassHorizontalMetres >= supportMinimumMetres &&
          centreOfMassHorizontalMetres <= supportMaximumMetres,
      );
}
