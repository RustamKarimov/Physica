import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const exampleDirectory = path.resolve("examples/system/hello-stage");

describe("hello-stage bootstrap example", () => {
  it("contains metadata, documentation, and a deterministic expected preview", () => {
    const metadata = JSON.parse(
      fs.readFileSync(path.join(exampleDirectory, "example.json"), "utf8"),
    );
    expect(metadata).toMatchObject({
      id: "system/hello-stage",
      status: "bootstrap-only",
      preview: "expected-preview.svg",
    });
    expect(fs.existsSync(path.join(exampleDirectory, "README.md"))).toBe(true);
    expect(
      fs.readFileSync(path.join(exampleDirectory, metadata.preview), "utf8"),
    ).toContain("<svg");
  });
});
