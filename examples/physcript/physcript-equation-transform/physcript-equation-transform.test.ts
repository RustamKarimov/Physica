import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runPhysScriptEquationTransform } from "./run";

describe("physcript-equation-transform example", () => {
  it("round-trips a semantic transform through data-only intents", () => {
    expect(runPhysScriptEquationTransform()).toEqual(expected);
  });
  it("ships an accessible and truthful preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("not final lesson artwork");
  });
});
