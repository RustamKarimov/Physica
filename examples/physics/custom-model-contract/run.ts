import {
  PhysicalModelRuntime,
  validModel,
  type PhysicalModelContract,
} from "@physica/physics-core";
export function runExample() {
  const contract: PhysicalModelContract<
    { speed: number },
    { x: number },
    { x: number },
    null
  > = {
    provenance: {
      modelId: "example:constant-speed",
      version: "1",
      category: "analytical",
      deterministic: true,
      assumptions: ["constant speed"],
      validityConditions: ["speed is finite"],
      approximationLevel: "exact",
      curriculumTags: ["kinematics"],
      referenceNotes: ["x = vt"],
    },
    stateChannels: ["position"],
    observableIds: ["position"],
    solverPolicy: {
      solverTypeId: "physica:solver/analytical-v1",
      recommendedMethod: "exact",
    },
    validateParameters: () => validModel(),
    createInitialState: () => ({ x: 0 }),
    evaluate: (p, t) => ({ x: p.speed * t }),
    emitEvents: (_a, _b, c) =>
      c.timeSeconds >= 2
        ? [
            {
              timestampSeconds: c.timeSeconds,
              priority: 0,
              sequenceId: 0,
              eventType: "example:reached-two-seconds",
              payload: null,
            },
          ]
        : [],
    computeObservables: (s) => ({ x: s.x }),
    validateState: () => validModel(),
  };
  const created = PhysicalModelRuntime.initialize(contract, { speed: 3 });
  if (!created.ok) throw new Error(created.error.kind);
  const advanced = created.value.advanceTo(2);
  if (!advanced.ok) throw new Error(advanced.error.kind);
  return {
    modelId: contract.provenance.modelId,
    position: advanced.value.observables.x,
    event: advanced.value.events[0]?.eventType ?? null,
    resetPosition: created.value.reset().observables.x,
  };
}
