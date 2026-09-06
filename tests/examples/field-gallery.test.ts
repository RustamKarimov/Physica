import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIELD_EXAMPLE_IDS,
  runFieldScenario,
  type FieldTopic,
} from "../../packages/physics-fields/src";

const categories: Record<FieldTopic, string> = {
  13: "gravity",
  18: "electric-fields",
  20: "magnetism",
  21: "alternating-current",
};

describe("Phase 11 Fields Gallery projects", () => {
  it.each(FIELD_EXAMPLE_IDS)(
    "%s executes through its public deterministic scenario API",
    (id) => {
      const result = runFieldScenario(id);
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

  it("covers exactly four gravity, four electric, four magnetic and three AC projects", () => {
    const projects = FIELD_EXAMPLE_IDS.map(runFieldScenario);
    expect(projects).toHaveLength(15);
    expect(projects.filter((project) => project.topic === 13)).toHaveLength(4);
    expect(projects.filter((project) => project.topic === 18)).toHaveLength(4);
    expect(projects.filter((project) => project.topic === 20)).toHaveLength(4);
    expect(projects.filter((project) => project.topic === 21)).toHaveLength(3);
    const ledger = JSON.parse(
      readFileSync(
        join(process.cwd(), "examples", "pending-artifacts.json"),
        "utf8",
      ),
    );
    for (const id of FIELD_EXAMPLE_IDS)
      expect(
        ledger.examples.filter((entry: { id: string }) => entry.id === id),
      ).toHaveLength(1);
  });
});
