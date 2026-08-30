import { describe, expect, it } from "vitest";
import {
  createSvgMaskPlan,
  createSvgStrokeDrawPlan,
  measureSvgPath,
  resolveSvgEmphasis,
  sliceSvgPath,
} from "../src";

describe("SVG reveal geometry", () => {
  it("measures and slices a 3-4-5 multi-segment path exactly", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 6, y: 4 },
    ];
    expect(measureSvgPath(points)).toMatchObject({
      ok: true,
      value: { segmentLengths: [5, 3], totalLength: 8 },
    });
    const sliced = sliceSvgPath(points, 0.5);
    expect(sliced).toMatchObject({
      ok: true,
      value: { visibleLength: 4 },
    });
    if (sliced.ok) {
      expect(sliced.value.visiblePoints[1]!.x).toBeCloseTo(2.4, 12);
      expect(sliced.value.visiblePoints[1]!.y).toBeCloseTo(3.2, 12);
    }
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 6, y: 4 },
    ]);
  });

  it("supports reverse draw and completion-only arrow heads", () => {
    expect(
      createSvgStrokeDrawPlan(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        0.25,
        "reverse",
      ),
    ).toMatchObject({
      ok: true,
      value: {
        visiblePoints: [
          { x: 10, y: 0 },
          { x: 7.5, y: 0 },
        ],
        dashArray: 10,
        dashOffset: -7.5,
        arrowHeadVisible: false,
      },
    });
    expect(
      createSvgStrokeDrawPlan(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        1,
      ),
    ).toMatchObject({
      ok: true,
      value: { arrowHeadVisible: true, dashOffset: 0 },
    });
  });

  it("resolves mask direction and semantic emphasis deterministically", () => {
    expect(
      createSvgMaskPlan(
        { x: 10, y: 20, width: 100, height: 40 },
        0.25,
        "horizontal",
        "end",
        3,
      ),
    ).toEqual({
      ok: true,
      value: {
        clip: { x: 85, y: 20, width: 25, height: 40 },
        feather: 3,
      },
    });
    expect(resolveSvgEmphasis("highlight", 0.75)).toMatchObject({
      ok: true,
      value: { accentIntensity: 0.75, opacityMultiplier: 1 },
    });
    expect(resolveSvgEmphasis("dim", 0.5, 0.2)).toMatchObject({
      ok: true,
      value: { accentIntensity: 0, opacityMultiplier: 0.6 },
    });
    expect(resolveSvgEmphasis("isolate", 1)).toMatchObject({
      ok: true,
      value: { isolated: true },
    });
  });

  it("rejects degenerate paths and invalid normalized values", () => {
    expect(
      measureSvgPath([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-path" },
    });
    expect(
      sliceSvgPath(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        2,
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-progress" },
    });
  });
});
