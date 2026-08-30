import {
  type DocumentReference,
  type IdFactory,
  type JsonValue,
  type PluginLockEntry,
  type SceneId,
} from "@physica/core-model";
import type {
  InstantiateLibraryItemPayload,
  LibraryInstantiationSnapshot,
} from "@physica/commands";
import {
  libraryError,
  type LibraryItemDefinition,
  type LibraryProjectSnapshotTemplate,
  type LibraryResult,
  type PrefabDefinition,
} from "@physica/plugin-sdk";
import { PhysicsLibraryCatalog } from "./catalog";

export interface LibraryInstantiationRequest {
  readonly itemId: LibraryItemDefinition["id"];
  readonly destinationSceneId: SceneId;
  readonly idFactory: IdFactory;
  readonly targetBindings?: Readonly<Record<string, DocumentReference>>;
  readonly availablePluginVersions?: Readonly<Record<string, string>>;
}

function remapValue<T>(value: T, ids: ReadonlyMap<string, string>): T {
  if (typeof value === "string") return (ids.get(value) ?? value) as T;
  if (Array.isArray(value))
    return value.map((entry) => remapValue(entry, ids)) as T;
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        remapValue(entry, ids),
      ]),
    ) as T;
  return value;
}

function bindReference(
  placeholder: DocumentReference,
  target: DocumentReference,
  ids: Map<string, string>,
): void {
  const placeholderFields = placeholder as unknown as Record<string, JsonValue>;
  const targetFields = target as unknown as Record<string, JsonValue>;
  for (const key of ["sceneId", "entityId", "id"]) {
    const from = placeholderFields[key];
    const to = targetFields[key];
    if (typeof from === "string" && typeof to === "string") ids.set(from, to);
  }
}

function createIdentityMap(
  prefab: PrefabDefinition,
  destinationSceneId: SceneId,
  idFactory: IdFactory,
  targetBindings: Readonly<Record<string, DocumentReference>>,
): LibraryResult<ReadonlyMap<string, string>> {
  const ids = new Map<string, string>();
  const snapshot = prefab.snapshot;
  ids.set(snapshot.templateSceneId, destinationSceneId);
  for (const asset of snapshot.assets) ids.set(asset.id, idFactory.assetId());
  for (const dataset of snapshot.datasets)
    ids.set(dataset.id, idFactory.datasetId());
  for (const entity of snapshot.entityDefinitions) {
    ids.set(entity.id, idFactory.entityId());
    for (const component of entity.componentInstances)
      ids.set(component.instanceId, idFactory.componentInstanceId());
  }
  for (const entry of snapshot.systemDefinitions)
    ids.set(entry.id, idFactory.systemId());
  for (const entry of snapshot.clockDefinitions)
    ids.set(entry.id, idFactory.clockId());
  for (const entry of snapshot.eventDefinitions)
    ids.set(entry.id, idFactory.eventDefinitionId());
  for (const entry of snapshot.relationshipDefinitions)
    ids.set(entry.id, idFactory.relationshipId());
  for (const entry of snapshot.representations)
    ids.set(entry.id, idFactory.representationId());
  for (const entry of snapshot.controls)
    ids.set(entry.id, idFactory.controlId());
  for (const entry of snapshot.equationDefinitions)
    ids.set(entry.id, idFactory.equationId());
  for (const entry of snapshot.graphDefinitions)
    ids.set(entry.id, idFactory.graphId());

  for (const slot of prefab.targetSlots) {
    const binding = targetBindings[slot.id];
    if (!binding) {
      if (slot.required)
        return {
          ok: false,
          error: libraryError(
            "incomplete-target",
            "required-target-slot-missing",
            "A required prefab target slot is not bound.",
            { definitionId: prefab.id, path: "targetSlots." + slot.id },
          ),
        };
      continue;
    }
    if (!slot.acceptedKinds.includes(binding.kind))
      return {
        ok: false,
        error: libraryError(
          "incompatible-target",
          "target-kind-incompatible",
          "A prefab target binding has an incompatible document kind.",
          { definitionId: prefab.id, path: "targetSlots." + slot.id },
        ),
      };
    bindReference(slot.placeholder, binding, ids);
  }
  return { ok: true, value: ids };
}

