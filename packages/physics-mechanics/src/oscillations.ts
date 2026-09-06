import { rk4 } from "@physica/solver-ode";
import {
  invalid,
  mechanicsIssue,
  valid,
  validateFinite,
  type MechanicsResult,
} from "./types";

export interface ShmParameters {
  readonly amplitudeMetres: number;
  readonly angularFrequencyRadiansPerSecond: number;
  readonly phaseRadians: number;
  readonly massKilograms: number;
}

export interface ShmState {
  readonly timeSeconds: number;
  readonly phaseRadians: number;
  readonly displacementMetres: number;
  readonly velocityMetresPerSecond: number;
  readonly accelerationMetresPerSecondSquared: number;
  readonly forceNewtons: number;
  readonly springConstantNewtonsPerMetre: number;
  readonly periodSeconds: number;
  readonly kineticEnergyJoules: number;
  readonly potentialEnergyJoules: number;
  readonly totalEnergyJoules: number;
}

function validateShm(
  parameters: ShmParameters,
  timeSeconds: number,
): MechanicsResult<void> {
  const issues = validateFinite({ ...parameters, timeSeconds });
  if (issues.length > 0) return invalid(...issues);
  if (
    parameters.amplitudeMetres < 0 ||
    parameters.angularFrequencyRadiansPerSecond <= 0 ||
    parameters.massKilograms <= 0 ||
    timeSeconds < 0
  )
    return invalid(
      mechanicsIssue(
        "oscillation.invalid-shm",
        "SHM needs non-negative amplitude and time plus positive angular frequency and mass.",
      ),
    );
  return valid(undefined);
}

export function evaluateShm(
  parameters: ShmParameters,
  timeSeconds: number,
): MechanicsResult<ShmState> {
  const validation = validateShm(parameters, timeSeconds);
  if (!validation.ok) return validation;
  const omega = parameters.angularFrequencyRadiansPerSecond;
  const phaseRadians = omega * timeSeconds + parameters.phaseRadians;
  const displacementMetres =
    parameters.amplitudeMetres * Math.cos(phaseRadians);
  const velocityMetresPerSecond =
    -parameters.amplitudeMetres * omega * Math.sin(phaseRadians);
  const accelerationMetresPerSecondSquared =
    -omega * omega * displacementMetres;
  const springConstantNewtonsPerMetre =
    parameters.massKilograms * omega * omega;
  const forceNewtons =
    parameters.massKilograms * accelerationMetresPerSecondSquared;
  const kineticEnergyJoules =
    0.5 * parameters.massKilograms * velocityMetresPerSecond ** 2;
  const potentialEnergyJoules =
    0.5 * springConstantNewtonsPerMetre * displacementMetres ** 2;
  return valid({
    timeSeconds,
    phaseRadians,
    displacementMetres,
    velocityMetresPerSecond,
    accelerationMetresPerSecondSquared,
    forceNewtons,
    springConstantNewtonsPerMetre,
    periodSeconds: (2 * Math.PI) / omega,
    kineticEnergyJoules,
    potentialEnergyJoules,
    totalEnergyJoules: kineticEnergyJoules + potentialEnergyJoules,
  });
}

export function sampleShm(
  parameters: ShmParameters,
  durationSeconds: number,
  sampleCount: number,
): MechanicsResult<readonly ShmState[]> {
  const issues = validateFinite({ durationSeconds, sampleCount });
  if (
    issues.length > 0 ||
    durationSeconds <= 0 ||
    !Number.isSafeInteger(sampleCount) ||
    sampleCount < 2 ||
    sampleCount > 4096
  )
    return invalid(
      ...issues,
      mechanicsIssue(
        "oscillation.invalid-sampling",
        "SHM sampling requires positive duration and 2–4096 integer samples.",
      ),
    );
  const samples: ShmState[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const state = evaluateShm(
      parameters,
      (durationSeconds * index) / (sampleCount - 1),
    );
    if (!state.ok) return state;
    samples.push(state.value);
  }
  return valid(samples);
}

export interface PendulumParameters {
  readonly lengthMetres: number;
  readonly angularAmplitudeRadians: number;
  readonly gravitationalAccelerationMetresPerSecondSquared: number;
  readonly massKilograms: number;
  readonly phaseRadians?: number;
}

export interface PendulumState {
  readonly timeSeconds: number;
  readonly angleRadians: number;
  readonly angularVelocityRadiansPerSecond: number;
  readonly arcDisplacementMetres: number;
  readonly periodSeconds: number;
  readonly angularFrequencyRadiansPerSecond: number;
  readonly kineticEnergyJoules: number;
  readonly smallAnglePotentialEnergyJoules: number;
  readonly modelDisclosure: string;
}

