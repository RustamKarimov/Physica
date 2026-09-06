import {
  invalidModel,
  validModel,
  type PhysicalModelContract,
} from "@physica/physics-core";
import { SOLVER_DESCRIPTOR } from "@physica/solver-ode";
import {
  evaluateShm,
  stepDrivenOscillator,
  type DrivenOscillatorParameters,
  type OscillatorTransientFrame,
  type OscillatorTransientState,
  type ShmParameters,
  type ShmState,
} from "./oscillations";

export const shmOscillatorModel: PhysicalModelContract<
  ShmParameters,
  ShmState,
  ShmState
> = {
  provenance: {
    modelId: "physica:model/shm-oscillator-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: ["linear restoring force", "constant mass", "no damping"],
    validityConditions: [
      "non-negative amplitude and time",
      "positive mass and angular frequency",
    ],
    approximationLevel: "exact",
    curriculumTags: ["cambridge-9702-topic-17"],
    referenceNotes: [
      "Closed-form SHM with position and every derivative evaluated at one absolute time.",
    ],
  },
  stateChannels: ["oscillator.position", "oscillator.velocity"],
  observableIds: [
    "oscillator.displacement",
    "oscillator.velocity",
    "oscillator.acceleration",
    "oscillator.force",
    "oscillator.kinetic-energy",
    "oscillator.potential-energy",
  ],
  solverPolicy: {
    solverTypeId: "physica:solver/analytical-v1",
    recommendedMethod: "closed-form harmonic evaluation",
  },
  validateParameters(parameters) {
    const result = evaluateShm(parameters, 0);
    return result.ok
      ? validModel()
      : invalidModel(
          ...result.issues.map((issue) => ({
            severity: issue.severity,
            code: issue.code,
            message: issue.message,
            ...(issue.path === undefined ? {} : { path: issue.path }),
          })),
        );
  },
  createInitialState(parameters) {
    return this.evaluate!(parameters, 0);
  },
  evaluate(parameters, timeSeconds) {
    const result = evaluateShm(parameters, timeSeconds);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  emitEvents() {
    return [];
  },
  computeObservables(state) {
    return state;
  },
  validateState(state) {
    return Object.values(state).every(Number.isFinite)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "oscillation.invalid-shm-state",
          message: "SHM state must remain finite.",
        });
  },
};

export interface DrivenModelParameters extends DrivenOscillatorParameters {
  readonly initialDisplacementMetres: number;
  readonly initialVelocityMetresPerSecond: number;
}

function observables(
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
  const kineticEnergyJoules =
    0.5 * parameters.massKilograms * state.velocityMetresPerSecond ** 2;
  const potentialEnergyJoules =
    0.5 *
    parameters.springConstantNewtonsPerMetre *
    state.displacementMetres ** 2;
  return {
    ...state,
    accelerationMetresPerSecondSquared:
      (restoringForceNewtons + dampingForceNewtons + drivingForceNewtons) /
      parameters.massKilograms,
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

export const drivenOscillatorModel: PhysicalModelContract<
  DrivenModelParameters,
  OscillatorTransientState,
  OscillatorTransientFrame
> = {
  provenance: {
    modelId: "physica:model/driven-damped-oscillator-v1",
    version: "1.0.0",
    category: "numerical",
    deterministic: true,
    assumptions: [
      "linear spring",
      "viscous damping",
      "sinusoidal external drive",
    ],
    validityConditions: [
      "positive mass and stiffness",
      "non-negative damping and drive frequency",
      "fixed positive numerical steps",
    ],
    approximationLevel: "numerical",
    curriculumTags: ["cambridge-9702-topic-17"],
    referenceNotes: [
      "State [x,v] integrated by the Physica ODE adapter under mx''+cx'+kx=F0 cos(omega t).",
    ],
  },
  stateChannels: ["driven-oscillator.position", "driven-oscillator.velocity"],
  observableIds: [
    "oscillator.displacement",
    "oscillator.velocity",
    "oscillator.acceleration",
    "oscillator.energy",
    "oscillator.dissipated-power",
    "oscillator.driving-force",
  ],
  solverPolicy: {
    solverTypeId: SOLVER_DESCRIPTOR.solverTypeId,
    recommendedMethod: "fixed-step RK4",
    absoluteTolerance: 1e-9,
    relativeTolerance: 1e-7,
  },
  validateParameters(parameters) {
    if (
      !Object.values(parameters).every(Number.isFinite) ||
      parameters.massKilograms <= 0 ||
      parameters.springConstantNewtonsPerMetre <= 0 ||
      parameters.dampingKilogramsPerSecond < 0 ||
      parameters.driveAngularFrequencyRadiansPerSecond < 0
    )
      return invalidModel({
        severity: "error",
        code: "oscillation.invalid-driven-model",
        message:
          "Driven model needs finite values, positive mass/stiffness and non-negative damping/frequency.",
      });
    return validModel();
  },
  createInitialState(parameters) {
    return {
      timeSeconds: 0,
      displacementMetres: parameters.initialDisplacementMetres,
      velocityMetresPerSecond: parameters.initialVelocityMetresPerSecond,
    };
  },
  step(state, parameters, context) {
    if (context.deltaSeconds === 0) return state;
    const result = stepDrivenOscillator(
      state,
      parameters,
      context.deltaSeconds,
    );
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return {
      timeSeconds: result.value.timeSeconds,
      displacementMetres: result.value.displacementMetres,
      velocityMetresPerSecond: result.value.velocityMetresPerSecond,
    };
  },
  emitEvents() {
    return [];
  },
  computeObservables(state, parameters) {
    return observables(state, parameters);
  },
  validateState(state) {
    return Object.values(state).every(Number.isFinite) && state.timeSeconds >= 0
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "oscillation.invalid-transient-state",
          message:
            "Driven oscillator state must remain finite with non-negative time.",
        });
  },
};
