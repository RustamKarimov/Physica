import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runSchemaRoundtrip } from "./run";

describe("schema-roundtrip example", () => {
  it("matches its checked-in expected output", () => {
    expect(runSchemaRoundtrip()).toEqual(expected);
  });
});
