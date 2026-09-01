import { DeterministicIdFactory } from "@physica/core-model";
import {
  createControlAction,
  type InteractiveControlV1,
} from "@physica/controls";

export function runPhysicalVsLayoutDrag() {
  const ids = new DeterministicIdFactory(2_330_000);
  const physical: InteractiveControlV1 = {
    id: ids.controlId(),
    kind: "physical-drag",
    name: "Move body",
    accessibleLabel: "Move physical body",
    binding: { kind: "live-runtime-input", key: "body.position" },
    mode: "live",
  };
  const layout: InteractiveControlV1 = {
    id: ids.controlId(),
    kind: "layout-drag",
    name: "Move label",
    accessibleLabel: "Move label layout",
    binding: { kind: "layout-property", path: "label.position" },
  };
  const physicalAction = createControlAction(physical, {
    kind: "vec2",
    x: 2,
    y: 3,
  });
  const layoutAction = createControlAction(layout, {
    kind: "vec2",
    x: 24,
    y: -12,
  });
  if (!physicalAction.ok || !layoutAction.ok)
    throw new Error("drag-action-failed");
  return {
    id: "physical-vs-layout-drag",
    physical: {
      route: physicalAction.value.route,
      target: physicalAction.value.target,
      value: physicalAction.value.value,
    },
    layout: {
      route: layoutAction.value.route,
      target: layoutAction.value.target,
      value: layoutAction.value.value,
    },
    sameAuthority: physicalAction.value.route === layoutAction.value.route,
  };
}
