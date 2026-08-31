import { command, type CommandHandler } from "../command";
import type { CommandRegistry } from "../command-registry";
import {
  BUILTIN_COMMAND_TYPES,
  type AddRepresentationPayload,
  type AddSystemPayload,
  type RemoveRepresentationPayload,
  type RemoveSystemPayload,
  type SetProjectMetadataPayload,
} from "./contract";
import {
  findScene,
  insertAt,
  issue,
  replaceScene,
  validIndex,
} from "./helpers";

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
    )
      return [
        issue(
          "duplicate-system-id",
          "System ID already exists in the Scene.",
          "payload.system.id",
          [current.payload.system.id],
        ),
      ];
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
    )
      return [
        issue(
          "duplicate-representation-id",
          "Representation ID already exists in the Scene.",
          "payload.representation.id",
          [current.payload.representation.id],
        ),
      ];
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
        {
          sceneId,
          representationId: representation.id,
        },
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

export function registerSceneContentCommands(registry: CommandRegistry): void {
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
}
