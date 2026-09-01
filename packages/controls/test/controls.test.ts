import { describe, expect, it } from "vitest";
import { DeterministicIdFactory } from "@physica/core-model";
import { SCHEDULER_PHASES } from "@physica/runtime-scheduler";
import {
  ControlInputStore,
  createControlAction,
  createControlInputTask,
  createInteractiveControlEnvelope,
  listControlKinds,
  parseInteractiveControlEnvelope,
  routeControlAction,
  type ControlAction,
  type InteractiveControlV1,
} from "../src";

function controls(): readonly InteractiveControlV1[] {
  const ids = new DeterministicIdFactory(210_000);
  return [
    {
      id: ids.controlId(),
      kind: "slider",
      name: "Gravity",
      accessibleLabel: "Gravity",
      binding: { kind: "live-runtime-input", key: "gravity" },
      range: { minimum: 0, maximum: 20, step: 0.5 },
      canonicalUnit: "m/s^2",
    },
    {
      id: ids.controlId(),
      kind: "number-unit",
      name: "Length",
      accessibleLabel: "Length",
      binding: { kind: "document-parameter", path: "body.length" },
      canonicalUnit: "m",
      displayUnit: "cm",
    },
    {
      id: ids.controlId(),
      kind: "toggle",
      name: "Trails",
      accessibleLabel: "Show trails",
      binding: { kind: "presentation-property", path: "trail.visible" },
    },
    {
      id: ids.controlId(),
      kind: "button",
      name: "Reset",
      accessibleLabel: "Reset",
      binding: { kind: "initial-physical-state", path: "body.reset" },
    },
    {
      id: ids.controlId(),
      kind: "vector-handle",
      name: "Velocity",
      accessibleLabel: "Initial velocity",
      binding: {
        kind: "initial-physical-state",
        path: "projectile.velocity",
      },
      step: 0.1,
    },
    {
      id: ids.controlId(),
      kind: "physical-drag",
      name: "Move body",
      accessibleLabel: "Move physical body",
      binding: { kind: "live-runtime-input", key: "body.position" },
      mode: "live",
    },
    {
      id: ids.controlId(),
      kind: "layout-drag",
      name: "Move label",
      accessibleLabel: "Move label layout",
      binding: { kind: "layout-property", path: "label.position" },
    },
    {
      id: ids.controlId(),
      kind: "probe",
      name: "Speed",
      accessibleLabel: "Measured speed",
      binding: { kind: "measurement-probe", key: "body.speed" },
      displayUnit: "m/s",
    },
  ];
}

describe("interactive controls", () => {
  it("round-trips all eight persisted control kinds and exposes keyboard metadata", () => {
    for (const definition of controls()) {
      const envelope = createInteractiveControlEnvelope(definition);
      expect(envelope.ok).toBe(true);
      if (!envelope.ok) continue;
      expect(parseInteractiveControlEnvelope(envelope.value)).toEqual({
        ok: true,
        value: definition,
      });
      expect(Object.isFrozen(envelope.value.configuration)).toBe(true);
    }
    expect(listControlKinds()).toHaveLength(8);
    expect(
      listControlKinds().every((kind) => kind.keyboardBehavior.length > 0),
    ).toBe(true);
  });

  it("clamps, snaps and converts display units through the central registry", () => {
    const [slider, numberUnit] = controls();
    const sliderAction = createControlAction(slider!, {
      kind: "scalar",
      value: 19.76,
    });
    expect(sliderAction).toMatchObject({
      ok: true,
      value: {
        route: "live-runtime-input",
        target: "gravity",
        value: { kind: "scalar", value: 20, unit: "m/s^2" },
      },
    });
    const lengthAction = createControlAction(numberUnit!, {
      kind: "scalar",
      value: 250,
      unit: "cm",
    });
    expect(lengthAction).toMatchObject({
      ok: true,
      value: {
        route: "document-command",
        value: { kind: "scalar", value: 2.5, unit: "m" },
      },
    });
    const incompatible = createControlAction(numberUnit!, {
      kind: "scalar",
      value: 2,
      unit: "s",
    });
    expect(incompatible).toMatchObject({
      ok: false,
      error: { code: "incompatible-unit" },
    });
  });

  it("keeps physical and layout drags on distinct owner routes", () => {
    const physical = controls()[5]!;
    const layout = controls()[6]!;
    const physicalAction = createControlAction(physical, {
      kind: "vec2",
      x: 2,
      y: 3,
    });
    const layoutAction = createControlAction(layout, {
      kind: "vec2",
      x: 20,
      y: 30,
    });
    expect(physicalAction).toMatchObject({
      ok: true,
      value: { route: "live-runtime-input", target: "body.position" },
    });
    expect(layoutAction).toMatchObject({
      ok: true,
      value: { route: "layout", target: "label.position" },
    });
  });

  it("routes actions without directly mutating a project and rejects probes", () => {
    const project = Object.freeze({ parameter: 1 });
    const routed: string[] = [];
    const action = createControlAction(controls()[1]!, {
      kind: "scalar",
      value: 1,
      unit: "m",
    });
    if (!action.ok) throw new Error(action.error.message);
    routeControlAction(action.value, {
      dispatchDocumentCommand: () => routed.push("document"),
      dispatchInitialStateCommand: () => routed.push("initial"),
      enqueueLiveInput: () => routed.push("live"),
      applyPresentationAction: () => routed.push("presentation"),
      applyLayoutAction: () => routed.push("layout"),
    });
    expect(routed).toEqual(["document"]);
    expect(project).toEqual({ parameter: 1 });
    expect(
      createControlAction(controls()[7]!, { kind: "scalar", value: 2 }),
    ).toMatchObject({
      ok: false,
      error: { code: "read-only-control" },
    });
  });

  it("applies queued live input in document/control phase and in queue order", () => {
    const store = new ControlInputStore();
    const definition = controls()[0]!;
    const actions = [2, 4].map((value) =>
      createControlAction(definition, { kind: "scalar", value }),
    );
    for (const action of actions)
      if (action.ok) store.enqueue(action.value as ControlAction);
    expect(store.read("gravity")).toBeUndefined();
    const task = createControlInputTask({ key: "test", store });
    expect(task.phaseId).toBe(SCHEDULER_PHASES.documentControl);
    expect(store.applyQueued()).toBe(2);
    expect(store.read("gravity")).toEqual({
      kind: "scalar",
      value: 4,
      unit: "m/s^2",
    });
  });
});
