import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runSchedulerOrderTrace } from "./run";

describe("scheduler-order-trace example", () => {
  it("matches its checked-in expected output", () => {
    expect(runSchedulerOrderTrace()).toEqual(expected);
  });
});
