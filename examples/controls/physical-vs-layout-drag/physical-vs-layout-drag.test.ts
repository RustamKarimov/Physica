import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runPhysicalVsLayoutDrag } from "./run";

describe("physical-vs-layout-drag example", () => {
  it("keeps physical and layout movement on different owner routes", () => {
    expect(runPhysicalVsLayoutDrag()).toEqual(expected);
    expect(expected.sameAuthority).toBe(false);
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("different authorities");
  });
});
