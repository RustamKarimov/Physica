import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runStochasticScrub } from "./run";

describe("stochastic-scrub example", () => {
  it("replays the exact random tail and event sequence", () => {
    expect(runStochasticScrub()).toEqual(expected);
  });
});
