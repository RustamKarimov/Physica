import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runLineAndArrow } from "./run";

describe("line-and-arrow example", () => {
  it("matches its checked-in SVG plan and preview", () => {
    const output = runLineAndArrow();
    expect(output).toEqual(expected);
    expect(
      readFileSync(
        new URL("expected-preview.svg", import.meta.url),
        "utf8",
      ).trim(),
    ).toBe(output.markup);
  });
});
