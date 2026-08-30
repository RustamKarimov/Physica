import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runHighlightDiagram } from "./run";

describe("highlight-diagram example", () => {
  it("matches explicit highlight and sibling-dim output", () => {
    expect(runHighlightDiagram()).toEqual(expected);
    expect(
      readFileSync(new URL("expected-preview.svg", import.meta.url), "utf8"),
    ).toContain("Highlight a diagram");
  });
});
