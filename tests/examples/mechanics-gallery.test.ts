import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MECHANICS_EXAMPLE_IDS,
  runMechanicsScenario,
} from "../../packages/physics-mechanics/src";

describe("Phase 8 mandatory Mechanics Gallery projects", () => {
  it.each(MECHANICS_EXAMPLE_IDS)(
    "%s executes through the shared runtime with exact artifacts",
    (id) => {
      const directory = join(process.cwd(), "examples", "mechanics", id);
      const expected = JSON.parse(
        readFileSync(join(directory, "expected-output.json"), "utf8"),
      );
      const metadata = JSON.parse(
        readFileSync(join(directory, "metadata.json"), "utf8"),
      );
      const pending = JSON.parse(
        readFileSync(join(directory, "pending-artifacts.json"), "utf8"),
      );
      const preview = readFileSync(
        join(directory, "expected-preview.svg"),
        "utf8",
      );
      expect(runMechanicsScenario(id)).toEqual(expected);
      expect(metadata).toMatchObject({
        id,
        category: "mechanics",
        entry: "run.ts",
        expectedPreview: "expected-preview.svg",
      });
      expect(existsSync(join(directory, "run.ts"))).toBe(true);
      expect(existsSync(join(directory, "README.md"))).toBe(true);
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

  it("reconciles every local declaration with the root pending ledger", () => {
    const ledger = JSON.parse(
      readFileSync(
        join(process.cwd(), "examples", "pending-artifacts.json"),
        "utf8",
      ),
    );
    const entries = new Map(
      ledger.examples.map((entry: { id: string; path: string }) => [
        entry.id,
        entry.path,
      ]),
    );
    for (const id of MECHANICS_EXAMPLE_IDS)
      expect(entries.get(id)).toBe(`examples/mechanics/${id}`);
  });

  it("keeps the whole Gallery ledger exact, unique and free of orphan paths", () => {
    const examplesRoot = join(process.cwd(), "examples");
    const ledger = JSON.parse(
      readFileSync(join(examplesRoot, "pending-artifacts.json"), "utf8"),
    ) as { examples: { id: string; path: string }[] };
    const declaredIds = ledger.examples.map((entry) => entry.id);
    const declaredPaths = ledger.examples.map((entry) => entry.path);
    const discovered = readdirSync(examplesRoot)
      .filter((category) =>
        statSync(join(examplesRoot, category)).isDirectory(),
      )
      .flatMap((category) =>
        readdirSync(join(examplesRoot, category))
          .filter((id) =>
            existsSync(join(examplesRoot, category, id, "metadata.json")),
          )
          .map((id) => ({
            id,
            path: `examples/${category}/${id}`,
          })),
      );

    expect(new Set(declaredIds).size).toBe(declaredIds.length);
    expect(new Set(declaredPaths).size).toBe(declaredPaths.length);
    expect(
      ledger.examples
        .map(({ id, path }) => ({ id, path }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ).toEqual(
      discovered.sort((left, right) => left.id.localeCompare(right.id)),
    );
  });
});
