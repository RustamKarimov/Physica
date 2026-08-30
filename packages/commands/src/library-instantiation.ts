import {
  registeredTypeId,
  validateProjectDocument,
  type AssetDefinition,
  type ClockDefinition,
  type ControlDefinition,
  type DatasetDefinition,
  type DatasetId,
  type EntityDefinition,
  type EquationDefinition,
  type EventDefinition,
  type GraphDefinition,
  type PluginId,
  type PluginLockEntry,
  type ProjectDocument,
  type RelationshipDefinition,
  type RepresentationDefinition,
  type SceneDefinition,
  type SceneId,
  type SystemDefinition,
  type ValidationIssue,
} from "@physica/core-model";
import { command, type Command, type CommandHandler } from "./command";
import { CommandRegistry } from "./command-registry";

export const LIBRARY_COMMAND_TYPES = {
  instantiateLibraryItem: registeredTypeId(
    "physica:command/instantiate-library-item",
  ),
  removeLibraryInstantiation: registeredTypeId(
    "physica:command/remove-library-instantiation",
  ),
} as const;

/**
 * A fully prepared, ID-stable snapshot. The assets package creates this at the
 * document boundary; the commands package applies it as one history entry.
 */
export interface LibraryInstantiationSnapshot {
  readonly assets: readonly AssetDefinition[];
  readonly datasets: readonly DatasetDefinition[];
  readonly entityDefinitions: readonly EntityDefinition[];
  readonly systemDefinitions: readonly SystemDefinition[];
  readonly clockDefinitions: readonly ClockDefinition[];
  readonly eventDefinitions: readonly EventDefinition[];
  readonly relationshipDefinitions: readonly RelationshipDefinition[];
  readonly representations: readonly RepresentationDefinition[];
  readonly controls: readonly ControlDefinition[];
  readonly datasetRefs: readonly DatasetId[];
  readonly equationDefinitions: readonly EquationDefinition[];
  readonly graphDefinitions: readonly GraphDefinition[];
  readonly pluginLocks: readonly PluginLockEntry[];
}

export interface InstantiateLibraryItemPayload {
  readonly sceneId: SceneId;
  readonly libraryItemId: string;
  readonly libraryItemVersion: string;
  readonly snapshot: LibraryInstantiationSnapshot;
}

export interface RemoveLibraryInstantiationPayload extends InstantiateLibraryItemPayload {
  readonly pluginIdsAdded: readonly PluginId[];
}

function issue(
  code: string,
  message: string,
  path?: string,
  relatedIds?: readonly string[],
): ValidationIssue {
  return {
    code,
    severity: "error",
    message,
    ...(path === undefined ? {} : { path }),
    source: "semantic",
    recoverable: true,
    ...(relatedIds === undefined ? {} : { relatedIds }),
  };
}

function findScene(
  document: ProjectDocument,
  sceneId: SceneId,
): SceneDefinition | undefined {
  return document.scenes.find((scene) => scene.id === sceneId);
}

function appendSnapshot(
  document: ProjectDocument,
  payload: InstantiateLibraryItemPayload,
): ProjectDocument {
  const existingPluginIds = new Set(
    document.pluginLock.map((lock) => lock.pluginId),
  );
  return {
    ...document,
    assets: [...document.assets, ...payload.snapshot.assets],
    datasets: [...document.datasets, ...payload.snapshot.datasets],
    pluginLock: [
      ...document.pluginLock,
      ...payload.snapshot.pluginLocks.filter(
        (lock) => !existingPluginIds.has(lock.pluginId),
      ),
    ],
    scenes: document.scenes.map((scene) =>
      scene.id === payload.sceneId
        ? {
            ...scene,
            entityDefinitions: [
              ...scene.entityDefinitions,
              ...payload.snapshot.entityDefinitions,
            ],
            systemDefinitions: [
              ...scene.systemDefinitions,
              ...payload.snapshot.systemDefinitions,
            ],
            clockDefinitions: [
              ...scene.clockDefinitions,
              ...payload.snapshot.clockDefinitions,
            ],
            eventDefinitions: [
              ...scene.eventDefinitions,
              ...payload.snapshot.eventDefinitions,
            ],
            relationshipDefinitions: [
              ...scene.relationshipDefinitions,
              ...payload.snapshot.relationshipDefinitions,
            ],
            representations: [
              ...scene.representations,
              ...payload.snapshot.representations,
            ],
            controls: [...scene.controls, ...payload.snapshot.controls],
            datasetRefs: [
              ...scene.datasetRefs,
              ...payload.snapshot.datasetRefs,
            ],
            equationDefinitions: [
              ...scene.equationDefinitions,
              ...payload.snapshot.equationDefinitions,
            ],
            graphDefinitions: [
              ...scene.graphDefinitions,
              ...payload.snapshot.graphDefinitions,
            ],
          }
        : scene,
    ),
  };
}

