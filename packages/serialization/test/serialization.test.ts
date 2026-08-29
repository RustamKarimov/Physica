import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  registeredTypeId,
  validateProjectDocument,
  type ProjectDocument,
} from "@physica/core-model";
import {
  DefaultProjectMigrationRegistry,
  ProjectDocumentSchemaV1,
  canonicalParseJson,
  canonicalStringify,
  parseProjectJson,
  serializeProjectJson,
} from "../src";
import {
  component,
  createFixtureProject,
  createFutureProofFixtures,
  entity,
  withScene,
} from "../../../tests/helpers/model-fixtures";
import { createDefaultClockDefinitions } from "../../clocks/src";
import { createDefaultUnitRegistry, createQuantity } from "../../units/src";
import { vec3 } from "../../mathematics/src";

function serializeOrThrow(document: ProjectDocument): string {
  const serialized = serializeProjectJson(document);
  if (!serialized.ok) throw new Error(serialized.error.message);
  return serialized.value;
}

describe("ProjectDocument V1 schema", () => {
  it("parses valid empty and one-Scene projects", () => {
    const empty = createFixtureProject().document;
    expect(parseProjectJson(serializeOrThrow(empty))).toMatchObject({
      ok: true,
    });

    const { ids, document } = createFixtureProject(20);
    const oneScene = withScene(document, createEmptyScene(ids, "One scene"));
    const parsed = parseProjectJson(serializeOrThrow(oneScene));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.validation.hasErrors).toBe(false);
  });

  it("rejects missing fields, unknown root fields, invalid versions and timestamps", () => {
    const valid = createFixtureProject().document;
    const missingScenes = { ...valid, scenes: undefined };
    expect(ProjectDocumentSchemaV1.safeParse(missingScenes).success).toBe(
      false,
    );
    expect(
      ProjectDocumentSchemaV1.safeParse({ ...valid, surprise: true }).success,
    ).toBe(false);
    expect(
      ProjectDocumentSchemaV1.safeParse({ ...valid, schemaVersion: 0 }).success,
    ).toBe(false);
    expect(
      ProjectDocumentSchemaV1.safeParse({
        ...valid,
        metadata: { ...valid.metadata, createdAt: "yesterday" },
      }).success,
    ).toBe(false);
  });

  it("returns a typed future-version rejection before V1 parsing", () => {
    const future = { ...createFixtureProject().document, schemaVersion: 99 };
    const result = parseProjectJson(JSON.stringify(future));
    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: "UnsupportedFutureProjectVersion",
        projectVersion: 99,
        currentVersion: 1,
      },
    });
  });
});

describe("canonical JSON", () => {
  it("sorts object keys, preserves array order and is deterministic", () => {
    const first = canonicalStringify({
      z: 1,
      a: { y: 2, x: 3 },
      list: [3, 1, 2],
    });
    const second = canonicalStringify({
      list: [3, 1, 2],
      a: { x: 3, y: 2 },
      z: 1,
    });
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value.indexOf('"a"')).toBeLessThan(
        first.value.indexOf('"z"'),
      );
      expect(canonicalParseJson(first.value)).toMatchObject({
        ok: true,
        value: { list: [3, 1, 2] },
      });
    }
  });

  it("omits undefined object properties but rejects undefined arrays and non-finite numbers", () => {
    expect(canonicalStringify({ kept: 1, omitted: undefined })).toMatchObject({
      ok: true,
      value: expect.not.stringContaining("omitted"),
    });
    expect(canonicalStringify([1, undefined])).toMatchObject({
      ok: false,
      error: { code: "undefined-array-entry" },
    });
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(canonicalStringify({ value })).toMatchObject({
        ok: false,
        error: { code: "non-finite-number" },
      });
    }
  });

  it("round trips projects with stable IDs", () => {
    const { ids, document } = createFixtureProject(40);
    const original = withScene(document, createEmptyScene(ids, "Stable"));
    const text = serializeOrThrow(original);
    expect(serializeOrThrow(original)).toBe(text);
    const parsed = parseProjectJson(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.document).toEqual(original);
      expect(parsed.value.document.projectId).toBe(original.projectId);
      expect(parsed.value.document.scenes[0]!.id).toBe(original.scenes[0]!.id);
    }
  });
});

