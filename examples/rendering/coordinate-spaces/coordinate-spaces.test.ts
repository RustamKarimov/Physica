import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runCoordinateSpaces } from "./run";

describe("coordinate-spaces example", () => {
  it("matches its checked-in transform output", () => {
    expect(runCoordinateSpaces()).toEqual(expected);
  });
});