export function evaluateSmallAnglePendulum(
  parameters: PendulumParameters,
  timeSeconds: number,
): MechanicsResult<PendulumState> {
  const phase = parameters.phaseRadians ?? 0;
  const issues = validateFinite({ ...parameters, phase, timeSeconds });
  if (issues.length > 0) return invalid(...issues);
  if (
    parameters.lengthMetres <= 0 ||
    parameters.massKilograms <= 0 ||
    parameters.gravitationalAccelerationMetresPerSecondSquared <= 0 ||
    Math.abs(parameters.angularAmplitudeRadians) > 0.35 ||
    timeSeconds < 0
  )
    return invalid(
      mechanicsIssue(
        "oscillation.invalid-small-angle-pendulum",
        "Pendulum needs positive length, mass and gravity, non-negative time, and angular amplitude no greater than 0.35 rad.",
      ),
    );
  const omega = Math.sqrt(
    parameters.gravitationalAccelerationMetresPerSecondSquared /
      parameters.lengthMetres,
  );
  const argument = omega * timeSeconds + phase;
  const angleRadians = parameters.angularAmplitudeRadians * Math.cos(argument);
  const angularVelocityRadiansPerSecond =
    -parameters.angularAmplitudeRadians * omega * Math.sin(argument);
  const speed = parameters.lengthMetres * angularVelocityRadiansPerSecond;
  const kineticEnergyJoules = 0.5 * parameters.massKilograms * speed ** 2;
  const smallAnglePotentialEnergyJoules =
    0.5 *
    parameters.massKilograms *
    parameters.gravitationalAccelerationMetresPerSecondSquared *
    parameters.lengthMetres *
    angleRadians ** 2;
  return valid({
    timeSeconds,
    angleRadians,
    angularVelocityRadiansPerSecond,
    arcDisplacementMetres: parameters.lengthMetres * angleRadians,
    periodSeconds: (2 * Math.PI) / omega,
    angularFrequencyRadiansPerSecond: omega,
    kineticEnergyJoules,
    smallAnglePotentialEnergyJoules,
    modelDisclosure:
      "Small-angle pendulum using sin(theta) approximately theta; |amplitude| <= 0.35 rad.",
  });
}

export interface DrivenOscillatorParameters {
  readonly massKilograms: number;
  readonly springConstantNewtonsPerMetre: number;
  readonly dampingKilogramsPerSecond: number;
  readonly driveForceAmplitudeNewtons: number;
  readonly driveAngularFrequencyRadiansPerSecond: number;
}

export interface OscillatorTransientState {
  readonly timeSeconds: number;
  readonly displacementMetres: number;
  readonly velocityMetresPerSecond: number;
}

export interface OscillatorTransientFrame extends OscillatorTransientState {
  readonly accelerationMetresPerSecondSquared: number;
  readonly restoringForceNewtons: number;
  readonly dampingForceNewtons: number;
  readonly drivingForceNewtons: number;
  readonly kineticEnergyJoules: number;
  readonly potentialEnergyJoules: number;
  readonly mechanicalEnergyJoules: number;
  readonly dissipatedPowerWatts: number;
}

function validateDriven(
  parameters: DrivenOscillatorParameters,
): MechanicsResult<void> {
  const issues = validateFinite({ ...parameters });
  if (issues.length > 0) return invalid(...issues);
  if (
    parameters.massKilograms <= 0 ||
    parameters.springConstantNewtonsPerMetre <= 0 ||
    parameters.dampingKilogramsPerSecond < 0 ||
    parameters.driveAngularFrequencyRadiansPerSecond < 0
  )
    return invalid(
      mechanicsIssue(
        "oscillation.invalid-driven-parameters",
        "Driven oscillation needs positive mass and stiffness plus non-negative damping and drive frequency.",
      ),
    );
  return valid(undefined);
}

function transientFrame(
  state: OscillatorTransientState,
  parameters: DrivenOscillatorParameters,
): OscillatorTransientFrame {
  const restoringForceNewtons =
    -parameters.springConstantNewtonsPerMetre * state.displacementMetres;
  const dampingForceNewtons =
    -parameters.dampingKilogramsPerSecond * state.velocityMetresPerSecond;
  const drivingForceNewtons =
    parameters.driveForceAmplitudeNewtons *
    Math.cos(
      parameters.driveAngularFrequencyRadiansPerSecond * state.timeSeconds,
    );
  const accelerationMetresPerSecondSquared =
    (restoringForceNewtons + dampingForceNewtons + drivingForceNewtons) /
    parameters.massKilograms;
  const kineticEnergyJoules =
    0.5 * parameters.massKilograms * state.velocityMetresPerSecond ** 2;
  const potentialEnergyJoules =
    0.5 *
    parameters.springConstantNewtonsPerMetre *
    state.displacementMetres ** 2;
  return {
    ...state,
    accelerationMetresPerSecondSquared,
    restoringForceNewtons,
    dampingForceNewtons,
    drivingForceNewtons,
    kineticEnergyJoules,
    potentialEnergyJoules,
    mechanicalEnergyJoules: kineticEnergyJoules + potentialEnergyJoules,
    dissipatedPowerWatts:
      parameters.dampingKilogramsPerSecond * state.velocityMetresPerSecond ** 2,
  };
}

