import { isUuidV4, type JsonValue } from "@physica/core-model";
import { freezeDeep, isJsonArray, stableJson } from "./internal";
import type {
  EquationResult,
  SemanticEquationIdFactory,
  SemanticEquationNode,
  SemanticEquationNodeId,
} from "./types";

type IdentityQueue = Map<string, SemanticEquationNodeId[]>;

function semanticFingerprint(value: JsonValue): string {
  if (isJsonArray(value)) return "list:" + stableJson(value);
  if (value !== null && typeof value === "object") {
    return "record:" + stableJson(value);
  }
  return "atom:" + stableJson(value);
}

function indexPrevious(
  node: SemanticEquationNode,
  queues: IdentityQueue,
): void {
  const queue = queues.get(node.fingerprint);
  if (queue) queue.push(node.id);
  else queues.set(node.fingerprint, [node.id]);
  if (node.kind === "list") {
    for (const item of node.items) indexPrevious(item, queues);
  } else if (node.kind === "record") {
    for (const entry of node.entries) indexPrevious(entry.value, queues);
  }
}

function acquireId(
  fingerprint: string,
  queues: IdentityQueue,
  factory: SemanticEquationIdFactory,
): SemanticEquationNodeId {
  const queue = queues.get(fingerprint);
  const reused = queue?.shift();
  return reused ?? factory.next();
}

function buildNode(
  value: JsonValue,
  queues: IdentityQueue,
  factory: SemanticEquationIdFactory,
): SemanticEquationNode {
  const fingerprint = semanticFingerprint(value);
  const id = acquireId(fingerprint, queues, factory);
  if (isJsonArray(value)) {
    return {
      id,
      kind: "list",
      items: value.map((item) => buildNode(item, queues, factory)),
      fingerprint,
    };
  }
  if (value !== null && typeof value === "object") {
    return {
      id,
      kind: "record",
      entries: Object.keys(value)
        .sort()
        .map((key) => ({
          key,
          value: buildNode(value[key]!, queues, factory),
        })),
      fingerprint,
    };
  }
  return { id, kind: "atom", value, fingerprint };
}

export function buildSemanticEquationTree(
  canonicalMathJson: JsonValue,
  idFactory: SemanticEquationIdFactory,
  previous?: SemanticEquationNode,
): SemanticEquationNode {
  const queues: IdentityQueue = new Map();
  if (previous) indexPrevious(previous, queues);
  return freezeDeep(buildNode(canonicalMathJson, queues, idFactory));
}

function mismatch(
  path: string,
  message: string,
): EquationResult<SemanticEquationNode> {
  return {
    ok: false,
    error: { kind: "semantic-canonical-mismatch", path, message },
  };
}

export function validateSemanticEquationTree(
  node: SemanticEquationNode,
  canonicalMathJson: JsonValue,
): EquationResult<SemanticEquationNode> {
  const ids = new Set<string>();

  const visit = (
    candidate: SemanticEquationNode,
    canonical: JsonValue,
    path: string,
  ): EquationResult<SemanticEquationNode> => {
    if (!isUuidV4(candidate.id)) {
      return {
        ok: false,
        error: {
          kind: "invalid-semantic-id",
          path,
          value: candidate.id,
        },
      };
    }
    if (ids.has(candidate.id)) {
      return {
        ok: false,
        error: {
          kind: "duplicate-semantic-id",
          path,
          value: candidate.id,
        },
      };
    }
    ids.add(candidate.id);
    if (candidate.fingerprint !== semanticFingerprint(canonical)) {
      return mismatch(path, "The structural fingerprint does not match.");
    }

    if (isJsonArray(canonical)) {
      if (candidate.kind !== "list") {
        return mismatch(path, "Expected a list semantic node.");
      }
      if (candidate.items.length !== canonical.length) {
        return mismatch(path, "List length does not match canonical MathJSON.");
      }
      for (let index = 0; index < canonical.length; index += 1) {
        const result = visit(
          candidate.items[index]!,
          canonical[index]!,
          path + ".items[" + index + "]",
        );
        if (!result.ok) return result;
      }
      return { ok: true, value: candidate };
    }

    if (canonical !== null && typeof canonical === "object") {
      if (candidate.kind !== "record") {
        return mismatch(path, "Expected a record semantic node.");
      }
      const keys = Object.keys(canonical).sort();
      if (
        candidate.entries.length !== keys.length ||
        candidate.entries.some((entry, index) => entry.key !== keys[index])
      ) {
        return mismatch(
          path,
          "Record keys are missing, duplicated or not lexicographically sorted.",
        );
      }
      for (const entry of candidate.entries) {
        const result = visit(
          entry.value,
          canonical[entry.key]!,
          path + ".entries." + entry.key,
        );
        if (!result.ok) return result;
      }
      return { ok: true, value: candidate };
    }

    if (candidate.kind !== "atom" || candidate.value !== canonical) {
      return mismatch(path, "Atom value does not match canonical MathJSON.");
    }
    return { ok: true, value: candidate };
  };

  return visit(node, canonicalMathJson, "$.semanticRoot");
}

export function countSemanticEquationNodes(node: SemanticEquationNode): number {
  if (node.kind === "atom") return 1;
  if (node.kind === "list") {
    return (
      1 +
      node.items.reduce(
        (sum, item) => sum + countSemanticEquationNodes(item),
        0,
      )
    );
  }
  return (
    1 +
    node.entries.reduce(
      (sum, entry) => sum + countSemanticEquationNodes(entry.value),
      0,
    )
  );
}

export function collectSemanticEquationIds(
  node: SemanticEquationNode,
): readonly SemanticEquationNodeId[] {
  const result: SemanticEquationNodeId[] = [];
  const visit = (candidate: SemanticEquationNode) => {
    result.push(candidate.id);
    if (candidate.kind === "list") {
      candidate.items.forEach(visit);
    } else if (candidate.kind === "record") {
      candidate.entries.forEach((entry) => visit(entry.value));
    }
  };
  visit(node);
  return Object.freeze(result);
}
