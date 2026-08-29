import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runTwoClocks } from "./run";

describe("two-clocks example", () => {
  it("matches its checked-in separated-time output", () => {
    expect(runTwoClocks()).toEqual(expected);
  });
});
