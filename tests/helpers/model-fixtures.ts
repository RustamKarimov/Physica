import {
  DeterministicIdFactory,
  createEmptyProject,
  createEmptyScene,
  registeredTypeId,
  stateChannelId,
  type ComponentInstance,
  type DatasetDefinition,
  type EntityDefinition,
  type IdFactory,
  type ProjectDocument,
  type RepresentationDefinition,
  type SceneDefinition,
  type SystemDefinition,
} from "../../packages/core-model/src";

export function createFixtureProject(seed = 0): {
  readonly document: ProjectDocument;
  readonly ids: DeterministicIdFactory;
} {
  const ids = new DeterministicIdFactory(seed);
  return {
    ids,
    document: createEmptyProject(ids, {
      title: "Fixture project",
      description: "Schema-only Step 5 fixture",
      tags: ["test"],
      createdAt: "2026-08-29T00:00:00.000Z",
    }),
  };
}

export function component(
  ids: IdFactory,
  name: string,
  configuration: Record<
    string,
    import("../../packages/core-model/src").JsonValue
  > = {},
): ComponentInstance {
  return {
    instanceId: ids.componentInstanceId(),
    componentTypeId: registeredTypeId(`physica.component:${name}`),
    componentSchemaVersion: 1,
    configuration,
    initialState: {},
    bindings: [],
    enabled: true,
  };
}

export function entity(
  ids: IdFactory,
  name: string,
  componentNames: readonly string[] = [],
): EntityDefinition {
  return {
    id: ids.entityId(),
    name,
    componentInstances: componentNames.map((entry) => component(ids, entry)),
    tags: [],
  };
}

export function system(
  ids: IdFactory,
  name: string,
  participants: SystemDefinition["participants"] = [],
): SystemDefinition {
  return {
    id: ids.systemId(),
    name,
    systemTypeId: registeredTypeId(`physica.system:${name}`),
    systemSchemaVersion: 1,
    configuration: {},
    participants,
    declaredInputs: [],
    declaredOutputs: [],
    enabled: true,
  };
}

export function representation(
  ids: IdFactory,
  name: string,
  sourceBindings: RepresentationDefinition["sourceBindings"] = [],
): RepresentationDefinition {
  return {
    id: ids.representationId(),
    representationTypeId: registeredTypeId(`physica.representation:${name}`),
    representationSchemaVersion: 1,
    sourceBindings,
    configuration: {},
    layout: {},
    visual: {},
    relationshipRefs: [],
    enabled: true,
  };
}

export function withScene(
  document: ProjectDocument,
  scene: SceneDefinition,
): ProjectDocument {
  return {
    ...document,
    scenes: [...document.scenes, scene],
    presentationFlow: {
      ...document.presentationFlow,
      entrySceneId: document.presentationFlow.entrySceneId ?? scene.id,
      sceneOrder: [...document.presentationFlow.sceneOrder, scene.id],
    },
  };
}

function proofBase(
  seed: number,
  name: string,
): {
  ids: DeterministicIdFactory;
  project: ProjectDocument;
  scene: SceneDefinition;
} {
  const { ids, document } = createFixtureProject(seed);
  return { ids, project: document, scene: createEmptyScene(ids, name) };
}

export interface FutureProofFixture {
  readonly name: string;
  readonly document: ProjectDocument;
}

