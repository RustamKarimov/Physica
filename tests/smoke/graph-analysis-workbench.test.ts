import { describe, expect, it } from "vitest";
import { graphAnalysisDemos } from "../../apps/desktop/src/graph-analysis-demos";

describe("desktop graph analysis workbench", () => {
  it("ships every Step 18 analysis view from frozen engine plans", () => {
    expect(graphAnalysisDemos.map((demo) => demo.id)).toEqual([
      "gradient",
      "area",
      "histogram",
      "spectrum",
    ]);
    expect(graphAnalysisDemos.every((demo) => Object.isFrozen(demo.plan))).toBe(
      true,
    );
    const gradient = graphAnalysisDemos[0]!.plan.analyses;
    expect(gradient.find((item) => item.kind === "tangent")).toMatchObject({
      slopeCanonical: 4,
      triangle: { runCanonical: 1, riseCanonical: 4 },
    });
    expect(gradient.find((item) => item.kind === "maximum")).toMatchObject({
      source: { xCanonical: 2, yCanonical: 8 },
    });
  });

  it("keeps area, uncertainty, bars and spectrum independently visible", () => {
    const area = graphAnalysisDemos[1]!.plan;
    expect(area.analyses.find((item) => item.kind === "area")).toMatchObject({
      signedAreaCanonical: 20,
    });
    expect(
      area.analyses.find((item) => item.kind === "error-bars"),
    ).toMatchObject({ sampleCount: 5 });
    expect(graphAnalysisDemos[2]!.plan.curves[0]!.bars).toHaveLength(4);
    expect(graphAnalysisDemos[3]!.plan.annotations[0]).toMatchObject({
      text: "2 Hz peak",
      source: { xCanonical: 2, yCanonical: 1 },
    });
  });
});
