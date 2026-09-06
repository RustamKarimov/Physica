import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateElectricity } from "../../apps/desktop/src/electricity-analysis";
import { ELECTRICITY_WORKFLOWS } from "../../apps/desktop/src/electricity-workflows";
import {
  PROJECT_TEMPLATES,
  createEditorSession,
  physicsLibrary,
} from "../../apps/desktop/src/teacher-editor/editor-model";

describe("Electricity/Circuits Alpha teacher workflows", () => {
  it("provides six finite no-code workflows with explicit assumptions", () => {
    expect(ELECTRICITY_WORKFLOWS.map((workflow) => workflow.id)).toEqual([
      "charge-current",
      "iv",
      "resistivity-power",
      "network",
      "internal-divider",
      "rc",
    ]);
    for (const workflow of ELECTRICITY_WORKFLOWS) {
      const analysis = calculateElectricity(workflow.id, workflow.defaults);
      expect(analysis.values.length).toBeGreaterThanOrEqual(3);
      expect(
        analysis.values.every(
          ([, value]) => !value.includes("NaN") && !value.includes("Infinity"),
        ),
      ).toBe(true);
      expect(workflow.assumptions.length).toBeGreaterThan(0);
      expect(analysis.validation.length).toBeGreaterThan(20);
      for (const control of workflow.controls) {
        expect(workflow.defaults[control.key]).toBeGreaterThanOrEqual(
          control.min,
        );
        expect(workflow.defaults[control.key]).toBeLessThanOrEqual(control.max);
      }
    }
  });

  it("uses one solved network for currents, node potential and residual diagnostics", () => {
    const defaults = ELECTRICITY_WORKFLOWS.find(
      (workflow) => workflow.id === "network",
    )!.defaults;
    const analysis = calculateElectricity("network", defaults);
    expect(analysis.state.seriesCurrent).toBeCloseTo(
      analysis.state.currentA! + analysis.state.currentB!,
      12,
    );
    expect(analysis.state.junction).toBeCloseTo(4, 12);
    expect(analysis.validation).toContain("KCL");
    expect(analysis.validation).toContain("KVL");
    const open = calculateElectricity("network", { ...defaults, e: 0 });
    expect(open.state.switchClosed).toBe(0);
    expect(open.state.currentB).toBe(0);
    expect(open.state.seriesCurrent).toBeCloseTo(open.state.currentA!, 12);
    expect(open.state.seriesCurrent).not.toBeCloseTo(
      analysis.state.seriesCurrent!,
      12,
    );
  });

  it("uses one named-clock RC state for graph, charge, voltage and current", () => {
    const defaults = ELECTRICITY_WORKFLOWS.find(
      (workflow) => workflow.id === "rc",
    )!.defaults;
    const analysis = calculateElectricity("rc", defaults);
    expect(analysis.graph).toHaveLength(101);
    expect(analysis.state.time).toBe(defaults.d);
    expect(analysis.state.tau).toBeCloseTo(1, 12);
    expect(analysis.state.voltage).toBeCloseTo(12 * (1 - Math.exp(-1)), 12);
    expect(analysis.state.charge).toBeCloseTo(
      0.0005 * analysis.state.voltage!,
      12,
    );
  });

  it("keeps semantic diagrams, native controls, focus and reduced-motion support", () => {
    const workbench = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "ElectricityWorkbench.tsx"),
      "utf8",
    );
    const diagram = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "ElectricityDiagram.tsx"),
      "utf8",
    );
    const styles = readFileSync(
      join(
        process.cwd(),
        "apps",
        "desktop",
        "src",
        "electricity-workbench.css",
      ),
      "utf8",
    );
    expect(workbench).toContain("aria-pressed");
    expect(workbench).toContain('type="range"');
    expect(workbench).toContain('aria-live="polite"');
    expect(workbench).toContain("el-switch-control");
    expect(diagram.match(/role="img"/gu)?.length).toBeGreaterThanOrEqual(4);
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain("focus-visible");
  });

  it("registers and instantiates all six no-code electrical Author templates", () => {
    const ids = [
      "charge-current",
      "iv-characteristics",
      "resistivity",
      "dc-network",
      "cell-divider",
      "rc-charging",
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
        "electricity-circuits-alpha",
      );
    }
  });
});
