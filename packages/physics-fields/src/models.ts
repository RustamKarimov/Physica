import {
  invalidModel,
  validModel,
  type PhysicalModelContract,
} from "@physica/physics-core";
import { SOLVER_DESCRIPTOR } from "@physica/solver-ode";
import { sinusoidalSignal } from "./ac";
import {
  advanceChargedParticleInUniformElectricField,
  type ChargedParticleState,
} from "./electric";
import { type Vec3 } from "./types";

export interface UniformElectricParticleParameters {
  readonly chargeCoulombs: number;
  readonly massKilograms: number;
  readonly fieldNewtonsPerCoulomb: Vec3;
  readonly initialState: ChargedParticleState;
}

export const chargedParticleFieldModel: PhysicalModelContract<
  UniformElectricParticleParameters,
  ChargedParticleState,
  ChargedParticleState
> = {
  provenance: {
    modelId: "physica:model/charged-particle-uniform-electric-field-v1",
    version: "1.0.0",
    category: "numerical",
    deterministic: true,
    assumptions: [
      "uniform electrostatic field",
      "non-relativistic particle",
      "no radiation loss",
    ],
    validityConditions: ["positive particle mass", "finite field and state"],
    approximationLevel: "educational",
    curriculumTags: ["cambridge-9702-topic-18"],
    referenceNotes: [
      "Newton's second law with F=qE, integrated through the Physica ODE adapter.",
    ],
  },
  stateChannels: ["charged-particle.position", "charged-particle.velocity"],
  observableIds: ["electric-field.particle-state"],
  solverPolicy: {
    solverTypeId: SOLVER_DESCRIPTOR.solverTypeId,
    recommendedMethod: "RK4",
    absoluteTolerance: 1e-10,
    relativeTolerance: 1e-8,
  },
  validateParameters(parameters) {
    return parameters.massKilograms > 0 &&
      Number.isFinite(parameters.chargeCoulombs) &&
      Object.values(parameters.fieldNewtonsPerCoulomb).every(Number.isFinite)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "electric-field.invalid-particle-model",
          message: "Particle mass must be positive and all parameters finite.",
        });
  },
  createInitialState(parameters) {
    return parameters.initialState;
  },
  step(state, parameters, context) {
    const result = advanceChargedParticleInUniformElectricField(
      state,
      parameters.chargeCoulombs,
      parameters.massKilograms,
      parameters.fieldNewtonsPerCoulomb,
      context.deltaSeconds,
    );
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
    return Object.values(state.positionMetres).every(Number.isFinite) &&
      Object.values(state.velocityMetresPerSecond).every(Number.isFinite)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "electric-field.invalid-particle-state",
          message: "Particle state must remain finite.",
        });
  },
};

export interface AcSourceParameters {
  readonly peakVolts: number;
  readonly frequencyHertz: number;
  readonly phaseRadians: number;
}

export interface AcSourceState {
  readonly timeSeconds: number;
  readonly instantaneousVolts: number;
  readonly rmsVolts: number;
}

export const acSourceModel: PhysicalModelContract<
  AcSourceParameters,
  AcSourceState,
  AcSourceState
> = {
  provenance: {
    modelId: "physica:model/sinusoidal-voltage-source-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: ["ideal sinusoidal source"],
    validityConditions: ["positive frequency", "finite peak and phase"],
    approximationLevel: "exact",
    curriculumTags: ["cambridge-9702-topic-21"],
    referenceNotes: ["V(t)=V_peak sin(2 pi f t + phase)."],
  },
  stateChannels: ["ac-source.signal"],
  observableIds: ["ac.instantaneous-voltage", "ac.rms-voltage", "ac.frequency"],
  solverPolicy: {
    solverTypeId: "physica:solver/analytical-v1",
    recommendedMethod: "closed-form sinusoid",
  },
  validateParameters(parameters) {
    const result = sinusoidalSignal(
      parameters.peakVolts,
      parameters.frequencyHertz,
      0,
      parameters.phaseRadians,
    );
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
    const result = sinusoidalSignal(
      parameters.peakVolts,
      parameters.frequencyHertz,
      timeSeconds,
      parameters.phaseRadians,
    );
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return {
      timeSeconds,
      instantaneousVolts: result.value.instantaneous,
      rmsVolts: result.value.rms,
    };
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
          code: "ac.invalid-source-state",
          message: "AC source state must be finite.",
        });
  },
};
