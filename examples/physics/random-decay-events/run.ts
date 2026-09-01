import {
  SeededRandom,
  monteCarlo,
  scheduleExponentialEvents,
} from "@physica/solver-stochastic";
export function runExample() {
  const random = new SeededRandom(9702);
  const events = scheduleExponentialEvents(2, 5, random).map((e) => ({
    sequenceId: e.sequenceId,
    timeSeconds: Number(e.timeSeconds.toFixed(6)),
  }));
  const monteRandom = new SeededRandom(9702);
  const summary = monteCarlo(1000, () => monteRandom.next());
  return {
    events,
    mean: Number(summary.mean.toFixed(6)),
    standardError: Number(summary.standardError.toFixed(6)),
    seed: 9702,
  };
}
