import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runRearrangement } from "./run";

describe("v-u-at-rearrangement example", () => {
  it("verifies, matches, moves and persists the rearrangement", () => {
    expect(runRearrangement()).toEqual(expected);
    expect(expected.equivalenceStatus).toBe("VERIFIED_EQUIVALENT");
    expect(expected.motion).toMatchObject({
      exactEndIdentity: true,
      deterministicScrub: true,
    });
    expect(expected.envelope.roundTrip).toBe(true);
  });

  it("ships an accessible presentation-grade expected preview", () => {
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain("Rearrange without losing the terms");
    expect(preview).toContain('role="img"');
    expect(preview).toContain("VERIFIED EQUIVALENT");
  });
});
