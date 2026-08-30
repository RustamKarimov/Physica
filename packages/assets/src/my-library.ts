import { canonicalParseJson, canonicalStringify } from "@physica/serialization";
import {
  createPhysicsLibraryRegistries,
  libraryError,
  type InstrumentDefinition,
  type LibraryItemDefinition,
  type LibraryResult,
  type MaterialPresetDefinition,
  type PhysicsLibraryRegistries,
  type PrefabDefinition,
} from "@physica/plugin-sdk";
import { PhysicsLibraryCatalog } from "./catalog";

export const MY_LIBRARY_SCHEMA_VERSION = 1 as const;

export interface MyLibraryBundle {
  readonly schemaVersion: typeof MY_LIBRARY_SCHEMA_VERSION;
  readonly libraryItems: readonly LibraryItemDefinition[];
  readonly prefabs: readonly PrefabDefinition[];
  readonly instruments: readonly InstrumentDefinition[];
  readonly materialPresets: readonly MaterialPresetDefinition[];
}

function invalid(message: string, path = ""): LibraryResult<never> {
  return {
    ok: false,
    error: libraryError(
      "invalid-my-library-manifest",
      "invalid-my-library-manifest",
      message,
      { path },
    ),
  };
}

function registerBundle(
  registries: PhysicsLibraryRegistries,
  bundle: MyLibraryBundle,
): LibraryResult<void> {
  const definitions = [
    ...bundle.libraryItems,
    ...bundle.prefabs,
    ...bundle.instruments,
    ...bundle.materialPresets,
  ];
  if (definitions.some((entry) => entry.source.kind !== "my-library"))
    return invalid(
      "My Library bundles may only contain definitions with a my-library source.",
      "source.kind",
    );
  const validations = [
    registries.prefabs.validateMany(bundle.prefabs),
    registries.instruments.validateMany(bundle.instruments),
    registries.materials.validateMany(bundle.materialPresets),
    registries.library.validateMany(bundle.libraryItems),
  ];
  const failed = validations.find((result) => !result.ok);
  if (failed && !failed.ok) return failed;
  const prefabIds = new Set([
    ...registries.prefabs.list().map((entry) => entry.id),
    ...bundle.prefabs.map((entry) => entry.id),
  ]);
  const instrumentIds = new Set([
    ...registries.instruments.list().map((entry) => entry.id),
    ...bundle.instruments.map((entry) => entry.id),
  ]);
  const materialIds = new Set([
    ...registries.materials.list().map((entry) => entry.id),
    ...bundle.materialPresets.map((entry) => entry.id),
  ]);
  for (const instrument of bundle.instruments) {
    if (!prefabIds.has(instrument.prefabId))
      return {
        ok: false,
        error: libraryError(
          "registry-reference-missing",
          "instrument-prefab-missing",
          "A My Library instrument references a missing prefab.",
          { definitionId: instrument.id, path: "prefabId" },
        ),
      };
  }
  for (const item of bundle.libraryItems) {
    const creation = item.creation;
    const exists =
      creation.kind === "prefab"
        ? prefabIds.has(creation.definitionId)
        : creation.kind === "instrument"
          ? instrumentIds.has(creation.definitionId)
          : materialIds.has(creation.definitionId);
    if (!exists)
      return {
        ok: false,
        error: libraryError(
          "registry-reference-missing",
          "my-library-creation-missing",
          "A My Library item references a missing creation definition.",
          { definitionId: item.id, path: "creation.definitionId" },
        ),
      };
  }
  // Every validation and cross-reference check completes before mutation.
  // These four registrations cannot fail in the synchronous registry model.
  const prefabResult = registries.prefabs.registerMany(bundle.prefabs);
  if (!prefabResult.ok) return prefabResult;
  const instrumentResult = registries.instruments.registerMany(
    bundle.instruments,
  );
  if (!instrumentResult.ok) return instrumentResult;
  const materialResult = registries.materials.registerMany(
    bundle.materialPresets,
  );
  if (!materialResult.ok) return materialResult;
  const itemResult = registries.library.registerMany(bundle.libraryItems);
  if (!itemResult.ok) return itemResult;
  const references = new PhysicsLibraryCatalog(registries).validateReferences();
  if (!references.ok) return references;
  return { ok: true, value: undefined };
}

export function exportMyLibraryBundle(
  bundle: MyLibraryBundle,
): LibraryResult<string> {
  const validationRegistries = createPhysicsLibraryRegistries();
  const registration = registerBundle(validationRegistries, bundle);
  if (!registration.ok) return registration;
  const serialized = canonicalStringify(bundle);
  return serialized.ok
    ? { ok: true, value: serialized.value }
    : invalid(serialized.error.message, serialized.error.path);
}

export function importMyLibraryBundle(
  text: string,
): LibraryResult<MyLibraryBundle> {
  const parsed = canonicalParseJson(text);
  if (!parsed.ok) return invalid(parsed.error.message, parsed.error.path);
  const value = parsed.value;
  if (value === null || Array.isArray(value) || typeof value !== "object")
    return invalid("My Library JSON must contain an object.", "$");
  const record = value as import("@physica/core-model").JsonObject;
  if (record.schemaVersion !== MY_LIBRARY_SCHEMA_VERSION)
    return {
      ok: false,
      error: libraryError(
        "unsupported-manifest-version",
        "unsupported-my-library-version",
        "The My Library bundle schema version is unsupported.",
        { path: "schemaVersion" },
      ),
    };
  if (
    !Array.isArray(record.libraryItems) ||
    !Array.isArray(record.prefabs) ||
    !Array.isArray(record.instruments) ||
    !Array.isArray(record.materialPresets)
  )
    return invalid("My Library definition collections must be arrays.", "$");
  const bundle = record as unknown as MyLibraryBundle;
  const registries = createPhysicsLibraryRegistries();
  const registration = registerBundle(registries, bundle);
  if (!registration.ok) return registration;
  return { ok: true, value: bundle };
}

export class MyLibraryStore {
  readonly registries = createPhysicsLibraryRegistries();
  readonly catalog = new PhysicsLibraryCatalog(this.registries);

  add(bundle: MyLibraryBundle): LibraryResult<void> {
    return registerBundle(this.registries, bundle);
  }

  removeItem(
    id: LibraryItemDefinition["id"],
  ): LibraryResult<LibraryItemDefinition> {
    return this.registries.library.unregister(id);
  }

  bundle(): MyLibraryBundle {
    return Object.freeze({
      schemaVersion: MY_LIBRARY_SCHEMA_VERSION,
      libraryItems: this.registries.library.list(),
      prefabs: this.registries.prefabs.list(),
      instruments: this.registries.instruments.list(),
      materialPresets: this.registries.materials.list(),
    });
  }

  export(): LibraryResult<string> {
    return exportMyLibraryBundle(this.bundle());
  }
}
