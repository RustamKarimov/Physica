import { scalarGrid1D, stepWaveEquation1D } from "@physica/solver-grid";
export function runExample() {
  const grid = scalarGrid1D([0, 0, 1, 0, 0], 1);
  const result = stepWaveEquation1D(
    { displacement: grid, previous: grid, timeSeconds: 0 },
    1,
    0.5,
    "fixed",
  );
  return {
    timeSeconds: result.state.timeSeconds,
    courantNumber: result.diagnostic.courantNumber,
    values: [...result.state.displacement.values],
    boundary: "fixed",
  };
}
