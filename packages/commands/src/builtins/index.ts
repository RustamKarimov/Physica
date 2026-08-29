import {
  registeredTypeId,
  type ComponentInstance,
  type EntityDefinition,
  type EntityId,
  type JsonObject,
  type ProjectDocument,
  type SceneDefinition,
  type SceneId,
  type SystemDefinition,
  type SystemId,
  type RepresentationDefinition,
  type RepresentationId,
  type ComponentInstanceId,
  type DocumentMetadata,
  type PresentationTransition,
  type ValidationIssue,
} from "@physica/core-model";
import { command, type Command, type CommandHandler } from "../command";
import { CommandRegistry } from "../command-registry";

export const BUILTIN_COMMAND_TYPES = {
  addScene: registeredTypeId("physica:command/add-scene"),
  removeScene: registeredTypeId("physica:command/remove-scene"),
  reorderScenes: registeredTypeId("physica:command/reorder-scenes"),
  addEntity: registeredTypeId("physica:command/add-entity"),
  removeEntity: registeredTypeId("physica:command/remove-entity"),
  addComponent: registeredTypeId("physica:command/add-component"),
  removeComponent: registeredTypeId("physica:command/remove-component"),
  setComponentConfiguration: registeredTypeId(
    "physica:command/set-component-configuration",
  ),
  setComponentInitialState: registeredTypeId(
    "physica:command/set-component-initial-state",
  ),
  addSystem: registeredTypeId("physica:command/add-system"),
  removeSystem: registeredTypeId("physica:command/remove-system"),
  addRepresentation: registeredTypeId("physica:command/add-representation"),
  removeRepresentation: registeredTypeId(
    "physica:command/remove-representation",
  ),
  setProjectMetadata: registeredTypeId("physica:command/set-project-metadata"),
} as const;

export interface AddScenePayload {
  readonly scene: SceneDefinition;
  readonly sceneIndex?: number;
  readonly orderIndex?: number;
  readonly restoreEntrySceneId?: SceneId | null;
  readonly restoreTransitions?: readonly IndexedTransition[];
}

export interface RemoveScenePayload {
  readonly sceneId: SceneId;
}

export interface ReorderScenesPayload {
  readonly sceneOrder: readonly SceneId[];
}

export interface AddEntityPayload {
  readonly sceneId: SceneId;
  readonly entity: EntityDefinition;
  readonly index?: number;
}

export interface RemoveEntityPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
}

export interface AddComponentPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly component: ComponentInstance;
  readonly index?: number;
}

export interface RemoveComponentPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly componentInstanceId: ComponentInstanceId;
}

export interface SetComponentConfigurationPayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly componentInstanceId: ComponentInstanceId;
  readonly configuration: JsonObject;
}

export interface SetComponentInitialStatePayload {
  readonly sceneId: SceneId;
  readonly entityId: EntityId;
  readonly componentInstanceId: ComponentInstanceId;
  readonly initialState: JsonObject;
}

export interface AddSystemPayload {
  readonly sceneId: SceneId;
  readonly system: SystemDefinition;
  readonly index?: number;
}

export interface RemoveSystemPayload {
  readonly sceneId: SceneId;
  readonly systemId: SystemId;
}

export interface AddRepresentationPayload {
  readonly sceneId: SceneId;
  readonly representation: RepresentationDefinition;
  readonly index?: number;
}

export interface RemoveRepresentationPayload {
  readonly sceneId: SceneId;
  readonly representationId: RepresentationId;
}

export interface SetProjectMetadataPayload {
  readonly metadata: DocumentMetadata;
}

export interface IndexedTransition {
  readonly index: number;
  readonly transition: PresentationTransition;
}

function issue(
  code: string,
  message: string,
  path: string,
  relatedIds: readonly string[] = [],
): ValidationIssue {
  return {
    code,
    severity: "error",
    message,
    path,
    source: "semantic",
    recoverable: true,
    relatedIds,
  };
}

function validIndex(index: number | undefined, length: number): boolean {
  return (
    index === undefined ||
    (Number.isInteger(index) && index >= 0 && index <= length)
  );
}

