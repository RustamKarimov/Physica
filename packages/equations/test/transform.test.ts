import { DeterministicIdFactory } from "@physica/core-model";
import { describe, expect, it } from "vitest";
import {
  collectSemanticEquationIds,
  createEquationModel,
  createEquationMotionPlan,
  createEquationTransform,
  DeterministicSemanticEquationIdFactory,
  editEquationModel,
  EQUATION_TRANSFORM_SCHEMA_VERSION,
  EQUATION_TRANSFORM_TYPE_ID,
  evaluateEquationMotion,
  matchEquationNodes,
  parseEquationDefinition,
  parseEquationTransformDefinition,
  toEquationTransformDefinition,
  verifyEquationTransition,
  type EquationModelV1,
  type EquationResult,
  type SemanticEquationNode,
} from "../src/index";

function unwrap<T>(result: EquationResult<T>): T {
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

function equation(latex: string, seed: number): EquationModelV1 {
  return unwrap(
    createEquationModel({
      id: new DeterministicIdFactory(100_000 + seed * 1_000).equationId(),
      name: "Transform fixture " + seed,
      latex,
      idFactory: new DeterministicSemanticEquationIdFactory(
        200_000 + seed * 1_000,
      ),
    }),
  );
}

function edited(
  previous: EquationModelV1,
  latex: string,
  seed: number,
): EquationModelV1 {
  return unwrap(
    editEquationModel({
      previous,
      latex,
      idFactory: new DeterministicSemanticEquationIdFactory(
        300_000 + seed * 1_000,
      ),
    }),
  );
}

function visitNodes(
  root: SemanticEquationNode,
): readonly SemanticEquationNode[] {
  const nodes: SemanticEquationNode[] = [];
  const visit = (node: SemanticEquationNode) => {
    nodes.push(node);
    if (node.kind === "list") node.items.forEach(visit);
    if (node.kind === "record") {
      node.entries.forEach((entry) => visit(entry.value));
    }
  };
  visit(root);
  return nodes;
}

function atom(model: EquationModelV1, value: string | number) {
  const node = visitNodes(model.semanticRoot).find(
    (candidate) => candidate.kind === "atom" && candidate.value === value,
  );
  if (!node) throw new Error("Missing atom " + value);
  return node.id;
}

describe("semantic equation transform matching", () => {
  it("uses persistent IDs first and deterministic semantic fallbacks after them", () => {
    const source = equation("x+1", 1);
    const same = edited(source, "1+x", 2);
    const persistent = unwrap(matchEquationNodes({ source, target: same }));
    expect(
      persistent.correspondence.every(
        (item) => item.method === "persistent-id",
      ),
    ).toBe(true);

    const target = equation("x+2", 3);
    const proposed = unwrap(matchEquationNodes({ source, target }));
    expect(proposed.correspondence.map((item) => item.method)).toContain(
      "symbolic-identity",
    );
    expect(proposed.correspondence.map((item) => item.method)).toContain(
      "structural-identity",
    );
    expect(Object.isFrozen(proposed)).toBe(true);

    const nested = equation("z(x+y)", 4);
    const canonical = unwrap(
      matchEquationNodes({ source: equation("x+y", 5), target: nested }),
    );
    expect(canonical.correspondence.map((item) => item.method)).toContain(
      "canonical-expression",
    );
  });

  it("accepts explicit overrides, rejects duplicate claims and keeps glyph fallback low confidence", () => {
    const source = equation("x", 10);
    const target = equation("y", 11);
    const override = unwrap(
      matchEquationNodes({
        source,
        target,
        overrides: [
          {
            sourceNodeId: source.semanticRoot.id,
            targetNodeId: target.semanticRoot.id,
          },
        ],
      }),
    );
    expect(override.correspondence).toEqual([
      {
        sourceNodeId: source.semanticRoot.id,
        targetNodeId: target.semanticRoot.id,
        method: "teacher-override",
        confidence: "author",
      },
    ]);
    expect(
      matchEquationNodes({
        source,
        target,
        overrides: [
          {
            sourceNodeId: source.semanticRoot.id,
            targetNodeId: target.semanticRoot.id,
          },
          {
            sourceNodeId: source.semanticRoot.id,
            targetNodeId: target.semanticRoot.id,
          },
        ],
      }),
    ).toMatchObject({ ok: false, error: { kind: "invalid-correspondence" } });

    const glyphTarget = equation("\\sin(y)", 12);
    const glyph = unwrap(
      matchEquationNodes({
        source,
        target: glyphTarget,
        sourceGlyphs: [{ nodeId: source.semanticRoot.id, text: "term" }],
        targetGlyphs: [{ nodeId: glyphTarget.semanticRoot.id, text: "term" }],
      }),
    );
    expect(glyph.correspondence).toContainEqual({
      sourceNodeId: source.semanticRoot.id,
      targetNodeId: glyphTarget.semanticRoot.id,
      method: "glyph-fallback",
      confidence: "low",
    });
  });
});

describe("equation transformation validity", () => {
  it("verifies safe residual equality and refuses to overclaim an invalid step", () => {
    const rearranged = unwrap(
      verifyEquationTransition(equation("v=u+at", 20), equation("v-u=at", 21), {
        kind: "automatic-equivalence",
      }),
    );
    expect(rearranged).toMatchObject({
      status: "VERIFIED_EQUIVALENT",
      method: {
        kind: "compute-engine",
        operation: "residual-equality",
        outcome: "verified",
      },
    });

    const invalid = unwrap(
      verifyEquationTransition(equation("x+1", 22), equation("x+2", 23), {
        kind: "automatic-equivalence",
      }),
    );
    expect(invalid).toMatchObject({
      status: "UNVERIFIED_PRESENTATION",
      method: { outcome: "not-established" },
    });
  });

  it("verifies declared substitution and simplification while preserving explicit declarations", () => {
    const substitution = unwrap(
      verifyEquationTransition(
        equation("s=ut+\\frac{1}{2}at^2", 30),
        equation("s=28", 31),
        { kind: "substitution", substitutions: { u: 3, t: 4, a: 2 } },
      ),
    );
    expect(substitution.status).toBe("VERIFIED_SUBSTITUTION");

    const simplified = unwrap(
      verifyEquationTransition(
        equation("\\frac{2x+2x}{2}", 32),
        equation("2x", 33),
        { kind: "automatic-equivalence" },
      ),
    );
    expect(simplified.status).toBe("VERIFIED_EQUIVALENT");

    expect(
      unwrap(
        verifyEquationTransition(equation("F=ma", 34), equation("F=ma", 35), {
          kind: "teacher-declared",
          statement: "Use the stated constant-mass model.",
        }),
      ).status,
    ).toBe("TEACHER_DECLARED");
  });
});

describe("equation transform persistence and motion", () => {
  it("round-trips the V1 envelope and rejects a forged verification status", () => {
    const source = equation("v=u+at", 40);
    const target = equation("v-u=at", 41);
    const transform = unwrap(
      createEquationTransform({
        id: new DeterministicIdFactory(400_000).equationId(),
        name: "Rearrange acceleration equation",
        source,
        target,
        verification: { kind: "automatic-equivalence" },
        metadata: { example: "v-u-at-rearrangement" },
      }),
    );
    const envelope = unwrap(toEquationTransformDefinition(transform, false));
    expect(envelope).toMatchObject({
      typeId: EQUATION_TRANSFORM_TYPE_ID,
      schemaVersion: EQUATION_TRANSFORM_SCHEMA_VERSION,
      enabled: false,
    });
    expect(parseEquationTransformDefinition(envelope)).toEqual({
      ok: true,
      value: transform,
    });
    expect(parseEquationDefinition(envelope)).toMatchObject({
      ok: false,
      error: { kind: "unsupported-equation-envelope" },
    });

    const forged = {
      ...envelope,
      configuration: {
        ...envelope.configuration,
        equivalenceStatus: "TEACHER_DECLARED",
      },
    };
    expect(parseEquationTransformDefinition(forged)).toMatchObject({
      ok: false,
      error: { kind: "invalid-equation-transform" },
    });
  });

  it("evaluates exact FLIP endpoints, enter/exit, scrub determinism and reduced motion", () => {
    const source = equation("x+y", 50);
    const target = equation("x", 51);
    const transform = unwrap(
      createEquationTransform({
        id: new DeterministicIdFactory(500_000).equationId(),
        name: "Remove a term",
        source,
        target,
        verification: {
          kind: "presentation-only",
          reason: "Motion fixture only; not an algebraic claim.",
        },
      }),
    );
    const matched = transform.tokenCorrespondence.find(
      (item) => item.sourceNodeId === atom(source, "x"),
    );
    if (!matched) throw new Error("Expected x correspondence.");
    const plan = unwrap(
      createEquationMotionPlan(
        transform,
        {
          coordinateSpace: "equation-stage-px",
          fragments: [
            { nodeId: matched.sourceNodeId, x: 0, y: 0, width: 20, height: 10 },
            { nodeId: atom(source, "y"), x: 40, y: 0, width: 20, height: 10 },
          ],
        },
        {
          coordinateSpace: "equation-stage-px",
          fragments: [
            {
              nodeId: matched.targetNodeId,
              x: 100,
              y: 20,
              width: 40,
              height: 10,
            },
          ],
        },
      ),
    );
    expect(plan.matched).toHaveLength(1);
    expect(plan.exits).toHaveLength(1);
    expect(plan.entries).toHaveLength(0);

    const start = unwrap(evaluateEquationMotion(plan, 0));
    const middle = unwrap(evaluateEquationMotion(plan, 0.5));
    const end = unwrap(evaluateEquationMotion(plan, 1));
    expect(start.fragments[0]).toMatchObject({
      role: "matched",
      translateX: -100,
      translateY: -20,
      scaleX: 0.5,
      opacity: 1,
    });
    expect(middle.fragments[0]).toMatchObject({
      translateX: -50,
      scaleX: 0.75,
    });
    expect(end.fragments[0]).toMatchObject({
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
    });
    expect(end.fragments[1]).toMatchObject({ role: "exit", opacity: 0 });
    expect(unwrap(evaluateEquationMotion(plan, 0.5))).toEqual(middle);
    expect(
      unwrap(evaluateEquationMotion(plan, 0, { reducedMotion: true })),
    ).toEqual(end);
    expect(Object.isFrozen(middle.fragments)).toBe(true);
    expect(evaluateEquationMotion(plan, Number.NaN)).toMatchObject({
      ok: false,
      error: { kind: "invalid-motion-progress" },
    });
  });

  it("classifies target-only fragment layouts as explicit entries", () => {
    const source = equation("x", 60);
    const target = equation("x+y", 61);
    const transform = unwrap(
      createEquationTransform({
        id: new DeterministicIdFactory(600_000).equationId(),
        name: "Enter a term",
        source,
        target,
        verification: {
          kind: "presentation-only",
          reason: "Enter behavior fixture.",
        },
      }),
    );
    const x = transform.tokenCorrespondence.find(
      (item) => item.sourceNodeId === source.semanticRoot.id,
    );
    if (!x) throw new Error("Expected x correspondence.");
    const plan = unwrap(
      createEquationMotionPlan(
        transform,
        {
          coordinateSpace: "px",
          fragments: [
            { nodeId: x.sourceNodeId, x: 0, y: 0, width: 20, height: 10 },
          ],
        },
        {
          coordinateSpace: "px",
          fragments: [
            { nodeId: x.targetNodeId, x: 0, y: 0, width: 20, height: 10 },
            { nodeId: atom(target, "y"), x: 40, y: 0, width: 20, height: 10 },
          ],
        },
      ),
    );
    expect(plan.entries.map((item) => item.nodeId)).toEqual([
      atom(target, "y"),
    ]);
    expect(
      unwrap(evaluateEquationMotion(plan, 0)).fragments.at(-1),
    ).toMatchObject({
      role: "entry",
      opacity: 0,
      scaleX: 0.84,
    });
    expect(
      new Set(collectSemanticEquationIds(target.semanticRoot)).has(
        atom(target, "y"),
      ),
    ).toBe(true);
  });
});
