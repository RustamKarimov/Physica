import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runCameraFollow } from "./run";

describe("camera-follow example", () => {
  it("produces deterministic Camera motion without changing world motion", () => {
    expect(runCameraFollow()).toEqual(expected);
    const preview = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(preview).toContain("Camera follows, physics does not move");
    expect(preview).toContain('role="img"');
  });
});
