import { DeterministicIdFactory } from "@physica/core-model";
import {
  ControlInputStore,
  createControlAction,
  type InteractiveControlV1,
} from "@physica/controls";

export function runLiveParameterBinding() {
  const ids = new DeterministicIdFactory(2_320_000);
  const gravity: InteractiveControlV1 = {
    id: ids.controlId(),
    kind: "slider",
    name: "Gravity",
    accessibleLabel: "Gravitational field strength",
    binding: { kind: "live-runtime-input", key: "world.gravity" },
    range: { minimum: 0, maximum: 20, step: 0.5 },
    canonicalUnit: "m/s^2",
  };
  const length: InteractiveControlV1 = {
    id: ids.controlId(),
    kind: "number-unit",
    name: "String length",
    accessibleLabel: "String length",
    binding: { kind: "document-parameter", path: "pendulum.length" },
    canonicalUnit: "m",
    displayUnit: "cm",
  };
  const trails: InteractiveControlV1 = {
    id: ids.controlId(),
    kind: "toggle",
    name: "Trails",
    accessibleLabel: "Show motion trail",
    binding: { kind: "presentation-property", path: "trail.visible" },
  };
  const gravityAction = createControlAction(gravity, {
    kind: "scalar",
    value: 9.7,
  });
  const lengthAction = createControlAction(length, {
    kind: "scalar",
    value: 250,
    unit: "cm",
  });
  const trailAction = createControlAction(trails, {
    kind: "boolean",
    value: true,
  });
  if (!gravityAction.ok || !lengthAction.ok || !trailAction.ok)
    throw new Error("control-action-failed");
  const store = new ControlInputStore();
  store.enqueue(gravityAction.value);
  store.applyQueued();
  return {
    id: "live-parameter-binding",
    gravity: store.read("world.gravity"),
    documentValue: lengthAction.value.value,
    documentRoute: lengthAction.value.route,
    presentationValue: trailAction.value.value,
    presentationRoute: trailAction.value.route,
    projectMutation: false,
  };
}
