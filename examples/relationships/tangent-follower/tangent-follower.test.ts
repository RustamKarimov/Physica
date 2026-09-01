import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runTangentFollower } from "./run";

describe("tangent-follower example", () => {
  it("derives follower, tangent and normal from one curve contract", () => {
    expect(runTangentFollower()).toEqual(expected);
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("derived tangent");
  });
});
