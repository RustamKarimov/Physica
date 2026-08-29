import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runUnitsAndDimensions } from "./run";

describe("units-and-dimensions example", () => {
  it("matches its checked-in scientific output", () => {
    expect(runUnitsAndDimensions()).toEqual(expected);
  });
});