function insertAt<T>(
  values: readonly T[],
  value: T,
  index?: number,
): readonly T[] {
  const target = index ?? values.length;
  return [...values.slice(0, target), value, ...values.slice(target)];
}

function insertManyAtOriginalIndexes<T>(
  values: readonly T[],
  entries: readonly { readonly index: number; readonly value: T }[],
): readonly T[] {
  const result = [...values];
  for (const entry of [...entries].sort((a, b) => a.index - b.index)) {
    result.splice(entry.index, 0, entry.value);
  }
  return result;
}

function findScene(
  document: ProjectDocument,
  sceneId: SceneId,
): SceneDefinition | undefined {
  return document.scenes.find((scene) => scene.id === sceneId);
}

function replaceScene(
  document: ProjectDocument,
  sceneId: SceneId,
  update: (scene: SceneDefinition) => SceneDefinition,
): ProjectDocument {
  return {
    ...document,
    scenes: document.scenes.map((scene) =>
      scene.id === sceneId ? update(scene) : scene,
    ),
  };
}

function findEntity(
  document: ProjectDocument,
  sceneId: SceneId,
  entityId: EntityId,
): EntityDefinition | undefined {
  return findScene(document, sceneId)?.entityDefinitions.find(
    (entity) => entity.id === entityId,
  );
}

function findComponent(
  document: ProjectDocument,
  sceneId: SceneId,
  entityId: EntityId,
  componentInstanceId: ComponentInstanceId,
): ComponentInstance | undefined {
  return findEntity(document, sceneId, entityId)?.componentInstances.find(
    (component) => component.instanceId === componentInstanceId,
  );
}

const addSceneHandler: CommandHandler<AddScenePayload> = {
  validate(document, current) {
    const { scene, sceneIndex, orderIndex, restoreTransitions } =
      current.payload;
    const issues: ValidationIssue[] = [];
    if (!scene || typeof scene !== "object") {
      return [
        issue(
          "invalid-scene-payload",
          "A SceneDefinition is required.",
          "payload.scene",
        ),
      ];
    }
    if (document.scenes.some((candidate) => candidate.id === scene.id)) {
      issues.push(
        issue(
          "duplicate-scene-id",
          "Scene ID already exists.",
          "payload.scene.id",
          [scene.id],
        ),
      );
    }
    if (!validIndex(sceneIndex, document.scenes.length)) {
      issues.push(
        issue(
          "invalid-scene-index",
          "sceneIndex is outside the insertion range.",
          "payload.sceneIndex",
        ),
      );
    }
    if (!validIndex(orderIndex, document.presentationFlow.sceneOrder.length)) {
      issues.push(
        issue(
          "invalid-scene-order-index",
          "orderIndex is outside the insertion range.",
          "payload.orderIndex",
        ),
      );
    }
    const restoredTransitionCount = restoreTransitions?.length ?? 0;
    const restoredTransitionLength =
      document.presentationFlow.transitions.length + restoredTransitionCount;
    for (const restored of restoreTransitions ?? []) {
      if (
        !Number.isInteger(restored.index) ||
        restored.index < 0 ||
        restored.index >= restoredTransitionLength
      ) {
        issues.push(
          issue(
            "invalid-transition-index",
            "A restored transition index is invalid.",
            "payload.restoreTransitions",
          ),
        );
      }
    }
    return issues;
  },
  apply(document, current, context) {
    const payload = current.payload;
    const restoredTransitions = (payload.restoreTransitions ?? []).map(
      (entry) => ({
        index: entry.index,
        value: entry.transition,
      }),
    );
    const entrySceneId = Object.prototype.hasOwnProperty.call(
      payload,
      "restoreEntrySceneId",
    )
      ? (payload.restoreEntrySceneId ?? null)
      : (document.presentationFlow.entrySceneId ?? payload.scene.id);
    return {
      document: {
        ...document,
        scenes: insertAt(document.scenes, payload.scene, payload.sceneIndex),
        presentationFlow: {
          ...document.presentationFlow,
          entrySceneId,
          sceneOrder: insertAt(
            document.presentationFlow.sceneOrder,
            payload.scene.id,
            payload.orderIndex,
          ),
          transitions: insertManyAtOriginalIndexes(
            document.presentationFlow.transitions,
            restoredTransitions,
          ),
        },
      },
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.removeScene, {
        sceneId: payload.scene.id,
      }),
      changes: [
        { kind: "add", path: "scenes", relatedIds: [payload.scene.id] },
      ],
    };
  },
};

