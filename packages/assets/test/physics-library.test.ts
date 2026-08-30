import { describe, expect, it } from "vitest";
import {
  DeterministicIdFactory,
  createEmptyScene,
  registeredTypeId,
} from "@physica/core-model";
import {
  BUILTIN_COMMAND_TYPES,
  DefaultProjectStore,
  command,
  createBuiltinCommandRegistry,
} from "@physica/commands";
import {
  createBuiltInPhysicsLibrary,
  exportMyLibraryBundle,
  importMyLibraryBundle,
  MyLibraryStore,
  planLibraryInstantiation,
  type MyLibraryBundle,
} from "../src";
import {
  createFixtureProject,
  withScene,
} from "../../../tests/helpers/model-fixtures";

describe("built-in Physics Library", () => {
  it("registers every foundation class and required named object", () => {
    const catalog = createBuiltInPhysicsLibrary();
    const items = catalog.search();
    expect(new Set(items.map((item) => item.itemClass))).toEqual(
      new Set([
        "smart-model",
        "prefab",
        "visual-object",
        "instrument",
        "representation",
        "material-preset",
      ]),
    );
    expect(items.map((item) => item.displayName)).toEqual(
      expect.arrayContaining([
        "Ball",
        "Block",
        "Trolley",
        "Car",
        "Mass",
        "String",
        "Spring",
        "Pulley",
        "Support",
        "Ground / Surface",
        "Ruler",
        "Stopwatch",
        "Vector Arrow",
        "Coordinate Axes",
        "Graph Panel",
        "Equation Panel",
      ]),
    );
    expect(catalog.validateReferences()).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("searches deterministically across metadata and filters", () => {
    const catalog = createBuiltInPhysicsLibrary();
    expect(
      catalog
        .search({ text: "mechanics tension" })
        .map((item) => item.displayName),
    ).toEqual(["Pulley", "String"]);
    expect(
      catalog.search({
        text: "text",
        itemClasses: ["visual-object"],
        dimensionality: "2D",
      }),
    ).toHaveLength(9);
    const ball = catalog.get(registeredTypeId("physica:library/ball"));
    expect(ball.ok).toBe(true);
    if (ball.ok)
      expect(catalog.dragPayload(ball.value)).toEqual({
        kind: "physica/library-item",
        itemId: ball.value.id,
        version: "1.0.0",
        sourceKind: "built-in",
      });
  });
});

describe("snapshot instantiation", () => {
  it("publishes once and preserves exact fresh IDs through undo and redo", () => {
    const catalog = createBuiltInPhysicsLibrary();
    const ids = new DeterministicIdFactory(70_000);
    const fixture = createFixtureProject(60_000);
    const scene = createEmptyScene(fixture.ids, "Library");
    const initial = withScene(fixture.document, scene);
    const planned = planLibraryInstantiation(catalog, {
      itemId: registeredTypeId("physica:library/ball"),
      destinationSceneId: scene.id,
      idFactory: ids,
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    const store = new DefaultProjectStore(
      initial,
      createBuiltinCommandRegistry(),
      ids,
    );
    const updates: number[] = [];
    store.subscribe(({ revision }) => updates.push(revision));
    const result = store.dispatch(
      command(ids, BUILTIN_COMMAND_TYPES.instantiateLibraryItem, planned.value),
    );
    expect(result.ok).toBe(true);
    expect(updates).toEqual([1]);
    const instantiated = store.getDocument();
    const component =
      instantiated.scenes[0]!.entityDefinitions[0]!.componentInstances[0]!;
    expect(component.sourceLibraryItem).toEqual({
      libraryItemId: registeredTypeId("physica:library/ball"),
      libraryItemVersion: "1.0.0",
      sourcePackage: "@physica/assets",
    });
    expect(store.undo().ok).toBe(true);
    expect(store.getDocument()).toEqual(initial);
    expect(store.redo().ok).toBe(true);
    expect(store.getDocument()).toEqual(instantiated);
  });

  it("rejects replaying an already-instantiated snapshot without publication", () => {
    const catalog = createBuiltInPhysicsLibrary();
    const ids = new DeterministicIdFactory(80_000);
    const fixture = createFixtureProject(81_000);
    const scene = createEmptyScene(fixture.ids, "Collision");
    const store = new DefaultProjectStore(
      withScene(fixture.document, scene),
      createBuiltinCommandRegistry(),
      ids,
    );
    const planned = planLibraryInstantiation(catalog, {
      itemId: registeredTypeId("physica:library/block"),
      destinationSceneId: scene.id,
      idFactory: ids,
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(
      store.dispatch(
        command(
          ids,
          BUILTIN_COMMAND_TYPES.instantiateLibraryItem,
          planned.value,
        ),
      ).ok,
    ).toBe(true);
    const once = store.getDocument();
    const revision = store.getRevision();
    const duplicate = store.dispatch(
      command(ids, BUILTIN_COMMAND_TYPES.instantiateLibraryItem, planned.value),
    );
    expect(duplicate.ok).toBe(false);
    expect(store.getDocument()).toBe(once);
    expect(store.getRevision()).toBe(revision);
  });
});

describe("My Library serialization", () => {
  it("round-trips a validated user-owned item canonically", () => {
    const builtIn = createBuiltInPhysicsLibrary();
    const originalItem = builtIn.registries.library.get(
      registeredTypeId("physica:library/ball"),
    )!;
    const originalPrefab = builtIn.registries.prefabs.get(
      registeredTypeId("physica:prefab/ball"),
    )!;
    const source = { kind: "my-library" as const, sourcePackage: "my-library" };
    const prefab = {
      ...originalPrefab,
      id: registeredTypeId("user:prefab/ball"),
      source,
    };
    const item = {
      ...originalItem,
      id: registeredTypeId("user:library/ball"),
      source,
      creation: { kind: "prefab" as const, definitionId: prefab.id },
    };
    const bundle: MyLibraryBundle = {
      schemaVersion: 1,
      libraryItems: [item],
      prefabs: [prefab],
      instruments: [],
      materialPresets: [],
    };
    const store = new MyLibraryStore();
    const rejected = store.add({
      ...bundle,
      instruments: [
        {
          id: registeredTypeId("user:instrument/invalid"),
          schemaVersion: 1,
          version: "1.0.0",
          displayName: "Invalid instrument",
          source,
          prefabId: prefab.id,
          portRequirements: [
            {
              role: "probe",
              displayName: "",
              compatiblePortTypeIds: [],
              minimumCount: -1,
              maximumCount: 0,
            },
          ],
          observableKinds: [],
          allowIncompleteAuthoring: false,
          exampleIds: ["save-to-my-library"],
        },
      ],
    });
    expect(rejected.ok).toBe(false);
    expect(store.registries.prefabs.list()).toEqual([]);
    expect(store.registries.instruments.list()).toEqual([]);
    const exported = exportMyLibraryBundle(bundle);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const imported = importMyLibraryBundle(exported.value);
    expect(imported).toEqual({ ok: true, value: bundle });
    const exportedAgain = exportMyLibraryBundle(
      imported.ok ? imported.value : bundle,
    );
    expect(exportedAgain).toEqual(exported);
  });

  it("rejects unsupported and malformed manifests", () => {
    expect(importMyLibraryBundle('{"schemaVersion":2}')).toMatchObject({
      ok: false,
      error: { kind: "unsupported-manifest-version" },
    });
    expect(importMyLibraryBundle("[]")).toMatchObject({
      ok: false,
      error: { kind: "invalid-my-library-manifest" },
    });
  });
});
