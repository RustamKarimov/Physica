import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runTeacherAuthoringWorkflow } from "./run";

describe("teacher-authoring-workflow example", () => {
  it("uses the project store, library snapshots and explicit clocks", () => {
    expect(runTeacherAuthoringWorkflow()).toEqual(expected);
  });
  it("ships an accessible authoring preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("Advanced timeline");
  });
});