function pluginIssues(
  item: LibraryItemDefinition,
  available: Readonly<Record<string, string>>,
): LibraryResult<readonly PluginLockEntry[]> {
  for (const required of item.requiredPlugins) {
    const installed = available[required.pluginId];
    if (installed === undefined)
      return {
        ok: false,
        error: libraryError(
          "dependency-missing",
          "required-plugin-missing",
          "A plugin required by this Library item is unavailable.",
          { definitionId: item.id, path: "requiredPlugins" },
        ),
      };
    if (installed !== required.requiredVersion)
      return {
        ok: false,
        error: libraryError(
          "plugin-version-conflict",
          "required-plugin-version-mismatch",
          "A plugin required by this Library item has a different version.",
          { definitionId: item.id, path: "requiredPlugins" },
        ),
      };
  }
  return { ok: true, value: item.requiredPlugins };
}

function withProvenance(
  snapshot: LibraryInstantiationSnapshot,
  item: LibraryItemDefinition,
): LibraryInstantiationSnapshot {
  return {
    ...snapshot,
    entityDefinitions: snapshot.entityDefinitions.map((entity) => ({
      ...entity,
      componentInstances: entity.componentInstances.map((component) => ({
        ...component,
        sourceLibraryItem: {
          libraryItemId: item.id,
          libraryItemVersion: item.version,
          sourcePackage: item.source.sourcePackage,
          ...(item.source.pluginId === undefined
            ? {}
            : { sourcePluginId: item.source.pluginId }),
        },
      })),
    })),
  };
}

function remapSnapshot(
  template: LibraryProjectSnapshotTemplate,
  ids: ReadonlyMap<string, string>,
  pluginLocks: readonly PluginLockEntry[],
): LibraryInstantiationSnapshot {
  return remapValue(
    {
      assets: template.assets,
      datasets: template.datasets,
      entityDefinitions: template.entityDefinitions,
      systemDefinitions: template.systemDefinitions,
      clockDefinitions: template.clockDefinitions,
      eventDefinitions: template.eventDefinitions,
      relationshipDefinitions: template.relationshipDefinitions,
      representations: template.representations,
      controls: template.controls,
      datasetRefs: template.datasetRefs,
      equationDefinitions: template.equationDefinitions,
      graphDefinitions: template.graphDefinitions,
      pluginLocks,
    },
    ids,
  );
}

export function planLibraryInstantiation(
  catalog: PhysicsLibraryCatalog,
  request: LibraryInstantiationRequest,
): LibraryResult<InstantiateLibraryItemPayload> {
  const itemResult = catalog.get(request.itemId);
  if (!itemResult.ok) return itemResult;
  const item = itemResult.value;
  const plugins = pluginIssues(
    item,
    request.availablePluginVersions ?? Object.freeze({}),
  );
  if (!plugins.ok) return plugins;

  const creation = item.creation;
  const prefabId =
    creation.kind === "prefab"
      ? creation.definitionId
      : creation.kind === "instrument"
        ? catalog.registries.instruments.get(creation.definitionId)?.prefabId
        : undefined;
  if (!prefabId)
    return {
      ok: false,
      error: libraryError(
        "instantiation-failed",
        "library-item-is-not-instantiable",
        "This Library item is a property preset, not a scene object.",
        { definitionId: item.id, path: "creation" },
      ),
    };
  const prefab = catalog.registries.prefabs.get(prefabId);
  if (!prefab)
    return {
      ok: false,
      error: libraryError(
        "registry-reference-missing",
        "prefab-missing",
        "The prefab required by this Library item is not registered.",
        { definitionId: item.id, path: "creation.definitionId" },
      ),
    };
  const ids = createIdentityMap(
    prefab,
    request.destinationSceneId,
    request.idFactory,
    request.targetBindings ?? Object.freeze({}),
  );
  if (!ids.ok) return ids;
  const snapshot = withProvenance(
    remapSnapshot(prefab.snapshot, ids.value, plugins.value),
    item,
  );
  return {
    ok: true,
    value: {
      sceneId: request.destinationSceneId,
      libraryItemId: item.id,
      libraryItemVersion: item.version,
      snapshot,
    },
  };
}