const removeSceneHandler: CommandHandler<RemoveScenePayload> = {
  validate(document, current) {
    return findScene(document, current.payload.sceneId)
      ? []
      : [
          issue("scene-not-found", "Scene does not exist.", "payload.sceneId", [
            current.payload.sceneId,
          ]),
        ];
  },
  apply(document, current, context) {
    const sceneIndex = document.scenes.findIndex(
      (scene) => scene.id === current.payload.sceneId,
    );
    const scene = document.scenes[sceneIndex]!;
    const orderIndex = document.presentationFlow.sceneOrder.indexOf(scene.id);
    const removedTransitions = document.presentationFlow.transitions
      .map((transition, index) => ({ transition, index }))
      .filter(
        ({ transition }) =>
          transition.fromSceneId === scene.id ||
          transition.toSceneId === scene.id,
      );
    const nextOrder = document.presentationFlow.sceneOrder.filter(
      (id) => id !== scene.id,
    );
    const oldEntry = document.presentationFlow.entrySceneId;
    return {
      document: {
        ...document,
        scenes: document.scenes.filter(
          (candidate) => candidate.id !== scene.id,
        ),
        presentationFlow: {
          ...document.presentationFlow,
          sceneOrder: nextOrder,
          entrySceneId:
            oldEntry === scene.id ? (nextOrder[0] ?? null) : oldEntry,
          transitions: document.presentationFlow.transitions.filter(
            (transition) =>
              transition.fromSceneId !== scene.id &&
              transition.toSceneId !== scene.id,
          ),
        },
      },
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.addScene, {
        scene,
        sceneIndex,
        orderIndex,
        restoreEntrySceneId: oldEntry,
        restoreTransitions: removedTransitions,
      }),
      changes: [{ kind: "remove", path: "scenes", relatedIds: [scene.id] }],
    };
  },
};

const reorderScenesHandler: CommandHandler<ReorderScenesPayload> = {
  validate(document, current) {
    const expected = new Set(document.scenes.map((scene) => scene.id));
    const received = current.payload.sceneOrder;
    const valid =
      received.length === expected.size &&
      new Set(received).size === received.length &&
      received.every((id) => expected.has(id));
    return valid
      ? []
      : [
          issue(
            "invalid-scene-order",
            "sceneOrder must contain every Scene ID exactly once.",
            "payload.sceneOrder",
          ),
        ];
  },
  apply(document, current, context) {
    return {
      document: {
        ...document,
        presentationFlow: {
          ...document.presentationFlow,
          sceneOrder: [...current.payload.sceneOrder],
        },
      },
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.reorderScenes, {
        sceneOrder: document.presentationFlow.sceneOrder,
      }),
      changes: [
        {
          kind: "reorder",
          path: "presentationFlow.sceneOrder",
          relatedIds: current.payload.sceneOrder,
        },
      ],
    };
  },
};

const addEntityHandler: CommandHandler<AddEntityPayload> = {
  validate(document, current) {
    const scene = findScene(document, current.payload.sceneId);
    if (!scene)
      return [
        issue("scene-not-found", "Scene does not exist.", "payload.sceneId", [
          current.payload.sceneId,
        ]),
      ];
    if (
      scene.entityDefinitions.some(
        (entity) => entity.id === current.payload.entity.id,
      )
    ) {
      return [
        issue(
          "duplicate-entity-id",
          "Entity ID already exists in the Scene.",
          "payload.entity.id",
          [current.payload.entity.id],
        ),
      ];
    }
    return validIndex(current.payload.index, scene.entityDefinitions.length)
      ? []
      : [
          issue(
            "invalid-entity-index",
            "Entity insertion index is invalid.",
            "payload.index",
          ),
        ];
  },
  apply(document, current, context) {
    const { sceneId, entity, index } = current.payload;
    return {
      document: replaceScene(document, sceneId, (scene) => ({
        ...scene,
        entityDefinitions: insertAt(scene.entityDefinitions, entity, index),
      })),
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.removeEntity, {
        sceneId,
        entityId: entity.id,
      }),
      changes: [
        {
          kind: "add",
          path: `scenes/${sceneId}/entityDefinitions`,
          relatedIds: [entity.id],
        },
      ],
    };
  },
};

