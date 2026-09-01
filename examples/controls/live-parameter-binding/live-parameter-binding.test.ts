import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runLiveParameterBinding } from "./run";

describe("live-parameter-binding example", () => {
  it("normalizes values and routes them to their owning layers", () => {
    expect(runLiveParameterBinding()).toEqual(expected);
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("9.5 m/s");
  });
});
