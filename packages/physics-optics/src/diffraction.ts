import {
  finiteOpticsInputs,
  invalidOptics,
  opticsIssue,
  validOptics,
  type OpticsResult,
} from "./types";

function sinc(value: number): number {
  return Math.abs(value) < 1e-12 ? 1 : Math.sin(value) / value;
}

function validateAperture(
  wavelengthMetres: number,
  screenDistanceMetres: number,
  apertureMetres: number,
): ReturnType<typeof finiteOpticsInputs> {
  const issues = finiteOpticsInputs({
    wavelengthMetres,
    screenDistanceMetres,
    apertureMetres,
  });
  if (wavelengthMetres <= 0 || screenDistanceMetres <= 0 || apertureMetres <= 0)
    issues.push(
      opticsIssue(
        "optics.invalid-aperture",
        "Wavelength, screen distance and aperture must be positive.",
      ),
    );
  return issues;
}

export function singleSlitIntensity(
  wavelengthMetres: number,
  slitWidthMetres: number,
  screenDistanceMetres: number,
  screenPositionMetres: number,
  peakIntensity: number,
): OpticsResult<{
  readonly angleRadians: number;
  readonly betaRadians: number;
  readonly normalizedIntensity: number;
  readonly intensity: number;
}> {
  const issues = validateAperture(
    wavelengthMetres,
    screenDistanceMetres,
    slitWidthMetres,
  );
  issues.push(...finiteOpticsInputs({ screenPositionMetres, peakIntensity }));
  if (peakIntensity < 0)
    issues.push(
      opticsIssue("optics.negative-intensity", "Intensity cannot be negative."),
    );
  if (issues.length > 0) return invalidOptics(...issues);
  const angleRadians = Math.atan2(screenPositionMetres, screenDistanceMetres);
  const betaRadians =
    (Math.PI * slitWidthMetres * Math.sin(angleRadians)) / wavelengthMetres;
  const normalizedIntensity = sinc(betaRadians) ** 2;
  return validOptics({
    angleRadians,
    betaRadians,
    normalizedIntensity,
    intensity: peakIntensity * normalizedIntensity,
  });
}

export interface DoubleSlitParameters {
  readonly wavelengthMetres: number;
  readonly slitSeparationMetres: number;
  readonly slitWidthMetres: number;
  readonly screenDistanceMetres: number;
  readonly peakIntensity: number;
}

export interface DoubleSlitState {
  readonly screenPositionMetres: number;
  readonly angleRadians: number;
  readonly pathDifferenceMetres: number;
  readonly phaseDifferenceRadians: number;
  readonly envelope: number;
  readonly normalizedIntensity: number;
  readonly intensity: number;
  readonly approximateFringeSpacingMetres: number;
  readonly approximation: "Fraunhofer scalar far field";
}

export function doubleSlitIntensity(
  parameters: DoubleSlitParameters,
  screenPositionMetres: number,
): OpticsResult<DoubleSlitState> {
  const issues = validateAperture(
    parameters.wavelengthMetres,
    parameters.screenDistanceMetres,
    parameters.slitWidthMetres,
  );
  issues.push(...finiteOpticsInputs({ ...parameters, screenPositionMetres }));
  if (
    parameters.slitSeparationMetres <= parameters.slitWidthMetres ||
    parameters.peakIntensity < 0
  )
    issues.push(
      opticsIssue(
        "optics.invalid-double-slit",
        "Slit separation must exceed slit width and intensity must be non-negative.",
      ),
    );
  if (issues.length > 0) return invalidOptics(...issues);
  const angleRadians = Math.atan2(
    screenPositionMetres,
    parameters.screenDistanceMetres,
  );
  const sine = Math.sin(angleRadians);
  const pathDifferenceMetres = parameters.slitSeparationMetres * sine;
  const phaseDifferenceRadians =
    (2 * Math.PI * pathDifferenceMetres) / parameters.wavelengthMetres;
  const beta =
    (Math.PI * parameters.slitWidthMetres * sine) / parameters.wavelengthMetres;
  const envelope = sinc(beta) ** 2;
  const normalizedIntensity =
    envelope * Math.cos(phaseDifferenceRadians / 2) ** 2;
  return validOptics({
    screenPositionMetres,
    angleRadians,
    pathDifferenceMetres,
    phaseDifferenceRadians,
    envelope,
    normalizedIntensity,
    intensity: parameters.peakIntensity * normalizedIntensity,
    approximateFringeSpacingMetres:
      (parameters.wavelengthMetres * parameters.screenDistanceMetres) /
      parameters.slitSeparationMetres,
    approximation: "Fraunhofer scalar far field",
  });
}

export function gratingIntensity(
  wavelengthMetres: number,
  slitSpacingMetres: number,
  sourceCount: number,
  angleRadians: number,
): OpticsResult<{
  readonly pathDifferenceMetres: number;
  readonly normalizedIntensity: number;
}> {
  const issues = finiteOpticsInputs({
    wavelengthMetres,
    slitSpacingMetres,
    sourceCount,
    angleRadians,
  });
  if (
    wavelengthMetres <= 0 ||
    slitSpacingMetres <= 0 ||
    !Number.isSafeInteger(sourceCount) ||
    sourceCount < 2
  )
    issues.push(
      opticsIssue(
        "optics.invalid-grating",
        "Positive wavelength/spacing and at least two integer sources are required.",
      ),
    );
  if (issues.length > 0) return invalidOptics(...issues);
  const pathDifferenceMetres = slitSpacingMetres * Math.sin(angleRadians);
  const alpha = (Math.PI * pathDifferenceMetres) / wavelengthMetres;
  const denominator = Math.sin(alpha);
  const normalizedIntensity =
    Math.abs(denominator) < 1e-12
      ? 1
      : (Math.sin(sourceCount * alpha) / (sourceCount * denominator)) ** 2;
  return validOptics({ pathDifferenceMetres, normalizedIntensity });
}

export function twoPointSourceIntensity(
  wavelengthMetres: number,
  sourceSeparationMetres: number,
  screenDistanceMetres: number,
  screenPositionMetres: number,
): OpticsResult<{
  readonly firstPathMetres: number;
  readonly secondPathMetres: number;
  readonly pathDifferenceMetres: number;
  readonly phaseDifferenceRadians: number;
  readonly normalizedIntensity: number;
}> {
  const issues = finiteOpticsInputs({
    wavelengthMetres,
    sourceSeparationMetres,
    screenDistanceMetres,
    screenPositionMetres,
  });
  if (
    wavelengthMetres <= 0 ||
    sourceSeparationMetres <= 0 ||
    screenDistanceMetres <= 0
  )
    issues.push(
      opticsIssue(
        "optics.invalid-two-source-geometry",
        "Wavelength, source separation and screen distance must be positive.",
      ),
    );
  if (issues.length > 0) return invalidOptics(...issues);
  const firstPathMetres = Math.hypot(
    screenDistanceMetres,
    screenPositionMetres - sourceSeparationMetres / 2,
  );
  const secondPathMetres = Math.hypot(
    screenDistanceMetres,
    screenPositionMetres + sourceSeparationMetres / 2,
  );
  const pathDifferenceMetres = secondPathMetres - firstPathMetres;
  const phaseDifferenceRadians =
    (2 * Math.PI * pathDifferenceMetres) / wavelengthMetres;
  return validOptics({
    firstPathMetres,
    secondPathMetres,
    pathDifferenceMetres,
    phaseDifferenceRadians,
    normalizedIntensity: Math.cos(phaseDifferenceRadians / 2) ** 2,
  });
}
