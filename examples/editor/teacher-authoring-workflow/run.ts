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
  type SceneId,
} from "@physica/core-model";
import { parseProjectJson, serializeProjectJson } from "@physica/serialization";

export function runTeacherAuthoringWorkflow() {
  const ids = new DeterministicIdFactory(7_400_000);
  const project = createEmptyProject(ids, {
    title: "Forces lesson",
    description: "How does force change motion?",
    tags: ["teacher-authored", "teacher-workflow-recovery"],
    createdAt: "2026-09-06T00:00:00.000Z",
  });
  const store = new DefaultProjectStore(
    project,
    createBuiltinCommandRegistry(),
    ids,
  );
  const opening = {
    ...createEmptyScene(ids, "Explore the force"),
    metadata: {
      "physica:lesson/objective":
        "Connect a larger resultant force to a larger acceleration.",
      "physica:lesson/notes": "Ask learners to predict before changing force.",
      "physica:lesson/durationSeconds": 25,
    },
  };
  const explanation = {
    ...createEmptyScene(ids, "Explain the relationship"),
    metadata: {
      "physica:lesson/objective": "Use F = ma to explain the observation.",
      "physica:lesson/notes": "Keep mass constant during the comparison.",
      "physica:lesson/durationSeconds": 35,
    },
  };
  addScene(opening.id, opening);
  addScene(explanation.id, explanation);

  const catalog = createBuiltInPhysicsLibrary();
  const ballId = instantiate("physica:library/ball", opening.id);
  const textId = instantiate(
    "physica:library/text-explanation",
    explanation.id,
  );
  instantiate("physica:library/equation-panel", explanation.id);

  const ball = store
    .getDocument()
    .scenes[0]!.entityDefinitions.find((entity) => entity.id === ballId)!;
  const ballComponent = ball.componentInstances[0]!;
  dispatch(
    BUILTIN_COMMAND_TYPES.setComponentInitialState,
    {
      sceneId: opening.id,
      entityId: ball.id,
      componentInstanceId: ballComponent.instanceId,
      initialState: {
        ...ballComponent.initialState,
        positionX: 1.5,
        positionY: 2,
      },
    },
    "Edit physical starting position",
  );
  dispatch(
    BUILTIN_COMMAND_TYPES.setEntityPresentation,
    {
      sceneId: opening.id,
      entityId: ball.id,
      name: "Demonstration ball",
      visualDefaults: { x: 310, y: 245 },
    },
    "Arrange ball on slide",
  );

  const text = store
    .getDocument()
    .scenes[1]!.entityDefinitions.find((entity) => entity.id === textId)!;
  dispatch(
    BUILTIN_COMMAND_TYPES.setEntityPresentation,
    {
      sceneId: explanation.id,
      entityId: text.id,
      name: "Lesson explanation",
      visualDefaults: {
        x: 300,
        y: 210,
        content:
          "For the same mass, doubling the resultant force doubles acceleration.",
      },
    },
    "Author lesson explanation",
  );

  const authored = store.getDocument();
  const serialized = serializeProjectJson(authored);
  if (!serialized.ok) throw new Error(serialized.error.message);
  const reopened = parseProjectJson(serialized.value);
  if (!reopened.ok) throw new Error(reopened.error.message);
  const reserialized = serializeProjectJson(reopened.value.document);
  if (!reserialized.ok) throw new Error(reserialized.error.message);

  return {
    id: "teacher-authoring-workflow",
    projectTitle: authored.metadata.title,
    sceneOrder: authored.presentationFlow.sceneOrder.map(
      (sceneId) => authored.scenes.find((scene) => scene.id === sceneId)!.name,
    ),
    openingObjective:
      authored.scenes[0]!.metadata?.["physica:lesson/objective"],
    openingNotes: authored.scenes[0]!.metadata?.["physica:lesson/notes"],
    ball: {
      name: authored.scenes[0]!.entityDefinitions[0]!.name,
      physicalPosition: {
        x: authored.scenes[0]!.entityDefinitions[0]!.componentInstances[0]!
          .initialState.positionX,
        y: authored.scenes[0]!.entityDefinitions[0]!.componentInstances[0]!
          .initialState.positionY,
      },
      presentationPosition:
        authored.scenes[0]!.entityDefinitions[0]!.visualDefaults,
    },
    explanation: authored.scenes[1]!.entityDefinitions.find(
      (entity) => entity.name === "Lesson explanation",
    )?.visualDefaults?.content,
    serializationRoundTrip: reserialized.value === serialized.value,
    validationHasErrors: reopened.value.validation.hasErrors,
  };

  function addScene(sceneId: SceneId, scene: typeof opening) {
    dispatch(BUILTIN_COMMAND_TYPES.addScene, { scene }, "Add scene " + sceneId);
  }

  function instantiate(itemId: string, sceneId: SceneId) {
    const planned = planLibraryInstantiation(catalog, {
      itemId: registeredTypeId(itemId),
      destinationSceneId: sceneId,
      idFactory: ids,
    });
    if (!planned.ok) throw new Error(planned.error.message);
    dispatch(
      BUILTIN_COMMAND_TYPES.instantiateLibraryItem,
      planned.value,
      "Add Library item",
    );
    return planned.value.snapshot.entityDefinitions[0]!.id;
  }

  function dispatch(type: string, payload: object, label: string) {
    const result = store.dispatch(
      command(ids, registeredTypeId(type), payload, label),
    );
    if (!result.ok) throw new Error(result.error.message);
  }
}
