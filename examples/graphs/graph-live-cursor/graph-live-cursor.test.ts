import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runGraphLiveCursor } from "./run";

describe("live cursor graph example", () => {
  it("samples on the named clock and keeps cursor inspection presentation-only", () => {
    expect(runGraphLiveCursor()).toEqual(expected);
    expect(expected.acquisition.windowIndependent).toBe(true);
    expect(expected.cursor).toMatchObject({
      xCanonical: 2.25,
      yCanonical: 5.5,
    });
    expect(expected.presentationOnly).toBe(true);
  });

  it("ships an accessible expected preview with an explicit cursor readout", () => {
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain('role="img"');
    expect(preview).toContain("Sample once, inspect at any frame");
    expect(preview).toContain("2.25 s");
    expect(preview).toContain("5.5 m/s");
  });
});
