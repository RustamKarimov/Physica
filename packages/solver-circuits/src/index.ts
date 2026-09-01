import { solveLinearSystem } from "@physica/solver-algebraic";
import type { SolverAdapterDescriptor } from "@physica/physics-core";
export const SOLVER_DESCRIPTOR: SolverAdapterDescriptor = Object.freeze({
  solverTypeId: "physica:solver/circuits-v1",
  supportedStateTypes: ["circuit-graph", "transient-state"],
  supportedDimensions: [1],
  determinismPolicy: "strict",
  checkpointCapability: "snapshot",
  workerCapability: "worker-compatible",
  precisionPolicy: "pivoted solve with residual",
  inputSchema: "physica:circuit-graph-v1",
  outputSchema: "physica:circuit-solution-v1",
});
export interface Resistor {
  readonly id: string;
  readonly nodeA: string;
  readonly nodeB: string;
  readonly resistanceOhms: number;
}
export interface CurrentSource {
  readonly id: string;
  readonly fromNode: string;
  readonly toNode: string;
  readonly currentAmps: number;
}
export interface VoltageSource {
  readonly id: string;
  readonly positiveNode: string;
  readonly negativeNode: string;
  readonly voltageVolts: number;
}
export interface DcCircuit {
  readonly groundNode: string;
  readonly resistors: readonly Resistor[];
  readonly currentSources?: readonly CurrentSource[];
  readonly voltageSources?: readonly VoltageSource[];
}
export interface DcSolution {
  readonly nodeVoltages: Readonly<Record<string, number>>;
  readonly resistorCurrents: Readonly<Record<string, number>>;
  readonly sourceCurrents: Readonly<Record<string, number>>;
  readonly residual: number;
}
export function solveDcCircuit(circuit: DcCircuit): DcSolution {
  const voltageSources = circuit.voltageSources ?? [];
  const currentSources = circuit.currentSources ?? [];
  const nodes = [
    ...new Set([
      ...circuit.resistors.flatMap((r) => [r.nodeA, r.nodeB]),
      ...currentSources.flatMap((s) => [s.fromNode, s.toNode]),
      ...voltageSources.flatMap((s) => [s.positiveNode, s.negativeNode]),
    ]),
  ]
    .filter((n) => n !== circuit.groundNode)
    .sort();
  const nodeIndex = new Map(nodes.map((n, i) => [n, i]));
  const size = nodes.length + voltageSources.length;
  if (size === 0) throw new RangeError("Circuit has no solvable nodes.");
  const matrix = Array.from(
    { length: size },
    () => Array(size).fill(0) as number[],
  );
  const rhs = Array(size).fill(0) as number[];
  const idx = (node: string) =>
    node === circuit.groundNode ? undefined : nodeIndex.get(node);
  for (const r of circuit.resistors) {
    if (!Number.isFinite(r.resistanceOhms) || r.resistanceOhms <= 0)
      throw new RangeError("Resistance must be positive.");
    const g = 1 / r.resistanceOhms;
    const a = idx(r.nodeA);
    const b = idx(r.nodeB);
    if (a !== undefined) matrix[a]![a]! += g;
    if (b !== undefined) matrix[b]![b]! += g;
    if (a !== undefined && b !== undefined) {
      matrix[a]![b]! -= g;
      matrix[b]![a]! -= g;
    }
  }
  for (const s of currentSources) {
    if (!Number.isFinite(s.currentAmps))
      throw new RangeError("Source current must be finite.");
    const from = idx(s.fromNode);
    const to = idx(s.toNode);
    if (from !== undefined) rhs[from]! -= s.currentAmps;
    if (to !== undefined) rhs[to]! += s.currentAmps;
  }
  voltageSources.forEach((s, k) => {
    if (!Number.isFinite(s.voltageVolts))
      throw new RangeError("Source voltage must be finite.");
    const row = nodes.length + k;
    const p = idx(s.positiveNode);
    const n = idx(s.negativeNode);
    if (p !== undefined) {
      matrix[p]![row]! += 1;
      matrix[row]![p]! += 1;
    }
    if (n !== undefined) {
      matrix[n]![row]! -= 1;
      matrix[row]![n]! -= 1;
    }
    rhs[row] = s.voltageVolts;
  });
  const solved = solveLinearSystem(matrix, rhs);
  const voltages: Record<string, number> = { [circuit.groundNode]: 0 };
  nodes.forEach((node, i) => (voltages[node] = solved.value[i]!));
  const currents: Record<string, number> = {};
  for (const r of circuit.resistors)
    currents[r.id] =
      (voltages[r.nodeA]! - voltages[r.nodeB]!) / r.resistanceOhms;
  const sourceCurrents: Record<string, number> = {};
  voltageSources.forEach(
    (s, k) => (sourceCurrents[s.id] = solved.value[nodes.length + k]!),
  );
  return Object.freeze({
    nodeVoltages: Object.freeze(voltages),
    resistorCurrents: Object.freeze(currents),
    sourceCurrents: Object.freeze(sourceCurrents),
    residual: solved.diagnostic.residual,
  });
}
export interface RcState {
  readonly timeSeconds: number;
  readonly capacitorVoltage: number;
}
export function stepRcTransient(
  state: RcState,
  sourceVoltage: number,
  resistanceOhms: number,
  capacitanceFarads: number,
  dt: number,
): RcState {
  if (
    ![
      sourceVoltage,
      resistanceOhms,
      capacitanceFarads,
      dt,
      state.capacitorVoltage,
      state.timeSeconds,
    ].every(Number.isFinite) ||
    resistanceOhms <= 0 ||
    capacitanceFarads <= 0 ||
    dt <= 0
  )
    throw new RangeError("RC transient parameters are invalid.");
  const decay = Math.exp(-dt / (resistanceOhms * capacitanceFarads));
  return Object.freeze({
    timeSeconds: state.timeSeconds + dt,
    capacitorVoltage:
      sourceVoltage + (state.capacitorVoltage - sourceVoltage) * decay,
  });
}
