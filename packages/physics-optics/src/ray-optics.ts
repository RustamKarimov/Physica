import {
  finiteOpticsInputs,
  invalidOptics,
  opticsIssue,
  validOptics,
  type OpticsResult,
} from "./types";

export function refractRay(
  incidentIndex: number,
  transmittedIndex: number,
  incidentAngleRadians: number,
): OpticsResult<{
  readonly reflectedAngleRadians: number;
  readonly refractedAngleRadians: number | null;
  readonly totalInternalReflection: boolean;
  readonly criticalAngleRadians: number | null;
}> {
  const issues = finiteOpticsInputs({
    incidentIndex,
    transmittedIndex,
    incidentAngleRadians,
  });
  if (incidentIndex <= 0 || transmittedIndex <= 0)
    issues.push(
      opticsIssue(
        "optics.invalid-refractive-index",
        "Refractive indices must be positive.",
      ),
    );
  if (incidentAngleRadians < 0 || incidentAngleRadians > Math.PI / 2)
    issues.push(
      opticsIssue(
        "optics.invalid-incident-angle",
        "Incident angle must lie from 0 to pi/2 radians.",
      ),
    );
  if (issues.length > 0) return invalidOptics(...issues);
  const sineRefracted =
    (incidentIndex * Math.sin(incidentAngleRadians)) / transmittedIndex;
  const totalInternalReflection = sineRefracted > 1;
  return validOptics({
    reflectedAngleRadians: incidentAngleRadians,
    refractedAngleRadians: totalInternalReflection
      ? null
      : Math.asin(Math.min(1, sineRefracted)),
    totalInternalReflection,
    criticalAngleRadians:
      incidentIndex > transmittedIndex
        ? Math.asin(transmittedIndex / incidentIndex)
        : null,
  });
}

export function thinLensImage(
  focalLengthMetres: number,
  objectDistanceMetres: number,
): OpticsResult<{
  readonly imageDistanceMetres: number;
  readonly magnification: number;
  readonly imageKind: "real-inverted" | "virtual-upright";
}> {
  const issues = finiteOpticsInputs({
    focalLengthMetres,
    objectDistanceMetres,
  });
  if (focalLengthMetres === 0 || objectDistanceMetres <= 0)
    issues.push(
      opticsIssue(
        "optics.invalid-lens-distance",
        "Focal length must be non-zero and object distance must be positive.",
      ),
    );
  if (Math.abs(objectDistanceMetres - focalLengthMetres) < 1e-12)
    issues.push(
      opticsIssue(
        "optics.image-at-infinity",
        "This thin-lens configuration forms an image at infinity.",
      ),
    );
  if (issues.length > 0) return invalidOptics(...issues);
  const imageDistanceMetres =
    (focalLengthMetres * objectDistanceMetres) /
    (objectDistanceMetres - focalLengthMetres);
  const magnification = -imageDistanceMetres / objectDistanceMetres;
  return validOptics({
    imageDistanceMetres,
    magnification,
    imageKind: imageDistanceMetres > 0 ? "real-inverted" : "virtual-upright",
  });
}

export function malusLaw(
  incidentIntensity: number,
  relativeAngleRadians: number,
): OpticsResult<{
  readonly transmittedIntensity: number;
  readonly transmissionFraction: number;
}> {
  const issues = finiteOpticsInputs({
    incidentIntensity,
    relativeAngleRadians,
  });
  if (incidentIntensity < 0)
    issues.push(
      opticsIssue("optics.negative-intensity", "Intensity cannot be negative."),
    );
  if (issues.length > 0) return invalidOptics(...issues);
  const transmissionFraction = Math.cos(relativeAngleRadians) ** 2;
  return validOptics({
    transmittedIntensity: incidentIntensity * transmissionFraction,
    transmissionFraction,
  });
}
