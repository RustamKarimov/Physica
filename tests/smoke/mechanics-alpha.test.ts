import { describe, expect, it } from "vitest";
import { calculate } from "../../apps/desktop/src/mechanics-analysis";
import { WORKFLOWS } from "../../apps/desktop/src/mechanics-workflows";

describe("Mechanics Alpha teacher workflows", () => {
  it("provides seven no-code workflows with finite default results", () => {
    expect(WORKFLOWS.map((workflow) => workflow.id)).toEqual([
      "projectile",
      "incline",
      "pulley",
      "collision",
      "energy",
      "stress",
      "circular",
    ]);
    for (const workflow of WORKFLOWS) {
      const analysis = calculate(workflow.id, workflow.defaults);
      expect(analysis.values.length).toBeGreaterThanOrEqual(3);
      expect(analysis.values.every(([, value]) => !value.includes("NaN"))).toBe(
        true,
      );
      expect(analysis.validation.length).toBeGreaterThan(20);
      expect(workflow.assumptions.length).toBeGreaterThan(0);
      expect(workflow.controls.length).toBeGreaterThan(0);
    }
  });

  it("holds the projectile at ground contact after the landing event", () => {
    const analysis = calculate("projectile", { a: 20, b: 45, c: 5 });
    const state = analysis.raw as {
      positionMetres: { x: number; y: number };
    };
    expect(state.positionMetres.y).toBeCloseTo(0, 10);
    expect(analysis.validation).toContain("Ground contact occurs");
  });

  it("keeps each control's default inside its declared range", () => {
    for (const workflow of WORKFLOWS)
      for (const control of workflow.controls) {
        expect(workflow.defaults[control.key]).toBeGreaterThanOrEqual(
          control.min,
        );
        expect(workflow.defaults[control.key]).toBeLessThanOrEqual(control.max);
      }
  });
});
