import type { RepresentationId } from "@physica/core-model";
import {
  addVec3,
  dotVec3,
  scaleVec3,
  subtractVec3,
  vec3,
  type Vec3,
} from "@physica/mathematics";
import { createCameraService } from "./camera";
import type { RenderResult } from "./errors";
import type { CameraDefinition } from "./types";

const EPSILON = 1e-12;

export type CameraAnimationChannel = "pose" | "projection";

export interface CameraBounds3 {
  readonly minimum: Vec3;
  readonly maximum: Vec3;
}

export interface CameraSubjectSnapshot {
  readonly representationId: RepresentationId;
  readonly position: Vec3;
  readonly bounds?: CameraBounds3;
}

export type CameraPresentationOperation =
  | {
      readonly kind: "pan";
      readonly startOffset: Vec3;
      readonly endOffset: Vec3;
    }
  | {
      readonly kind: "zoom";
      readonly startZoom: number;
      readonly endZoom: number;
    }
  | {
      readonly kind: "fit-object";
      readonly representationId: RepresentationId;
      readonly padding: number;
    }
  | {
      readonly kind: "follow-target";
      readonly representationId: RepresentationId;
      readonly cameraOffset: Vec3;
      readonly lookAtOffset: Vec3;
    }
  | {
      readonly kind: "powers-of-ten-zoom";
      readonly startExponent: number;
      readonly endExponent: number;
    };

export interface EvaluatedCameraOperation {
  readonly sourceId: string;
  readonly operation: CameraPresentationOperation;
  readonly progress: number;
}

function finiteVec3(value: unknown): value is Vec3 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Vec3>;
  return (
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.z)
  );
}

function copyVec3(value: Vec3): Vec3 {
  return vec3(value.x, value.y, value.z);
}

function interpolateVec3(start: Vec3, end: Vec3, progress: number): Vec3 {
  return addVec3(start, scaleVec3(subtractVec3(end, start), progress));
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function invalid(message: string): RenderResult<never> {
  return {
    ok: false,
    error: { kind: "invalid-camera-animation", message },
  };
}

export function cameraOperationChannels(
  operation: CameraPresentationOperation,
): readonly CameraAnimationChannel[] {
  switch (operation.kind) {
    case "pan":
    case "follow-target":
      return Object.freeze(["pose"]);
    case "zoom":
    case "powers-of-ten-zoom":
      return Object.freeze(["projection"]);
    case "fit-object":
      return Object.freeze(["pose", "projection"]);
  }
}

export function validateCameraPresentationOperation(
  operation: unknown,
): RenderResult<CameraPresentationOperation> {
  if (!operation || typeof operation !== "object")
    return invalid("Camera operation must be an object.");
  const candidate = operation as Record<string, unknown>;
  switch (candidate.kind) {
    case "pan":
      if (
        !finiteVec3(candidate.startOffset) ||
        !finiteVec3(candidate.endOffset)
      )
        return invalid("Pan offsets must be finite Vec3 values.");
      return {
        ok: true,
        value: Object.freeze({
          kind: "pan",
          startOffset: copyVec3(candidate.startOffset),
          endOffset: copyVec3(candidate.endOffset),
        }),
      };
    case "zoom":
      if (
        !Number.isFinite(candidate.startZoom) ||
        !Number.isFinite(candidate.endZoom) ||
        (candidate.startZoom as number) <= 0 ||
        (candidate.endZoom as number) <= 0
      )
        return invalid("Zoom factors must be finite and positive.");
      return {
        ok: true,
        value: Object.freeze({
          kind: "zoom",
          startZoom: candidate.startZoom as number,
          endZoom: candidate.endZoom as number,
        }),
      };
    case "fit-object":
      if (
        typeof candidate.representationId !== "string" ||
        candidate.representationId.length === 0 ||
        !Number.isFinite(candidate.padding) ||
        (candidate.padding as number) < 0 ||
        (candidate.padding as number) > 10
      )
        return invalid(
          "Fit-object requires a Representation ID and padding in [0, 10].",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "fit-object",
          representationId: candidate.representationId as RepresentationId,
          padding: candidate.padding as number,
        }),
      };
    case "follow-target":
      if (
        typeof candidate.representationId !== "string" ||
        candidate.representationId.length === 0 ||
        !finiteVec3(candidate.cameraOffset) ||
        !finiteVec3(candidate.lookAtOffset)
      )
        return invalid(
          "Follow-target requires a Representation ID and finite offsets.",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "follow-target",
          representationId: candidate.representationId as RepresentationId,
          cameraOffset: copyVec3(candidate.cameraOffset),
          lookAtOffset: copyVec3(candidate.lookAtOffset),
        }),
      };
    case "powers-of-ten-zoom":
      if (
        !Number.isFinite(candidate.startExponent) ||
        !Number.isFinite(candidate.endExponent) ||
        (candidate.startExponent as number) < -12 ||
        (candidate.startExponent as number) > 12 ||
        (candidate.endExponent as number) < -12 ||
        (candidate.endExponent as number) > 12
      )
        return invalid(
          "Powers-of-ten exponents must be finite and in [-12, 12].",
        );
      return {
        ok: true,
        value: Object.freeze({
          kind: "powers-of-ten-zoom",
          startExponent: candidate.startExponent as number,
          endExponent: candidate.endExponent as number,
        }),
      };
    default:
      return invalid("Camera operation kind is unknown.");
  }
}

