import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runUndoRedo } from "./run";

describe("undo-redo example", () => {
  it("matches its checked-in expected output", () => {
    expect(runUndoRedo()).toEqual(expected);
  });
});
