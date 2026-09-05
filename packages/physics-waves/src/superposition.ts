import { evaluateHarmonicWave, type HarmonicWaveParameters } from "./waves";
import {
  finiteWaveInputs,
  invalidWave,
  validWave,
  waveIssue,
  type WaveResult,
} from "./types";

export function evaluateSuperposition(
  components: readonly HarmonicWaveParameters[],
  positionMetres: number,
  timeSeconds: number,
): WaveResult<{
  readonly componentDisplacementsMetres: readonly number[];
  readonly resultantDisplacementMetres: number;
}> {
  if (components.length === 0)
    return invalidWave(
      waveIssue("waves.empty-superposition", "At least one wave is required."),
    );
  const displacements: number[] = [];
  for (const component of components) {
    const state = evaluateHarmonicWave(component, positionMetres, timeSeconds);
    if (!state.ok) return state;
    displacements.push(state.value.displacementMetres);
  }
  return validWave({
    componentDisplacementsMetres: displacements,
    resultantDisplacementMetres: displacements.reduce(
      (sum, value) => sum + value,
      0,
    ),
  });
}

export interface StandingWaveParameters {
  readonly componentAmplitudeMetres: number;
  readonly frequencyHertz: number;
  readonly wavelengthMetres: number;
  readonly phaseRadians: number;
  readonly lengthMetres: number;
}

export function evaluateStandingWave(
  parameters: StandingWaveParameters,
  positionMetres: number,
  timeSeconds: number,
): WaveResult<{
  readonly displacementMetres: number;
  readonly envelopeAmplitudeMetres: number;
  readonly nodePositionsMetres: readonly number[];
  readonly antinodePositionsMetres: readonly number[];
}> {
  const issues = finiteWaveInputs({
    ...parameters,
    positionMetres,
    timeSeconds,
  });
  if (
    parameters.componentAmplitudeMetres < 0 ||
    parameters.frequencyHertz <= 0 ||
    parameters.wavelengthMetres <= 0 ||
    parameters.lengthMetres <= 0
  )
    issues.push(
      waveIssue(
        "waves.invalid-standing-wave",
        "Amplitude must be non-negative; frequency, wavelength and length must be positive.",
      ),
    );
  if (positionMetres < 0 || positionMetres > parameters.lengthMetres)
    issues.push(
      waveIssue(
        "waves.position-outside-medium",
        "Position must lie on the declared standing-wave length.",
      ),
    );
  if (issues.length > 0) return invalidWave(...issues);
  const waveNumber = (2 * Math.PI) / parameters.wavelengthMetres;
  const angularFrequency = 2 * Math.PI * parameters.frequencyHertz;
  const envelopeAmplitudeMetres =
    2 *
    parameters.componentAmplitudeMetres *
    Math.sin(waveNumber * positionMetres);
  const nodeSpacing = parameters.wavelengthMetres / 2;
  const antinodeSpacing = parameters.wavelengthMetres / 4;
  const nodePositionsMetres: number[] = [];
  const antinodePositionsMetres: number[] = [];
  for (let x = 0; x <= parameters.lengthMetres + 1e-12; x += nodeSpacing)
    nodePositionsMetres.push(x);
  for (
    let x = antinodeSpacing;
    x <= parameters.lengthMetres + 1e-12;
    x += nodeSpacing
  )
    antinodePositionsMetres.push(x);
  return validWave({
    displacementMetres:
      envelopeAmplitudeMetres *
      Math.cos(angularFrequency * timeSeconds + parameters.phaseRadians),
    envelopeAmplitudeMetres,
    nodePositionsMetres,
    antinodePositionsMetres,
  });
}

export function beatState(
  amplitudeMetres: number,
  firstFrequencyHertz: number,
  secondFrequencyHertz: number,
  timeSeconds: number,
): WaveResult<{
  readonly displacementMetres: number;
  readonly envelopeMetres: number;
  readonly beatFrequencyHertz: number;
}> {
  const issues = finiteWaveInputs({
    amplitudeMetres,
    firstFrequencyHertz,
    secondFrequencyHertz,
    timeSeconds,
  });
  if (
    amplitudeMetres < 0 ||
    firstFrequencyHertz <= 0 ||
    secondFrequencyHertz <= 0
  )
    issues.push(
      waveIssue(
        "waves.invalid-beat",
        "Amplitude must be non-negative and frequencies must be positive.",
      ),
    );
  if (issues.length > 0) return invalidWave(...issues);
  const average = (firstFrequencyHertz + secondFrequencyHertz) / 2;
  const difference = firstFrequencyHertz - secondFrequencyHertz;
  return validWave({
    displacementMetres:
      2 *
      amplitudeMetres *
      Math.cos(Math.PI * difference * timeSeconds) *
      Math.sin(2 * Math.PI * average * timeSeconds),
    envelopeMetres:
      2 *
      amplitudeMetres *
      Math.abs(Math.cos(Math.PI * difference * timeSeconds)),
    beatFrequencyHertz: Math.abs(difference),
  });
}
