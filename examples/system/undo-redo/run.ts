import {
  DeterministicIdFactory,
  createEmptyProject,
  createEmptyScene,
  registeredTypeId,
} from "@physica/core-model";
import {
  BUILTIN_COMMAND_TYPES,
  DefaultProjectStore,
  command,
  createBuiltinCommandRegistry,
  transaction,
} from "@physica/commands";

export interface UndoRedoResult {
  readonly afterCommitScenes: number;
  readonly afterUndoScenes: number;
  readonly afterRedoScenes: number;
  readonly stableIdentities: boolean;
  readonly redoEqualsCommitted: boolean;
}

export function runUndoRedo(): UndoRedoResult {
  const ids = new DeterministicIdFactory(6000);
  const initial = createEmptyProject(ids, {
    title: "Undo and redo",
    tags: ["example", "system"],
    createdAt: "2026-08-29T00:00:00.000Z",
  });
  const scene = createEmptyScene(ids, "Model");
  const entity = {
    id: ids.entityId(),
    name: "Body",
    componentInstances: [],
    tags: [],
  };
  const component = {
    instanceId: ids.componentInstanceId(),
    componentTypeId: registeredTypeId("physica.component:schema-only"),
    componentSchemaVersion: 1,
    configuration: { model: "example" },
    initialState: {},
    bindings: [],
    enabled: true,
  };
  const store = new DefaultProjectStore(
    initial,
    createBuiltinCommandRegistry(),
    ids,
  );
  const committed = store.dispatchTransaction(
    transaction(
      ids,
      [
        command(ids, BUILTIN_COMMAND_TYPES.addScene, { scene }),
        command(ids, BUILTIN_COMMAND_TYPES.addEntity, {
          sceneId: scene.id,
          entity,
        }),
        command(ids, BUILTIN_COMMAND_TYPES.addComponent, {
          sceneId: scene.id,
          entityId: entity.id,
          component,
        }),
      ],
      "Add model envelope",
    ),
  );
  if (!committed.ok) throw new Error(committed.error.message);
  const committedDocument = store.getDocument();
  const afterCommitScenes = committedDocument.scenes.length;
  if (!store.undo().ok) throw new Error("Undo failed.");
  const afterUndoScenes = store.getDocument().scenes.length;
  if (!store.redo().ok) throw new Error("Redo failed.");
  const redone = store.getDocument();
  return {
    afterCommitScenes,
    afterUndoScenes,
    afterRedoScenes: redone.scenes.length,
    stableIdentities:
      redone.scenes[0]!.id === scene.id &&
      redone.scenes[0]!.entityDefinitions[0]!.id === entity.id &&
      redone.scenes[0]!.entityDefinitions[0]!.componentInstances[0]!
        .instanceId === component.instanceId,
    redoEqualsCommitted:
      JSON.stringify(redone) === JSON.stringify(committedDocument),
  };
}
