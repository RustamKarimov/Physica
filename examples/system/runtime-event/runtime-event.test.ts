import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runRuntimeEvent } from "./run";

describe("runtime-event example", () => {
  it("matches its checked-in expected output", () => {
    expect(runRuntimeEvent()).toEqual(expected);
  });
});