const removeEntityHandler: CommandHandler<RemoveEntityPayload> = {
  validate(document, current) {
    return findEntity(
      document,
      current.payload.sceneId,
      current.payload.entityId,
    )
      ? []
      : [
          issue(
            "entity-not-found",
            "Entity does not exist in the Scene.",
            "payload.entityId",
            [current.payload.entityId],
          ),
        ];
  },
  apply(document, current, context) {
    const scene = findScene(document, current.payload.sceneId)!;
    const index = scene.entityDefinitions.findIndex(
      (entity) => entity.id === current.payload.entityId,
    );
    const entity = scene.entityDefinitions[index]!;
    return {
      document: replaceScene(document, scene.id, (candidate) => ({
        ...candidate,
        entityDefinitions: candidate.entityDefinitions.filter(
          (item) => item.id !== entity.id,
        ),
      })),
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.addEntity, {
        sceneId: scene.id,
        entity,
        index,
      }),
      changes: [
        {
          kind: "remove",
          path: `scenes/${scene.id}/entityDefinitions`,
          relatedIds: [entity.id],
        },
      ],
    };
  },
};

const addComponentHandler: CommandHandler<AddComponentPayload> = {
  validate(document, current) {
    const entity = findEntity(
      document,
      current.payload.sceneId,
      current.payload.entityId,
    );
    if (!entity)
      return [
        issue(
          "entity-not-found",
          "Entity does not exist in the Scene.",
          "payload.entityId",
          [current.payload.entityId],
        ),
      ];
    if (
      entity.componentInstances.some(
        (component) =>
          component.instanceId === current.payload.component.instanceId,
      )
    ) {
      return [
        issue(
          "duplicate-component-id",
          "Component instance ID already exists.",
          "payload.component.instanceId",
          [current.payload.component.instanceId],
        ),
      ];
    }
    return validIndex(current.payload.index, entity.componentInstances.length)
      ? []
      : [
          issue(
            "invalid-component-index",
            "Component insertion index is invalid.",
            "payload.index",
          ),
        ];
  },
  apply(document, current, context) {
    const { sceneId, entityId, component, index } = current.payload;
    return {
      document: replaceScene(document, sceneId, (scene) => ({
        ...scene,
        entityDefinitions: scene.entityDefinitions.map((entity) =>
          entity.id === entityId
            ? {
                ...entity,
                componentInstances: insertAt(
                  entity.componentInstances,
                  component,
                  index,
                ),
              }
            : entity,
        ),
      })),
      inverse: command(
        context.idFactory,
        BUILTIN_COMMAND_TYPES.removeComponent,
        {
          sceneId,
          entityId,
          componentInstanceId: component.instanceId,
        },
      ),
      changes: [
        {
          kind: "add",
          path: `scenes/${sceneId}/entities/${entityId}/components`,
          relatedIds: [component.instanceId],
        },
      ],
    };
  },
};

