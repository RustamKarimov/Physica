import { freezeDeep, stableJson } from "./internal";
import { validateEquationModel } from "./model";
import type {
  EquationGlyphHint,
  EquationMatchConfidence,
  EquationMatchMethod,
  EquationMatchPlan,
  EquationResult,
  EquationTokenCorrespondence,
  MatchEquationNodesInput,
  SemanticEquationNode,
  SemanticEquationNodeId,
} from "./types";

interface IndexedNode {
  readonly node: SemanticEquationNode;
  readonly path: string;
  readonly order: number;
}

function structuralSignature(node: SemanticEquationNode): string {
  if (node.kind === "atom") return "atom";
  if (node.kind === "record") {
    return "record:" + node.entries.map((entry) => entry.key).join("|");
  }
  const head = node.items[0];
  const operator =
    head?.kind === "atom" && typeof head.value === "string"
      ? head.value
      : "anonymous";
  return "list:" + operator + ":" + node.items.length;
}

function indexTree(root: SemanticEquationNode): readonly IndexedNode[] {
  const result: IndexedNode[] = [];
  const visit = (node: SemanticEquationNode, path: string) => {
    result.push({ node, path, order: result.length });
    if (node.kind === "list") {
      node.items.forEach((item, index) =>
        visit(item, path + ".items[" + index + "]"),
      );
    } else if (node.kind === "record") {
      node.entries.forEach((entry) =>
        visit(entry.value, path + ".entries." + entry.key),
      );
    }
  };
  visit(root, "$");
  return result;
}

function confidence(method: EquationMatchMethod): EquationMatchConfidence {
  if (method === "teacher-override") return "author";
  if (method === "persistent-id" || method === "symbolic-identity") {
    return "high";
  }
  if (method === "structural-identity" || method === "canonical-expression") {
    return "medium";
  }
  return "low";
}

function invalid(
  path: string,
  message: string,
): EquationResult<EquationMatchPlan> {
  return {
    ok: false,
    error: { kind: "invalid-correspondence", path, message },
  };
}

function glyphMap(
  hints: readonly EquationGlyphHint[] | undefined,
  nodes: ReadonlyMap<string, IndexedNode>,
  path: string,
): EquationResult<ReadonlyMap<string, string>> {
  const map = new Map<string, string>();
  for (let index = 0; index < (hints?.length ?? 0); index += 1) {
    const hint = hints![index]!;
    if (!nodes.has(hint.nodeId)) {
      return {
        ok: false,
        error: {
          kind: "invalid-correspondence",
          path: path + "[" + index + "].nodeId",
          message: "Glyph hint refers to a missing semantic node.",
        },
      };
    }
    if (hint.text.trim().length === 0) {
      return {
        ok: false,
        error: {
          kind: "invalid-correspondence",
          path: path + "[" + index + "].text",
          message: "Glyph hint text must not be empty.",
        },
      };
    }
    if (map.has(hint.nodeId)) {
      return {
        ok: false,
        error: {
          kind: "invalid-correspondence",
          path: path + "[" + index + "].nodeId",
          message: "Glyph hint semantic node IDs must be unique.",
        },
      };
    }
    map.set(hint.nodeId, hint.text);
  }
  return { ok: true, value: map };
}