function snapshotIds(
  snapshot: LibraryInstantiationSnapshot,
): readonly string[] {
  return [
    ...snapshot.assets.map((entry) => entry.id),
    ...snapshot.datasets.map((entry) => entry.id),
    ...snapshot.entityDefinitions.flatMap((entry) => [
      entry.id,
      ...entry.componentInstances.map((component) => component.instanceId),
    ]),
    ...snapshot.systemDefinitions.map((entry) => entry.id),
    ...snapshot.clockDefinitions.map((entry) => entry.id),
    ...snapshot.eventDefinitions.map((entry) => entry.id),
    ...snapshot.relationshipDefinitions.map((entry) => entry.id),
    ...snapshot.representations.map((entry) => entry.id),
    ...snapshot.controls.map((entry) => entry.id),
    ...snapshot.equationDefinitions.map((entry) => entry.id),
    ...snapshot.graphDefinitions.map((entry) => entry.id),
  ];
}

function documentNodeIds(document: ProjectDocument): ReadonlySet<string> {
  return new Set([
    ...document.assets.map((entry) => entry.id),
    ...document.datasets.map((entry) => entry.id),
    ...document.scenes.flatMap((scene) => [
      ...scene.entityDefinitions.flatMap((entity) => [
        entity.id,
        ...entity.componentInstances.map((component) => component.instanceId),
      ]),
      ...scene.systemDefinitions.map((entry) => entry.id),
      ...scene.clockDefinitions.map((entry) => entry.id),
      ...scene.eventDefinitions.map((entry) => entry.id),
      ...scene.relationshipDefinitions.map((entry) => entry.id),
      ...scene.representations.map((entry) => entry.id),
      ...scene.controls.map((entry) => entry.id),
      ...scene.equationDefinitions.map((entry) => entry.id),
      ...scene.graphDefinitions.map((entry) => entry.id),
    ]),
  ]);
}

function removeSnapshot(
  document: ProjectDocument,
  payload: RemoveLibraryInstantiationPayload,
): ProjectDocument {
  const ids = new Set(snapshotIds(payload.snapshot));
  const datasetRefIds = new Set(payload.snapshot.datasetRefs);
  const pluginIds = new Set(payload.pluginIdsAdded);
  return {
    ...document,
    assets: document.assets.filter((entry) => !ids.has(entry.id)),
    datasets: document.datasets.filter((entry) => !ids.has(entry.id)),
    pluginLock: document.pluginLock.filter(
      (entry) => !pluginIds.has(entry.pluginId),
    ),
    scenes: document.scenes.map((scene) =>
      scene.id === payload.sceneId
        ? {
            ...scene,
            entityDefinitions: scene.entityDefinitions.filter(
              (entry) => !ids.has(entry.id),
            ),
            systemDefinitions: scene.systemDefinitions.filter(
              (entry) => !ids.has(entry.id),
            ),
            clockDefinitions: scene.clockDefinitions.filter(
              (entry) => !ids.has(entry.id),
            ),
            eventDefinitions: scene.eventDefinitions.filter(
              (entry) => !ids.has(entry.id),
            ),
            relationshipDefinitions: scene.relationshipDefinitions.filter(
              (entry) => !ids.has(entry.id),
            ),
            representations: scene.representations.filter(
              (entry) => !ids.has(entry.id),
            ),
            controls: scene.controls.filter((entry) => !ids.has(entry.id)),
            datasetRefs: scene.datasetRefs.filter(
              (entry) => !datasetRefIds.has(entry),
            ),
            equationDefinitions: scene.equationDefinitions.filter(
              (entry) => !ids.has(entry.id),
            ),
            graphDefinitions: scene.graphDefinitions.filter(
              (entry) => !ids.has(entry.id),
            ),
          }
        : scene,
    ),
  };
}

