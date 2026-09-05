import {
  finiteWaveInputs,
  invalidWave,
  validWave,
  waveIssue,
  type WaveResult,
} from "./types";

export interface HarmonicWaveParameters {
  readonly amplitudeMetres: number;
  readonly frequencyHertz: number;
  readonly wavelengthMetres: number;
  readonly phaseRadians: number;
  readonly direction: 1 | -1;
}

export interface HarmonicWaveState {
  readonly positionMetres: number;
  readonly timeSeconds: number;
  readonly displacementMetres: number;
  readonly particleVelocityMetresPerSecond: number;
  readonly phaseRadians: number;
  readonly angularFrequencyRadiansPerSecond: number;
  readonly waveNumberRadiansPerMetre: number;
  readonly patternSpeedMetresPerSecond: number;
}

export function evaluateHarmonicWave(
  parameters: HarmonicWaveParameters,
  positionMetres: number,
  timeSeconds: number,
): WaveResult<HarmonicWaveState> {
  const issues = finiteWaveInputs({
    ...parameters,
    positionMetres,
    timeSeconds,
  });
  if (parameters.amplitudeMetres < 0)
    issues.push(
      waveIssue(
        "waves.negative-amplitude",
        "Amplitude cannot be negative.",
        "amplitudeMetres",
      ),
    );
  if (parameters.frequencyHertz <= 0 || parameters.wavelengthMetres <= 0)
    issues.push(
      waveIssue(
        "waves.invalid-periodic-parameter",
        "Frequency and wavelength must be greater than zero.",
      ),
    );
  if (parameters.direction !== 1 && parameters.direction !== -1)
    issues.push(
      waveIssue("waves.invalid-direction", "Direction must be +1 or -1."),
    );
  if (issues.length > 0) return invalidWave(...issues);
  const angularFrequencyRadiansPerSecond =
    2 * Math.PI * parameters.frequencyHertz;
  const waveNumberRadiansPerMetre = (2 * Math.PI) / parameters.wavelengthMetres;
  const phaseRadians =
    parameters.direction * waveNumberRadiansPerMetre * positionMetres -
    angularFrequencyRadiansPerSecond * timeSeconds +
    parameters.phaseRadians;
  return validWave({
    positionMetres,
    timeSeconds,
    displacementMetres: parameters.amplitudeMetres * Math.sin(phaseRadians),
    particleVelocityMetresPerSecond:
      -parameters.amplitudeMetres *
      angularFrequencyRadiansPerSecond *
      Math.cos(phaseRadians),
    phaseRadians,
    angularFrequencyRadiansPerSecond,
    waveNumberRadiansPerMetre,
    patternSpeedMetresPerSecond:
      parameters.frequencyHertz * parameters.wavelengthMetres,
  });
}

export interface GaussianPulseParameters {
  readonly amplitudeMetres: number;
  readonly widthMetres: number;
  readonly initialCentreMetres: number;
  readonly speedMetresPerSecond: number;
  readonly direction: 1 | -1;
}

export function evaluateGaussianPulse(
  parameters: GaussianPulseParameters,
  positionMetres: number,
  timeSeconds: number,
): WaveResult<{
  readonly centreMetres: number;
  readonly displacementMetres: number;
}> {
  const issues = finiteWaveInputs({
    ...parameters,
    positionMetres,
    timeSeconds,
  });
  if (parameters.amplitudeMetres < 0 || parameters.widthMetres <= 0)
    issues.push(
      waveIssue(
        "waves.invalid-pulse",
        "Pulse amplitude must be non-negative and width must be positive.",
      ),
    );
  if (parameters.speedMetresPerSecond < 0)
    issues.push(waveIssue("waves.negative-speed", "Speed cannot be negative."));
  if (parameters.direction !== 1 && parameters.direction !== -1)
    issues.push(
      waveIssue("waves.invalid-direction", "Direction must be +1 or -1."),
    );
  if (issues.length > 0) return invalidWave(...issues);
  const centreMetres =
    parameters.initialCentreMetres +
    parameters.direction * parameters.speedMetresPerSecond * timeSeconds;
  const offset = (positionMetres - centreMetres) / parameters.widthMetres;
  return validWave({
    centreMetres,
    displacementMetres: parameters.amplitudeMetres * Math.exp(-(offset ** 2)),
  });
}

export function evaluateLongitudinalParticle(
  parameters: HarmonicWaveParameters,
  equilibriumPositionMetres: number,
  timeSeconds: number,
): WaveResult<{
  readonly equilibriumPositionMetres: number;
  readonly actualPositionMetres: number;
  readonly particleDisplacementMetres: number;
  readonly compressionProxy: number;
  readonly patternSpeedMetresPerSecond: number;
}> {
  const state = evaluateHarmonicWave(
    parameters,
    equilibriumPositionMetres,
    timeSeconds,
  );
  if (!state.ok) return state;
  const compressionProxy =
    -parameters.amplitudeMetres *
    state.value.waveNumberRadiansPerMetre *
    Math.cos(state.value.phaseRadians);
  return validWave({
    equilibriumPositionMetres,
    actualPositionMetres:
      equilibriumPositionMetres + state.value.displacementMetres,
    particleDisplacementMetres: state.value.displacementMetres,
    compressionProxy,
    patternSpeedMetresPerSecond: state.value.patternSpeedMetresPerSecond,
  });
}

export function waveBoundaryCoefficients(
  incidentImpedance: number,
  transmittedImpedance: number,
): WaveResult<{
  readonly amplitudeReflection: number;
  readonly amplitudeTransmission: number;
  readonly energyReflection: number;
  readonly energyTransmission: number;
  readonly energyResidual: number;
}> {
  const issues = finiteWaveInputs({ incidentImpedance, transmittedImpedance });
  if (incidentImpedance <= 0 || transmittedImpedance <= 0)
    issues.push(
      waveIssue(
        "waves.invalid-impedance",
        "Both medium impedances must be greater than zero.",
      ),
    );
  if (issues.length > 0) return invalidWave(...issues);
  const sum = incidentImpedance + transmittedImpedance;
  const amplitudeReflection = (incidentImpedance - transmittedImpedance) / sum;
  const amplitudeTransmission = (2 * incidentImpedance) / sum;
  const energyReflection = amplitudeReflection ** 2;
  const energyTransmission =
    (4 * incidentImpedance * transmittedImpedance) / sum ** 2;
  return validWave({
    amplitudeReflection,
    amplitudeTransmission,
    energyReflection,
    energyTransmission,
    energyResidual: 1 - energyReflection - energyTransmission,
  });
}
