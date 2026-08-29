import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runVectorOperations } from "./run";

describe("vector-operations example", () => {
  it("matches its checked-in mathematical output", () => {
    expect(runVectorOperations()).toEqual(expected);
  });
});