function structuralIssues(
  document: ProjectDocument,
): readonly ValidationIssue[] {
  return validateProjectDocument(document).issues.filter(
    (entry) => entry.severity === "fatal" || entry.severity === "error",
  );
}

const instantiateHandler: CommandHandler<InstantiateLibraryItemPayload> = {
  validate(document, current) {
    if (!findScene(document, current.payload.sceneId)) {
      return [
        issue(
          "library-destination-scene-missing",
          "The destination scene does not exist.",
          "payload.sceneId",
          [current.payload.sceneId],
        ),
      ];
    }
    if (
      !current.payload.libraryItemId ||
      !current.payload.libraryItemVersion.trim()
    ) {
      return [
        issue(
          "invalid-library-source",
          "A library item ID and version are required.",
          "payload",
        ),
      ];
    }
    const conflicts = current.payload.snapshot.pluginLocks.filter(
      (required) => {
        const currentLock = document.pluginLock.find(
          (entry) => entry.pluginId === required.pluginId,
        );
        return (
          currentLock &&
          currentLock.requiredVersion !== required.requiredVersion
        );
      },
    );
    if (conflicts.length > 0) {
      return conflicts.map((entry) =>
        issue(
          "library-plugin-version-conflict",
          "A required plugin is locked to a different version.",
          "payload.snapshot.pluginLocks",
          [entry.pluginId],
        ),
      );
    }
    return structuralIssues(appendSnapshot(document, current.payload));
  },
  apply(document, current, context) {
    const existingPluginIds = new Set(
      document.pluginLock.map((entry) => entry.pluginId),
    );
    const pluginIdsAdded = current.payload.snapshot.pluginLocks
      .filter((entry) => !existingPluginIds.has(entry.pluginId))
      .map((entry) => entry.pluginId);
    return {
      document: appendSnapshot(document, current.payload),
      inverse: command(
        context.idFactory,
        LIBRARY_COMMAND_TYPES.removeLibraryInstantiation,
        { ...current.payload, pluginIdsAdded },
        "Remove " + current.payload.libraryItemId,
      ),
      changes: [
        {
          kind: "add",
          path: "scenes/" + current.payload.sceneId + "/library-instantiations",
          relatedIds: snapshotIds(current.payload.snapshot),
        },
      ],
    };
  },
};

const removeHandler: CommandHandler<RemoveLibraryInstantiationPayload> = {
  validate(document, current) {
    if (!findScene(document, current.payload.sceneId)) {
      return [
        issue(
          "library-destination-scene-missing",
          "The destination scene does not exist.",
          "payload.sceneId",
        ),
      ];
    }
    const existingIds = documentNodeIds(document);
    const missing = snapshotIds(current.payload.snapshot).filter(
      (id) => !existingIds.has(id),
    );
    if (missing.length > 0) {
      return [
        issue(
          "library-instance-incomplete",
          "The library instance cannot be removed because persisted nodes are missing.",
          "payload.snapshot",
          missing,
        ),
      ];
    }
    return structuralIssues(removeSnapshot(document, current.payload));
  },
  apply(document, current, context) {
    return {
      document: removeSnapshot(document, current.payload),
      inverse: command(
        context.idFactory,
        LIBRARY_COMMAND_TYPES.instantiateLibraryItem,
        {
          sceneId: current.payload.sceneId,
          libraryItemId: current.payload.libraryItemId,
          libraryItemVersion: current.payload.libraryItemVersion,
          snapshot: current.payload.snapshot,
        },
        "Restore " + current.payload.libraryItemId,
      ),
      changes: [
        {
          kind: "remove",
          path: "scenes/" + current.payload.sceneId + "/library-instantiations",
          relatedIds: snapshotIds(current.payload.snapshot),
        },
      ],
    };
  },
};

export function registerLibraryInstantiationCommands(
  registry: CommandRegistry,
): CommandRegistry {
  registry.register(
    LIBRARY_COMMAND_TYPES.instantiateLibraryItem,
    instantiateHandler,
  );
  registry.register(
    LIBRARY_COMMAND_TYPES.removeLibraryInstantiation,
    removeHandler,
  );
  return registry;
}

export type LibraryInstantiationCommand = Command<
  InstantiateLibraryItemPayload | RemoveLibraryInstantiationPayload
>;
