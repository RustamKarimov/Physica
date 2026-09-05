import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateWaveOptics } from "../../apps/desktop/src/wave-optics-analysis";
import { WAVE_OPTICS_WORKFLOWS } from "../../apps/desktop/src/wave-optics-workflows";

describe("Wave/Optics Alpha teacher workflows", () => {
  it("provides five finite no-code workflows with explicit assumptions", () => {
    expect(WAVE_OPTICS_WORKFLOWS.map((workflow) => workflow.id)).toEqual([
      "progressive",
      "standing",
      "double-slit",
      "ray-lens",
      "polarization",
    ]);
    for (const workflow of WAVE_OPTICS_WORKFLOWS) {
      const analysis = calculateWaveOptics(workflow.id, workflow.defaults);
      expect(analysis.values.length).toBeGreaterThanOrEqual(3);
      expect(
        analysis.values.every(
          ([, value]) => !value.includes("NaN") && !value.includes("Infinity"),
        ),
      ).toBe(true);
      expect(workflow.assumptions.length).toBeGreaterThan(0);
      expect(analysis.validation.length).toBeGreaterThan(30);
      for (const control of workflow.controls) {
        expect(workflow.defaults[control.key]).toBeGreaterThanOrEqual(
          control.min,
        );
        expect(workflow.defaults[control.key]).toBeLessThanOrEqual(control.max);
      }
    }
  });

  it("uses one double-slit sample set for its strip and graph", () => {
    const defaults = WAVE_OPTICS_WORKFLOWS.find(
      (workflow) => workflow.id === "double-slit",
    )!.defaults;
    const first = calculateWaveOptics("double-slit", defaults);
    const changed = calculateWaveOptics("double-slit", {
      ...defaults,
      a: 700,
    });
    const raw = first.raw as {
      samples: readonly {
        screenPositionMetres: number;
        state: { normalizedIntensity: number };
      }[];
      centre: { approximateFringeSpacingMetres: number };
    };
    const changedRaw = changed.raw as {
      centre: { approximateFringeSpacingMetres: number };
    };
    expect(raw.samples).toHaveLength(121);
    expect(raw.samples[60]).toMatchObject({
      screenPositionMetres: 0,
      state: { normalizedIntensity: 1 },
    });
    expect(changedRaw.centre.approximateFringeSpacingMetres).toBeGreaterThan(
      raw.centre.approximateFringeSpacingMetres,
    );
  });

  it("keeps semantic selection and reduced-motion declarations in the public UI", () => {
    const workbench = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "WaveOpticsWorkbench.tsx"),
      "utf8",
    );
    const styles = readFileSync(
      join(
        process.cwd(),
        "apps",
        "desktop",
        "src",
        "wave-optics-workbench.css",
      ),
      "utf8",
    );
    expect(workbench).toContain("aria-pressed");
    expect(workbench).toContain('type="range"');
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain("focus-visible");
  });
});