describe("unknown plugin payload preservation", () => {
  it("preserves opaque envelopes through an unrelated metadata edit and round trip", () => {
    const { ids, document } = createFixtureProject(50);
    const scene = createEmptyScene(ids, "Plugin payload");
    const owner = entity(ids, "Owner");
    const unknown = {
      ...component(ids, "placeholder"),
      componentTypeId: registeredTypeId(
        "org.example.plugin:component/custom-model",
      ),
      componentSchemaVersion: 7,
      configuration: { coefficients: [1, 2, 3], nested: { mode: "opaque" } },
      initialState: { seed: 123, enabledFeatures: ["a", "b"] },
      metadata: { pluginLabel: "Do not strip" },
      extensions: { "org.example.plugin:future": { arbitrary: true } },
    };
    const original = withScene(document, {
      ...scene,
      entityDefinitions: [{ ...owner, componentInstances: [unknown] }],
    });
    const firstParse = parseProjectJson(serializeOrThrow(original));
    expect(firstParse.ok).toBe(true);
    if (!firstParse.ok) return;
    const edited = {
      ...firstParse.value.document,
      metadata: {
        ...firstParse.value.document.metadata,
        title: "Unrelated edit",
      },
    };
    const secondParse = parseProjectJson(serializeOrThrow(edited));
    expect(secondParse.ok).toBe(true);
    if (secondParse.ok) {
      expect(
        secondParse.value.document.scenes[0]!.entityDefinitions[0]!
          .componentInstances[0],
      ).toEqual(unknown);
    }
  });
});

describe("Step 6 value-envelope preservation", () => {
  it("round trips quantities, coordinates, opaque frame providers and clock definitions without a V1 migration", () => {
    const { ids, document } = createFixtureProject(75);
    const scene = createEmptyScene(ids, "Quantitative envelopes");
    const registry = createDefaultUnitRegistry();
    const distance = createQuantity(2.5, "km", registry);
    if (!distance.ok) throw new Error("Quantity fixture failed.");
    const quantitativeComponent = {
      ...component(ids, "quantitative-envelope"),
      configuration: {
        distance: distance.value,
        position: vec3(1, 2, 3),
        referenceFrame: {
          id: "org.example.frames:moving",
          transformTypeId: "org.example.frames:future-transform",
          configuration: { opaque: [1, 2, 3] },
        },
      },
    };
    const owner = entity(ids, "Owner");
    const quantitativeProject = withScene(document, {
      ...scene,
      entityDefinitions: [
        { ...owner, componentInstances: [quantitativeComponent] },
      ],
      clockDefinitions: createDefaultClockDefinitions(ids),
    });
    const parsed = parseProjectJson(serializeOrThrow(quantitativeProject));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.document).toEqual(quantitativeProject);
  });
});

describe("migration registry foundation", () => {
  it("registers only sequential migrations and runs synthetic chains", () => {
    const registry = new DefaultProjectMigrationRegistry(3);
    registry.register({
      fromVersion: 1,
      toVersion: 2,
      migrate: (input) => ({ ...input, schemaVersion: 2, first: true }),
    });
    registry.register({
      fromVersion: 2,
      toVersion: 3,
      migrate: (input) => ({ ...input, schemaVersion: 3, second: true }),
    });
    expect(registry.migrateToCurrent({ schemaVersion: 1 })).toMatchObject({
      ok: true,
      value: {
        document: { schemaVersion: 3, first: true, second: true },
        appliedVersions: [2, 3],
      },
    });
    expect(() =>
      registry.register({
        fromVersion: 4,
        toVersion: 6,
        migrate: (input) => input,
      }),
    ).toThrow(RangeError);
  });

  it("fails without mutating the original when an intermediate migration is missing", () => {
    const original = { schemaVersion: 1, payload: { retained: true } } as const;
    const registry = new DefaultProjectMigrationRegistry(3);
    registry.register({
      fromVersion: 1,
      toVersion: 2,
      migrate: (input) => ({ ...input, schemaVersion: 2 }),
    });
    const result = registry.migrateToCurrent(original);
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "missing-migration", original },
    });
    expect(original).toEqual({ schemaVersion: 1, payload: { retained: true } });
  });
});

describe("twelve future-proof schema fixtures", () => {
  it.each(createFutureProofFixtures())(
    "parses $name without root-schema changes",
    ({ document }) => {
      const parsed = parseProjectJson(serializeOrThrow(document));
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(parsed.value.validation.hasErrors).toBe(false);
      expect(validateProjectDocument(document).hasErrors).toBe(false);
    },
  );

  it("contains exactly the twelve Section 30 proof cases", () => {
    expect(createFutureProofFixtures().map((fixture) => fixture.name)).toEqual([
      "projectile",
      "pulley",
      "circuit",
      "particle-gas",
      "wave-grid",
      "radioactive-sample",
      "ultrasound-acquisition",
      "tomography",
      "galaxy-redshift",
      "rigid-body-3d",
      "text-block",
      "experimental-dataset",
    ]);
  });
});
