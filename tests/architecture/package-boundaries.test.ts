import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const checker = path.resolve(
  testDirectory,
  "../../tools/architecture/check-boundaries.mjs",
);
const fixtures = path.resolve(testDirectory, "../fixtures/architecture");

describe("package boundary checker", () => {
  it("accepts an approved renderer dependency direction", () => {
    const result = spawnSync(
      process.execPath,
      [checker, path.join(fixtures, "allowed")],
      {
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Architecture boundaries passed.");
  });

  it("rejects a physics package importing React", () => {
    const result = spawnSync(
      process.execPath,
      [checker, path.join(fixtures, "forbidden")],
      {
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "physics packages must not depend on React/editor internals",
    );
  });
});
