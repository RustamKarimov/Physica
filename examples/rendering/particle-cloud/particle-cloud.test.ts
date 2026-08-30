import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runParticleCloud } from "./run";

describe("particle-cloud example", () => {
  it("matches deterministic stride, culling and immutability output", () => {
    expect(runParticleCloud()).toEqual(expected);
  });
});
