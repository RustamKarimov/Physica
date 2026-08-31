import { isUuidV4, type JsonObject, type JsonValue } from "@physica/core-model";
import { collectSemanticEquationIds } from "./identity";
import {
  checkedJsonObject,
  cloneJson,
  freezeDeep,
  stableJson,
} from "./internal";
import { matchEquationNodes } from "./matching";
import { validateEquationModel } from "./model";
import { verifyEquationTransition } from "./verification";
import type {
  CreateEquationTransformInput,
  EquationMatchConfidence,
  EquationMatchMethod,
  EquationModelV1,
  EquationResult,
  EquationTransformV1,
  EquationVerificationMethod,
  EquationVerificationRequest,
  SemanticEquationNode,
} from "./types";

const matchConfidence: Readonly<
  Record<EquationMatchMethod, EquationMatchConfidence>
> = Object.freeze({
  "teacher-override": "author",
  "persistent-id": "high",
  "symbolic-identity": "high",
  "structural-identity": "medium",
  "canonical-expression": "medium",
  "glyph-fallback": "low",
});

function invalid(
  path: string,
  message: string,
): EquationResult<EquationTransformV1> {
  return {
    ok: false,
    error: { kind: "invalid-equation-transform", path, message },
  };
}

function cloneSemanticNode(node: SemanticEquationNode): SemanticEquationNode {
  if (node.kind === "atom") return { ...node };
  if (node.kind === "list") {
    return { ...node, items: node.items.map(cloneSemanticNode) };
  }
  return {
    ...node,
    entries: node.entries.map((entry) => ({
      key: entry.key,
      value: cloneSemanticNode(entry.value),
    })),
  };
}

function cloneEquationModel(model: EquationModelV1): EquationModelV1 {
  return {
    id: model.id,
    name: model.name,
    source: { ...model.source },
    canonicalizer: { ...model.canonicalizer },
    canonicalMathJson: cloneJson(model.canonicalMathJson),
    semanticRoot: cloneSemanticNode(model.semanticRoot),
    diagnostics: model.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      start: diagnostic.start,
      end: diagnostic.end,
      ...(diagnostic.detail
        ? { detail: cloneJson(diagnostic.detail) as JsonObject }
        : {}),
    })),
    ...(model.metadata
      ? { metadata: cloneJson(model.metadata) as JsonObject }
      : {}),
  };
}

function verificationRequest(
  method: EquationVerificationMethod,
): EquationVerificationRequest {
  if (method.kind === "compute-engine") {
    return { kind: "automatic-equivalence" };
  }
  if (method.kind === "compute-engine-substitution") {
    return { kind: "substitution", substitutions: method.substitutions };
  }
  if (method.kind === "teacher-declaration") {
    return { kind: "teacher-declared", statement: method.statement };
  }
  return { kind: "presentation-only", reason: method.reason };
}

function sameJson(left: unknown, right: unknown): boolean {
  return stableJson(left as JsonValue) === stableJson(right as JsonValue);
}