export function createFutureProofFixtures(): readonly FutureProofFixture[] {
  const fixtures: FutureProofFixture[] = [];

  {
    const { ids, project, scene } = proofBase(100, "Projectile");
    const ball = entity(ids, "Ball", [
      "translational-body",
      "mass-property",
      "projectile-model",
    ]);
    fixtures.push({
      name: "projectile",
      document: withScene(project, { ...scene, entityDefinitions: [ball] }),
    });
  }
  {
    const { ids, project, scene } = proofBase(200, "Pulley");
    const entities = [
      entity(ids, "Mass A"),
      entity(ids, "Mass B"),
      entity(ids, "Pulley"),
      entity(ids, "String"),
    ];
    const connected = system(
      ids,
      "connected-constraint",
      entities.map((item) => ({ kind: "entity" as const, entityId: item.id })),
    );
    fixtures.push({
      name: "pulley",
      document: withScene(project, {
        ...scene,
        entityDefinitions: entities,
        systemDefinitions: [connected],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(300, "Circuit");
    const entities = [
      entity(ids, "Battery"),
      entity(ids, "Resistor"),
      entity(ids, "Switch"),
    ];
    fixtures.push({
      name: "circuit",
      document: withScene(project, {
        ...scene,
        entityDefinitions: entities,
        systemDefinitions: [
          system(
            ids,
            "circuit-network",
            entities.map((item) => ({
              kind: "entity" as const,
              entityId: item.id,
            })),
          ),
        ],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(400, "Particle gas");
    fixtures.push({
      name: "particle-gas",
      document: withScene(project, {
        ...scene,
        entityDefinitions: [entity(ids, "Container")],
        systemDefinitions: [system(ids, "particle-ensemble")],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(500, "Wave grid");
    fixtures.push({
      name: "wave-grid",
      document: withScene(project, {
        ...scene,
        entityDefinitions: [entity(ids, "Source"), entity(ids, "Boundary")],
        systemDefinitions: [system(ids, "wave-grid")],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(600, "Radioactive sample");
    fixtures.push({
      name: "radioactive-sample",
      document: withScene(project, {
        ...scene,
        entityDefinitions: [
          entity(ids, "Sample", [
            "radioactive-species",
            "stochastic-decay-model",
          ]),
        ],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(700, "Ultrasound acquisition");
    fixtures.push({
      name: "ultrasound-acquisition",
      document: withScene(project, {
        ...scene,
        entityDefinitions: [
          entity(ids, "Transducer"),
          entity(ids, "Tissue layer A"),
          entity(ids, "Tissue layer B"),
        ],
        systemDefinitions: [
          system(ids, "layered-propagation"),
          system(ids, "acquisition"),
        ],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(800, "Tomography");
    const source = entity(ids, "Source");
    const detector = entity(ids, "Detector array");
    const assetId = ids.assetId();
    const datasetId = ids.datasetId();
    fixtures.push({
      name: "tomography",
      document: withScene(
        {
          ...project,
          assets: [
            {
              id: assetId,
              uri: "assets/projections.json",
              mediaType: "application/json",
            },
          ],
          datasets: [
            {
              id: datasetId,
              name: "Projections",
              datasetTypeId: registeredTypeId(
                "physica.dataset:projection-table",
              ),
              datasetSchemaVersion: 1,
              storage: { kind: "asset", assetId },
            },
          ],
        },
        {
          ...scene,
          entityDefinitions: [source, detector],
          systemDefinitions: [
            system(ids, "projection-acquisition"),
            system(ids, "reconstruction"),
          ],
          datasetRefs: [datasetId],
        },
      ),
    });
  }
  {
    const { ids, project, scene } = proofBase(900, "Galaxy redshift");
    const galaxy = entity(ids, "Galaxy", ["spectrum-source", "redshift-model"]);
    fixtures.push({
      name: "galaxy-redshift",
      document: withScene(project, {
        ...scene,
        entityDefinitions: [galaxy],
        representations: [
          representation(ids, "spectrum", [
            { kind: "entity", entityId: galaxy.id },
          ]),
        ],
        graphDefinitions: [
          {
            id: ids.graphId(),
            typeId: registeredTypeId("physica.graph:hubble-plot"),
            schemaVersion: 1,
            configuration: {},
            enabled: true,
          },
        ],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(1000, "3D rigid body");
    const body = entity(ids, "Body", ["transform-3d", "rigid-body"]);
    fixtures.push({
      name: "rigid-body-3d",
      document: withScene(project, {
        ...scene,
        entityDefinitions: [body],
        systemDefinitions: [
          system(ids, "rigid-world", [{ kind: "entity", entityId: body.id }]),
        ],
      }),
    });
  }
  {
    const { ids, project, scene } = proofBase(1100, "Explanatory text");
    const textBlock = {
      ...representation(ids, "text-block"),
      configuration: {
        semanticRole: "definition",
        text: "A schema-only explanation.",
      },
    };
    fixtures.push({
      name: "text-block",
      document: withScene(project, { ...scene, representations: [textBlock] }),
    });
  }
  {
    const { ids, project, scene } = proofBase(1200, "Experimental dataset");
    const dataset: DatasetDefinition = {
      id: ids.datasetId(),
      name: "Measurements",
      datasetTypeId: registeredTypeId("physica.dataset:experimental-table"),
      datasetSchemaVersion: 1,
      storage: {
        kind: "inline-json",
        value: [
          { time: 0, value: 1 },
          { time: 1, value: 2 },
        ],
      },
    };
    fixtures.push({
      name: "experimental-dataset",
      document: withScene(
        { ...project, datasets: [dataset] },
        {
          ...scene,
          datasetRefs: [dataset.id],
          graphDefinitions: [
            {
              id: ids.graphId(),
              typeId: registeredTypeId("physica.graph:dataset-plot"),
              schemaVersion: 1,
              configuration: { datasetId: dataset.id },
              enabled: true,
            },
          ],
        },
      ),
    });
  }

  return fixtures;
}

export const POSITION_CHANNEL = stateChannelId("motion.position");

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
  }
  return value;
}
