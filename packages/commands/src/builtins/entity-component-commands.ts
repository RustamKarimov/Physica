import type {
  ComponentInstance,
  ComponentInstanceId,
  EntityId,
  ProjectDocument,
  SceneId,
  ValidationIssue,
} from "@physica/core-model";
import { command, type CommandHandler } from "../command";
import type { CommandRegistry } from "../command-registry";
import {
  BUILTIN_COMMAND_TYPES,
  type AddComponentPayload,
  type AddEntityPayload,
  type RemoveComponentPayload,
  type RemoveEntityPayload,
  type SetComponentConfigurationPayload,
  type SetComponentInitialStatePayload,
} from "./contract";
import {
  findComponent,
  findEntity,
  findScene,
  insertAt,
  issue,
  replaceScene,
  validIndex,
} from "./helpers";

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
        { sceneId, entityId, componentInstanceId: component.instanceId },
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

export function registerEntityComponentCommands(
  registry: CommandRegistry,
): void {
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
}
