import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  isUuidV4,
  parseRegisteredTypeId,
  parseUuid,
  registeredTypeId,
  validateProjectDocument,
  type ComponentDefinition,
  type ComponentInstanceId,
  type EntityId,
  type ProjectDefinitionRegistry,
  type ProjectId,
  type SystemTypeDefinition,
} from "../src";
import {
  POSITION_CHANNEL,
  component,
  createFixtureProject,
  deepFreeze,
  entity,
  representation,
  system,
  withScene,
} from "../../../tests/helpers/model-fixtures";
import { createEmptyScene } from "../src";

describe("persisted identifiers", () => {
  it("generates UUID v4 identifiers deterministically", () => {
    const first = new DeterministicIdFactory(7);
    const second = new DeterministicIdFactory(7);
    const ids = [
      first.projectId(),
      first.sceneId(),
      first.componentInstanceId(),
    ];
    expect(ids.every(isUuidV4)).toBe(true);
    expect(ids).toEqual([
      second.projectId(),
      second.sceneId(),
      second.componentInstanceId(),
    ]);
    expect(new DeterministicIdFactory(8).projectId()).not.toBe(ids[0]);
  });

  it("rejects invalid persisted and registered identifier strings", () => {
    expect(parseUuid<ProjectId>("not-a-uuid")).toMatchObject({ ok: false });
    expect(parseRegisteredTypeId("Missing Namespace")).toMatchObject({
      ok: false,
    });
    expect(() => registeredTypeId("bad type")).toThrow(TypeError);
  });
});

describe("structural and reference validation", () => {
  it("accepts a valid PresentationFlow and finds dangling references", () => {
    const { ids, document } = createFixtureProject();
    const scene = createEmptyScene(ids, "Scene");
    const valid = withScene(document, scene);
    expect(validateProjectDocument(valid).hasErrors).toBe(false);

    const dangling = ids.sceneId();
    const invalid = {
      ...valid,
      presentationFlow: {
        ...valid.presentationFlow,
        entrySceneId: dangling,
        transitions: [
          {
            id: ids.presentationTransitionId(),
            fromSceneId: scene.id,
            toSceneId: dangling,
            trigger: { kind: "next" as const },
          },
        ],
      },
    };
    const codes = validateProjectDocument(invalid).issues.map(
      (item) => item.code,
    );
    expect(codes).toContain("dangling-entry-scene");
    expect(codes).toContain("dangling-transition-target");
  });

  it("detects globally duplicate IDs including component instances", () => {
    const { ids, document } = createFixtureProject();
    const scene = createEmptyScene(ids, "Duplicate IDs");
    const first = entity(ids, "One", ["mass"]);
    const second = entity(ids, "Two", ["charge"]);
    const duplicateComponent = {
      ...second.componentInstances[0]!,
      instanceId: first.componentInstances[0]!.instanceId,
    };
    const invalid = withScene(document, {
      ...scene,
      entityDefinitions: [
        first,
        { ...second, componentInstances: [duplicateComponent] },
      ],
    });
    expect(validateProjectDocument(invalid).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate-persisted-id" }),
      ]),
    );
  });

  it("detects dangling system participants, representation sources and dataset assets", () => {
    const { ids, document } = createFixtureProject();
    const scene = createEmptyScene(ids, "References");
    const missingEntity = ids.entityId();
    const invalidSystem = system(ids, "constraint", [
      { kind: "entity", entityId: missingEntity },
    ]);
    const invalidRepresentation = representation(ids, "marker", [
      { kind: "entity", entityId: missingEntity },
    ]);
    const invalid = withScene(
      {
        ...document,
        datasets: [
          {
            id: ids.datasetId(),
            name: "Missing asset",
            datasetTypeId: registeredTypeId("physica.dataset:table"),
            datasetSchemaVersion: 1,
            storage: { kind: "asset", assetId: ids.assetId() },
          },
        ],
      },
      {
        ...scene,
        systemDefinitions: [invalidSystem],
        representations: [invalidRepresentation],
      },
    );
    const codes = validateProjectDocument(invalid).issues.map(
      (item) => item.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "dangling-system-participant",
        "dangling-representation-source",
        "dangling-dataset-asset",
      ]),
    );
  });
});