function validateSubject(
  snapshot: CameraSubjectSnapshot,
): RenderResult<CameraSubjectSnapshot> {
  if (
    typeof snapshot.representationId !== "string" ||
    snapshot.representationId.length === 0 ||
    !finiteVec3(snapshot.position)
  )
    return invalid("Camera subject ID and position must be valid.");
  if (snapshot.bounds) {
    const { minimum, maximum } = snapshot.bounds;
    if (
      !finiteVec3(minimum) ||
      !finiteVec3(maximum) ||
      maximum.x < minimum.x ||
      maximum.y < minimum.y ||
      maximum.z < minimum.z
    )
      return {
        ok: false,
        error: {
          kind: "invalid-fit-bounds",
          representationId: snapshot.representationId,
          message: "Subject bounds must be a finite ordered AABB.",
        },
      };
  }
  return {
    ok: true,
    value: Object.freeze({
      representationId: snapshot.representationId,
      position: copyVec3(snapshot.position),
      ...(snapshot.bounds
        ? {
            bounds: Object.freeze({
              minimum: copyVec3(snapshot.bounds.minimum),
              maximum: copyVec3(snapshot.bounds.maximum),
            }),
          }
        : {}),
    }),
  };
}

function subjectFor(
  subjects: ReadonlyMap<RepresentationId, CameraSubjectSnapshot>,
  representationId: RepresentationId,
): RenderResult<CameraSubjectSnapshot> {
  const subject = subjects.get(representationId);
  return subject
    ? { ok: true, value: subject }
    : {
        ok: false,
        error: { kind: "missing-camera-subject", representationId },
      };
}

function zoomCamera(camera: CameraDefinition, zoom: number): CameraDefinition {
  return camera.kind === "orthographic"
    ? { ...camera, verticalSpan: camera.verticalSpan / zoom }
    : {
        ...camera,
        verticalFieldOfViewRadians:
          2 * Math.atan(Math.tan(camera.verticalFieldOfViewRadians / 2) / zoom),
      };
}

