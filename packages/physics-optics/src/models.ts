import {
  invalidModel,
  validModel,
  type PhysicalModelContract,
} from "@physica/physics-core";
import { SOLVER_DESCRIPTOR } from "@physica/solver-analytical";
import {
  doubleSlitIntensity,
  type DoubleSlitParameters,
  type DoubleSlitState,
} from "./diffraction";

export interface DoubleSlitModelParameters extends DoubleSlitParameters {
  readonly probePositionMetres: number;
}

const doubleSlitContract: PhysicalModelContract<
  DoubleSlitModelParameters,
  DoubleSlitState,
  DoubleSlitState
> = {
  provenance: Object.freeze({
    modelId: "physica:model/double-slit-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: Object.freeze([
      "Coherent monochromatic scalar sources",
      "Fraunhofer far field",
      "Ideal identical rectangular slits",
    ]),
    validityConditions: Object.freeze([
      "Positive distances and wavelength",
      "Slit separation exceeds slit width",
    ]),
    approximationLevel: "educational",
    curriculumTags: Object.freeze(["cambridge-9702-topic-8"]),
    referenceNotes: Object.freeze([
      "Finite-slit sinc-squared envelope multiplied by two-source cosine-squared interference.",
    ]),
  }),
  stateChannels: Object.freeze(["optical-intensity"]),
  observableIds: Object.freeze([
    "optics.screen-intensity",
    "optics.path-difference",
    "optics.phase-difference",
    "optics.fringe-spacing",
  ]),
  solverPolicy: Object.freeze({
    solverTypeId: SOLVER_DESCRIPTOR.solverTypeId,
    recommendedMethod: "Fraunhofer aperture intensity",
  }),
  validateParameters(parameters) {
    const result = doubleSlitIntensity(
      parameters,
      parameters.probePositionMetres,
    );
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
    const result = doubleSlitIntensity(
      parameters,
      parameters.probePositionMetres,
    );
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  evaluate(parameters) {
    const result = doubleSlitIntensity(
      parameters,
      parameters.probePositionMetres,
    );
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
    return Number.isFinite(state.intensity) &&
      state.normalizedIntensity >= 0 &&
      state.normalizedIntensity <= 1 + 1e-12
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "optics.invalid-state",
          message:
            "Double-slit intensity state must remain finite and normalized.",
        });
  },
};
export const doubleSlitModel = Object.freeze(doubleSlitContract);