export function validateEquationTransform(
  transform: EquationTransformV1,
): EquationResult<EquationTransformV1> {
  if (!isUuidV4(transform.id)) {
    return invalid("$.id", "Equation transform ID must be a UUID-v4 value.");
  }
  if (transform.name.trim().length === 0) {
    return invalid("$.name", "Equation transform name must not be empty.");
  }
  const sourceValid = validateEquationModel(transform.sourceExpression);
  if (!sourceValid.ok) return sourceValid;
  const targetValid = validateEquationModel(transform.targetExpression);
  if (!targetValid.ok) return targetValid;
  if (!Array.isArray(transform.tokenCorrespondence)) {
    return invalid(
      "$.tokenCorrespondence",
      "Token correspondence must be an array.",
    );
  }

  const sourceIds = new Set(
    collectSemanticEquationIds(transform.sourceExpression.semanticRoot),
  );
  const targetIds = new Set(
    collectSemanticEquationIds(transform.targetExpression.semanticRoot),
  );
  const usedSource = new Set<string>();
  const usedTarget = new Set<string>();
  for (
    let index = 0;
    index < transform.tokenCorrespondence.length;
    index += 1
  ) {
    const item = transform.tokenCorrespondence[index]!;
    const path = "$.tokenCorrespondence[" + index + "]";
    if (!sourceIds.has(item.sourceNodeId)) {
      return invalid(
        path + ".sourceNodeId",
        "Source semantic node is missing.",
      );
    }
    if (!targetIds.has(item.targetNodeId)) {
      return invalid(
        path + ".targetNodeId",
        "Target semantic node is missing.",
      );
    }
    if (usedSource.has(item.sourceNodeId)) {
      return invalid(path + ".sourceNodeId", "Source node is matched twice.");
    }
    if (usedTarget.has(item.targetNodeId)) {
      return invalid(path + ".targetNodeId", "Target node is matched twice.");
    }
    const expectedConfidence =
      matchConfidence[item.method as EquationMatchMethod];
    if (
      expectedConfidence === undefined ||
      expectedConfidence !== item.confidence
    ) {
      return invalid(
        path + ".method",
        "Correspondence method/confidence pair is unsupported.",
      );
    }
    usedSource.add(item.sourceNodeId);
    usedTarget.add(item.targetNodeId);
  }

  if (transform.verificationExplanation.trim().length === 0) {
    return invalid(
      "$.verificationExplanation",
      "Verification explanation must not be empty.",
    );
  }
  const recomputed = verifyEquationTransition(
    transform.sourceExpression,
    transform.targetExpression,
    verificationRequest(transform.verificationMethod),
  );
  if (!recomputed.ok) return recomputed;
  if (
    recomputed.value.status !== transform.equivalenceStatus ||
    !sameJson(recomputed.value.method, transform.verificationMethod)
  ) {
    return invalid(
      "$.verificationMethod",
      "Stored verification status/method does not match a fresh conservative verification.",
    );
  }

  if (transform.metadata !== undefined) {
    const metadata = checkedJsonObject(transform.metadata, {
      kind: "invalid-equation-transform",
      path: "$.metadata",
      message: "Equation transform metadata must be finite JSON object data.",
    });
    if (!metadata.ok) return metadata;
  }
  return { ok: true, value: transform };
}

export function createEquationTransform(
  input: CreateEquationTransformInput,
): EquationResult<EquationTransformV1> {
  if (!isUuidV4(input.id)) {
    return invalid("$.id", "Equation transform ID must be a UUID-v4 value.");
  }
  if (input.name.trim().length === 0) {
    return invalid("$.name", "Equation transform name must not be empty.");
  }
  const metadata =
    input.metadata === undefined
      ? { ok: true as const, value: undefined }
      : checkedJsonObject(input.metadata, {
          kind: "invalid-equation-transform",
          path: "$.metadata",
          message:
            "Equation transform metadata must be finite JSON object data.",
        });
  if (!metadata.ok) return metadata;
  const match = matchEquationNodes({
    source: input.source,
    target: input.target,
    ...(input.overrides ? { overrides: input.overrides } : {}),
    ...(input.sourceGlyphs ? { sourceGlyphs: input.sourceGlyphs } : {}),
    ...(input.targetGlyphs ? { targetGlyphs: input.targetGlyphs } : {}),
  });
  if (!match.ok) return match;
  const verification = verifyEquationTransition(
    input.source,
    input.target,
    input.verification,
  );
  if (!verification.ok) return verification;
  const transform: EquationTransformV1 = {
    id: input.id,
    name: input.name,
    sourceExpression: cloneEquationModel(input.source),
    targetExpression: cloneEquationModel(input.target),
    tokenCorrespondence: match.value.correspondence.map((item) => ({
      ...item,
    })),
    equivalenceStatus: verification.value.status,
    verificationMethod: cloneJson(
      verification.value.method as unknown as JsonValue,
    ) as unknown as EquationVerificationMethod,
    verificationExplanation: verification.value.explanation,
    ...(metadata.value
      ? { metadata: cloneJson(metadata.value) as JsonObject }
      : {}),
  };
  const valid = validateEquationTransform(transform);
  return valid.ok ? { ok: true, value: freezeDeep(transform) } : valid;
}