describe("single-authoritative-writer validation", () => {
  function componentDefinition(
    instanceId: ComponentInstanceId,
  ): ComponentDefinition {
    return {
      typeId: registeredTypeId("physica.component:writer"),
      schemaVersion: 1,
      requiredCapabilities: [],
      providedCapabilities: [],
      readStateChannels: [],
      writeStateChannels: [POSITION_CHANNEL],
      observableDefinitions: [],
      solverRequirements: [],
      assumptions: [],
      validateConfiguration: () => [],
      resolveStateClaims: (instance) =>
        instance.instanceId === instanceId
          ? [{ channel: POSITION_CHANNEL, role: "authoritative-write" }]
          : [],
    };
  }

  function registryFor(
    definition: ComponentDefinition,
  ): ProjectDefinitionRegistry {
    return {
      getComponentDefinition: (typeId, version) =>
        typeId === definition.typeId && version === definition.schemaVersion
          ? definition
          : undefined,
      getSystemDefinition: (): SystemTypeDefinition | undefined => undefined,
    };
  }

  it("accepts one component writer and rejects component + System writers", () => {
    const { ids, document } = createFixtureProject();
    const scene = createEmptyScene(ids, "Authority");
    const body = entity(ids, "Body");
    const writer = {
      ...component(ids, "writer"),
      componentTypeId: registeredTypeId("physica.component:writer"),
    };
    const entityWithWriter = { ...body, componentInstances: [writer] };
    const oneWriter = withScene(document, {
      ...scene,
      entityDefinitions: [entityWithWriter],
    });
    const registry = registryFor(componentDefinition(writer.instanceId));
    expect(validateProjectDocument(oneWriter, registry).hasErrors).toBe(false);

    const competingSystem = {
      ...system(ids, "motion"),
      declaredOutputs: [
        {
          scope: "entity" as const,
          entityId: body.id,
          channel: POSITION_CHANNEL,
        },
      ],
    };
    const conflict = {
      ...oneWriter,
      scenes: [
        { ...oneWriter.scenes[0]!, systemDefinitions: [competingSystem] },
      ],
    };
    expect(validateProjectDocument(conflict, registry).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "multiple-authoritative-state-writers",
        }),
      ]),
    );
  });

  it("accepts one System writer and rejects two System writers", () => {
    const { ids, document } = createFixtureProject();
    const scene = createEmptyScene(ids, "System authority");
    const body = entity(ids, "Body");
    const output = {
      scope: "entity" as const,
      entityId: body.id as EntityId,
      channel: POSITION_CHANNEL,
    };
    const first = { ...system(ids, "first"), declaredOutputs: [output] };
    const one = withScene(document, {
      ...scene,
      entityDefinitions: [body],
      systemDefinitions: [first],
    });
    expect(validateProjectDocument(one).hasErrors).toBe(false);
    const two = {
      ...one,
      scenes: [
        {
          ...one.scenes[0]!,
          systemDefinitions: [
            first,
            { ...system(ids, "second"), declaredOutputs: [output] },
          ],
        },
      ],
    };
    expect(
      validateProjectDocument(two).issues.some(
        (item) => item.code === "multiple-authoritative-state-writers",
      ),
    ).toBe(true);
  });
});

describe("document/runtime separation", () => {
  it("keeps runtime frames outside ProjectDocument and leaves a frozen document unchanged", () => {
    const { document } = createFixtureProject();
    const frozen = deepFreeze(document);
    const before = JSON.stringify(frozen);
    const runtimeFixture = {
      frame: 0,
      time: 0,
      channels: new Map<string, number>(),
    };
    runtimeFixture.frame += 1;
    runtimeFixture.time = 1 / 60;
    runtimeFixture.channels.set("motion.position", 4.2);
    expect(JSON.stringify(frozen)).toBe(before);
    expect("runtimeState" in frozen).toBe(false);
    expect("frame" in frozen).toBe(false);
  });
});