export function evaluateDrivenOscillatorFrame(
  state: OscillatorTransientState,
  parameters: DrivenOscillatorParameters,
): MechanicsResult<OscillatorTransientFrame> {
  const validation = validateDriven(parameters);
  if (!validation.ok) return validation;
  const issues = validateFinite({ ...state });
  if (issues.length > 0 || state.timeSeconds < 0)
    return invalid(
      ...issues,
      mechanicsIssue(
        "oscillation.invalid-transient-state",
        "Oscillator transient state must be finite with non-negative time.",
      ),
    );
  return valid(transientFrame(state, parameters));
}

export function stepDrivenOscillator(
  state: OscillatorTransientState,
  parameters: DrivenOscillatorParameters,
  deltaSeconds: number,
): MechanicsResult<OscillatorTransientFrame> {
  const validation = validateDriven(parameters);
  if (!validation.ok) return validation;
  const issues = validateFinite({ ...state, deltaSeconds });
  if (issues.length > 0 || state.timeSeconds < 0 || deltaSeconds <= 0)
    return invalid(
      ...issues,
      mechanicsIssue(
        "oscillation.invalid-transient-step",
        "Oscillator state time must be non-negative and step must be positive.",
      ),
    );
  const result = rk4(
    (time, vector) => {
      const displacement = vector[0]!;
      const velocity = vector[1]!;
      return [
        velocity,
        (parameters.driveForceAmplitudeNewtons *
          Math.cos(parameters.driveAngularFrequencyRadiansPerSecond * time) -
          parameters.dampingKilogramsPerSecond * velocity -
          parameters.springConstantNewtonsPerMetre * displacement) /
          parameters.massKilograms,
      ];
    },
    [state.displacementMetres, state.velocityMetresPerSecond],
    state.timeSeconds,
    deltaSeconds,
  );
  return valid(
    transientFrame(
      {
        timeSeconds: result.timeSeconds,
        displacementMetres: result.state[0]!,
        velocityMetresPerSecond: result.state[1]!,
      },
      parameters,
    ),
  );
}

export interface DrivenSteadyResponse {
  readonly drivingAngularFrequencyRadiansPerSecond: number;
  readonly amplitudeMetres: number;
  readonly phaseLagRadians: number;
  readonly naturalAngularFrequencyRadiansPerSecond: number;
  readonly dampingRatio: number;
}

export function drivenSteadyResponse(
  parameters: DrivenOscillatorParameters,
): MechanicsResult<DrivenSteadyResponse> {
  const validation = validateDriven(parameters);
  if (!validation.ok) return validation;
  const omega = parameters.driveAngularFrequencyRadiansPerSecond;
  const stiffnessDifference =
    parameters.springConstantNewtonsPerMetre -
    parameters.massKilograms * omega * omega;
  const dampingTerm = parameters.dampingKilogramsPerSecond * omega;
  const denominator = Math.hypot(stiffnessDifference, dampingTerm);
  if (denominator === 0)
    return invalid(
      mechanicsIssue(
        "oscillation.singular-undamped-resonance",
        "An ideal undamped oscillator has no finite steady amplitude exactly at resonance.",
      ),
    );
  return valid({
    drivingAngularFrequencyRadiansPerSecond: omega,
    amplitudeMetres:
      Math.abs(parameters.driveForceAmplitudeNewtons) / denominator,
    phaseLagRadians: Math.atan2(dampingTerm, stiffnessDifference),
    naturalAngularFrequencyRadiansPerSecond: Math.sqrt(
      parameters.springConstantNewtonsPerMetre / parameters.massKilograms,
    ),
    dampingRatio:
      parameters.dampingKilogramsPerSecond /
      (2 *
        Math.sqrt(
          parameters.massKilograms * parameters.springConstantNewtonsPerMetre,
        )),
  });
}

