import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WAVE_EXAMPLE_IDS,
  runWaveScenario,
} from "../../packages/physics-waves/src";
import {
  OPTICS_EXAMPLE_IDS,
  runOpticsScenario,
} from "../../packages/physics-optics/src";

const projects = [
  ...WAVE_EXAMPLE_IDS.map((id) => ({
    id,
    category: "waves",
    run: () => runWaveScenario(id),
  })),
  ...OPTICS_EXAMPLE_IDS.map((id) => ({
    id,
    category: "optics",
    run: () => runOpticsScenario(id),
  })),
];

describe("Phase 9 Wave/Optics Gallery projects", () => {
  it.each(projects)(
    "$id executes through its public deterministic scenario API",
    ({ id, category, run }) => {
      const directory = join(process.cwd(), "examples", category, id);
      const expected = JSON.parse(
        readFileSync(join(directory, "expected-output.json"), "utf8"),
      );
      const metadata = JSON.parse(
        readFileSync(join(directory, "metadata.json"), "utf8"),
      );
      const preview = readFileSync(
        join(directory, "expected-preview.svg"),
        "utf8",
      );
      const pending = JSON.parse(
        readFileSync(join(directory, "pending-artifacts.json"), "utf8"),
      );

      expect(run()).toEqual(expected);
      expect(metadata).toMatchObject({
        id,
        category,
        entry: "run.ts",
        expectedPreview: "expected-preview.svg",
        deterministic: true,
      });
      expect(existsSync(join(directory, "README.md"))).toBe(true);
      expect(existsSync(join(directory, "run.ts"))).toBe(true);
      expect(preview).toContain('role="img"');
      expect(preview).toContain("deterministic physics result");
      expect(pending.requiredWhenAvailable).toEqual([
        "example.physica",
        "expected.png",
        "preview.webm",
        "example.spec.ts",
      ]);
    },
  );

  it("covers exactly nine curriculum projects and two approved extensions", () => {
    expect(projects).toHaveLength(11);
    expect(
      projects.filter((project) => !project.id.endsWith("optics-overview")),
    ).toHaveLength(9);
  });
});
