import { describe, expect, it } from "vitest";
import { equationTransformDemos } from "../../apps/desktop/src/equation-transform-demos";

describe("desktop equation transform presentation", () => {
  it("reconstructs every source and target from complete semantic fragments", () => {
    expect(equationTransformDemos).toHaveLength(3);

    for (const demo of equationTransformDemos) {
      expect(
        demo.sourceFragments.map((fragment) => fragment.latex).join(""),
      ).toBe(demo.transform.sourceExpression.source.value);
      expect(
        demo.targetFragments.map((fragment) => fragment.latex).join(""),
      ).toBe(demo.transform.targetExpression.source.value);
      expect(
        new Set(demo.sourceFragments.map((fragment) => fragment.nodeId)).size,
      ).toBe(demo.sourceFragments.length);
      expect(
        new Set(demo.targetFragments.map((fragment) => fragment.nodeId)).size,
      ).toBe(demo.targetFragments.length);
      expect(
        demo.sourceFragments.every((fragment) => fragment.markup.length > 0),
      ).toBe(true);
      expect(
        demo.targetFragments.every((fragment) => fragment.markup.length > 0),
      ).toBe(true);
    }
  });

  it("keeps intentionally compound changes grouped", () => {
    const substitution = equationTransformDemos.find(
      (demo) => demo.id === "substitute",
    );
    const cancellation = equationTransformDemos.find(
      (demo) => demo.id === "cancel",
    );

    expect(substitution?.sourceFragments.at(-1)?.latex).toBe(
      String.raw`ut+\frac{1}{2}at^2`,
    );
    expect(
      cancellation?.sourceFragments.map((fragment) => fragment.latex),
    ).toEqual(["x", "+(", "y", "-", "y)"]);
  });
});