function boundsCorners(bounds: CameraBounds3): readonly Vec3[] {
  const { minimum, maximum } = bounds;
  return Object.freeze([
    vec3(minimum.x, minimum.y, minimum.z),
    vec3(minimum.x, minimum.y, maximum.z),
    vec3(minimum.x, maximum.y, minimum.z),
    vec3(minimum.x, maximum.y, maximum.z),
    vec3(maximum.x, minimum.y, minimum.z),
    vec3(maximum.x, minimum.y, maximum.z),
    vec3(maximum.x, maximum.y, minimum.z),
    vec3(maximum.x, maximum.y, maximum.z),
  ]);
}

function fitCamera(
  camera: CameraDefinition,
  snapshot: CameraSubjectSnapshot,
  padding: number,
): RenderResult<CameraDefinition> {
  const bounds = snapshot.bounds;
  if (!bounds)
    return {
      ok: false,
      error: {
        kind: "invalid-fit-bounds",
        representationId: snapshot.representationId,
        message: "Fit-object requires subject bounds.",
      },
    };
  const center = scaleVec3(addVec3(bounds.minimum, bounds.maximum), 0.5);
  const service = createCameraService(camera);
  if (!service.ok) return service;
  let rightExtent = 0;
  let upExtent = 0;
  let forwardExtent = 0;
  for (const corner of boundsCorners(bounds)) {
    const relative = subtractVec3(corner, center);
    rightExtent = Math.max(
      rightExtent,
      Math.abs(dotVec3(relative, service.value.basis.right)),
    );
    upExtent = Math.max(
      upExtent,
      Math.abs(dotVec3(relative, service.value.basis.up)),
    );
    forwardExtent = Math.max(
      forwardExtent,
      Math.abs(dotVec3(relative, service.value.basis.forward)),
    );
  }
  if (rightExtent <= EPSILON && upExtent <= EPSILON)
    return {
      ok: false,
      error: {
        kind: "invalid-fit-bounds",
        representationId: snapshot.representationId,
        message: "Fit bounds have no visible extent in the camera plane.",
      },
    };
  const paddingScale = 1 + padding;
  const aspect = camera.viewport.width / camera.viewport.height;
  if (camera.kind === "orthographic") {
    const verticalSpan =
      2 * Math.max(upExtent, rightExtent / aspect) * paddingScale;
    const distance = Math.sqrt(
      (camera.position.x - camera.target.x) ** 2 +
        (camera.position.y - camera.target.y) ** 2 +
        (camera.position.z - camera.target.z) ** 2,
    );
    const position = subtractVec3(
      center,
      scaleVec3(service.value.basis.forward, distance),
    );
    return {
      ok: true,
      value: {
        ...camera,
        position,
        target: center,
        verticalSpan,
      },
    };
  }
  const tangent = Math.tan(camera.verticalFieldOfViewRadians / 2);
  const planeDistance =
    Math.max(upExtent / tangent, rightExtent / (tangent * aspect)) *
    paddingScale;
  const distance = Math.max(
    forwardExtent + camera.near,
    forwardExtent + planeDistance,
  );
  if (distance + forwardExtent > camera.far)
    return {
      ok: false,
      error: {
        kind: "invalid-fit-bounds",
        representationId: snapshot.representationId,
        message: "Fit bounds exceed the camera clipping range.",
      },
    };
  return {
    ok: true,
    value: {
      ...camera,
      position: subtractVec3(
        center,
        scaleVec3(service.value.basis.forward, distance),
      ),
      target: center,
    },
  };
}

function interpolateCamera(
  start: CameraDefinition,
  end: CameraDefinition,
  progress: number,
): CameraDefinition {
  const pose = {
    position: interpolateVec3(start.position, end.position, progress),
    target: interpolateVec3(start.target, end.target, progress),
  };
  if (start.kind === "orthographic" && end.kind === "orthographic")
    return {
      ...start,
      ...pose,
      verticalSpan: interpolate(start.verticalSpan, end.verticalSpan, progress),
    };
  if (start.kind === "perspective" && end.kind === "perspective")
    return {
      ...start,
      ...pose,
      verticalFieldOfViewRadians: interpolate(
        start.verticalFieldOfViewRadians,
        end.verticalFieldOfViewRadians,
        progress,
      ),
    };
  return start;
}

