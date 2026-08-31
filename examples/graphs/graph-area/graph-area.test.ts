import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runGraphArea } from "./run";
describe("graph-area example", () => {
  it("keeps area, fit and uncertainty scientifically separate", () => {
    expect(runGraphArea()).toEqual(expected);
    expect(expected.area).toMatchObject({
      signedCanonical: 20,
      display: 20,
      unit: "m/s·s",
    });
    expect(expected.fit).toMatchObject({
      slopeCanonical: 2,
      interceptCanonical: 1,
      rSquared: 1,
      weighting: "unweighted",
    });
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("20 m");
    expect(svg).toContain("R² = 1");
  });
});
