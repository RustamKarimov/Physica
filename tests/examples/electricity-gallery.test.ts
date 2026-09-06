import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ELECTRICITY_EXAMPLE_IDS,
  runElectricityScenario,
} from "../../packages/physics-electricity/src";

function category(topic: number) {
  return topic === 9
    ? "electricity"
    : topic === 10
      ? "circuits"
      : "capacitance";
}

describe("Phase 10 Electricity Gallery projects", () => {
  it.each(ELECTRICITY_EXAMPLE_IDS)(
    "%s executes through its public deterministic scenario API",
    (id) => {
      const result = runElectricityScenario(id);
      const folderCategory = category(result.topic);
      const directory = join(process.cwd(), "examples", folderCategory, id);
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
        category: folderCategory,
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

  it("covers exactly the five Topic 9, four Topic 10 and four Topic 19 projects", () => {
    const projects = ELECTRICITY_EXAMPLE_IDS.map(runElectricityScenario);
    expect(projects).toHaveLength(13);
    expect(projects.filter((project) => project.topic === 9)).toHaveLength(5);
    expect(projects.filter((project) => project.topic === 10)).toHaveLength(4);
    expect(projects.filter((project) => project.topic === 19)).toHaveLength(4);
    const ledger = JSON.parse(
      readFileSync(
        join(process.cwd(), "examples", "pending-artifacts.json"),
        "utf8",
      ),
    );
    for (const id of ELECTRICITY_EXAMPLE_IDS)
      expect(
        ledger.examples.filter((entry: { id: string }) => entry.id === id),
      ).toHaveLength(1);
  });
});
