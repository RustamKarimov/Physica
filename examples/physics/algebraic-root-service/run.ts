import {
  findBracketedRoot,
  solveLinearSystem,
} from "@physica/solver-algebraic";
export function runExample() {
  const root = findBracketedRoot((x) => x * x - 2, 0, 2);
  const linear = solveLinearSystem(
    [
      [2, 1],
      [1, -1],
    ],
    [5, 1],
  );
  return {
    root: Number(root.value.toFixed(10)),
    rootResidual: Number(root.diagnostic.residual.toExponential(4)),
    linear: [...linear.value],
    linearResidual: linear.diagnostic.residual,
  };
}
