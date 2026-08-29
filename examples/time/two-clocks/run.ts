import { DeterministicIdFactory } from "@physica/core-model";
import { ClockRuntime, createDefaultClockDefinitions } from "@physica/clocks";

export function runTwoClocks() {
  const definitions = createDefaultClockDefinitions(
    new DeterministicIdFactory(7000),
    false,
  );
  const originalDefinitions = JSON.stringify(definitions);
  const runtime = new ClockRuntime(definitions);
  const simulation = definitions[0].id;
  const presentation = definitions[1].id;
  if (!runtime.advance(2).ok) throw new Error("Clock advance failed.");
  const beforePause = {
    simulation: runtime.getState(simulation)!.timeSeconds,
    presentation: runtime.getState(presentation)!.timeSeconds,
  };
  if (
    !runtime.applyControl({ kind: "pause", clockId: simulation }).ok ||
    !runtime.advance(3).ok
  )
    throw new Error("Clock pause failed.");
  const whilePaused = {
    simulation: runtime.getState(simulation)!.timeSeconds,
    presentation: runtime.getState(presentation)!.timeSeconds,
  };
  if (
    !runtime.applyControl({
      kind: "scrub",
      clockId: simulation,
      timeSeconds: 10,
    }).ok
  )
    throw new Error("Clock scrub failed.");
  const afterScrub = {
    simulation: runtime.getState(simulation)!.timeSeconds,
    presentation: runtime.getState(presentation)!.timeSeconds,
  };
  return {
    beforePause,
    whilePaused,
    afterScrub,
    documentDefinitionsUnchanged:
      JSON.stringify(definitions) === originalDefinitions,
  };
}
