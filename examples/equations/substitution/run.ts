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

export function runSubstitution() {
  const ids = new DeterministicIdFactory(700_000);
  const source = unwrap(
    createEquationModel({
      id: ids.equationId(),
      name: "Displacement before substitution",
      latex: String.raw`s=ut+\frac{1}{2}at^2`,
      idFactory: new DeterministicSemanticEquationIdFactory(710_000),
    }),
  );
  const target = unwrap(
    createEquationModel({
      id: ids.equationId(),
      name: "Displacement after substitution",
      latex: "s=28",
      idFactory: new DeterministicSemanticEquationIdFactory(720_000),
    }),
  );
  const substitutions = { u: 3, t: 4, a: 2 };
  const transform = unwrap(
    createEquationTransform({
      id: ids.equationId(),
      name: "Insert known values",
      source,
      target,
      verification: { kind: "substitution", substitutions },
      metadata: { gallery: "substitution" },
    }),
  );
  const match = unwrap(matchEquationNodes({ source, target }));
  const pairs = transform.tokenCorrespondence.slice(0, 3);
  const sourceOnly = match.sourceOnly.slice(0, 3);
  const targetOnly = match.targetOnly.slice(0, 1);
  const plan = unwrap(
    createEquationMotionPlan(
      transform,
      {
        coordinateSpace: "preview-px",
        fragments: [
          ...pairs.map((item, index) => ({
            nodeId: item.sourceNodeId,
            x: index * 62,
            y: 0,
            width: 34,
            height: 42,
          })),
          ...sourceOnly.map((nodeId, index) => ({
            nodeId,
            x: 220 + index * 45,
            y: 0,
            width: 32,
            height: 42,
          })),
        ],
      },
      {
        coordinateSpace: "preview-px",
        fragments: [
          ...pairs.map((item, index) => ({
            nodeId: item.targetNodeId,
            x: index * 78,
            y: index === 2 ? 4 : 0,
            width: index === 2 ? 48 : 34,
            height: 42,
          })),
          ...targetOnly.map((nodeId) => ({
            nodeId,
            x: 174,
            y: 0,
            width: 48,
            height: 42,
          })),
        ],
      },
    ),
  );
  const middle = unwrap(evaluateEquationMotion(plan, 0.5));
  const reduced = unwrap(
    evaluateEquationMotion(plan, 0, { reducedMotion: true }),
  );
  const definition = unwrap(toEquationTransformDefinition(transform));
  const restored = unwrap(parseEquationTransformDefinition(definition));
  const restoredDefinition = unwrap(toEquationTransformDefinition(restored));

  return {
    id: "substitution",
    source: source.source.value,
    target: target.source.value,
    substitutions,
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
      midpoint: middle.easedProgress,
      reducedMotionProgress: reduced.progress,
      reducedMotionReadable: reduced.fragments
        .filter((fragment) => fragment.role !== "exit")
        .every((fragment) => fragment.opacity === 1),
    },
    envelope: {
      typeId: definition.typeId,
      schemaVersion: definition.schemaVersion,
      roundTrip:
        JSON.stringify(restoredDefinition) === JSON.stringify(definition),
    },
  };
}
