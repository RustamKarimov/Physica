import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runGraphGradient } from "./run";
describe("graph-gradient example", () => {
  it("derives its tangent, triangle and maximum from one model", () => {
    expect(runGraphGradient()).toEqual(expected);
    expect(expected.tangent).toMatchObject({
      slopeCanonical: 4,
      runCanonical: 1,
      riseCanonical: 4,
    });
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("gradient = 4 m/s");
  });
});
