import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expected from "./expected-output.json";
import { runHistogramLive } from "./run";
describe("histogram-live example", () => {
  it("derives deterministic bars and a reference amplitude spectrum", () => {
    expect(runHistogramLive()).toEqual(expected);
    expect(expected.histogram).toMatchObject({
      counts: [2, 3, 1, 2],
      bars: 4,
      excluded: 0,
    });
    expect(expected.spectrum).toMatchObject({
      peakFrequencyHz: 2,
      peakAmplitudeV: 1,
      algorithm: "direct-real-dft-v1",
    });
  });
  it("ships an accessible preview", () => {
    const svg = readFileSync(
      new URL("expected-preview.svg", import.meta.url),
      "utf8",
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain("2 Hz");
    expect(svg).toContain("DIRECT DFT");
  });
});