const removeComponentHandler: CommandHandler<RemoveComponentPayload> = {
  validate(document, current) {
    return findComponent(
      document,
      current.payload.sceneId,
      current.payload.entityId,
      current.payload.componentInstanceId,
    )
      ? []
      : [
          issue(
            "component-not-found",
            "Component instance does not exist.",
            "payload.componentInstanceId",
            [current.payload.componentInstanceId],
          ),
        ];
  },
  apply(document, current, context) {
    const { sceneId, entityId, componentInstanceId } = current.payload;
    const entity = findEntity(document, sceneId, entityId)!;
    const index = entity.componentInstances.findIndex(
      (component) => component.instanceId === componentInstanceId,
    );
    const component = entity.componentInstances[index]!;
    return {
      document: replaceScene(document, sceneId, (scene) => ({
        ...scene,
        entityDefinitions: scene.entityDefinitions.map((candidate) =>
          candidate.id === entityId
            ? {
                ...candidate,
                componentInstances: candidate.componentInstances.filter(
                  (item) => item.instanceId !== componentInstanceId,
                ),
              }
            : candidate,
        ),
      })),
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.addComponent, {
        sceneId,
        entityId,
        component,
        index,
      }),
      changes: [
        {
          kind: "remove",
          path: `scenes/${sceneId}/entities/${entityId}/components`,
          relatedIds: [componentInstanceId],
        },
      ],
    };
  },
};

function setComponentField(
  document: ProjectDocument,
  sceneId: SceneId,
  entityId: EntityId,
  componentInstanceId: ComponentInstanceId,
  update: (component: ComponentInstance) => ComponentInstance,
): ProjectDocument {
  return replaceScene(document, sceneId, (scene) => ({
    ...scene,
    entityDefinitions: scene.entityDefinitions.map((entity) =>
      entity.id === entityId
        ? {
            ...entity,
            componentInstances: entity.componentInstances.map((component) =>
              component.instanceId === componentInstanceId
                ? update(component)
                : component,
            ),
          }
        : entity,
    ),
  }));
}

function componentExistsValidation(
  document: ProjectDocument,
  payload: {
    readonly sceneId: SceneId;
    readonly entityId: EntityId;
    readonly componentInstanceId: ComponentInstanceId;
  },
): readonly ValidationIssue[] {
  return findComponent(
    document,
    payload.sceneId,
    payload.entityId,
    payload.componentInstanceId,
  )
    ? []
    : [
        issue(
          "component-not-found",
          "Component instance does not exist.",
          "payload.componentInstanceId",
          [payload.componentInstanceId],
        ),
      ];
}

const setComponentConfigurationHandler: CommandHandler<SetComponentConfigurationPayload> =
  {
    validate: (document, current) =>
      componentExistsValidation(document, current.payload),
    apply(document, current, context) {
      const payload = current.payload;
      const previous = findComponent(
        document,
        payload.sceneId,
        payload.entityId,
        payload.componentInstanceId,
      )!;
      return {
        document: setComponentField(
          document,
          payload.sceneId,
          payload.entityId,
          payload.componentInstanceId,
          (component) => ({
            ...component,
            configuration: payload.configuration,
          }),
        ),
        inverse: command(
          context.idFactory,
          BUILTIN_COMMAND_TYPES.setComponentConfiguration,
          { ...payload, configuration: previous.configuration },
        ),
        changes: [
          {
            kind: "replace",
            path: `scenes/${payload.sceneId}/entities/${payload.entityId}/components/${payload.componentInstanceId}/configuration`,
            relatedIds: [payload.componentInstanceId],
          },
        ],
      };
    },
  };

const setComponentInitialStateHandler: CommandHandler<SetComponentInitialStatePayload> =
  {
    validate: (document, current) =>
      componentExistsValidation(document, current.payload),
    apply(document, current, context) {
      const payload = current.payload;
      const previous = findComponent(
        document,
        payload.sceneId,
        payload.entityId,
        payload.componentInstanceId,
      )!;
      return {
        document: setComponentField(
          document,
          payload.sceneId,
          payload.entityId,
          payload.componentInstanceId,
          (component) => ({ ...component, initialState: payload.initialState }),
        ),
        inverse: command(
          context.idFactory,
          BUILTIN_COMMAND_TYPES.setComponentInitialState,
          { ...payload, initialState: previous.initialState },
        ),
        changes: [
          {
            kind: "replace",
            path: `scenes/${payload.sceneId}/entities/${payload.entityId}/components/${payload.componentInstanceId}/initialState`,
            relatedIds: [payload.componentInstanceId],
          },
        ],
      };
    },
  };

