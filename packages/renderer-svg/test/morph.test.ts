import { describe, expect, it } from "vitest";
import {
  createSvgMorphPlan,
  interpolateSvgMorphPaths,
  normalizeSvgMorphPaths,
} from "../src";

function ellipse(
  radiusX: number,
  radiusY: number,
  pointCount = 16,
  reverse = false,
) {
  return Array.from({ length: pointCount }, (_, index) => {
    const direction = reverse ? -1 : 1;
    const angle = (direction * index * Math.PI * 2) / pointCount;
    return { x: radiusX * Math.cos(angle), y: radiusY * Math.sin(angle) };
  });
}

describe("canonical SVG morph path normalization", () => {
  it("resamples open paths at equal arc-length coordinates", () => {
    const source = {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      closed: false,
    };
    const destination = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
      ],
      closed: false,
    };
    expect(normalizeSvgMorphPaths(source, destination, 3)).toEqual({
      ok: true,
      value: {
        source: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 10, y: 0 },
        ],
        destination: [
          { x: 0, y: 0 },
          { x: 0, y: 10 },
          { x: 0, y: 20 },
        ],
        closed: false,
        sampleCount: 3,
      },
    });
    expect(source.points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it("removes repeated closing points and aligns winding/cyclic starts", () => {
    const source = {
      points: [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
      ],
      closed: true,
    };
    const destination = {
      points: [
        { x: 0, y: -2 },
        { x: -2, y: 0 },
        { x: 0, y: 2 },
        { x: 2, y: 0 },
      ],
      closed: true,
    };
    const normalized = normalizeSvgMorphPaths(source, destination, 4);
    expect(normalized).toMatchObject({
      ok: true,
      value: {
        sampleCount: 4,
        source: [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 0, y: -1 },
        ],
        destination: [
          { x: 2, y: 0 },
          { x: 0, y: 2 },
          { x: -2, y: 0 },
          { x: 0, y: -2 },
        ],
      },
    });
  });

  it("normalizes a circle and ellipse to 64 immutable samples", () => {
    const source = { points: ellipse(40, 40), closed: true };
    const destination = { points: ellipse(72, 28, 16, true), closed: true };
    const normalized = normalizeSvgMorphPaths(source, destination, 64);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.value.source).toHaveLength(64);
    expect(normalized.value.destination).toHaveLength(64);
    expect(normalized.value.source[0]).toEqual({ x: 40, y: 0 });
    expect(normalized.value.destination[0]!.x).toBeGreaterThan(70);
    expect(Math.abs(normalized.value.destination[0]!.y)).toBeLessThan(10);
    expect(Object.isFrozen(normalized.value)).toBe(true);
    expect(Object.isFrozen(normalized.value.destination)).toBe(true);
  });
});

describe("SVG morph interpolation and replacement", () => {
  it("returns exact endpoints and component-wise midpoint geometry", () => {
    const normalized = normalizeSvgMorphPaths(
      {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        closed: false,
      },
      {
        points: [
          { x: 0, y: 10 },
          { x: 20, y: 10 },
        ],
        closed: false,
      },
      2,
    );
    if (!normalized.ok) throw new Error(normalized.error.kind);
    expect(interpolateSvgMorphPaths(normalized.value, 0)).toEqual({
      ok: true,
      value: normalized.value.source,
    });
    expect(interpolateSvgMorphPaths(normalized.value, 0.5)).toEqual({
      ok: true,
      value: [
        { x: 0, y: 5 },
        { x: 15, y: 5 },
      ],
    });
    expect(interpolateSvgMorphPaths(normalized.value, 1)).toEqual({
      ok: true,
      value: normalized.value.destination,
    });
  });

  it("uses semantic replacement for valid but incompatible topology", () => {
    expect(
      createSvgMorphPlan(
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          closed: false,
        },
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 10 },
          ],
          closed: true,
        },
        0.25,
      ),
    ).toEqual({
      ok: true,
      value: {
        kind: "replace",
        progress: 0.25,
        sourceOpacity: 0.75,
        destinationOpacity: 0.25,
        reason: "topology-mismatch",
      },
    });
  });

  it("rejects degenerate/non-finite geometry and invalid sample/progress", () => {
    expect(
      normalizeSvgMorphPaths(
        {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ],
          closed: false,
        },
        { points: ellipse(2, 1), closed: true },
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-geometry" } });
    expect(
      createSvgMorphPlan(
        {
          points: [
            { x: 0, y: 0 },
            { x: Number.NaN, y: 1 },
          ],
          closed: false,
        },
        {
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          closed: false,
        },
        0.5,
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-geometry" } });
    expect(
      normalizeSvgMorphPaths(
        { points: ellipse(2, 2), closed: true },
        { points: ellipse(3, 1), closed: true },
        2,
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-sample-count" } });
    expect(
      createSvgMorphPlan(
        { points: ellipse(2, 2), closed: true },
        { points: ellipse(3, 1), closed: true },
        2,
      ),
    ).toMatchObject({ ok: false, error: { kind: "invalid-progress" } });
  });
});
