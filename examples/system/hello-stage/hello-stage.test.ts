import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runHelloStage } from "./run";

const exampleDirectory = path.resolve("examples/system/hello-stage");

describe("hello-stage current-runtime example", () => {
  it("runs through the shared SVG renderer and matches its gallery artifacts", () => {
    const metadata = JSON.parse(
      fs.readFileSync(path.join(exampleDirectory, "metadata.json"), "utf8"),
    );
    expect(metadata).toMatchObject({
      id: "hello-stage",
      category: "system",
      entry: "run.ts",
      expectedPreview: "expected-preview.svg",
    });
    expect(runHelloStage()).toEqual(expected);
    expect(
      fs.readFileSync(
        path.join(exampleDirectory, metadata.expectedPreview),
        "utf8",
      ),
    ).toContain("<svg");
  });
});
