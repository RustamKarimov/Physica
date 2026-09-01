import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runProjectileExplanation } from "./run";

describe("projectile-explanation example", () => {
  it("coordinates pause, presentation, condition and interaction directives", () => {
    expect(runProjectileExplanation()).toEqual(expected);
    expect(expected.entry.directives).toContain("simulation:pause");
    expect(expected.entry.directives).toContain("presentation");
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("fixture observable");
  });
});
