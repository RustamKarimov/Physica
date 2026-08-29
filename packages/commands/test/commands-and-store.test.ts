import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  createEmptyScene,
  validateProjectDocument,
  type ProjectDocument,
} from "@physica/core-model";
import {
  BUILTIN_COMMAND_TYPES,
  DefaultProjectStore,
  applyCommandSequence,
  command,
  createBuiltinCommandRegistry,
  transaction,
  type Command,
} from "../src";
import {
  component,
  createFixtureProject,
  deepFreeze,
  entity,
  representation,
  system,
  withScene,
} from "../../../tests/helpers/model-fixtures";

interface CommandCase {
  readonly name: string;
  readonly document: ProjectDocument;
  readonly command: Command<unknown>;
}

function populated(seed = 2000): {
  ids: DeterministicIdFactory;
  document: ProjectDocument;
} {
  const { ids, document } = createFixtureProject(seed);
  const scene = createEmptyScene(ids, "Populated");
  const owner = entity(ids, "Owner", ["mass"]);
  const model = system(ids, "model");
  const view = representation(ids, "marker");
  return {
    ids,
    document: withScene(document, {
      ...scene,
      entityDefinitions: [owner],
      systemDefinitions: [model],
      representations: [view],
    }),
  };
}

function inverseCases(): readonly CommandCase[] {
  const cases: CommandCase[] = [];
  {
    const { ids, document } = createFixtureProject(2100);
    cases.push({
      name: "AddScene",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.addScene, {
        scene: createEmptyScene(ids, "Added"),
      }),
    });
  }
  {
    const { ids, document } = createFixtureProject(2200);
    const first = createEmptyScene(ids, "First");
    const second = createEmptyScene(ids, "Second");
    const transition = {
      id: ids.presentationTransitionId(),
      fromSceneId: first.id,
      toSceneId: second.id,
      trigger: { kind: "next" as const },
    };
    const reverseTransition = {
      id: ids.presentationTransitionId(),
      fromSceneId: second.id,
      toSceneId: first.id,
      trigger: { kind: "previous" as const },
    };
    const twoScenes = withScene(withScene(document, first), second);
    const connected = {
      ...twoScenes,
      presentationFlow: {
        ...twoScenes.presentationFlow,
        transitions: [transition, reverseTransition],
      },
    };
    cases.push({
      name: "RemoveScene",
      document: connected,
      command: command(ids, BUILTIN_COMMAND_TYPES.removeScene, {
        sceneId: first.id,
      }),
    });
    cases.push({
      name: "ReorderScenes",
      document: connected,
      command: command(ids, BUILTIN_COMMAND_TYPES.reorderScenes, {
        sceneOrder: [second.id, first.id],
      }),
    });
  }
  {
    const { ids, document } = createFixtureProject(2300);
    const scene = createEmptyScene(ids, "Entity scene");
    cases.push({
      name: "AddEntity",
      document: withScene(document, scene),
      command: command(ids, BUILTIN_COMMAND_TYPES.addEntity, {
        sceneId: scene.id,
        entity: entity(ids, "Added"),
      }),
    });
  }
  {
    const { ids, document } = populated(2400);
    const scene = document.scenes[0]!;
    const owner = scene.entityDefinitions[0]!;
    cases.push({
      name: "RemoveEntity",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.removeEntity, {
        sceneId: scene.id,
        entityId: owner.id,
      }),
    });
    cases.push({
      name: "AddComponent",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.addComponent, {
        sceneId: scene.id,
        entityId: owner.id,
        component: component(ids, "added"),
      }),
    });
    cases.push({
      name: "RemoveComponent",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.removeComponent, {
        sceneId: scene.id,
        entityId: owner.id,
        componentInstanceId: owner.componentInstances[0]!.instanceId,
      }),
    });
    cases.push({
      name: "SetComponentConfiguration",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.setComponentConfiguration, {
        sceneId: scene.id,
        entityId: owner.id,
        componentInstanceId: owner.componentInstances[0]!.instanceId,
        configuration: { changed: true },
      }),
    });
    cases.push({
      name: "SetComponentInitialState",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.setComponentInitialState, {
        sceneId: scene.id,
        entityId: owner.id,
        componentInstanceId: owner.componentInstances[0]!.instanceId,
        initialState: { position: [1, 2, 3] },
      }),
    });
    cases.push({
      name: "AddSystem",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.addSystem, {
        sceneId: scene.id,
        system: system(ids, "added"),
      }),
    });
    cases.push({
      name: "RemoveSystem",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.removeSystem, {
        sceneId: scene.id,
        systemId: scene.systemDefinitions[0]!.id,
      }),
    });
    cases.push({
      name: "AddRepresentation",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.addRepresentation, {
        sceneId: scene.id,
        representation: representation(ids, "added"),
      }),
    });
    cases.push({
      name: "RemoveRepresentation",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.removeRepresentation, {
        sceneId: scene.id,
        representationId: scene.representations[0]!.id,
      }),
    });
    cases.push({
      name: "SetProjectMetadata",
      document,
      command: command(ids, BUILTIN_COMMAND_TYPES.setProjectMetadata, {
        metadata: { ...document.metadata, title: "Changed" },
      }),
    });
  }
  return cases;
}

