import {
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
} from "./types";

function requireNonNegative(
  values: Readonly<Record<string, number>>,
): MechanicsResult<void> {
  const issues = validateFinite(values);
  for (const [path, value] of Object.entries(values))
    if (value < 0)
      issues.push(
        mechanicsIssue(
          "energy.negative-input",
          `${path} cannot be negative.`,
          path,
        ),
      );
  return issues.length > 0 ? invalid(...issues) : valid(undefined);
}

export function kineticEnergy(
  massKilograms: number,
  speedMetresPerSecond: number,
): MechanicsResult<number> {
  const checked = requireNonNegative({ massKilograms, speedMetresPerSecond });
  return checked.ok
    ? valid(0.5 * massKilograms * speedMetresPerSecond ** 2)
    : checked;
}
export function gravitationalPotentialEnergy(
  massKilograms: number,
  heightMetres: number,
  gravityMetresPerSecondSquared = 9.81,
): MechanicsResult<number> {
  const issues = validateFinite({
    massKilograms,
    heightMetres,
    gravityMetresPerSecondSquared,
  });
  if (massKilograms < 0 || gravityMetresPerSecondSquared <= 0)
    issues.push(
      mechanicsIssue(
        "energy.invalid-gravity-input",
        "Mass must be non-negative and gravity positive.",
      ),
    );
  return issues.length > 0
    ? invalid(...issues)
    : valid(massKilograms * gravityMetresPerSecondSquared * heightMetres);
}
export function elasticPotentialEnergy(
  springConstantNewtonsPerMetre: number,
  extensionMetres: number,
): MechanicsResult<number> {
  const issues = validateFinite({
    springConstantNewtonsPerMetre,
    extensionMetres,
  });
  if (springConstantNewtonsPerMetre < 0)
    issues.push(
      mechanicsIssue(
        "energy.invalid-spring",
        "Spring constant cannot be negative.",
      ),
    );
  return issues.length > 0
    ? invalid(...issues)
    : valid(0.5 * springConstantNewtonsPerMetre * extensionMetres ** 2);
}

export function workFromSamples(
  samples: readonly {
    readonly displacementMetres: number;
    readonly forceNewtons: number;
  }[],
): MechanicsResult<number> {
  if (samples.length < 2)
    return invalid(
      mechanicsIssue(
        "energy.work-too-few-samples",
        "Work integration requires at least two samples.",
      ),
    );
  const issues = validateFinite(
    Object.fromEntries(
      samples.flatMap((sample, index) => [
        [`samples.${index}.displacementMetres`, sample.displacementMetres],
        [`samples.${index}.forceNewtons`, sample.forceNewtons],
      ]),
    ),
  );
  if (
    samples.some(
      (sample, index) =>
        index > 0 &&
        sample.displacementMetres <= samples[index - 1]!.displacementMetres,
    )
  )
    issues.push(
      mechanicsIssue(
        "energy.work-position-order",
        "Displacement samples must be strictly increasing.",
      ),
    );
  if (issues.length > 0) return invalid(...issues);
  let work = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1]!;
    const right = samples[index]!;
    work +=
      0.5 *
      (left.forceNewtons + right.forceNewtons) *
      (right.displacementMetres - left.displacementMetres);
  }
  return valid(work);
}

export function power(
  workJoules: number,
  durationSeconds: number,
): MechanicsResult<number> {
  const issues = validateFinite({ workJoules, durationSeconds });
  if (durationSeconds <= 0)
    issues.push(
      mechanicsIssue(
        "energy.invalid-duration",
        "Duration must be greater than zero.",
      ),
    );
  return issues.length > 0
    ? invalid(...issues)
    : valid(workJoules / durationSeconds);
}
export function efficiency(
  usefulOutputJoules: number,
  totalInputJoules: number,
): MechanicsResult<number> {
  const issues = validateFinite({ usefulOutputJoules, totalInputJoules });
  if (
    usefulOutputJoules < 0 ||
    totalInputJoules <= 0 ||
    usefulOutputJoules > totalInputJoules
  )
    issues.push(
      mechanicsIssue(
        "energy.invalid-efficiency",
        "Useful output must lie between zero and positive total input.",
      ),
    );
  return issues.length > 0
    ? invalid(...issues)
    : valid(usefulOutputJoules / totalInputJoules);
}

export interface EnergyLedger {
  readonly inputJoules: number;
  readonly usefulJoules: number;
  readonly storedJoules: number;
  readonly dissipatedJoules: number;
  readonly accountedJoules: number;
  readonly conservationResidualJoules: number;
}
export function createEnergyLedger(
  inputJoules: number,
  usefulJoules: number,
  storedJoules: number,
  dissipatedJoules: number,
): MechanicsResult<EnergyLedger> {
  const checked = requireNonNegative({
    inputJoules,
    usefulJoules,
    storedJoules,
    dissipatedJoules,
  });
  if (!checked.ok) return checked;
  const accountedJoules = usefulJoules + storedJoules + dissipatedJoules;
  return valid({
    inputJoules,
    usefulJoules,
    storedJoules,
    dissipatedJoules,
    accountedJoules,
    conservationResidualJoules: accountedJoules - inputJoules,
  });
}
