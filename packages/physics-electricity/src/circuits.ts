import { solveDcCircuit } from "@physica/solver-circuits";
import {
  electricityIssue,
  invalidElectricity,
  validElectricity,
  type ElectricityResult,
} from "./types";

export interface ResistiveBranchSpec {
  readonly id: string;
  readonly fromNode: string;
  readonly toNode: string;
  readonly resistanceOhms: number;
}
export interface VoltageSourceSpec {
  readonly id: string;
  readonly positiveNode: string;
  readonly negativeNode: string;
  readonly emfVolts: number;
}
export interface ElectricalNetworkSpec {
  readonly nodes: readonly string[];
  readonly groundNode: string;
  readonly branches: readonly ResistiveBranchSpec[];
  readonly sources: readonly VoltageSourceSpec[];
}
export interface ElectricalNetworkState {
  readonly nodePotentialsVolts: Readonly<Record<string, number>>;
  readonly branchCurrentsAmps: Readonly<Record<string, number>>;
  readonly sourceCurrentsAmps: Readonly<Record<string, number>>;
  readonly branchPowerWatts: Readonly<Record<string, number>>;
  readonly maximumKclResidualAmps: number;
  readonly maximumKvlResidualVolts: number;
  readonly solverResidual: number;
  readonly diagnostics: readonly string[];
}

function duplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  return values.find((value) => (seen.has(value) ? true : !seen.add(value)));
}

export function solveElectricalNetwork(
  network: ElectricalNetworkSpec,
): ElectricityResult<ElectricalNetworkState> {
  const issues = [];
  const duplicateNode = duplicate(network.nodes);
  if (duplicateNode)
    issues.push(
      electricityIssue(
        "electricity.duplicate-node",
        `Node ${duplicateNode} is duplicated.`,
        "nodes",
      ),
    );
  if (!network.nodes.includes(network.groundNode))
    issues.push(
      electricityIssue(
        "electricity.missing-ground",
        "The ground node must be declared.",
        "groundNode",
      ),
    );
  const componentIds = [
    ...network.branches.map((branch) => branch.id),
    ...network.sources.map((source) => source.id),
  ];
  const duplicateComponent = duplicate(componentIds);
  if (duplicateComponent)
    issues.push(
      electricityIssue(
        "electricity.duplicate-component",
        `Component ${duplicateComponent} is duplicated.`,
        "components",
      ),
    );
  const nodeSet = new Set(network.nodes);
  for (const branch of network.branches) {
    if (!nodeSet.has(branch.fromNode) || !nodeSet.has(branch.toNode))
      issues.push(
        electricityIssue(
          "electricity.missing-node",
          `Branch ${branch.id} references an undeclared node.`,
          branch.id,
        ),
      );
    if (branch.fromNode === branch.toNode)
      issues.push(
        electricityIssue(
          "electricity.short-circuit",
          `Branch ${branch.id} connects a node to itself.`,
          branch.id,
        ),
      );
    if (!Number.isFinite(branch.resistanceOhms) || branch.resistanceOhms <= 0)
      issues.push(
        electricityIssue(
          "electricity.invalid-resistance",
          `Branch ${branch.id} resistance must be positive and finite.`,
          branch.id,
        ),
      );
  }
  for (const source of network.sources) {
    if (!nodeSet.has(source.positiveNode) || !nodeSet.has(source.negativeNode))
      issues.push(
        electricityIssue(
          "electricity.missing-node",
          `Source ${source.id} references an undeclared node.`,
          source.id,
        ),
      );
    if (source.positiveNode === source.negativeNode)
      issues.push(
        electricityIssue(
          "electricity.short-circuit",
          `Source ${source.id} has identical terminals.`,
          source.id,
        ),
      );
    if (!Number.isFinite(source.emfVolts))
      issues.push(
        electricityIssue(
          "electricity.non-finite",
          `Source ${source.id} emf must be finite.`,
          source.id,
        ),
      );
  }
  if (issues.length > 0) return invalidElectricity(...issues);
  let solved;
  try {
    solved = solveDcCircuit({
      groundNode: network.groundNode,
      resistors: network.branches.map((branch) => ({
        id: branch.id,
        nodeA: branch.fromNode,
        nodeB: branch.toNode,
        resistanceOhms: branch.resistanceOhms,
      })),
      voltageSources: network.sources.map((source) => ({
        id: source.id,
        positiveNode: source.positiveNode,
        negativeNode: source.negativeNode,
        voltageVolts: source.emfVolts,
      })),
    });
  } catch {
    return invalidElectricity(
      electricityIssue(
        "electricity.singular-network",
        "The D.C. network has no unique solution; check open paths, shorts and source constraints.",
      ),
    );
  }
  const branchPowerWatts = Object.fromEntries(
    network.branches.map((branch) => [
      branch.id,
      solved.resistorCurrents[branch.id]! ** 2 * branch.resistanceOhms,
    ]),
  );
  const diagnostics = [
    "Conventional branch current is positive from fromNode to toNode.",
    "Ideal voltmeters do not load the circuit; ideal ammeters observe branch current.",
  ];
  if (
    network.branches.length === 0 ||
    network.sources.every(
      (source) => Math.abs(solved.sourceCurrents[source.id] ?? 0) < 1e-12,
    )
  )
    diagnostics.push(
      "Open-circuit warning: no conductive load path draws current from the source.",
    );
  let maximumKclResidualAmps = 0;
  for (const node of network.nodes.filter((id) => id !== network.groundNode)) {
    let sum = 0;
    for (const branch of network.branches) {
      const current = solved.resistorCurrents[branch.id]!;
      if (branch.fromNode === node) sum += current;
      if (branch.toNode === node) sum -= current;
    }
    for (const source of network.sources) {
      const current = solved.sourceCurrents[source.id]!;
      if (source.positiveNode === node) sum += current;
      if (source.negativeNode === node) sum -= current;
    }
    maximumKclResidualAmps = Math.max(maximumKclResidualAmps, Math.abs(sum));
  }
  let maximumKvlResidualVolts = 0;
  for (const branch of network.branches) {
    const constitutiveResidual =
      solved.nodeVoltages[branch.fromNode]! -
      solved.nodeVoltages[branch.toNode]! -
      solved.resistorCurrents[branch.id]! * branch.resistanceOhms;
    maximumKvlResidualVolts = Math.max(
      maximumKvlResidualVolts,
      Math.abs(constitutiveResidual),
    );
  }
  for (const source of network.sources) {
    maximumKvlResidualVolts = Math.max(
      maximumKvlResidualVolts,
      Math.abs(
        solved.nodeVoltages[source.positiveNode]! -
          solved.nodeVoltages[source.negativeNode]! -
          source.emfVolts,
      ),
    );
  }
  return validElectricity({
    nodePotentialsVolts: solved.nodeVoltages,
    branchCurrentsAmps: solved.resistorCurrents,
    sourceCurrentsAmps: solved.sourceCurrents,
    branchPowerWatts,
    maximumKclResidualAmps,
    maximumKvlResidualVolts,
    solverResidual: solved.residual,
    diagnostics,
  });
}

