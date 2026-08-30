import { createBuiltInPhysicsLibrary } from "@physica/assets";

export function runExample() {
  const catalog = createBuiltInPhysicsLibrary();
  return (() => {
    const item = catalog.search({
      text: "pulley mass setup",
      itemClasses: ["prefab"],
    })[0]!;
    return {
      id: "drag-prefab",
      item: item.displayName,
      itemClass: item.itemClass,
      prefabRegistered:
        item.creation.kind === "prefab" &&
        catalog.registries.prefabs.has(item.creation.definitionId),
    };
  })();
}