describe("built-in inverse commands", () => {
  it.each(inverseCases())(
    "$name restores the exact frozen input",
    ({ document, command: forward }) => {
      const ids = new DeterministicIdFactory(9000);
      const registry = createBuiltinCommandRegistry();
      const frozen = deepFreeze(document);
      const applied = applyCommandSequence(
        frozen,
        [forward],
        registry,
        ids,
        validateProjectDocument,
      );
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;
      expect(applied.value.document).not.toBe(frozen);
      const undone = applyCommandSequence(
        applied.value.document,
        applied.value.inverse,
        registry,
        ids,
        validateProjectDocument,
      );
      expect(undone.ok).toBe(true);
      if (undone.ok) expect(undone.value.document).toEqual(frozen);
    },
  );
});

describe("atomic transactions", () => {
  it("publishes two commands once and undoes/redoes them as one entry", () => {
    const { ids, document } = createFixtureProject(3000);
    const scene = createEmptyScene(ids, "Transaction");
    const store = new DefaultProjectStore(
      document,
      createBuiltinCommandRegistry(),
      ids,
    );
    const updates: number[] = [];
    store.subscribe(({ revision }) => updates.push(revision));
    const batch = transaction(
      ids,
      [
        command(ids, BUILTIN_COMMAND_TYPES.addScene, { scene }),
        command(ids, BUILTIN_COMMAND_TYPES.addEntity, {
          sceneId: scene.id,
          entity: entity(ids, "Entity"),
        }),
      ],
      "Add scene and entity",
    );
    expect(store.dispatchTransaction(batch).ok).toBe(true);
    expect(updates).toEqual([1]);
    const final = store.getDocument();
    expect(final.scenes[0]!.entityDefinitions).toHaveLength(1);
    expect(store.undo().ok).toBe(true);
    expect(store.getDocument()).toEqual(document);
    expect(store.redo().ok).toBe(true);
    expect(store.getDocument()).toEqual(final);
  });

  it("publishes no partial document and emits no update when the second command fails", () => {
    const { ids, document } = createFixtureProject(3100);
    const scene = createEmptyScene(ids, "Rollback");
    const duplicate = entity(ids, "Duplicate");
    const store = new DefaultProjectStore(
      document,
      createBuiltinCommandRegistry(),
      ids,
    );
    let updates = 0;
    store.subscribe(() => {
      updates += 1;
    });
    const failed = store.dispatchTransaction(
      transaction(ids, [
        command(ids, BUILTIN_COMMAND_TYPES.addScene, { scene }),
        command(ids, BUILTIN_COMMAND_TYPES.addEntity, {
          sceneId: scene.id,
          entity: duplicate,
        }),
        command(ids, BUILTIN_COMMAND_TYPES.addEntity, {
          sceneId: scene.id,
          entity: duplicate,
        }),
      ]),
    );
    expect(failed).toMatchObject({
      ok: false,
      error: { kind: "command-validation-failed" },
    });
    expect(store.getDocument()).toBe(document);
    expect(store.getRevision()).toBe(0);
    expect(updates).toBe(0);
    expect(store.canUndo()).toBe(false);
  });
});

