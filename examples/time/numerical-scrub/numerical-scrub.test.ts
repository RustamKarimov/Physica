import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runNumericalScrub } from "./run";

describe("numerical-scrub example", () => {
  it("matches uninterrupted execution after backward and forward replay", () => {
    expect(runNumericalScrub()).toEqual(expected);
  });
});
