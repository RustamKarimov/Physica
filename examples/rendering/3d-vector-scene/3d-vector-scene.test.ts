import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { run3dVectorScene } from "./run";

describe("3d-vector-scene example", () => {
  it("matches its known geometry and perspective projection", () => {
    expect(run3dVectorScene()).toEqual(expected);
  });
});
