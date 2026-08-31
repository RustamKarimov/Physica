import { DeterministicIdFactory } from "@physica/core-model";
import {
  createEquationModel,
  createEquationMotionPlan,
  createEquationTransform,
  DeterministicSemanticEquationIdFactory,
  evaluateEquationMotion,
  matchEquationNodes,
  parseEquationTransformDefinition,
  toEquationTransformDefinition,
  type EquationResult,
} from "@physica/equations";

function unwrap<T>(result: EquationResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

export function runCancelAndSimplify() {
  const ids = new DeterministicIdFactory(800_000);
  const source = unwrap(
    createEquationModel({
      id: ids.equationId(),
      name: "Unsimplified expression",
      latex: "x+(y-y)",
      idFactory: new DeterministicSemanticEquationIdFactory(810_000),
    }),
  );
  const target = unwrap(
    createEquationModel({
      id: ids.equationId(),
      name: "Simplified expression",
      latex: "x",
      idFactory: new DeterministicSemanticEquationIdFactory(820_000),
    }),
  );
  const transform = unwrap(
    createEquationTransform({
      id: ids.equationId(),
      name: "Cancel and collect",
      source,
      target,
      verification: { kind: "automatic-equivalence" },
      metadata: { gallery: "cancel-and-simplify" },
    }),
  );
  const match = unwrap(matchEquationNodes({ source, target }));
  const pairs = transform.tokenCorrespondence.slice(0, 4);
  const sourceOnly = match.sourceOnly.slice(0, 4);
  const targetOnly = match.targetOnly.slice(0, 1);
  const plan = unwrap(
    createEquationMotionPlan(
      transform,
      {
        coordinateSpace: "preview-px",
        fragments: [
          ...pairs.map((item, index) => ({
            nodeId: item.sourceNodeId,
            x: index * 48,
            y: index < 2 ? 0 : 32,
            width: 32,
            height: 34,
          })),
          ...sourceOnly.map((nodeId, index) => ({
            nodeId,
            x: 220 + index * 38,
            y: index % 2 === 0 ? 0 : 32,
            width: 28,
            height: 34,
          })),
        ],
      },
      {
        coordinateSpace: "preview-px",
        fragments: [
          ...pairs.map((item, index) => ({
            nodeId: item.targetNodeId,
            x: 55 + index * 54,
            y: 18,
            width: 36,
            height: 40,
          })),
          ...targetOnly.map((nodeId) => ({
            nodeId,
            x: 260,
            y: 18,
            width: 36,
            height: 40,
          })),
        ],
      },
    ),
  );
  const start = unwrap(evaluateEquationMotion(plan, 0));
  const middle = unwrap(evaluateEquationMotion(plan, 0.5));
  const end = unwrap(evaluateEquationMotion(plan, 1));
  const reduced = unwrap(
    evaluateEquationMotion(plan, 0.2, { reducedMotion: true }),
  );
  const definition = unwrap(toEquationTransformDefinition(transform));
  const restored = unwrap(parseEquationTransformDefinition(definition));
  const restoredDefinition = unwrap(toEquationTransformDefinition(restored));

  return {
    id: "cancel-and-simplify",
    source: source.source.value,
    target: target.source.value,
    equivalenceStatus: transform.equivalenceStatus,
    verificationMethod: transform.verificationMethod,
    correspondence: {
      matched: transform.tokenCorrespondence.length,
      sourceOnly: match.sourceOnly.length,
      targetOnly: match.targetOnly.length,
      methods: Object.fromEntries(
        [...new Set(transform.tokenCorrespondence.map((item) => item.method))]
          .sort()
          .map((method) => [
            method,
            transform.tokenCorrespondence.filter(
              (item) => item.method === method,
            ).length,
          ]),
      ),
    },
    motion: {
      matched: plan.matched.length,
      exits: plan.exits.length,
      entries: plan.entries.length,
      startExitOpacity: start.fragments.find((item) => item.role === "exit")
        ?.opacity,
      middleExitOpacity: middle.fragments.find((item) => item.role === "exit")
        ?.opacity,
      endExitOpacity: end.fragments.find((item) => item.role === "exit")
        ?.opacity,
      reducedMotionProgress: reduced.progress,
      deterministicScrub:
        JSON.stringify(middle) ===
        JSON.stringify(unwrap(evaluateEquationMotion(plan, 0.5))),
    },
    envelope: {
      typeId: definition.typeId,
      schemaVersion: definition.schemaVersion,
      roundTrip:
        JSON.stringify(restoredDefinition) === JSON.stringify(definition),
    },
  };
}