const addSystemHandler: CommandHandler<AddSystemPayload> = {
  validate(document, current) {
    const scene = findScene(document, current.payload.sceneId);
    if (!scene)
      return [
        issue("scene-not-found", "Scene does not exist.", "payload.sceneId", [
          current.payload.sceneId,
        ]),
      ];
    if (
      scene.systemDefinitions.some(
        (system) => system.id === current.payload.system.id,
      )
    ) {
      return [
        issue(
          "duplicate-system-id",
          "System ID already exists.",
          "payload.system.id",
          [current.payload.system.id],
        ),
      ];
    }
    return validIndex(current.payload.index, scene.systemDefinitions.length)
      ? []
      : [
          issue(
            "invalid-system-index",
            "System insertion index is invalid.",
            "payload.index",
          ),
        ];
  },
  apply(document, current, context) {
    const { sceneId, system, index } = current.payload;
    return {
      document: replaceScene(document, sceneId, (scene) => ({
        ...scene,
        systemDefinitions: insertAt(scene.systemDefinitions, system, index),
      })),
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.removeSystem, {
        sceneId,
        systemId: system.id,
      }),
      changes: [
        {
          kind: "add",
          path: `scenes/${sceneId}/systemDefinitions`,
          relatedIds: [system.id],
        },
      ],
    };
  },
};

const removeSystemHandler: CommandHandler<RemoveSystemPayload> = {
  validate(document, current) {
    const exists = findScene(
      document,
      current.payload.sceneId,
    )?.systemDefinitions.some(
      (system) => system.id === current.payload.systemId,
    );
    return exists
      ? []
      : [
          issue(
            "system-not-found",
            "System does not exist in the Scene.",
            "payload.systemId",
            [current.payload.systemId],
          ),
        ];
  },
  apply(document, current, context) {
    const scene = findScene(document, current.payload.sceneId)!;
    const index = scene.systemDefinitions.findIndex(
      (system) => system.id === current.payload.systemId,
    );
    const system = scene.systemDefinitions[index]!;
    return {
      document: replaceScene(document, scene.id, (candidate) => ({
        ...candidate,
        systemDefinitions: candidate.systemDefinitions.filter(
          (item) => item.id !== system.id,
        ),
      })),
      inverse: command(context.idFactory, BUILTIN_COMMAND_TYPES.addSystem, {
        sceneId: scene.id,
        system,
        index,
      }),
      changes: [
        {
          kind: "remove",
          path: `scenes/${scene.id}/systemDefinitions`,
          relatedIds: [system.id],
        },
      ],
    };
  },
};

const addRepresentationHandler: CommandHandler<AddRepresentationPayload> = {
  validate(document, current) {
    const scene = findScene(document, current.payload.sceneId);
    if (!scene)
      return [
        issue("scene-not-found", "Scene does not exist.", "payload.sceneId", [
          current.payload.sceneId,
        ]),
      ];
    if (
      scene.representations.some(
        (entry) => entry.id === current.payload.representation.id,
      )
    ) {
      return [
        issue(
          "duplicate-representation-id",
          "Representation ID already exists.",
          "payload.representation.id",
          [current.payload.representation.id],
        ),
      ];
    }
    return validIndex(current.payload.index, scene.representations.length)
      ? []
      : [
          issue(
            "invalid-representation-index",
            "Representation insertion index is invalid.",
            "payload.index",
          ),
        ];
  },
  apply(document, current, context) {
    const { sceneId, representation, index } = current.payload;
    return {
      document: replaceScene(document, sceneId, (scene) => ({
        ...scene,
        representations: insertAt(scene.representations, representation, index),
      })),
      inverse: command(
        context.idFactory,
        BUILTIN_COMMAND_TYPES.removeRepresentation,
        { sceneId, representationId: representation.id },
      ),
      changes: [
        {
          kind: "add",
          path: `scenes/${sceneId}/representations`,
          relatedIds: [representation.id],
        },
      ],
    };
  },
};

