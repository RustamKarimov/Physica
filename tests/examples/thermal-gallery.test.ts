import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THERMAL_EXAMPLE_IDS,
  runThermalScenario,
  type ThermalTopic,
} from "../../packages/physics-thermal/src";

const categories: Record<ThermalTopic, string> = {
  14: "temperature",
  15: "ideal-gases",
  16: "thermodynamics",
};

describe("Phase 12 Thermal Gallery projects", () => {
  it.each(THERMAL_EXAMPLE_IDS)(
    "%s executes through its public deterministic scenario API",
    (id) => {
      const result = runThermalScenario(id);
      const category = categories[result.topic];
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
      expect(result).toEqual(expected);
      expect(metadata).toMatchObject({
        id,
        category,
        topic: result.topic,
        entry: "run.ts",
        expectedPreview: "expected-preview.svg",
        deterministic: true,
        accessibility: {
          previewHasTextAlternative: true,
          colorIsNotSoleIndicator: true,
        },
      });
      expect(existsSync(join(directory, "README.md"))).toBe(true);
      expect(existsSync(join(directory, "run.ts"))).toBe(true);
      expect(preview).toContain('role="img"');
      expect(preview).toContain("deterministic physics result");
      expect(preview).toContain("MODEL / LOAD");
      expect(pending.requiredWhenAvailable).toEqual([
        "example.physica",
        "expected.png",
        "preview.webm",
        "example.spec.ts",
      ]);
    },
  );

  it("covers three temperature, five gas and four thermodynamics projects exactly", () => {
    const projects = THERMAL_EXAMPLE_IDS.map(runThermalScenario);
    expect(projects.filter((project) => project.topic === 14)).toHaveLength(3);
    expect(projects.filter((project) => project.topic === 15)).toHaveLength(5);
    expect(projects.filter((project) => project.topic === 16)).toHaveLength(4);
    const ledger = JSON.parse(
      readFileSync(
        join(process.cwd(), "examples", "pending-artifacts.json"),
        "utf8",
      ),
    );
    for (const id of THERMAL_EXAMPLE_IDS)
      expect(
        ledger.examples.filter((entry: { id: string }) => entry.id === id),
      ).toHaveLength(1);
  });
});
