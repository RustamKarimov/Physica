import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import metadata from "./metadata.json";
import { runExample } from "./run";

describe("bind-instrument example", () => {
  it("matches its deterministic output and expected preview", () => {
    expect(runExample()).toEqual(expected);
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain(metadata.title);
  });
});
