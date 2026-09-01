import { constantAcceleration1D } from "@physica/solver-analytical";
export function runExample() {
  return {
    model: "constant-acceleration",
    timeSeconds: 2,
    ...constantAcceleration1D(1, 4, -2, 2),
  };
}
