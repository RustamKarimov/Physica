import type { PluginId, RegisteredTypeId } from "@physica/core-model";
import { libraryError, type LibraryResult } from "./errors";
import type { PhysicsLibraryRegistries } from "./registry";
import type {
  DeclarativeLibraryContributions,
  DeclarativePluginManifest,
  LibrarySource,
} from "./types";

function pluginSource(source: LibrarySource, pluginId: PluginId): boolean {
  return source.kind === "plugin" && source.pluginId === pluginId;
}

function pluginNamespace(id: RegisteredTypeId, pluginId: PluginId): boolean {
  return id.startsWith(`${pluginId}:`);
}

export function registerDeclarativeLibraryPlugin(
  manifest: DeclarativePluginManifest,
  contributions: DeclarativeLibraryContributions,
  registries: PhysicsLibraryRegistries,
): LibraryResult<void> {
  if (!manifest.version.trim() || !manifest.compatibleCoreRange.trim())
    return {
      ok: false,
      error: libraryError(
        "invalid-definition",
        "invalid-plugin-manifest",
        "Plugin version and compatible core range are required.",
      ),
    };

  const sourced = [
    ...contributions.libraryItems.map((entry) => ({
      id: entry.id,
      source: entry.source,
    })),
    ...contributions.prefabs.map((entry) => ({
      id: entry.id,
      source: entry.source,
    })),
    ...contributions.instruments.map((entry) => ({
      id: entry.id,
      source: entry.source,
    })),
    ...contributions.materialPresets.map((entry) => ({
      id: entry.id,
      source: entry.source,
    })),
  ];
  for (const entry of sourced) {
    if (
      !pluginNamespace(entry.id, manifest.id) ||
      !pluginSource(entry.source, manifest.id)
    )
      return {
        ok: false,
        error: libraryError(
          "plugin-namespace-mismatch",
          "plugin-namespace-mismatch",
          `Plugin contribution ${entry.id} does not use the plugin namespace/source.`,
          { definitionId: entry.id },
        ),
      };
  }

  const validations = [
    registries.prefabs.validateMany(contributions.prefabs),
    registries.instruments.validateMany(contributions.instruments),
    registries.materials.validateMany(contributions.materialPresets),
    registries.library.validateMany(contributions.libraryItems),
  ];
  const failed = validations.find((result) => !result.ok);
  if (failed && !failed.ok) return failed;

  const registered: Array<{
    readonly registry: { unregister(id: RegisteredTypeId): unknown };
    readonly id: RegisteredTypeId;
  }> = [];
  const rollback = (): void => {
    for (const entry of registered.reverse())
      entry.registry.unregister(entry.id);
  };
  try {
    for (const entry of contributions.prefabs) {
      const result = registries.prefabs.register(entry);
      if (!result.ok) {
        rollback();
        return result;
      }
      registered.push({ registry: registries.prefabs, id: entry.id });
    }
    for (const entry of contributions.instruments) {
      const result = registries.instruments.register(entry);
      if (!result.ok) {
        rollback();
        return result;
      }
      registered.push({ registry: registries.instruments, id: entry.id });
    }
    for (const entry of contributions.materialPresets) {
      const result = registries.materials.register(entry);
      if (!result.ok) {
        rollback();
        return result;
      }
      registered.push({ registry: registries.materials, id: entry.id });
    }
    for (const entry of contributions.libraryItems) {
      const result = registries.library.register(entry);
      if (!result.ok) {
        rollback();
        return result;
      }
      registered.push({ registry: registries.library, id: entry.id });
    }
    return { ok: true, value: undefined };
  } catch {
    rollback();
    return {
      ok: false,
      error: libraryError(
        "invalid-definition",
        "plugin-registration-failed",
        "Declarative plugin registration failed atomically.",
      ),
    };
  }
}
