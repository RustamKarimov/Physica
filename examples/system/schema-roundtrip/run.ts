import {
  DeterministicIdFactory,
  createEmptyProject,
  createEmptyScene,
  registeredTypeId,
  type ProjectDocument,
} from "@physica/core-model";
import { parseProjectJson, serializeProjectJson } from "@physica/serialization";

export interface SchemaRoundtripResult {
  readonly equal: boolean;
  readonly sceneCount: number;
  readonly unknownPluginPreserved: boolean;
  readonly validationErrors: number;
}

export function buildSchemaRoundtripProject(): ProjectDocument {
  const ids = new DeterministicIdFactory(5000);
  const project = createEmptyProject(ids, {
    title: "Schema round trip",
    tags: ["example", "system"],
    createdAt: "2026-08-29T00:00:00.000Z",
  });
  const first = createEmptyScene(ids, "Model");
  const second = createEmptyScene(ids, "Explanation");
  const assetId = ids.assetId();
  const datasetId = ids.datasetId();
  const entityId = ids.entityId();
  const unknownComponent = {
    instanceId: ids.componentInstanceId(),
    componentTypeId: registeredTypeId(
      "org.example.plugin:component/custom-model",
    ),
    componentSchemaVersion: 4,
    configuration: { model: "opaque", coefficients: [1, 2, 3] },
    initialState: { seed: 42 },
    bindings: [] as const,
    enabled: true,
    metadata: { preserved: true },
    extensions: { "org.example.plugin:future": { data: ["kept"] } },
  };
  const systemId = ids.systemId();
  return {
    ...project,
    assets: [
      {
        id: assetId,
        uri: "assets/measurements.json",
        mediaType: "application/json",
      },
    ],
    datasets: [
      {
        id: datasetId,
        name: "Measurements",
        datasetTypeId: registeredTypeId("physica.dataset:experimental-table"),
        datasetSchemaVersion: 1,
        storage: { kind: "asset", assetId },
      },
    ],
    scenes: [
      {
        ...first,
        entityDefinitions: [
          {
            id: entityId,
            name: "Unknown model owner",
            componentInstances: [unknownComponent],
            tags: [],
          },
        ],
        systemDefinitions: [
          {
            id: systemId,
            name: "Schema-only system",
            systemTypeId: registeredTypeId("physica.system:schema-only"),
            systemSchemaVersion: 1,
            configuration: {},
            participants: [{ kind: "entity", entityId }],
            declaredInputs: [],
            declaredOutputs: [],
            enabled: true,
          },
        ],
        datasetRefs: [datasetId],
      },
      {
        ...second,
        representations: [
          {
            id: ids.representationId(),
            representationTypeId: registeredTypeId(
              "physica.representation:text-block",
            ),
            representationSchemaVersion: 1,
            sourceBindings: [],
            configuration: {
              semanticRole: "definition",
              text: "Schema envelopes preserve meaning.",
            },
            layout: {},
            visual: {},
            relationshipRefs: [],
            enabled: true,
          },
        ],
      },
    ],
    presentationFlow: {
      entrySceneId: first.id,
      sceneOrder: [first.id, second.id],
      transitions: [
        {
          id: ids.presentationTransitionId(),
          fromSceneId: first.id,
          toSceneId: second.id,
          trigger: { kind: "next" },
        },
      ],
    },
  };
}

export function runSchemaRoundtrip(): SchemaRoundtripResult {
  const original = buildSchemaRoundtripProject();
  const serialized = serializeProjectJson(original);
  if (!serialized.ok) throw new Error(serialized.error.message);
  const parsed = parseProjectJson(serialized.value);
  if (!parsed.ok) throw new Error(parsed.error.message);
  const restored = parsed.value.document;
  const restoredText = serializeProjectJson(restored);
  if (!restoredText.ok) throw new Error(restoredText.error.message);
  const opaque =
    restored.scenes[0]!.entityDefinitions[0]!.componentInstances[0]!;
  return {
    equal: restoredText.value === serialized.value,
    sceneCount: restored.scenes.length,
    unknownPluginPreserved:
      opaque.componentTypeId === "org.example.plugin:component/custom-model" &&
      opaque.extensions?.["org.example.plugin:future"] !== undefined,
    validationErrors: parsed.value.validation.issues.filter(
      (issue) => issue.severity === "fatal" || issue.severity === "error",
    ).length,
  };
}
