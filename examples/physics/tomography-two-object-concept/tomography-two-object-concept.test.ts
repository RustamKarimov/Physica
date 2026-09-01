import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runExample } from "./run";
describe("tomography-two-object-concept example", () => {
  it("matches its scientific reference output", () =>
    expect(runExample()).toEqual(expected));
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("Tomography two-object concept");
  });
});
