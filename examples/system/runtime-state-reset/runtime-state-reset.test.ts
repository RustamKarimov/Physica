import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runRuntimeStateReset } from "./run";

describe("runtime-state-reset example", () => {
  it("matches its checked-in expected output", () => {
    expect(runRuntimeStateReset()).toEqual(expected);
  });
});
