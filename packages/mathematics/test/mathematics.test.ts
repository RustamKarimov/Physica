import { describe, expect, it } from "vitest";
import {
  DEFAULT_NUMERICS_POLICY,
  GalileanFrameTransformProvider,
  ReferenceFrameGraph,
  angleBetweenVec3,
  approximatelyEqual,
  approximatelyEqualMatrix,
  approximatelyEqualVec3,
  complex,
  conjugateQuaternion,
  createDefaultReferenceFrameProviderRegistry,
  createReferenceFrameGraph,
  crossVec3,
  determinantMatrix,
  divideComplex,
  educationalScale,
  identityGalileanFrameConfiguration,
  identityMatrix,
  interval,
  intervalContains,
  inverseMatrix,
  liftPhysical2D,
  matrix,
  multiplyComplex,
  multiplyMatrix,
  normalizeVec3,
  projectPhysicalTo2D,
  quaternionFromAxisAngle,
  referenceFrameId,
  rotateVec3ByQuaternion,
  sampledSeries,
  validateReferenceFrames,
  vec2,
  vec3,
} from "../src";

describe("numerics and vectors", () => {
  it("uses combined absolute and relative tolerance across representative ranges", () => {
    expect(approximatelyEqual(0, 5e-13)).toBe(true);
    expect(approximatelyEqual(1e30, 1e30 + 1e19)).toBe(true);
    expect(approximatelyEqual(1e-30, 2e-30)).toBe(true);
    expect(approximatelyEqual(Number.NaN, Number.NaN)).toBe(false);
    expect(DEFAULT_NUMERICS_POLICY).toBe(
      Object.freeze(DEFAULT_NUMERICS_POLICY),
    );
  });

  it("implements the right-handed cross product and safe normalization", () => {
    const x = vec3(1, 0, 0);
    const y = vec3(0, 1, 0);
    expect(crossVec3(x, y)).toEqual(vec3(0, 0, 1));
    expect(normalizeVec3(vec3(3, 4, 0))).toMatchObject({
      ok: true,
      value: { x: 0.6, y: 0.8, z: 0 },
    });
    expect(normalizeVec3(vec3(0, 0, 0))).toMatchObject({
      ok: false,
      error: { kind: "zero-vector" },
    });
    expect(angleBetweenVec3(x, y)).toMatchObject({
      ok: true,
      value: Math.PI / 2,
    });
  });

  it("does not mutate frozen vector inputs", () => {
    const a = Object.freeze(vec3(1, 0, 0));
    const b = Object.freeze(vec3(0, 1, 0));
    expect(crossVec3(a, b)).toEqual(vec3(0, 0, 1));
    expect(a).toEqual({ x: 1, y: 0, z: 0 });
  });
});

describe("complex, matrix and quaternion operations", () => {
  it("supports complex multiplication and typed division failure", () => {
    expect(multiplyComplex(complex(1, 2), complex(3, 4))).toEqual(
      complex(-5, 10),
    );
    expect(divideComplex(complex(1), complex(0))).toMatchObject({
      ok: false,
      error: { kind: "division-by-zero" },
    });
  });

  it("computes deterministic determinant and inverse", () => {
    const value = matrix(2, 2, [4, 7, 2, 6]);
    expect(determinantMatrix(value)).toMatchObject({ ok: true, value: 10 });
    const inverse = inverseMatrix(value);
    expect(inverse.ok).toBe(true);
    if (inverse.ok) {
      const product = multiplyMatrix(value, inverse.value);
      expect(product.ok).toBe(true);
      if (product.ok)
        expect(approximatelyEqualMatrix(product.value, identityMatrix(2))).toBe(
          true,
        );
    }
    expect(inverseMatrix(matrix(2, 2, [1, 2, 2, 4]))).toMatchObject({
      ok: false,
      error: { kind: "singular-matrix" },
    });
  });

  it("rotates vectors consistently with axis-angle quaternions", () => {
    const rotation = quaternionFromAxisAngle(vec3(0, 0, 1), Math.PI / 2);
    expect(rotation.ok).toBe(true);
    if (!rotation.ok) return;
    const rotated = rotateVec3ByQuaternion(vec3(1, 0, 0), rotation.value);
    expect(rotated.ok).toBe(true);
    if (rotated.ok)
      expect(approximatelyEqualVec3(rotated.value, vec3(0, 1, 0))).toBe(true);
    const restored = rotated.ok
      ? rotateVec3ByQuaternion(
          rotated.value,
          conjugateQuaternion(rotation.value),
        )
      : rotated;
    expect(restored.ok).toBe(true);
    if (restored.ok)
      expect(approximatelyEqualVec3(restored.value, vec3(1, 0, 0))).toBe(true);
  });
});

