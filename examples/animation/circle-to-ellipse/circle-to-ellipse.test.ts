import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runCircleToEllipse } from "./run";

describe("circle-to-ellipse example", () => {
  it("produces deterministic normalized morph and matched-transform output", () => {
    expect(runCircleToEllipse()).toEqual(expected);
    expect(
      readFileSync(new URL("expected-preview.svg", import.meta.url), "utf8"),
    ).toContain("Circle to ellipse");
  });
});
