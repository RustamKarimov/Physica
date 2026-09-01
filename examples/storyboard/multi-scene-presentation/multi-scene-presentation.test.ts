import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runMultiScenePresentation } from "./run";

describe("multi-scene-presentation example", () => {
  it("resolves a storyboard flow trigger by explicit priority", () => {
    expect(runMultiScenePresentation()).toEqual(expected);
    expect(expected.selectedChallengeScene).toBe(true);
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("Challenge");
  });
});
