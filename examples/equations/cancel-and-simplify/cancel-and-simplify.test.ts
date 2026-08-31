import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runCancelAndSimplify } from "./run";

describe("cancel-and-simplify equation example", () => {
  it("verifies simplification and explicitly exits removed structure", () => {
    expect(runCancelAndSimplify()).toEqual(expected);
    expect(expected.equivalenceStatus).toBe("VERIFIED_EQUIVALENT");
    expect(expected.motion).toMatchObject({
      startExitOpacity: 1,
      middleExitOpacity: 0.5,
      endExitOpacity: 0,
      deterministicScrub: true,
    });
    expect(expected.envelope.roundTrip).toBe(true);
  });

  it("ships an accessible presentation-grade expected preview", () => {
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain("Cancel clutter, preserve meaning");
    expect(preview).toContain('role="img"');
    expect(preview).toContain("VERIFIED EQUIVALENT");
  });
});
