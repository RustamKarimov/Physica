import type { RepresentationId } from "@physica/core-model";
import { vec3 } from "@physica/mathematics";
import { describe, expect, it } from "vitest";
import {
  cameraDistance,
  cameraOperationChannels,
  resolveCameraPresentation,
  validateCameraPresentationOperation,
  type CameraDefinition,
  type CameraPresentationOperation,
  type CameraSubjectSnapshot,
  type EvaluatedCameraOperation,
} from "../src";

const SUBJECT = "00000000-0000-4000-8000-000000009101" as RepresentationId;

function camera(
  kind: "orthographic" | "perspective" = "orthographic",
): CameraDefinition {
  const base = {
    viewport: { width: 800, height: 400, devicePixelRatio: 1 },
    position: vec3(0, 0, 10),
    target: vec3(0, 0, 0),
    up: vec3(0, 1, 0),
    near: 0.1,
    far: 100,
  };
  return kind === "orthographic"
    ? { ...base, kind, verticalSpan: 4 }
    : { ...base, kind, verticalFieldOfViewRadians: Math.PI / 2 };
}

function evaluated(
  operation: CameraPresentationOperation,
  progress = 1,
): readonly EvaluatedCameraOperation[] {
  return [{ sourceId: "camera-test", operation, progress }];
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Unexpected camera-animation failure.");
  return result.value;
}

