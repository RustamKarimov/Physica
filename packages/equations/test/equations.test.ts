import { DeterministicIdFactory } from "@physica/core-model";
import { describe, expect, it } from "vitest";
import {
  buildSemanticEquationTree,
  collectSemanticEquationIds,
  countSemanticEquationNodes,
  createEquationModel,
  DeterministicSemanticEquationIdFactory,
  editEquationModel,
  EQUATION_MODEL_SCHEMA_VERSION,
  EQUATION_MODEL_TYPE_ID,
  parseEquationDefinition,
  renderEquationToMarkup,
  toEquationDefinition,
  validateSemanticEquationTree,
  type EquationResult,
  type SemanticEquationNode,
} from "../src/index";

function unwrap<T>(result: EquationResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

function createKinematics(seed = 0) {
  return unwrap(
    createEquationModel({
      id: new DeterministicIdFactory(40_000 + seed).equationId(),
      name: "Constant acceleration",
      latex: String.raw`v=u+at`,
      idFactory: new DeterministicSemanticEquationIdFactory(50_000 + seed),
      metadata: { syllabus: "mechanics" },
    }),
  );
}

describe("semantic equation model", () => {
  it("clones caller metadata and rejects invalid injected semantic identities", () => {
    const metadata = { owner: "teacher" };
    const cloned = unwrap(
      createEquationModel({
        id: new DeterministicIdFactory(39_000).equationId(),
        name: "Metadata boundary",
        latex: "x+y",
        idFactory: new DeterministicSemanticEquationIdFactory(49_000),
        metadata,
      }),
    );
    expect(cloned.metadata).toEqual(metadata);
    expect(cloned.metadata).not.toBe(metadata);
    expect(Object.isFrozen(metadata)).toBe(false);

    const duplicateFactory = {
      next: () =>
        "00000000-0000-4000-9000-000000000001" as ReturnType<
          DeterministicSemanticEquationIdFactory["next"]
        >,
    };
    expect(
      createEquationModel({
        id: new DeterministicIdFactory(39_100).equationId(),
        name: "Invalid identity source",
        latex: "x+y",
        idFactory: duplicateFactory,
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "duplicate-semantic-id" },
    });
  });

  it("parses known LaTeX into pinned canonical MathJSON", () => {
    const model = createKinematics();
    expect(model.canonicalMathJson).toEqual([
      "Equal",
      "v",
      ["Add", ["Multiply", "a", "t"], "u"],
    ]);
    expect(model.canonicalizer).toEqual({
      id: "cortex-js/compute-engine",
      version: "0.120.0",
    });
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "undeclared-symbol",
      "undeclared-symbol",
      "undeclared-symbol",
      "undeclared-symbol",
    ]);
    expect(countSemanticEquationNodes(model.semanticRoot)).toBe(10);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.semanticRoot)).toBe(true);
  });

  it("rejects empty and structurally invalid source without changing prior state", () => {
    const previous = createKinematics();
    const before = JSON.stringify(previous);
    const empty = editEquationModel({
      previous,
      latex: "   ",
      idFactory: new DeterministicSemanticEquationIdFactory(60_000),
    });
    const malformed = editEquationModel({
      previous,
      latex: String.raw`\frac{`,
      idFactory: new DeterministicSemanticEquationIdFactory(61_000),
    });
    expect(empty).toMatchObject({
      ok: false,
      error: { kind: "invalid-source" },
    });
    expect(malformed).toMatchObject({
      ok: false,
      error: { kind: "parse-failed" },
    });
    expect(JSON.stringify(previous)).toBe(before);
  });

  it("retains identities for unchanged semantic subtrees across edits", () => {
    const first = createKinematics();
    const unchanged = unwrap(
      editEquationModel({
        previous: first,
        latex: String.raw`v = u + at`,
        idFactory: new DeterministicSemanticEquationIdFactory(70_000),
      }),
    );
    expect(unchanged.semanticRoot).toEqual(first.semanticRoot);

    const extended = unwrap(
      editEquationModel({
        previous: first,
        latex: String.raw`v=u+at+bt^2`,
        idFactory: new DeterministicSemanticEquationIdFactory(71_000),
      }),
    );
    const oldIds = new Set(collectSemanticEquationIds(first.semanticRoot));
    const retained = collectSemanticEquationIds(extended.semanticRoot).filter(
      (id) => oldIds.has(id),
    );
    expect(retained.length).toBeGreaterThanOrEqual(6);
    expect(extended.id).toBe(first.id);
    expect(extended.name).toBe(first.name);
  });

  it("reuses each duplicate subtree identity at most once", () => {
    const first = buildSemanticEquationTree(
      ["Tuple", "x", "x"],
      new DeterministicSemanticEquationIdFactory(80_000),
    );
    const edited = buildSemanticEquationTree(
      ["Tuple", "x", "x", "x"],
      new DeterministicSemanticEquationIdFactory(81_000),
      first,
    );
    const oldIds = new Set(collectSemanticEquationIds(first));
    const editedIds = collectSemanticEquationIds(edited);
    expect(new Set(editedIds).size).toBe(editedIds.length);
    expect(editedIds.filter((id) => oldIds.has(id))).toHaveLength(3);
  });

  it("detects malformed and duplicate persisted semantic identities", () => {
    const canonical = ["Tuple", "x", "y"] as const;
    const valid = buildSemanticEquationTree(
      canonical,
      new DeterministicSemanticEquationIdFactory(90_000),
    );
    const invalidId = {
      ...valid,
      id: "not-a-uuid",
    } as SemanticEquationNode;
    expect(validateSemanticEquationTree(invalidId, canonical)).toMatchObject({
      ok: false,
      error: { kind: "invalid-semantic-id" },
    });
    if (valid.kind !== "list") throw new Error("Expected a list.");
    const duplicate = {
      ...valid,
      items: [
        valid.items[0],
        { ...valid.items[1], id: valid.items[0]!.id },
        valid.items[2],
      ],
    } as SemanticEquationNode;
    expect(validateSemanticEquationTree(duplicate, canonical)).toMatchObject({
      ok: false,
      error: { kind: "duplicate-semantic-id" },
    });
  });

  it("round-trips the existing EquationDefinition envelope exactly", () => {
    const model = createKinematics(1);
    const definition = unwrap(toEquationDefinition(model, false));
    expect(definition).toMatchObject({
      typeId: EQUATION_MODEL_TYPE_ID,
      schemaVersion: EQUATION_MODEL_SCHEMA_VERSION,
      enabled: false,
    });
    expect(parseEquationDefinition(definition)).toEqual({
      ok: true,
      value: model,
    });
    expect(
      parseEquationDefinition({
        ...definition,
        schemaVersion: 2,
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "unsupported-equation-envelope" },
    });
  });

  it("renders deterministic accessible KaTeX without trusting authored HTML", () => {
    const model = createKinematics(2);
    const first = unwrap(renderEquationToMarkup(model));
    const second = unwrap(renderEquationToMarkup(model));
    expect(first).toEqual(second);
    expect(first.markup).toContain("<math");
    expect(first.markup).toContain("katex-display");

    const hostile = unwrap(
      createEquationModel({
        id: new DeterministicIdFactory(43_000).equationId(),
        name: "Escaped text",
        latex: String.raw`\text{<img src=x onerror=alert(1)>}`,
        idFactory: new DeterministicSemanticEquationIdFactory(93_000),
      }),
    );
    const escaped = unwrap(renderEquationToMarkup(hostile));
    expect(escaped.markup).not.toContain("<img");
    expect(escaped.markup).toContain("&lt;img");

    const link = createEquationModel({
      id: new DeterministicIdFactory(44_000).equationId(),
      name: "Untrusted link",
      latex: String.raw`\href{javascript:alert(1)}{x}`,
      idFactory: new DeterministicSemanticEquationIdFactory(94_000),
    });
    expect(link).toMatchObject({
      ok: false,
      error: { kind: "parse-failed" },
    });
  });
});
