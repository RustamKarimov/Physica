import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runDrawVector } from "./run";

describe("draw-vector example", () => {
  it("matches deterministic path-length drawing output", () => {
    expect(runDrawVector()).toEqual(expected);
    expect(
      readFileSync(new URL("expected-preview.svg", import.meta.url), "utf8"),
    ).toContain("Draw a vector");
  });
});
