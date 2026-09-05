import {
  createBuiltInPhysicsLibrary,
  planLibraryInstantiation,
} from "@physica/assets";
import {
  BUILTIN_COMMAND_TYPES,
  DefaultProjectStore,
  command,
  createBuiltinCommandRegistry,
} from "@physica/commands";
import {
  createEmptyProject,
  createEmptyScene,
  DeterministicIdFactory,
  registeredTypeId,
} from "@physica/core-model";
import {
  compileAdvancedTimeline,
  evaluateAdvancedTimeline,
  type AdvancedTimelineV1,
} from "@physica/storyboard";

export function runTeacherAuthoringWorkflow() {
  const ids = new DeterministicIdFactory(7_400_000);
  const project = createEmptyProject(ids, {
    title: "Motion question",
    description: "How does position change?",
    tags: ["teacher-authored"],
    createdAt: "2026-09-01T00:00:00.000Z",
  });
  const store = new DefaultProjectStore(
    project,
    createBuiltinCommandRegistry(),
    ids,
  );
  const scene = createEmptyScene(ids, "Motion explanation");
  const sceneResult = store.dispatch(
    command(ids, BUILTIN_COMMAND_TYPES.addScene, { scene }),
  );
  if (!sceneResult.ok) throw new Error(sceneResult.error.message);

  const catalog = createBuiltInPhysicsLibrary();
  const planned = planLibraryInstantiation(catalog, {
    itemId: registeredTypeId("physica:library/ball"),
    destinationSceneId: scene.id,
    idFactory: ids,
  });
  if (!planned.ok) throw new Error(planned.error.message);
  const libraryResult = store.dispatch(
    command(ids, BUILTIN_COMMAND_TYPES.instantiateLibraryItem, planned.value),
  );
  if (!libraryResult.ok) throw new Error(libraryResult.error.message);

  const entity = store.getDocument().scenes[0]!.entityDefinitions[0]!;
  const component = entity.componentInstances[0]!;
  const moveResult = store.dispatch(
    command(ids, BUILTIN_COMMAND_TYPES.setComponentInitialState, {
      sceneId: scene.id,
      entityId: entity.id,
      componentInstanceId: component.instanceId,
      initialState: {
        ...component.initialState,
        positionX: 1.5,
        positionY: 2,
      },
    }),
  );
  if (!moveResult.ok) throw new Error(moveResult.error.message);
  const afterMove = store.getDocument();
  const undoExact =
    store.undo().ok &&
    store.getDocument().scenes[0]!.entityDefinitions[0]!.componentInstances[0]!
      .initialState.positionX === undefined;
  const redoExact =
    store.redo().ok &&
    JSON.stringify(store.getDocument()) === JSON.stringify(afterMove);

  const timeline: AdvancedTimelineV1 = {
    schemaVersion: 1,
    tracks: [
      {
        id: "explanation",
        name: "Animation",
        kind: "animation",
        clockKey: "presentation",
        clips: [
          {
            id: "reveal",
            label: "Reveal ball",
            startSeconds: 0,
            durationSeconds: 3,
            clockKey: "presentation",
            payload: { target: "ball" },
          },
        ],
      },
      {
        id: "measure",
        name: "Data acquisition",
        kind: "acquisition",
        clockKey: "simulation",
        clips: [
          {
            id: "record",
            label: "Record position",
            startSeconds: 1,
            durationSeconds: 3,
            clockKey: "simulation",
            payload: { cadenceSeconds: 0.1 },
          },
        ],
      },
    ],
  };
  const compiled = compileAdvancedTimeline(timeline);
  if (!compiled.ok) throw new Error(compiled.issues[0]?.message);
  const snapshot = evaluateAdvancedTimeline(compiled.value, 2);
  if (!snapshot.ok) throw new Error(snapshot.issues[0]?.message);

  return {
    id: "teacher-authoring-workflow",
    projectTitle: store.getDocument().metadata.title,
    scene: store.getDocument().scenes[0]!.name,
    entities: store
      .getDocument()
      .scenes[0]!.entityDefinitions.map((candidate) => candidate.name),
    librarySource:
      store.getDocument().scenes[0]!.entityDefinitions[0]!
        .componentInstances[0]!.sourceLibraryItem?.libraryItemId,
    physicalInitialPosition: {
      x: store.getDocument().scenes[0]!.entityDefinitions[0]!
        .componentInstances[0]!.initialState.positionX,
      y: store.getDocument().scenes[0]!.entityDefinitions[0]!
        .componentInstances[0]!.initialState.positionY,
    },
    layoutWritesPhysics: false,
    undoExact,
    redoExact,
    activeTimelineClips: snapshot.value.activeClips.map((entry) => ({
      id: entry.clip.id,
      clock: entry.clockKey,
    })),
    validationHasErrors: store.validate().hasErrors,
  };
}
