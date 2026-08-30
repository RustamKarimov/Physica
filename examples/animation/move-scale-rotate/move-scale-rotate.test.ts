import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runMoveScaleRotate } from "./run";

describe("move-scale-rotate example", () => {
  it("matches deterministic forward, reverse and scrub output", () => {
    expect(runMoveScaleRotate()).toEqual(expected);
    expect(
      readFileSync(new URL("expected-preview.svg", import.meta.url), "utf8"),
    ).toContain("Move, scale and rotate");
  });
});