describe("intervals and sampled series", () => {
  it("validates interval endpoints and strictly increasing samples", () => {
    const closed = interval(0, 1);
    expect(closed.ok).toBe(true);
    if (closed.ok) expect(intervalContains(closed.value, 1)).toBe(true);
    expect(interval(1, 0)).toMatchObject({ ok: false });
    expect(
      sampledSeries([
        { argument: 0, value: 1 },
        { argument: 1, value: 2 },
      ]),
    ).toMatchObject({ ok: true });
    expect(
      sampledSeries([
        { argument: 1, value: 1 },
        { argument: 1, value: 2 },
      ]),
    ).toMatchObject({ ok: false, error: { kind: "invalid-series" } });
  });
});

describe("coordinate spaces and Galilean reference frames", () => {
  it("lifts and safely projects the canonical physical 2D plane", () => {
    const lifted = liftPhysical2D(vec2(2, 3));
    expect(lifted).toEqual({
      space: "physical-world",
      value: { x: 2, y: 3, z: 0 },
    });
    expect(projectPhysicalTo2D(lifted)).toMatchObject({
      ok: true,
      value: { x: 2, y: 3 },
    });
    expect(
      projectPhysicalTo2D({ space: "physical-world", value: vec3(1, 2, 0.1) }),
    ).toMatchObject({ ok: false, error: { kind: "off-physical-plane" } });
  });

  it("round trips through rotated and moving frames at explicit time", () => {
    const rootId = referenceFrameId("physica.frame:world");
    const movingId = referenceFrameId("physica.frame:moving");
    const rotation = quaternionFromAxisAngle(vec3(0, 0, 1), Math.PI / 2);
    if (!rotation.ok) throw new Error("rotation failed");
    const definitions = [
      {
        id: rootId,
        name: "World",
        parentId: null,
        transformTypeId: GalileanFrameTransformProvider.typeId,
        configuration: identityGalileanFrameConfiguration(),
      },
      {
        id: movingId,
        name: "Moving",
        parentId: rootId,
        transformTypeId: GalileanFrameTransformProvider.typeId,
        configuration: {
          originAtEpoch: vec3(10, 0, 0),
          orientationToParent: rotation.value,
          velocityRelativeToParent: vec3(2, 0, 0),
          epochSeconds: 0,
        },
      },
    ] as const;
    const graph = new ReferenceFrameGraph(
      definitions,
      createDefaultReferenceFrameProviderRegistry(),
    );
    const world = graph.transformPosition(vec3(1, 0, 0), movingId, rootId, 5);
    expect(world.ok).toBe(true);
    if (world.ok)
      expect(approximatelyEqualVec3(world.value, vec3(20, 1, 0))).toBe(true);
    const local = world.ok
      ? graph.transformPosition(world.value, rootId, movingId, 5)
      : world;
    expect(local.ok).toBe(true);
    if (local.ok)
      expect(approximatelyEqualVec3(local.value, vec3(1, 0, 0))).toBe(true);
    const direction = graph.transformDirection(vec3(1, 0, 0), movingId, rootId);
    expect(direction.ok).toBe(true);
    if (direction.ok)
      expect(approximatelyEqualVec3(direction.value, vec3(0, 1, 0))).toBe(true);
    expect(
      graph.transformPosition(vec3(1, 0, 0), movingId, rootId, Number.NaN),
    ).toMatchObject({ ok: false, error: { kind: "transform-failed" } });
  });

  it("detects missing parents, cycles and unknown providers", () => {
    const a = referenceFrameId("test.frame:a");
    const b = referenceFrameId("test.frame:b");
    const registry = createDefaultReferenceFrameProviderRegistry();
    const issues = validateReferenceFrames(
      [
        {
          id: a,
          name: "A",
          parentId: b,
          transformTypeId: "missing:provider",
          configuration: {},
        },
        {
          id: b,
          name: "B",
          parentId: a,
          transformTypeId: "missing:provider",
          configuration: {},
        },
      ],
      registry,
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["frame-cycle", "unknown-frame-provider"]),
    );
    expect(
      createReferenceFrameGraph(
        [
          {
            id: a,
            name: "A",
            parentId: b,
            transformTypeId: "missing:provider",
            configuration: {},
          },
          {
            id: b,
            name: "B",
            parentId: a,
            transformTypeId: "missing:provider",
            configuration: {},
          },
        ],
        registry,
      ),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-frame-graph" },
    });
  });

  it("enforces explicit educational not-to-scale warnings", () => {
    expect(
      educationalScale({
        physicalScale: 1,
        visualScale: 100,
        scaleMode: "educational",
        notToScaleWarning: false,
      }),
    ).toMatchObject({ ok: false });
    expect(
      educationalScale({
        physicalScale: 1,
        visualScale: 100,
        scaleMode: "educational",
        notToScaleWarning: true,
      }),
    ).toMatchObject({ ok: true });
  });
});
