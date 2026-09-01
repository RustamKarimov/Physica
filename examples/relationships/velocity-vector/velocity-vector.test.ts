import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runVelocityVector } from "./run";

describe("velocity-vector example", () => {
  it("resolves a visual arrow from a mathematical vector observable", () => {
    expect(runVelocityVector()).toEqual(expected);
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("5 m/s");
  });
});
