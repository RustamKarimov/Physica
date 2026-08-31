import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runGraphBasic } from "./run";

describe("basic graph example", () => {
  it("resolves and round-trips a unit-aware multi-series graph", () => {
    expect(runGraphBasic()).toEqual(expected);
    expect(expected.curves.map((curve) => curve.line)).toEqual([
      "solid",
      "dashed",
    ]);
    expect(expected.persistence).toMatchObject({
      datasetRoundTrip: true,
      graphRoundTrip: true,
    });
  });

  it("ships an accessible expected preview with non-colour curve coding", () => {
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain('role="img"');
    expect(preview).toContain("Compare motion on one set of axes");
    expect(preview).toContain('stroke-dasharray="9 6"');
  });
});