export function matchEquationNodes(
  input: MatchEquationNodesInput,
): EquationResult<EquationMatchPlan> {
  const sourceValid = validateEquationModel(input.source);
  if (!sourceValid.ok) return sourceValid;
  const targetValid = validateEquationModel(input.target);
  if (!targetValid.ok) return targetValid;

  const source = indexTree(input.source.semanticRoot);
  const target = indexTree(input.target.semanticRoot);
  const sourceById = new Map(source.map((entry) => [entry.node.id, entry]));
  const targetById = new Map(target.map((entry) => [entry.node.id, entry]));
  const sourceGlyphs = glyphMap(
    input.sourceGlyphs,
    sourceById,
    "$.sourceGlyphs",
  );
  if (!sourceGlyphs.ok) return sourceGlyphs;
  const targetGlyphs = glyphMap(
    input.targetGlyphs,
    targetById,
    "$.targetGlyphs",
  );
  if (!targetGlyphs.ok) return targetGlyphs;

  const usedSource = new Set<SemanticEquationNodeId>();
  const usedTarget = new Set<SemanticEquationNodeId>();
  const correspondence: EquationTokenCorrespondence[] = [];

  const add = (
    sourceNodeId: SemanticEquationNodeId,
    targetNodeId: SemanticEquationNodeId,
    method: EquationMatchMethod,
  ) => {
    usedSource.add(sourceNodeId);
    usedTarget.add(targetNodeId);
    correspondence.push({
      sourceNodeId,
      targetNodeId,
      method,
      confidence: confidence(method),
    });
  };

  const overrides = [...(input.overrides ?? [])].sort(
    (left, right) =>
      left.sourceNodeId.localeCompare(right.sourceNodeId) ||
      left.targetNodeId.localeCompare(right.targetNodeId),
  );
  for (let index = 0; index < overrides.length; index += 1) {
    const override = overrides[index]!;
    if (!sourceById.has(override.sourceNodeId)) {
      return invalid(
        "$.overrides[" + index + "].sourceNodeId",
        "Teacher override source node does not exist.",
      );
    }
    if (!targetById.has(override.targetNodeId)) {
      return invalid(
        "$.overrides[" + index + "].targetNodeId",
        "Teacher override target node does not exist.",
      );
    }
    if (usedSource.has(override.sourceNodeId)) {
      return invalid(
        "$.overrides[" + index + "].sourceNodeId",
        "A source node may be overridden only once.",
      );
    }
    if (usedTarget.has(override.targetNodeId)) {
      return invalid(
        "$.overrides[" + index + "].targetNodeId",
        "A target node may be overridden only once.",
      );
    }
    add(override.sourceNodeId, override.targetNodeId, "teacher-override");
  }

  const matchStage = (
    method: EquationMatchMethod,
    key: (
      entry: IndexedNode,
      glyphs: ReadonlyMap<string, string>,
    ) => string | undefined,
  ) => {
    const queues = new Map<string, IndexedNode[]>();
    for (const entry of target) {
      if (usedTarget.has(entry.node.id)) continue;
      const value = key(entry, targetGlyphs.value);
      if (value === undefined) continue;
      const queue = queues.get(value);
      if (queue) queue.push(entry);
      else queues.set(value, [entry]);
    }
    for (const entry of source) {
      if (usedSource.has(entry.node.id)) continue;
      const value = key(entry, sourceGlyphs.value);
      if (value === undefined) continue;
      const candidate = queues.get(value)?.shift();
      if (candidate) add(entry.node.id, candidate.node.id, method);
    }
  };

  matchStage("persistent-id", (entry) => "id:" + entry.node.id);
  matchStage("symbolic-identity", (entry) =>
    entry.node.kind === "atom"
      ? "atom:" + stableJson(entry.node.value)
      : undefined,
  );
  matchStage(
    "structural-identity",
    (entry) => "role:" + entry.path + ":" + structuralSignature(entry.node),
  );
  matchStage(
    "canonical-expression",
    (entry) => "canonical:" + entry.node.fingerprint,
  );
  matchStage("glyph-fallback", (entry, glyphs) => {
    const text = glyphs.get(entry.node.id);
    return text === undefined ? undefined : "glyph:" + text;
  });

  const sourceOrder = new Map(
    source.map((entry) => [entry.node.id, entry.order] as const),
  );
  const targetOrder = new Map(
    target.map((entry) => [entry.node.id, entry.order] as const),
  );
  correspondence.sort(
    (left, right) =>
      sourceOrder.get(left.sourceNodeId)! -
        sourceOrder.get(right.sourceNodeId)! ||
      targetOrder.get(left.targetNodeId)! -
        targetOrder.get(right.targetNodeId)!,
  );

  return {
    ok: true,
    value: freezeDeep({
      correspondence,
      sourceOnly: source
        .filter((entry) => !usedSource.has(entry.node.id))
        .map((entry) => entry.node.id),
      targetOnly: target
        .filter((entry) => !usedTarget.has(entry.node.id))
        .map((entry) => entry.node.id),
    }),
  };
}
