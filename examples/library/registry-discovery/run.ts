import { createBuiltInPhysicsLibrary } from "@physica/assets";

export function runExample() {
  const catalog = createBuiltInPhysicsLibrary();
  return {
    id: "registry-discovery",
    libraryItems: catalog.registries.library.list().length,
    prefabs: catalog.registries.prefabs.list().length,
    instruments: catalog.registries.instruments.list().length,
    materials: catalog.registries.materials.list().length,
  };
}
