import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runSubstitution } from "./run";

describe("substitution equation example", () => {
  it("verifies declared values and evaluates truthful fragment motion", () => {
    expect(runSubstitution()).toEqual(expected);
    expect(expected.equivalenceStatus).toBe("VERIFIED_SUBSTITUTION");
    expect(expected.motion.reducedMotionReadable).toBe(true);
    expect(expected.envelope.roundTrip).toBe(true);
  });

  it("ships an accessible presentation-grade expected preview", () => {
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain("Substitute values with proof attached");
    expect(preview).toContain('role="img"');
    expect(preview).toContain("VERIFIED SUBSTITUTION");
  });
});