export interface InternalResistanceState {
  readonly emfVolts: number;
  readonly currentAmps: number;
  readonly terminalPotentialDifferenceVolts: number;
  readonly lostVolts: number;
  readonly loadPowerWatts: number;
  readonly internalPowerWatts: number;
}
export function internalResistanceState(
  emfVolts: number,
  internalResistanceOhms: number,
  loadResistanceOhms: number,
): ElectricityResult<InternalResistanceState> {
  if (
    ![emfVolts, internalResistanceOhms, loadResistanceOhms].every(
      Number.isFinite,
    ) ||
    emfVolts < 0 ||
    internalResistanceOhms < 0 ||
    loadResistanceOhms <= 0
  )
    return invalidElectricity(
      electricityIssue(
        "electricity.invalid-cell",
        "Cell emf and resistances are outside the valid D.C. range.",
      ),
    );
  const currentAmps = emfVolts / (internalResistanceOhms + loadResistanceOhms);
  const lostVolts = currentAmps * internalResistanceOhms;
  const terminalPotentialDifferenceVolts = currentAmps * loadResistanceOhms;
  return validElectricity({
    emfVolts,
    currentAmps,
    terminalPotentialDifferenceVolts,
    lostVolts,
    loadPowerWatts: currentAmps ** 2 * loadResistanceOhms,
    internalPowerWatts: currentAmps ** 2 * internalResistanceOhms,
  });
}

export interface PotentialDividerState {
  readonly sourceVoltageVolts: number;
  readonly upperResistanceOhms: number;
  readonly lowerEffectiveResistanceOhms: number;
  readonly outputVoltageVolts: number;
  readonly currentAmps: number;
}
export function potentialDividerState(
  sourceVoltageVolts: number,
  upperResistanceOhms: number,
  lowerResistanceOhms: number,
  loadResistanceOhms?: number,
): ElectricityResult<PotentialDividerState> {
  if (
    ![sourceVoltageVolts, upperResistanceOhms, lowerResistanceOhms].every(
      Number.isFinite,
    ) ||
    upperResistanceOhms <= 0 ||
    lowerResistanceOhms <= 0 ||
    (loadResistanceOhms !== undefined &&
      (!Number.isFinite(loadResistanceOhms) || loadResistanceOhms <= 0))
  )
    return invalidElectricity(
      electricityIssue(
        "electricity.invalid-divider",
        "Potential-divider values must be finite with positive resistances.",
      ),
    );
  const lowerEffectiveResistanceOhms =
    loadResistanceOhms === undefined
      ? lowerResistanceOhms
      : 1 / (1 / lowerResistanceOhms + 1 / loadResistanceOhms);
  const currentAmps =
    sourceVoltageVolts / (upperResistanceOhms + lowerEffectiveResistanceOhms);
  return validElectricity({
    sourceVoltageVolts,
    upperResistanceOhms,
    lowerEffectiveResistanceOhms,
    outputVoltageVolts: currentAmps * lowerEffectiveResistanceOhms,
    currentAmps,
  });
}

export function measurePotentialDifference(
  state: ElectricalNetworkState,
  positiveNode: string,
  negativeNode: string,
): ElectricityResult<number> {
  const positive = state.nodePotentialsVolts[positiveNode];
  const negative = state.nodePotentialsVolts[negativeNode];
  return positive === undefined || negative === undefined
    ? invalidElectricity(
        electricityIssue(
          "electricity.unknown-meter-node",
          "The voltmeter references an unknown node.",
        ),
      )
    : validElectricity(positive - negative);
}

export function measureBranchCurrent(
  state: ElectricalNetworkState,
  branchId: string,
): ElectricityResult<number> {
  const current = state.branchCurrentsAmps[branchId];
  return current === undefined
    ? invalidElectricity(
        electricityIssue(
          "electricity.unknown-meter-branch",
          "The ammeter references an unknown branch.",
        ),
      )
    : validElectricity(current);
}
