import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runEditAndRender } from "./run";

describe("edit-and-render example", () => {
  it("preserves semantic identity, persistence and stable rendering", () => {
    expect(runEditAndRender()).toEqual(expected);
    expect(expected.retainedIdentityCount).toBeGreaterThan(0);
    expect(expected.introducedIdentityCount).toBeGreaterThan(0);
    expect(expected.envelope.canonicalProjectRoundTrip).toBe(true);
    expect(expected.envelope.semanticTreeRoundTrip).toBe(true);
    expect(expected.rendering).toMatchObject({
      stable: true,
      containsMathMl: true,
      containsKatexHtml: true,
    });
  });

  it("ships an accessible expected preview", () => {
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain("Edit notation without losing meaning");
    expect(preview).toContain('role="img"');
  });
});
