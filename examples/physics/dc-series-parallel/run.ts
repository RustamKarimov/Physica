import { solveDcCircuit } from "@physica/solver-circuits";
export function runExample() {
  const result = solveDcCircuit({
    groundNode: "ground",
    resistors: [
      { id: "series", nodeA: "supply", nodeB: "junction", resistanceOhms: 100 },
      {
        id: "branch-a",
        nodeA: "junction",
        nodeB: "ground",
        resistanceOhms: 200,
      },
      {
        id: "branch-b",
        nodeA: "junction",
        nodeB: "ground",
        resistanceOhms: 200,
      },
    ],
    voltageSources: [
      {
        id: "battery",
        positiveNode: "supply",
        negativeNode: "ground",
        voltageVolts: 12,
      },
    ],
  });
  return {
    nodeVoltages: result.nodeVoltages,
    resistorCurrents: result.resistorCurrents,
    kirchhoffResidual: result.residual,
  };
}
