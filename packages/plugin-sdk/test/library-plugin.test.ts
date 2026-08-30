import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  pluginId,
  registeredTypeId,
} from "@physica/core-model";
import {
  createPhysicsLibraryRegistries,
  registerDeclarativeLibraryPlugin,
  type LibraryCreationReference,
  type LibraryItemClass,
  type LibraryItemDefinition,
} from "../src";

describe("declarative Library plugin registration", () => {
  it("discovers a Smart Model, Prefab and Instrument without editor changes", () => {
    const registries = createPhysicsLibraryRegistries();
    const id = pluginId("example.plugin");
    const source = {
      kind: "plugin" as const,
      sourcePackage: "example-plugin",
      pluginId: id,
    };
    const ids = new DeterministicIdFactory(95_000);
    const prefabId = registeredTypeId("example.plugin:prefab/base");
    const instrumentId = registeredTypeId(
      "example.plugin:instrument/stopwatch",
    );
    const prefab = {
      id: prefabId,
      schemaVersion: 1,
      version: "1.0.0",
      displayName: "Plugin prefab",
      source,
      targetSlots: [],
      snapshot: {
        templateSceneId: ids.sceneId(),
        assets: [],
        datasets: [],
        entityDefinitions: [],
        systemDefinitions: [],
        clockDefinitions: [],
        eventDefinitions: [],
        relationshipDefinitions: [],
        representations: [],
        controls: [],
        datasetRefs: [],
        equationDefinitions: [],
        graphDefinitions: [],
      },
      exampleIds: ["registry-discovery"],
    };
    const instrument = {
      id: instrumentId,
      schemaVersion: 1,
      version: "1.0.0",
      displayName: "Plugin instrument",
      source,
      prefabId,
      portRequirements: [],
      observableKinds: ["time"],
      allowIncompleteAuthoring: true,
      exampleIds: ["registry-discovery"],
    };
    const item = (
      suffix: string,
      itemClass: LibraryItemClass,
      creation: LibraryCreationReference,
    ): LibraryItemDefinition => ({
      id: registeredTypeId("example.plugin:library/" + suffix),
      schemaVersion: 1,
      version: "1.0.0",
      displayName: "Plugin " + itemClass,
      description: "A declarative plugin discovery fixture.",
      itemClass,
      source,
      domainTags: ["physics"],
      curriculumTags: [],
      topicTags: [],
      searchTags: [suffix],
      physicalQuantityTags: [],
      thumbnail: {
        kind: "procedural",
        uri: "plugin://preview/" + suffix,
        altText: "Plugin contribution preview",
      },
      defaultParameters: {},
      editableProperties: [],
      anchors: [],
      ports: [],
      compatibleTargets: [],
      recommendedRepresentationIds: [],
      recommendedControlIds: [],
      assumptions: [],
      visualVariants: [],
      dimensionality: "BOTH",
      exampleIds: ["registry-discovery"],
      requiredCoreRange: ">=0.0.0",
      requiredPlugins: [],
      dependentAssetIds: [],
      license: { spdxId: "MIT" },
      creation,
    });
    const result = registerDeclarativeLibraryPlugin(
      {
        id,
        version: "1.0.0",
        compatibleCoreRange: ">=0.0.0",
      },
      {
        prefabs: [prefab],
        instruments: [instrument],
        materialPresets: [],
        libraryItems: [
          item("smart", "smart-model", {
            kind: "prefab",
            definitionId: prefabId,
          }),
          item("prefab", "prefab", {
            kind: "prefab",
            definitionId: prefabId,
          }),
          item("instrument", "instrument", {
            kind: "instrument",
            definitionId: instrumentId,
          }),
        ],
      },
      registries,
    );
    expect(result).toEqual({ ok: true, value: undefined });
    expect(registries.library.list().map((entry) => entry.itemClass)).toEqual([
      "instrument",
      "prefab",
      "smart-model",
    ]);
    expect(registries.prefabs.has(prefabId)).toBe(true);
    expect(registries.instruments.has(instrumentId)).toBe(true);
  });

  it("rejects contributions outside the plugin namespace without mutation", () => {
    const registries = createPhysicsLibraryRegistries();
    const result = registerDeclarativeLibraryPlugin(
      {
        id: pluginId("example.plugin"),
        version: "1.0.0",
        compatibleCoreRange: ">=0.0.0",
      },
      {
        prefabs: [],
        instruments: [],
        materialPresets: [],
        libraryItems: [
          {
            id: registeredTypeId("other:library/item"),
            schemaVersion: 1,
            version: "1.0.0",
            displayName: "Plugin item",
            description: "A declarative test contribution.",
            itemClass: "visual-object",
            source: {
              kind: "plugin",
              sourcePackage: "example-plugin",
              pluginId: pluginId("example.plugin"),
            },
            domainTags: ["physics"],
            curriculumTags: [],
            topicTags: [],
            searchTags: [],
            physicalQuantityTags: [],
            thumbnail: {
              kind: "procedural",
              uri: "plugin://preview",
              altText: "Plugin item preview",
            },
            defaultParameters: {},
            editableProperties: [],
            anchors: [],
            ports: [],
            compatibleTargets: [],
            recommendedRepresentationIds: [],
            recommendedControlIds: [],
            assumptions: [],
            visualVariants: [],
            dimensionality: "BOTH",
            exampleIds: ["registry-discovery"],
            requiredCoreRange: ">=0.0.0",
            requiredPlugins: [],
            dependentAssetIds: [],
            license: { spdxId: "MIT" },
            creation: {
              kind: "prefab",
              definitionId: registeredTypeId("example.plugin:prefab/item"),
            },
          },
        ],
      },
      registries,
    );
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "plugin-namespace-mismatch" },
    });
    expect(registries.library.list()).toEqual([]);
  });
});
