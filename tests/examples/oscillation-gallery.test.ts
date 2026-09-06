import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OSCILLATION_EXAMPLE_IDS,
  runOscillationScenario,
} from "../../packages/physics-mechanics/src";

describe("Phase 13 Oscillation Gallery projects", () => {
  it.each(OSCILLATION_EXAMPLE_IDS)(
    "%s executes through its public deterministic scenario API",
    (id) => {
      const result = runOscillationScenario(id);
      const directory = join(process.cwd(), "examples", "oscillations", id);
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
        category: "oscillations",
        topic: 17,
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
      expect(preview).toContain("share one labelled time");
      expect(pending.requiredWhenAvailable).toEqual([
        "example.physica",
        "expected.png",
        "preview.webm",
        "example.spec.ts",
      ]);
    },
  );

  it("reconciles all four projects exactly with the root ledger", () => {
    const ledger = JSON.parse(
      readFileSync(
        join(process.cwd(), "examples", "pending-artifacts.json"),
        "utf8",
      ),
    );
    for (const id of OSCILLATION_EXAMPLE_IDS)
      expect(
        ledger.examples.filter((entry: { id: string }) => entry.id === id),
      ).toHaveLength(1);
  });
});
