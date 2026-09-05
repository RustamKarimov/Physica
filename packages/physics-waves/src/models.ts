import {
  invalidModel,
  validModel,
  type PhysicalModelContract,
} from "@physica/physics-core";
import { SOLVER_DESCRIPTOR } from "@physica/solver-analytical";
import {
  evaluateHarmonicWave,
  type HarmonicWaveParameters,
  type HarmonicWaveState,
} from "./waves";

const harmonicWaveContract: PhysicalModelContract<
  HarmonicWaveParameters,
  HarmonicWaveState,
  HarmonicWaveState
> = {
  provenance: Object.freeze({
    modelId: "physica:model/harmonic-wave-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: Object.freeze([
      "Linear non-dispersive medium",
      "Single scalar displacement component",
    ]),
    validityConditions: Object.freeze([
      "Positive frequency and wavelength",
      "Finite coordinate and named-clock time",
    ]),
    approximationLevel: "educational",
    curriculumTags: Object.freeze(["cambridge-9702-topic-7"]),
    referenceNotes: Object.freeze([
      "y = A sin(kx - omega t + phase); +x direction is direction +1.",
    ]),
  }),
  stateChannels: Object.freeze(["wave-displacement"]),
  observableIds: Object.freeze([
    "waves.displacement",
    "waves.particle-velocity",
    "waves.pattern-speed",
    "waves.phase",
  ]),
  solverPolicy: Object.freeze({
    solverTypeId: SOLVER_DESCRIPTOR.solverTypeId,
    recommendedMethod: "closed-form harmonic wave",
  }),
  validateParameters(parameters) {
    const result = evaluateHarmonicWave(parameters, 0, 0);
    return result.ok
      ? validModel()
      : invalidModel(
          ...result.issues.map((issue) => ({
            severity: "error" as const,
            code: issue.code,
            message: issue.message,
            ...(issue.path === undefined ? {} : { path: issue.path }),
          })),
        );
  },
  createInitialState(parameters) {
    const result = evaluateHarmonicWave(parameters, 0, 0);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  evaluate(parameters, timeSeconds) {
    const result = evaluateHarmonicWave(parameters, 0, timeSeconds);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  emitEvents() {
    return Object.freeze([]);
  },
  computeObservables(state) {
    return state;
  },
  validateState(state) {
    return Number.isFinite(state.displacementMetres) &&
      Number.isFinite(state.particleVelocityMetresPerSecond)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "waves.invalid-state",
          message: "Harmonic-wave state must remain finite.",
        });
  },
};
export const harmonicWaveModel = Object.freeze(harmonicWaveContract);
