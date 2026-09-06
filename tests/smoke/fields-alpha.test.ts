import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateFieldWorkflow } from "../../apps/desktop/src/field-analysis";
import { FIELD_WORKFLOWS } from "../../apps/desktop/src/field-workflows";
import {
  PROJECT_TEMPLATES,
  createEditorSession,
  physicsLibrary,
} from "../../apps/desktop/src/teacher-editor/editor-model";

describe("Fields/AC Alpha teacher workflows", () => {
  it("provides eight finite no-code workflows with explicit assumptions", () => {
    expect(FIELD_WORKFLOWS.map((workflow) => workflow.id)).toEqual([
      "gravity",
      "orbit",
      "electric-field",
      "particle",
      "magnetic-force",
      "induction",
      "ac",
      "transformer",
    ]);
    for (const workflow of FIELD_WORKFLOWS) {
      const analysis = calculateFieldWorkflow(workflow.id, workflow.defaults);
      expect(analysis.values.length).toBeGreaterThanOrEqual(3);
      expect(
        analysis.values.every(
          ([, value]) => !value.includes("NaN") && !value.includes("Infinity"),
        ),
      ).toBe(true);
      expect(Object.values(analysis.state).every(Number.isFinite)).toBe(true);
      expect(workflow.assumptions.length).toBeGreaterThanOrEqual(2);
      expect(analysis.validation.length).toBeGreaterThan(20);
      for (const control of workflow.controls) {
        expect(workflow.defaults[control.key]).toBeGreaterThanOrEqual(
          control.min,
        );
        expect(workflow.defaults[control.key]).toBeLessThanOrEqual(control.max);
      }
    }
  });

  it("uses one source for gravitational field and potential and one orbit state", () => {
    const gravity = calculateFieldWorkflow(
      "gravity",
      FIELD_WORKFLOWS[0]!.defaults,
    );
    expect(gravity.state.field).toBeLessThan(0);
    expect(gravity.state.potential).toBeLessThan(0);
    const orbit = calculateFieldWorkflow("orbit", FIELD_WORKFLOWS[1]!.defaults);
    expect(orbit.graph).toHaveLength(81);
    expect(orbit.state.energy).toBeLessThan(0);
  });

  it("keeps electric trajectory, AC cursor and RMS display synchronized", () => {
    const particle = calculateFieldWorkflow(
      "particle",
      FIELD_WORKFLOWS[3]!.defaults,
    );
    expect(particle.graph).toHaveLength(61);
    expect(particle.state.x).toBeCloseTo(0.02, 12);
    const ac = calculateFieldWorkflow("ac", FIELD_WORKFLOWS[6]!.defaults);
    expect(ac.graph).toHaveLength(101);
    expect(ac.state.time).toBe(0.005);
    expect(ac.state.instantaneous).toBeCloseTo(325, 10);
    expect(ac.state.rms).toBeCloseTo(325 / Math.sqrt(2), 10);
  });

  it("ships semantic diagrams, native controls, focus and reduced-motion support", () => {
    const workbench = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "FieldsWorkbench.tsx"),
      "utf8",
    );
    const diagram = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "FieldDiagram.tsx"),
      "utf8",
    );
    const styles = readFileSync(
      join(process.cwd(), "apps", "desktop", "src", "fields-workbench.css"),
      "utf8",
    );
    expect(workbench).toContain('type="range"');
    expect(workbench).toContain('aria-live="polite"');
    expect(workbench).toContain("aria-pressed");
    expect(diagram.match(/role="img"/gu)?.length).toBeGreaterThanOrEqual(5);
    expect(diagram).toContain("polarity");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain("focus-visible");
  });

  it("registers and instantiates all eight no-code field Author templates", () => {
    const ids = [
      "gravity-field",
      "circular-orbit",
      "electric-field",
      "charged-particle-plates",
      "magnetic-force",
      "induction",
      "ac-rms",
      "transformer",
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
      expect(session.store.document.metadata.tags).toContain("fields-ac-alpha");
    }
  });
});