function applyOperation(
  camera: CameraDefinition,
  evaluated: EvaluatedCameraOperation,
  subjects: ReadonlyMap<RepresentationId, CameraSubjectSnapshot>,
): RenderResult<CameraDefinition> {
  if (
    typeof evaluated.sourceId !== "string" ||
    evaluated.sourceId.length === 0 ||
    !Number.isFinite(evaluated.progress) ||
    evaluated.progress < 0 ||
    evaluated.progress > 1
  )
    return invalid(
      "Evaluated operation requires a source ID and progress in [0, 1].",
    );
  const operationResult = validateCameraPresentationOperation(
    evaluated.operation,
  );
  if (!operationResult.ok) return operationResult;
  const operation = operationResult.value;
  let next: RenderResult<CameraDefinition>;
  switch (operation.kind) {
    case "pan": {
      const offset = interpolateVec3(
        operation.startOffset,
        operation.endOffset,
        evaluated.progress,
      );
      next = {
        ok: true,
        value: {
          ...camera,
          position: addVec3(camera.position, offset),
          target: addVec3(camera.target, offset),
        },
      };
      break;
    }
    case "zoom": {
      const zoom = interpolate(
        operation.startZoom,
        operation.endZoom,
        evaluated.progress,
      );
      next = { ok: true, value: zoomCamera(camera, zoom) };
      break;
    }
    case "powers-of-ten-zoom": {
      const exponent = interpolate(
        operation.startExponent,
        operation.endExponent,
        evaluated.progress,
      );
      next = { ok: true, value: zoomCamera(camera, 10 ** exponent) };
      break;
    }
    case "fit-object": {
      const subject = subjectFor(subjects, operation.representationId);
      if (!subject.ok) return subject;
      const fitted = fitCamera(camera, subject.value, operation.padding);
      next = fitted.ok
        ? {
            ok: true,
            value: interpolateCamera(camera, fitted.value, evaluated.progress),
          }
        : fitted;
      break;
    }
    case "follow-target": {
      const subject = subjectFor(subjects, operation.representationId);
      if (!subject.ok) return subject;
      const desiredPosition = addVec3(
        subject.value.position,
        operation.cameraOffset,
      );
      const desiredTarget = addVec3(
        subject.value.position,
        operation.lookAtOffset,
      );
      next = {
        ok: true,
        value: {
          ...camera,
          position: interpolateVec3(
            camera.position,
            desiredPosition,
            evaluated.progress,
          ),
          target: interpolateVec3(
            camera.target,
            desiredTarget,
            evaluated.progress,
          ),
        },
      };
      break;
    }
  }
  if (!next.ok) return next;
  const validated = createCameraService(next.value);
  return validated.ok
    ? { ok: true, value: validated.value.definition }
    : validated;
}

export function resolveCameraPresentation(
  baseCamera: CameraDefinition,
  evaluatedOperations: readonly EvaluatedCameraOperation[],
  subjectSnapshots: readonly CameraSubjectSnapshot[] = [],
): RenderResult<CameraDefinition> {
  const base = createCameraService(baseCamera);
  if (!base.ok) return base;
  const subjects = new Map<RepresentationId, CameraSubjectSnapshot>();
  for (const candidate of subjectSnapshots) {
    const subject = validateSubject(candidate);
    if (!subject.ok) return subject;
    if (subjects.has(subject.value.representationId))
      return invalid(
        `Duplicate camera subject: ${subject.value.representationId}.`,
      );
    subjects.set(subject.value.representationId, subject.value);
  }
  let camera = base.value.definition;
  for (const evaluated of evaluatedOperations) {
    const result = applyOperation(camera, evaluated, subjects);
    if (!result.ok) return result;
    camera = result.value;
  }
  return { ok: true, value: camera };
}
