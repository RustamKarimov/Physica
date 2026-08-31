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

export function runRearrangement() {
  const ids = new DeterministicIdFactory(600_000);
  const source = unwrap(
    createEquationModel({
      id: ids.equationId(),
      name: "Constant acceleration",
      latex: "v=u+at",
      idFactory: new DeterministicSemanticEquationIdFactory(610_000),
    }),
  );
  const target = unwrap(
    createEquationModel({
      id: ids.equationId(),
      name: "Subtract initial velocity",
      latex: "v-u=at",
      idFactory: new DeterministicSemanticEquationIdFactory(620_000),
    }),
  );
  const transform = unwrap(
    createEquationTransform({
      id: ids.equationId(),
      name: "Move u to the left",
      source,
      target,
      verification: { kind: "automatic-equivalence" },
      metadata: { gallery: "v-u-at-rearrangement" },
    }),
  );
  const match = unwrap(matchEquationNodes({ source, target }));
  const pairs = transform.tokenCorrespondence.slice(0, 6);
  const sourceOnly = match.sourceOnly[0];
  const targetOnly = match.targetOnly[0];
  const plan = unwrap(
    createEquationMotionPlan(
      transform,
      {
        coordinateSpace: "preview-px",
        fragments: [
          ...pairs.map((item, index) => ({
            nodeId: item.sourceNodeId,
            x: index * 54,
            y: index % 2 === 0 ? 0 : 3,
            width: 30,
            height: 40,
          })),
          ...(sourceOnly
            ? [{ nodeId: sourceOnly, x: 340, y: 0, width: 30, height: 40 }]
            : []),
        ],
      },
      {
        coordinateSpace: "preview-px",
        fragments: [
          ...pairs.map((item, index) => ({
            nodeId: item.targetNodeId,
            x: index * 58 + (index > 1 ? 26 : 0),
            y: index % 2 === 0 ? 5 : 0,
            width: 30,
            height: 40,
          })),
          ...(targetOnly
            ? [{ nodeId: targetOnly, x: 128, y: 0, width: 24, height: 40 }]
            : []),
        ],
      },
    ),
  );
  const start = unwrap(evaluateEquationMotion(plan, 0));
  const middle = unwrap(evaluateEquationMotion(plan, 0.5));
  const end = unwrap(evaluateEquationMotion(plan, 1));
  const definition = unwrap(toEquationTransformDefinition(transform));
  const restored = unwrap(parseEquationTransformDefinition(definition));
  const restoredDefinition = unwrap(toEquationTransformDefinition(restored));
  const methodCounts = Object.fromEntries(
    [...new Set(transform.tokenCorrespondence.map((item) => item.method))]
      .sort()
      .map((method) => [
        method,
        transform.tokenCorrespondence.filter((item) => item.method === method)
          .length,
      ]),
  );

  return {
    id: "v-u-at-rearrangement",
    source: source.source.value,
    target: target.source.value,
    equivalenceStatus: transform.equivalenceStatus,
    verificationMethod: transform.verificationMethod,
    correspondence: {
      matched: transform.tokenCorrespondence.length,
      sourceOnly: match.sourceOnly.length,
      targetOnly: match.targetOnly.length,
      methods: methodCounts,
    },
    motion: {
      matched: plan.matched.length,
      exits: plan.exits.length,
      entries: plan.entries.length,
      startProgress: start.progress,
      middleProgress: middle.easedProgress,
      endProgress: end.progress,
      exactEndIdentity: end.fragments
        .filter((fragment) => fragment.role === "matched")
        .every(
          (fragment) =>
            fragment.translateX === 0 &&
            fragment.translateY === 0 &&
            fragment.scaleX === 1 &&
            fragment.scaleY === 1,
        ),
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
