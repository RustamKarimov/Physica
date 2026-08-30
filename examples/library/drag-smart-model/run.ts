import { createBuiltInPhysicsLibrary } from "@physica/assets";

export function runExample() {
  const catalog = createBuiltInPhysicsLibrary();
  return (() => {
    const item = catalog.search({
      text: "ball",
      itemClasses: ["smart-model"],
    })[0]!;
    const drag = catalog.dragPayload(item);
    return {
      id: "drag-smart-model",
      item: item.displayName,
      itemClass: item.itemClass,
      dragKind: drag.kind,
    };
  })();
}
