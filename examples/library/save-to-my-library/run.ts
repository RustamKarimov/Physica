import {
  createBuiltInPhysicsLibrary,
  exportMyLibraryBundle,
  importMyLibraryBundle,
  type MyLibraryBundle,
} from "@physica/assets";
import { registeredTypeId } from "@physica/core-model";

export function runExample() {
  const builtIn = createBuiltInPhysicsLibrary();
  const source = {
    kind: "my-library" as const,
    sourcePackage: "my-library",
  };
  const originalPrefab = builtIn.registries.prefabs.get(
    registeredTypeId("physica:prefab/ball"),
  )!;
  const prefab = {
    ...originalPrefab,
    id: registeredTypeId("teacher:prefab/ball"),
    source,
  };
  const originalItem = builtIn.registries.library.get(
    registeredTypeId("physica:library/ball"),
  )!;
  const item = {
    ...originalItem,
    id: registeredTypeId("teacher:library/ball"),
    source,
    creation: { kind: "prefab" as const, definitionId: prefab.id },
  };
  const bundle: MyLibraryBundle = {
    schemaVersion: 1,
    libraryItems: [item],
    prefabs: [prefab],
    instruments: [],
    materialPresets: [],
  };
  const exported = exportMyLibraryBundle(bundle);
  const imported = exported.ok
    ? importMyLibraryBundle(exported.value)
    : exported;
  return {
    id: "save-to-my-library",
    schemaVersion: 1,
    sourceKind: item.source.kind,
    portable: exported.ok && imported.ok,
  };
}
