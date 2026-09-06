import {
  invalidModel,
  validModel,
  type PhysicalModelContract,
} from "@physica/physics-core";
import { solveIdealGas, type IdealGasState } from "./gas";
import {
  thermalContactAt,
  type ThermalContactParameters,
  type ThermalContactState,
} from "./temperature";

export const thermalContactModel: PhysicalModelContract<
  ThermalContactParameters,
  ThermalContactState,
  ThermalContactState
> = {
  provenance: {
    modelId: "physica:model/two-body-thermal-contact-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: [
      "lumped bodies",
      "constant heat capacities",
      "constant thermal conductance",
      "isolated two-body system",
    ],
    validityConditions: [
      "non-negative absolute temperatures",
      "positive heat capacities",
      "non-negative conductance",
    ],
    approximationLevel: "educational",
    curriculumTags: ["cambridge-9702-topic-14"],
    referenceNotes: [
      "Closed-form two-body Newton cooling with energy conservation.",
    ],
  },
  stateChannels: [
    "thermal-contact.temperature-a",
    "thermal-contact.temperature-b",
  ],
  observableIds: [
    "thermal.temperature-a",
    "thermal.temperature-b",
    "thermal.equilibrium-temperature",
    "thermal.temperature-difference",
  ],
  solverPolicy: {
    solverTypeId: "physica:solver/analytical-v1",
    recommendedMethod: "closed-form exponential equilibration",
  },
  validateParameters(parameters) {
    const result = thermalContactAt(parameters, 0);
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
    const result = thermalContactAt(parameters, timeSeconds);
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
    return Object.values(state).every(Number.isFinite) &&
      state.bodyATemperatureKelvin >= 0 &&
      state.bodyBTemperatureKelvin >= 0
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "thermal.invalid-contact-state",
          message: "Thermal-contact state must remain finite and absolute.",
        });
  },
};

export interface IdealGasModelParameters {
  readonly volumeCubicMetres: number;
  readonly temperatureKelvin: number;
  readonly amountMoles: number;
}

export const idealGasModel: PhysicalModelContract<
  IdealGasModelParameters,
  IdealGasState,
  IdealGasState
> = {
  provenance: {
    modelId: "physica:model/ideal-gas-state-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: [
      "point particles",
      "negligible intermolecular forces",
      "thermal equilibrium",
    ],
    validityConditions: [
      "positive volume",
      "positive absolute temperature",
      "positive amount",
    ],
    approximationLevel: "exact",
    curriculumTags: ["cambridge-9702-topic-15", "cambridge-9702-topic-16"],
    referenceNotes: ["pV=nRT and mean translational kinetic energy=3kT/2."],
  },
  stateChannels: ["ideal-gas.macroscopic-state"],
  observableIds: [
    "gas.pressure",
    "gas.volume",
    "gas.temperature",
    "gas.mean-kinetic-energy",
  ],
  solverPolicy: {
    solverTypeId: "physica:solver/analytical-v1",
    recommendedMethod: "ideal-gas closed form",
  },
  validateParameters(parameters) {
    const result = solveIdealGas(parameters, "pressurePascals");
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
  evaluate(parameters) {
    const result = solveIdealGas(parameters, "pressurePascals");
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
    return Object.values(state)
      .filter((value): value is number => typeof value === "number")
      .every((value) => Number.isFinite(value) && value > 0)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "thermal.invalid-gas-model-state",
          message:
            "Ideal-gas state quantities must remain finite and positive.",
        });
  },
};