describe("portable camera operations", () => {
  it("validates and reports deterministic operation channels", () => {
    const pan = unwrap(
      validateCameraPresentationOperation({
        kind: "pan",
        startOffset: vec3(0, 0, 0),
        endOffset: vec3(2, 1, 0),
      }),
    );
    expect(cameraOperationChannels(pan)).toEqual(["pose"]);
    expect(
      cameraOperationChannels({
        kind: "fit-object",
        representationId: SUBJECT,
        padding: 0.1,
      }),
    ).toEqual(["pose", "projection"]);
    expect(
      validateCameraPresentationOperation({
        kind: "zoom",
        startZoom: 1,
        endZoom: 0,
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-camera-animation" },
    });
    expect(
      validateCameraPresentationOperation({
        kind: "powers-of-ten-zoom",
        startExponent: -13,
        endExponent: 0,
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-camera-animation" },
    });
  });

  it("pans without changing orientation or camera distance", () => {
    const base = camera();
    const resolved = unwrap(
      resolveCameraPresentation(
        base,
        evaluated({
          kind: "pan",
          startOffset: vec3(0, 0, 0),
          endOffset: vec3(4, -2, 1),
        }),
      ),
    );
    expect(resolved.position).toEqual(vec3(4, -2, 11));
    expect(resolved.target).toEqual(vec3(4, -2, 1));
    expect(cameraDistance(resolved.position, resolved.target)).toBe(
      cameraDistance(base.position, base.target),
    );
  });

  it("uses exact orthographic and reference perspective zoom optics", () => {
    const operation: CameraPresentationOperation = {
      kind: "zoom",
      startZoom: 1,
      endZoom: 2,
    };
    const orthographic = unwrap(
      resolveCameraPresentation(camera(), evaluated(operation)),
    );
    expect(orthographic.kind).toBe("orthographic");
    if (orthographic.kind === "orthographic")
      expect(orthographic.verticalSpan).toBe(2);

    const perspective = unwrap(
      resolveCameraPresentation(camera("perspective"), evaluated(operation)),
    );
    expect(perspective.kind).toBe("perspective");
    if (perspective.kind === "perspective")
      expect(perspective.verticalFieldOfViewRadians).toBeCloseTo(
        2 * Math.atan(0.5),
        14,
      );
  });

  it("resolves known powers-of-ten zoom and sequential accumulation", () => {
    const resolved = unwrap(
      resolveCameraPresentation(camera(), [
        ...evaluated({
          kind: "pan",
          startOffset: vec3(0, 0, 0),
          endOffset: vec3(1, 0, 0),
        }),
        ...evaluated({
          kind: "powers-of-ten-zoom",
          startExponent: 0,
          endExponent: 1,
        }),
      ]),
    );
    expect(resolved.target).toEqual(vec3(1, 0, 0));
    if (resolved.kind === "orthographic")
      expect(resolved.verticalSpan).toBeCloseTo(0.4, 14);
  });
});

describe("camera subject resolution", () => {
  const subject: CameraSubjectSnapshot = {
    representationId: SUBJECT,
    position: vec3(4, 1, 0),
    bounds: {
      minimum: vec3(0, 0, 0),
      maximum: vec3(8, 2, 0),
    },
  };

  it("fits orthographic bounds with aspect ratio and padding", () => {
    const resolved = unwrap(
      resolveCameraPresentation(
        camera(),
        evaluated({
          kind: "fit-object",
          representationId: SUBJECT,
          padding: 0.25,
        }),
        [subject],
      ),
    );
    expect(resolved.target).toEqual(vec3(4, 1, 0));
    expect(resolved.position).toEqual(vec3(4, 1, 10));
    if (resolved.kind === "orthographic") expect(resolved.verticalSpan).toBe(5);
  });

  it("fits perspective bounds while preserving optics", () => {
    const resolved = unwrap(
      resolveCameraPresentation(
        camera("perspective"),
        evaluated({
          kind: "fit-object",
          representationId: SUBJECT,
          padding: 0.25,
        }),
        [subject],
      ),
    );
    expect(resolved.target).toEqual(vec3(4, 1, 0));
    expect(resolved.position.x).toBeCloseTo(4, 14);
    expect(resolved.position.y).toBeCloseTo(1, 14);
    expect(resolved.position.z).toBeCloseTo(2.5, 14);
    if (resolved.kind === "perspective")
      expect(resolved.verticalFieldOfViewRadians).toBe(Math.PI / 2);
  });

  it("follows deterministic snapshots at partial and final progress", () => {
    const operation: CameraPresentationOperation = {
      kind: "follow-target",
      representationId: SUBJECT,
      cameraOffset: vec3(0, 2, 8),
      lookAtOffset: vec3(0, 0, 0),
    };
    const halfway = unwrap(
      resolveCameraPresentation(camera(), evaluated(operation, 0.5), [subject]),
    );
    expect(halfway.position).toEqual(vec3(2, 1.5, 9));
    expect(halfway.target).toEqual(vec3(2, 0.5, 0));

    const moved = unwrap(
      resolveCameraPresentation(camera(), evaluated(operation), [
        { ...subject, position: vec3(10, -2, 0) },
      ]),
    );
    expect(moved.position).toEqual(vec3(10, 0, 8));
    expect(moved.target).toEqual(vec3(10, -2, 0));
  });

  it("returns typed missing-subject and invalid-bounds failures", () => {
    const fit: CameraPresentationOperation = {
      kind: "fit-object",
      representationId: SUBJECT,
      padding: 0,
    };
    expect(resolveCameraPresentation(camera(), evaluated(fit))).toMatchObject({
      ok: false,
      error: { kind: "missing-camera-subject" },
    });
    expect(
      resolveCameraPresentation(camera(), evaluated(fit), [
        {
          representationId: SUBJECT,
          position: vec3(0, 0, 0),
          bounds: {
            minimum: vec3(1, 1, 0),
            maximum: vec3(-1, -1, 0),
          },
        },
      ]),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-fit-bounds" },
    });
    expect(
      resolveCameraPresentation(camera(), evaluated(fit), [
        {
          representationId: SUBJECT,
          position: vec3(0, 0, 0),
          bounds: {
            minimum: vec3(0, 0, 0),
            maximum: vec3(0, 0, 2),
          },
        },
      ]),
    ).toMatchObject({
      ok: false,
      error: { kind: "invalid-fit-bounds" },
    });
  });

  it("does not mutate Camera, operations or subject snapshots", () => {
    const base = camera();
    const operations = evaluated({
      kind: "follow-target",
      representationId: SUBJECT,
      cameraOffset: vec3(0, 2, 8),
      lookAtOffset: vec3(0, 0, 0),
    });
    const before = JSON.stringify({ base, operations, subject });
    const resolved = unwrap(
      resolveCameraPresentation(base, operations, [subject]),
    );
    expect(JSON.stringify({ base, operations, subject })).toBe(before);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.position)).toBe(true);
  });
});
