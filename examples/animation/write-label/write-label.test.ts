import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runWriteLabel } from "./run";

describe("write-label example", () => {
  it("matches grapheme-safe deterministic writing output", () => {
    expect(runWriteLabel()).toEqual(expected);
    expect(
      readFileSync(new URL("expected-preview.svg", import.meta.url), "utf8"),
    ).toContain("Unicode-safe label");
  });
});
