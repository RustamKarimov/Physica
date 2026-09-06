import {
  invalidModel,
  validModel,
  type PhysicalModelContract,
} from "@physica/physics-core";
import { SOLVER_DESCRIPTOR } from "@physica/solver-circuits";
import {
  rcTransientState,
  type RcTransientParameters,
  type RcTransientState,
} from "./capacitors";
import {
  solveElectricalNetwork,
  type ElectricalNetworkSpec,
  type ElectricalNetworkState,
} from "./circuits";

const dcNetworkContract: PhysicalModelContract<
  ElectricalNetworkSpec,
  ElectricalNetworkState,
  ElectricalNetworkState
> = {
  provenance: Object.freeze({
    modelId: "physica:model/dc-electrical-network-v1",
    version: "1.0.0",
    category: "numerical",
    deterministic: true,
    assumptions: Object.freeze([
      "Lumped steady D.C. components",
      "Ideal wires and ideal measurement probes",
    ]),
    validityConditions: Object.freeze([
      "Declared connected nodes and positive finite resistances",
      "One unique modified-nodal solution",
    ]),
    approximationLevel: "educational",
    curriculumTags: Object.freeze([
      "cambridge-9702-topic-9",
      "cambridge-9702-topic-10",
    ]),
    referenceNotes: Object.freeze([
      "Network state is solved simultaneously by the registered circuit adapter.",
    ]),
  }),
  stateChannels: Object.freeze(["electrical-network-state"]),
  observableIds: Object.freeze([
    "electricity.node-potential",
    "electricity.branch-current",
    "electricity.component-power",
    "electricity.kcl-residual",
    "electricity.kvl-residual",
  ]),
  solverPolicy: Object.freeze({
    solverTypeId: SOLVER_DESCRIPTOR.solverTypeId,
    recommendedMethod: "modified nodal D.C. solve",
  }),
  validateParameters(parameters) {
    const result = solveElectricalNetwork(parameters);
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
    const result = solveElectricalNetwork(parameters);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  evaluate(parameters) {
    const result = solveElectricalNetwork(parameters);
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
    return [
      state.maximumKclResidualAmps,
      state.maximumKvlResidualVolts,
      state.solverResidual,
      ...Object.values(state.nodePotentialsVolts),
      ...Object.values(state.branchCurrentsAmps),
    ].every(Number.isFinite)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "electricity.invalid-network-state",
          message: "Every solved network observable must remain finite.",
        });
  },
};
export const dcElectricalNetworkModel = Object.freeze(dcNetworkContract);

const rcTransientContract: PhysicalModelContract<
  RcTransientParameters,
  RcTransientState,
  RcTransientState
> = {
  provenance: Object.freeze({
    modelId: "physica:model/rc-transient-v1",
    version: "1.0.0",
    category: "analytical",
    deterministic: true,
    assumptions: Object.freeze([
      "Ideal lumped resistor and capacitor",
      "Constant source voltage and capacitance",
    ]),
    validityConditions: Object.freeze([
      "Positive resistance and capacitance",
      "Finite non-negative named-clock time",
    ]),
    approximationLevel: "educational",
    curriculumTags: Object.freeze(["cambridge-9702-topic-19"]),
    referenceNotes: Object.freeze([
      "Exact first-order exponential response at externally supplied time.",
    ]),
  }),
  stateChannels: Object.freeze(["capacitor-charge"]),
  observableIds: Object.freeze([
    "electricity.capacitor-voltage",
    "electricity.capacitor-charge",
    "electricity.rc-current",
    "electricity.capacitor-energy",
  ]),
  solverPolicy: Object.freeze({
    solverTypeId: SOLVER_DESCRIPTOR.solverTypeId,
    recommendedMethod: "exact analytical RC transient",
  }),
  validateParameters(parameters) {
    const result = rcTransientState(parameters, 0);
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
    const result = rcTransientState(parameters, 0);
    if (!result.ok) throw new RangeError(result.issues[0]?.message);
    return result.value;
  },
  evaluate(parameters, timeSeconds) {
    const result = rcTransientState(parameters, timeSeconds);
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
    return [
      state.timeSeconds,
      state.timeConstantSeconds,
      state.voltageVolts,
      state.chargeCoulombs,
      state.currentAmps,
      state.energyJoules,
    ].every(Number.isFinite)
      ? validModel()
      : invalidModel({
          severity: "error",
          code: "electricity.invalid-rc-state",
          message: "Every RC transient observable must remain finite.",
        });
  },
};
export const rcTransientModel = Object.freeze(rcTransientContract);
