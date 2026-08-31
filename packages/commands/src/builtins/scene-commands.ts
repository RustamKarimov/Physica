import type { ValidationIssue } from "@physica/core-model";
import { command, type CommandHandler } from "../command";
import type { CommandRegistry } from "../command-registry";
import {
  BUILTIN_COMMAND_TYPES,
  type AddScenePayload,
  type RemoveScenePayload,
  type ReorderScenesPayload,
} from "./contract";
import {
  findScene,
  insertAt,
  insertManyAtOriginalIndexes,
  issue,
  validIndex,
} from "./helpers";

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
    const restoredTransitionLength =
      document.presentationFlow.transitions.length +
      (restoreTransitions?.length ?? 0);
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
      (entry) => ({ index: entry.index, value: entry.transition }),
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

export function registerSceneCommands(registry: CommandRegistry): void {
  registry.register(BUILTIN_COMMAND_TYPES.addScene, addSceneHandler);
  registry.register(BUILTIN_COMMAND_TYPES.removeScene, removeSceneHandler);
  registry.register(BUILTIN_COMMAND_TYPES.reorderScenes, reorderScenesHandler);
}
