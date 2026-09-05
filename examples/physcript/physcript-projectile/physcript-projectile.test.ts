import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runPhysScriptProjectile } from "./run";

describe("physcript-projectile example", () => {
  it("parses to exact data-only command intents", () => {
    expect(runPhysScriptProjectile()).toEqual(expected);
  });
  it("ships an accessible and truthful preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("not final lesson artwork");
  });
});
