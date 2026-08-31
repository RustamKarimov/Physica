import { describe, expect, it } from "vitest";
import {
  graphDemoEvidence,
  resolveBasicGraphDemo,
  resolveLiveGraphDemo,
} from "../../apps/desktop/src/graph-demos";

describe("desktop graph workbench", () => {
  it("resolves the static graph with non-colour series identification", () => {
    const plan = resolveBasicGraphDemo();
    expect(plan.curves).toHaveLength(2);
    expect(plan.curves.map((curve) => Boolean(curve.style.dash))).toEqual([
      false,
      true,
    ]);
    expect(plan.points).toHaveLength(1);
    expect(plan.annotations).toHaveLength(1);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it("interpolates cursor readouts without mutating acquisition evidence", () => {
    const first = resolveLiveGraphDemo(2.25);
    const second = resolveLiveGraphDemo(4.75);
    expect(first.cursor?.readouts[0]).toMatchObject({
      xCanonical: 2.25,
      yCanonical: 5.5,
    });
    expect(second.cursor?.readouts[0]).toMatchObject({
      xCanonical: 4.75,
      yCanonical: 10.5,
    });
    expect(graphDemoEvidence).toMatchObject({
      basicDatasetFrozen: true,
      basicSeriesCount: 2,
      liveSampleCount: 11,
      liveSamplingMethod: "fixed interval 0.5 s",
    });
  });
});
