import {
  cross3,
  finiteIssue,
  invalidField,
  magnitude3,
  scale3,
  validField,
  type Vec3,
} from "./types";

export const VACUUM_PERMEABILITY = 4 * Math.PI * 1e-7;

export function magneticForceOnCharge(
  chargeCoulombs: number,
  velocityMetresPerSecond: Vec3,
  fieldTeslas: Vec3,
) {
  const finite = finiteIssue({
    chargeCoulombs,
    vx: velocityMetresPerSecond.x,
    vy: velocityMetresPerSecond.y,
    vz: velocityMetresPerSecond.z,
    bx: fieldTeslas.x,
    by: fieldTeslas.y,
    bz: fieldTeslas.z,
  });
  return finite
    ? invalidField(finite)
    : validField(
        scale3(cross3(velocityMetresPerSecond, fieldTeslas), chargeCoulombs),
      );
}

export function forceOnCurrent(
  fieldTeslas: number,
  currentAmperes: number,
  lengthMetres: number,
  angleRadians: number,
) {
  const finite = finiteIssue({
    fieldTeslas,
    currentAmperes,
    lengthMetres,
    angleRadians,
  });
  if (finite) return invalidField(finite);
  if (lengthMetres < 0)
    return invalidField({
      severity: "error",
      code: "magnetic.invalid-wire",
      message: "Wire length cannot be negative.",
    });
  return validField(
    fieldTeslas * currentAmperes * lengthMetres * Math.sin(angleRadians),
  );
}

export function magneticCircularMotion(
  massKilograms: number,
  speedMetresPerSecond: number,
  chargeCoulombs: number,
  fieldTeslas: number,
) {
  const finite = finiteIssue({
    massKilograms,
    speedMetresPerSecond,
    chargeCoulombs,
    fieldTeslas,
  });
  if (finite) return invalidField(finite);
  if (
    massKilograms <= 0 ||
    speedMetresPerSecond < 0 ||
    chargeCoulombs === 0 ||
    fieldTeslas === 0
  )
    return invalidField({
      severity: "error",
      code: "magnetic.undefined-radius",
      message:
        "Mass must be positive and charge and magnetic field must be non-zero.",
    });
  const radius =
    (massKilograms * speedMetresPerSecond) /
    (Math.abs(chargeCoulombs) * Math.abs(fieldTeslas));
  return validField({
    radiusMetres: radius,
    angularSpeedRadiansPerSecond:
      (Math.abs(chargeCoulombs) * Math.abs(fieldTeslas)) / massKilograms,
    periodSeconds:
      (2 * Math.PI * massKilograms) /
      (Math.abs(chargeCoulombs) * Math.abs(fieldTeslas)),
  });
}

export function longSolenoidField(
  turns: number,
  currentAmperes: number,
  lengthMetres: number,
) {
  const finite = finiteIssue({ turns, currentAmperes, lengthMetres });
  if (finite) return invalidField(finite);
  if (!Number.isSafeInteger(turns) || turns < 1 || lengthMetres <= 0)
    return invalidField({
      severity: "error",
      code: "magnetic.invalid-solenoid",
      message: "Solenoid turns must be a positive integer and length positive.",
    });
  return validField(
    (VACUUM_PERMEABILITY * turns * currentAmperes) / lengthMetres,
  );
}

export function magneticFlux(
  fieldTeslas: number,
  areaSquareMetres: number,
  normalAngleRadians: number,
) {
  const finite = finiteIssue({
    fieldTeslas,
    areaSquareMetres,
    normalAngleRadians,
  });
  if (finite) return invalidField(finite);
  if (areaSquareMetres < 0)
    return invalidField({
      severity: "error",
      code: "magnetic.invalid-flux-area",
      message: "Flux area cannot be negative.",
    });
  return validField(
    fieldTeslas * areaSquareMetres * Math.cos(normalAngleRadians),
  );
}

export function inducedEmf(
  turns: number,
  previousFluxWebers: number,
  currentFluxWebers: number,
  deltaSeconds: number,
) {
  const finite = finiteIssue({
    turns,
    previousFluxWebers,
    currentFluxWebers,
    deltaSeconds,
  });
  if (finite) return invalidField(finite);
  if (!Number.isSafeInteger(turns) || turns < 1 || deltaSeconds <= 0)
    return invalidField({
      severity: "error",
      code: "magnetic.invalid-induction",
      message: "Induction requires positive turns and elapsed time.",
    });
  return validField(
    (-turns * (currentFluxWebers - previousFluxWebers)) / deltaSeconds,
  );
}

export function magneticForceMagnitude(force: Vec3): number {
  return magnitude3(force);
}