const removeRepresentationHandler: CommandHandler<RemoveRepresentationPayload> =
  {
    validate(document, current) {
      const exists = findScene(
        document,
        current.payload.sceneId,
      )?.representations.some(
        (entry) => entry.id === current.payload.representationId,
      );
      return exists
        ? []
        : [
            issue(
              "representation-not-found",
              "Representation does not exist in the Scene.",
              "payload.representationId",
              [current.payload.representationId],
            ),
          ];
    },
    apply(document, current, context) {
      const scene = findScene(document, current.payload.sceneId)!;
      const index = scene.representations.findIndex(
        (entry) => entry.id === current.payload.representationId,
      );
      const representation = scene.representations[index]!;
      return {
        document: replaceScene(document, scene.id, (candidate) => ({
          ...candidate,
          representations: candidate.representations.filter(
            (entry) => entry.id !== representation.id,
          ),
        })),
        inverse: command(
          context.idFactory,
          BUILTIN_COMMAND_TYPES.addRepresentation,
          { sceneId: scene.id, representation, index },
        ),
        changes: [
          {
            kind: "remove",
            path: `scenes/${scene.id}/representations`,
            relatedIds: [representation.id],
          },
        ],
      };
    },
  };

const setProjectMetadataHandler: CommandHandler<SetProjectMetadataPayload> = {
  validate(_document, current) {
    return current.payload.metadata &&
      typeof current.payload.metadata === "object"
      ? []
      : [
          issue(
            "invalid-project-metadata",
            "DocumentMetadata is required.",
            "payload.metadata",
          ),
        ];
  },
  apply(document, current, context) {
    return {
      document: { ...document, metadata: current.payload.metadata },
      inverse: command(
        context.idFactory,
        BUILTIN_COMMAND_TYPES.setProjectMetadata,
        { metadata: document.metadata },
      ),
      changes: [
        { kind: "replace", path: "metadata", relatedIds: [document.projectId] },
      ],
    };
  },
};

export function registerBuiltinCommands(
  registry: CommandRegistry,
): CommandRegistry {
  registry.register(BUILTIN_COMMAND_TYPES.addScene, addSceneHandler);
  registry.register(BUILTIN_COMMAND_TYPES.removeScene, removeSceneHandler);
  registry.register(BUILTIN_COMMAND_TYPES.reorderScenes, reorderScenesHandler);
  registry.register(BUILTIN_COMMAND_TYPES.addEntity, addEntityHandler);
  registry.register(BUILTIN_COMMAND_TYPES.removeEntity, removeEntityHandler);
  registry.register(BUILTIN_COMMAND_TYPES.addComponent, addComponentHandler);
  registry.register(
    BUILTIN_COMMAND_TYPES.removeComponent,
    removeComponentHandler,
  );
  registry.register(
    BUILTIN_COMMAND_TYPES.setComponentConfiguration,
    setComponentConfigurationHandler,
  );
  registry.register(
    BUILTIN_COMMAND_TYPES.setComponentInitialState,
    setComponentInitialStateHandler,
  );
  registry.register(BUILTIN_COMMAND_TYPES.addSystem, addSystemHandler);
  registry.register(BUILTIN_COMMAND_TYPES.removeSystem, removeSystemHandler);
  registry.register(
    BUILTIN_COMMAND_TYPES.addRepresentation,
    addRepresentationHandler,
  );
  registry.register(
    BUILTIN_COMMAND_TYPES.removeRepresentation,
    removeRepresentationHandler,
  );
  registry.register(
    BUILTIN_COMMAND_TYPES.setProjectMetadata,
    setProjectMetadataHandler,
  );
  return registry;
}

export function createBuiltinCommandRegistry(): CommandRegistry {
  return registerBuiltinCommands(new CommandRegistry());
}

export type BuiltinCommand = Command<
  | AddScenePayload
  | RemoveScenePayload
  | ReorderScenesPayload
  | AddEntityPayload
  | RemoveEntityPayload
  | AddComponentPayload
  | RemoveComponentPayload
  | SetComponentConfigurationPayload
  | SetComponentInitialStatePayload
  | AddSystemPayload
  | RemoveSystemPayload
  | AddRepresentationPayload
  | RemoveRepresentationPayload
  | SetProjectMetadataPayload
>;