export function resonanceCurve(
  parameters: Omit<
    DrivenOscillatorParameters,
    "driveAngularFrequencyRadiansPerSecond"
  >,
  minimumRadiansPerSecond: number,
  maximumRadiansPerSecond: number,
  sampleCount: number,
): MechanicsResult<readonly DrivenSteadyResponse[]> {
  const issues = validateFinite({
    ...parameters,
    minimumRadiansPerSecond,
    maximumRadiansPerSecond,
    sampleCount,
  });
  if (
    issues.length > 0 ||
    minimumRadiansPerSecond < 0 ||
    maximumRadiansPerSecond <= minimumRadiansPerSecond ||
    !Number.isSafeInteger(sampleCount) ||
    sampleCount < 2 ||
    sampleCount > 4096
  )
    return invalid(
      ...issues,
      mechanicsIssue(
        "oscillation.invalid-resonance-sampling",
        "Resonance sampling requires an increasing non-negative range and 2–4096 samples.",
      ),
    );
  const responses: DrivenSteadyResponse[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const omega =
      minimumRadiansPerSecond +
      ((maximumRadiansPerSecond - minimumRadiansPerSecond) * index) /
        (sampleCount - 1);
    const response = drivenSteadyResponse({
      ...parameters,
      driveAngularFrequencyRadiansPerSecond: omega,
    });
    if (!response.ok) return response;
    responses.push(response.value);
  }
  return valid(responses);
}

export interface NonlinearPendulumState {
  readonly timeSeconds: number;
  readonly angleRadians: number;
  readonly angularVelocityRadiansPerSecond: number;
}

export function stepNonlinearPendulum(
  state: NonlinearPendulumState,
  lengthMetres: number,
  gravitationalAccelerationMetresPerSecondSquared: number,
  deltaSeconds: number,
): MechanicsResult<NonlinearPendulumState> {
  const issues = validateFinite({
    ...state,
    lengthMetres,
    gravitationalAccelerationMetresPerSecondSquared,
    deltaSeconds,
  });
  if (
    issues.length > 0 ||
    state.timeSeconds < 0 ||
    lengthMetres <= 0 ||
    gravitationalAccelerationMetresPerSecondSquared <= 0 ||
    deltaSeconds <= 0
  )
    return invalid(
      ...issues,
      mechanicsIssue(
        "oscillation.invalid-nonlinear-pendulum",
        "Nonlinear pendulum stepping needs positive length, gravity and time step.",
      ),
    );
  const result = rk4(
    (_time, vector) => [
      vector[1]!,
      -(gravitationalAccelerationMetresPerSecondSquared / lengthMetres) *
        Math.sin(vector[0]!),
    ],
    [state.angleRadians, state.angularVelocityRadiansPerSecond],
    state.timeSeconds,
    deltaSeconds,
  );
  return valid({
    timeSeconds: result.timeSeconds,
    angleRadians: result.state[0]!,
    angularVelocityRadiansPerSecond: result.state[1]!,
  });
}

export interface CoupledOscillatorParameters {
  readonly massKilograms: number;
  readonly groundingSpringConstantNewtonsPerMetre: number;
  readonly couplingSpringConstantNewtonsPerMetre: number;
  readonly symmetricAmplitudeMetres: number;
  readonly antisymmetricAmplitudeMetres: number;
}

export interface CoupledOscillatorState {
  readonly timeSeconds: number;
  readonly firstDisplacementMetres: number;
  readonly secondDisplacementMetres: number;
  readonly symmetricAngularFrequencyRadiansPerSecond: number;
  readonly antisymmetricAngularFrequencyRadiansPerSecond: number;
}

export function evaluateCoupledOscillators(
  parameters: CoupledOscillatorParameters,
  timeSeconds: number,
): MechanicsResult<CoupledOscillatorState> {
  const issues = validateFinite({ ...parameters, timeSeconds });
  if (
    issues.length > 0 ||
    parameters.massKilograms <= 0 ||
    parameters.groundingSpringConstantNewtonsPerMetre <= 0 ||
    parameters.couplingSpringConstantNewtonsPerMetre < 0 ||
    timeSeconds < 0
  )
    return invalid(
      ...issues,
      mechanicsIssue(
        "oscillation.invalid-coupled-system",
        "Coupled oscillators need positive mass and grounding stiffness plus non-negative coupling and time.",
      ),
    );
  const symmetricAngularFrequencyRadiansPerSecond = Math.sqrt(
    parameters.groundingSpringConstantNewtonsPerMetre /
      parameters.massKilograms,
  );
  const antisymmetricAngularFrequencyRadiansPerSecond = Math.sqrt(
    (parameters.groundingSpringConstantNewtonsPerMetre +
      2 * parameters.couplingSpringConstantNewtonsPerMetre) /
      parameters.massKilograms,
  );
  const symmetric =
    parameters.symmetricAmplitudeMetres *
    Math.cos(symmetricAngularFrequencyRadiansPerSecond * timeSeconds);
  const antisymmetric =
    parameters.antisymmetricAmplitudeMetres *
    Math.cos(antisymmetricAngularFrequencyRadiansPerSecond * timeSeconds);
  return valid({
    timeSeconds,
    firstDisplacementMetres: symmetric + antisymmetric,
    secondDisplacementMetres: symmetric - antisymmetric,
    symmetricAngularFrequencyRadiansPerSecond,
    antisymmetricAngularFrequencyRadiansPerSecond,
  });
}
