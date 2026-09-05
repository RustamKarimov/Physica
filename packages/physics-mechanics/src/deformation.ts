import {
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
} from "./types";

export interface HookeState {
  readonly forceNewtons: number;
  readonly extensionMetres: number;
  readonly springConstantNewtonsPerMetre: number;
  readonly storedEnergyJoules: number;
}
export function evaluateHookeLaw(
  springConstantNewtonsPerMetre: number,
  extensionMetres: number,
): MechanicsResult<HookeState> {
  const issues = validateFinite({
    springConstantNewtonsPerMetre,
    extensionMetres,
  });
  if (springConstantNewtonsPerMetre <= 0)
    issues.push(
      mechanicsIssue(
        "deformation.invalid-spring-constant",
        "Spring constant must be greater than zero.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const forceNewtons = springConstantNewtonsPerMetre * extensionMetres;
  return valid({
    forceNewtons,
    extensionMetres,
    springConstantNewtonsPerMetre,
    storedEnergyJoules: 0.5 * forceNewtons * extensionMetres,
  });
}

export interface StressStrainState {
  readonly stressPascals: number;
  readonly strain: number;
  readonly youngModulusPascals: number;
}
export function evaluateStressStrain(
  forceNewtons: number,
  crossSectionalAreaSquareMetres: number,
  extensionMetres: number,
  originalLengthMetres: number,
): MechanicsResult<StressStrainState> {
  const issues = validateFinite({
    forceNewtons,
    crossSectionalAreaSquareMetres,
    extensionMetres,
    originalLengthMetres,
  });
  if (crossSectionalAreaSquareMetres <= 0)
    issues.push(
      mechanicsIssue(
        "deformation.invalid-area",
        "Cross-sectional area must be greater than zero.",
      ),
    );
  if (originalLengthMetres <= 0)
    issues.push(
      mechanicsIssue(
        "deformation.invalid-length",
        "Original length must be greater than zero.",
      ),
    );
  if (extensionMetres === 0)
    issues.push(
      mechanicsIssue(
        "deformation.zero-strain",
        "Young modulus is undefined at zero strain for this direct calculation.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const stressPascals = forceNewtons / crossSectionalAreaSquareMetres;
  const strain = extensionMetres / originalLengthMetres;
  return valid({
    stressPascals,
    strain,
    youngModulusPascals: stressPascals / strain,
  });
}

export interface ConstitutivePoint {
  readonly strain: number;
  readonly stressPascals: number;
  readonly region: "elastic" | "plastic";
  readonly permanentStrain: number;
}
export function evaluateElasticPlasticMaterial(
  youngModulusPascals: number,
  yieldStressPascals: number,
  plasticTangentModulusPascals: number,
  strain: number,
): MechanicsResult<ConstitutivePoint> {
  const issues = validateFinite({
    youngModulusPascals,
    yieldStressPascals,
    plasticTangentModulusPascals,
    strain,
  });
  if (youngModulusPascals <= 0 || yieldStressPascals <= 0)
    issues.push(
      mechanicsIssue(
        "deformation.invalid-material",
        "Young modulus and yield stress must be positive.",
      ),
    );
  if (
    plasticTangentModulusPascals < 0 ||
    plasticTangentModulusPascals > youngModulusPascals
  )
    issues.push(
      mechanicsIssue(
        "deformation.invalid-plastic-modulus",
        "Plastic tangent modulus must lie from zero to the Young modulus.",
      ),
    );
  if (strain < 0)
    issues.push(
      mechanicsIssue(
        "deformation.negative-strain",
        "This tensile teaching model requires non-negative strain.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  const yieldStrain = yieldStressPascals / youngModulusPascals;
  if (strain <= yieldStrain)
    return valid({
      strain,
      stressPascals: youngModulusPascals * strain,
      region: "elastic",
      permanentStrain: 0,
    });
  const stressPascals =
    yieldStressPascals + plasticTangentModulusPascals * (strain - yieldStrain);
  return valid({
    strain,
    stressPascals,
    region: "plastic",
    permanentStrain: strain - stressPascals / youngModulusPascals,
  });
}
