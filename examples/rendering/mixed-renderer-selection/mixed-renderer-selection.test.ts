import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runMixedRendererSelection } from "./run";

describe("mixed-renderer-selection example", () => {
  it("matches stable topmost semantic ordering", () => {
    expect(runMixedRendererSelection()).toEqual(expected);
  });
});
