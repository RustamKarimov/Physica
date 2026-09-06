import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateThermalWorkflow } from "../../apps/desktop/src/thermal-analysis";
import { THERMAL_WORKFLOWS } from "../../apps/desktop/src/thermal-workflows";
import {
  PROJECT_TEMPLATES,
  createEditorSession,
  physicsLibrary,
} from "../../apps/desktop/src/teacher-editor/editor-model";

describe("Thermal/Gases Alpha teacher workflows", () => {
  it("provides six finite no-code workflows with explicit assumptions", () => {
    expect(THERMAL_WORKFLOWS.map((workflow) => workflow.id)).toEqual([
      "temperature",
      "ideal-gas",
      "particles",
      "brownian",
      "first-law",
      "pv-process",
    ]);
    for (const workflow of THERMAL_WORKFLOWS) {
      const analysis = calculateThermalWorkflow(workflow.id, workflow.defaults);
      expect(analysis.values.length).toBeGreaterThanOrEqual(4);
      expect(
        analysis.values.every(
          ([, result]) =>
            !result.includes("NaN") && !result.includes("Infinity"),
        ),
      ).toBe(true);
      expect(Object.values(analysis.state).every(Number.isFinite)).toBe(true);
      expect(workflow.assumptions.length).toBeGreaterThanOrEqual(3);
      for (const control of workflow.controls) {
        expect(workflow.defaults[control.key]).toBeGreaterThanOrEqual(
          control.min,
        );
        expect(workflow.defaults[control.key]).toBeLessThanOrEqual(control.max);
      }
    }
  });

  it("keeps temperature pairs, particle state and P–V work synchronized", () => {
    const temperature = calculateThermalWorkflow(
      "temperature",
      THERMAL_WORKFLOWS[0]!.defaults,
    );
    expect(temperature.state.hot).toBeGreaterThan(temperature.state.cool!);
    expect(temperature.graph).toHaveLength(61);
    const particles = calculateThermalWorkflow(
      "particles",
      THERMAL_WORKFLOWS[2]!.defaults,
    );
    expect(particles.particles).toHaveLength(24);
    const pv = calculateThermalWorkflow(
      "pv-process",
      THERMAL_WORKFLOWS[5]!.defaults,
    );
    expect(pv.state.work).toBeGreaterThan(0);
    expect(pv.state.heat).toBeCloseTo(pv.state.work!, 10);
  });

  it("ships semantic diagrams, native controls, focus and reduced-motion support", () => {
    const workbench = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "ThermalWorkbench.tsx"),
      "utf8",
    );
    const diagram = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "ThermalDiagram.tsx"),
      "utf8",
    );
    const styles = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "thermal-workbench.css"),
      "utf8",
    );
    expect(workbench).toContain('type="range"');
    expect(workbench).toContain('aria-live="polite"');
    expect(workbench).toContain("aria-pressed");
    expect(diagram.match(/role="img"/gu)?.length).toBeGreaterThanOrEqual(4);
    expect(diagram).toContain("sign");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain("focus-visible");
  });

  it("registers and instantiates six no-code thermal Author templates", () => {
    const ids = [
      "temperature-equilibrium",
      "thermometer-calibration",
      "ideal-gas",
      "particle-gas",
      "brownian-motion",
      "thermodynamic-process",
    ];
    expect(physicsLibrary.validateReferences()).toMatchObject({ ok: true });
    for (const id of ids) {
      const template = PROJECT_TEMPLATES.find(
        (candidate) => candidate.id === id,
      )!;
      expect(template).toBeDefined();
      const session = createEditorSession(template);
      expect(
        session.store.document.scenes[0]?.entityDefinitions.length,
      ).toBeGreaterThan(0);
      expect(session.store.document.metadata.tags).toContain(
        "thermal-gases-alpha",
      );
    }
  });
});