describe("ProjectStore history and save state", () => {
  it("clears redo on a new branch", () => {
    const { ids, document } = createFixtureProject(3200);
    const store = new DefaultProjectStore(
      document,
      createBuiltinCommandRegistry(),
      ids,
    );
    const first = createEmptyScene(ids, "First");
    expect(
      store.dispatch(
        command(ids, BUILTIN_COMMAND_TYPES.addScene, { scene: first }),
      ).ok,
    ).toBe(true);
    expect(store.undo().ok).toBe(true);
    expect(store.canRedo()).toBe(true);
    const branch = createEmptyScene(ids, "Branch");
    expect(
      store.dispatch(
        command(ids, BUILTIN_COMMAND_TYPES.addScene, { scene: branch }),
      ).ok,
    ).toBe(true);
    expect(store.canRedo()).toBe(false);
    expect(store.getDocument().scenes.map((scene) => scene.name)).toEqual([
      "Branch",
    ]);
  });

  it("uses stable history tokens for markSaved/isDirty and resets history on replace", () => {
    const { ids, document } = createFixtureProject(3300);
    const store = new DefaultProjectStore(
      document,
      createBuiltinCommandRegistry(),
      ids,
    );
    expect(store.isDirty()).toBe(false);
    expect(
      store.dispatch(
        command(ids, BUILTIN_COMMAND_TYPES.addScene, {
          scene: createEmptyScene(ids, "Saved"),
        }),
      ).ok,
    ).toBe(true);
    expect(store.isDirty()).toBe(true);
    store.markSaved();
    expect(store.isDirty()).toBe(false);
    expect(store.undo().ok).toBe(true);
    expect(store.isDirty()).toBe(true);
    expect(store.redo().ok).toBe(true);
    expect(store.isDirty()).toBe(false);

    const replacement = createFixtureProject(3400).document;
    store.replaceDocument(replacement);
    expect(store.getDocument()).toBe(replacement);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
    expect(store.isDirty()).toBe(false);
    store.replaceDocument(document, { markSaved: false });
    expect(store.isDirty()).toBe(true);
  });

  it("does not create history or revisions when an external runtime fixture changes", () => {
    const { ids, document } = createFixtureProject(3500);
    const store = new DefaultProjectStore(
      document,
      createBuiltinCommandRegistry(),
      ids,
    );
    const runtime = { frame: 0, time: 0 };
    runtime.frame = 60;
    runtime.time = 1;
    expect(store.getDocument()).toBe(document);
    expect(store.getRevision()).toBe(0);
    expect(store.canUndo()).toBe(false);
    expect(store.isDirty()).toBe(false);
  });
});

describe("deterministic 100-command history", () => {
  it("applies, undoes all and redoes all with exact document equality", () => {
    const { ids, document: empty } = createFixtureProject(4000);
    const scene = createEmptyScene(ids, "History");
    const initial = withScene(empty, scene);
    const store = new DefaultProjectStore(
      initial,
      createBuiltinCommandRegistry(),
      ids,
    );
    for (let index = 0; index < 100; index += 1) {
      const result = store.dispatch(
        command(ids, BUILTIN_COMMAND_TYPES.addEntity, {
          sceneId: scene.id,
          entity: entity(ids, `Entity ${index}`),
        }),
      );
      expect(result.ok).toBe(true);
    }
    const final = store.getDocument();
    expect(final.scenes[0]!.entityDefinitions).toHaveLength(100);
    for (let index = 0; index < 100; index += 1)
      expect(store.undo().ok).toBe(true);
    expect(store.getDocument()).toEqual(initial);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(true);
    for (let index = 0; index < 100; index += 1)
      expect(store.redo().ok).toBe(true);
    expect(store.getDocument()).toEqual(final);
    expect(store.canRedo()).toBe(false);
  });
});
